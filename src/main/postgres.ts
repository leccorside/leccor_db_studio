import { Client } from 'pg'
import { Client as SSHClient } from 'ssh2'
import fs from 'fs'
import net from 'net'
import dns from 'dns'
import util from 'util'
import crypto from 'crypto'
import { EventEmitter } from 'events'

const lookup = util.promisify(dns.lookup)
const executionEvents = new EventEmitter()

async function createClient(config: any): Promise<{ client: Client, cleanup: () => void }> {
  if (config.use_ssh) {
    return new Promise((resolve, reject) => {
      const ssh = new SSHClient();
      let localServer: net.Server | null = null;
      
      ssh.on('ready', async () => {
        const targetHostRaw = (config.host || '127.0.0.1').trim();
        const targetPort = config.port || 5432;
        
        let resolvedHost = targetHostRaw;
        try {
          // Resolve locally to an IP address to bypass EC2 DNS issues
          const { address } = await lookup(targetHostRaw);
          resolvedHost = address;
        } catch (e) {
          // fallback to raw
        }

        // Create a local TCP server that forwards traffic through the SSH tunnel
        localServer = net.createServer((sock) => {
          ssh.forwardOut(
            sock.remoteAddress || '127.0.0.1', 
            sock.remotePort || 0, 
            resolvedHost, 
            targetPort, 
            (err, stream) => {
              if (err) {
                console.error('[SSH] forwardOut error:', err);
                return sock.end();
              }
              sock.pipe(stream).pipe(sock);
            }
          );
        });

        localServer.listen(0, '127.0.0.1', () => {
          const localPort = (localServer?.address() as net.AddressInfo).port;
          
          const pgConfig: any = {
            host: '127.0.0.1',
            port: localPort,
            user: config.username,
            password: config.password,
            database: config.database,
          };
          
          // Use SSL for remote hosts, RDS requires this.
          if (config.host && !['localhost', '127.0.0.1'].includes(config.host.trim())) {
            pgConfig.ssl = { rejectUnauthorized: false };
          }
          
          const pgClient = new Client(pgConfig);

          pgClient.connect(err => {
            if (err) {
              try { localServer?.close(); } catch (e) {}
              try { ssh.end(); } catch (e) {}
              return reject(err);
            }
            resolve({
              client: pgClient,
              cleanup: () => {
                try { pgClient.end(); } catch (e) {}
                try { localServer?.close(); } catch (e) {}
                try { ssh.end(); } catch (e) {}
              }
            });
          });
        });
      }).on('error', (err) => {
        reject(err);
      });

      const sshConfig: any = {
        host: (config.ssh_host || '').trim(),
        port: config.ssh_port || 22,
        username: (config.ssh_username || '').trim(),
      };

      if (config.ssh_keyfile && fs.existsSync(config.ssh_keyfile)) {
        sshConfig.privateKey = fs.readFileSync(config.ssh_keyfile);
      } else {
        sshConfig.password = config.ssh_password;
      }

      ssh.connect(sshConfig);
    });
  } else {
    const pgConfig: any = {
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
    };

    if (config.host && !['localhost', '127.0.0.1'].includes(config.host.trim())) {
      pgConfig.ssl = { rejectUnauthorized: false };
    }

    const client = new Client(pgConfig);
    await client.connect();
    return {
      client,
      cleanup: () => {
        try { client.end(); } catch (e) {}
      }
    };
  }
}

export async function testConnection(config: any) {
  let cleanupFn: (() => void) | null = null;
  try {
    const { client, cleanup } = await createClient(config);
    cleanupFn = cleanup;
    await client.query('SELECT 1');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    if (cleanupFn) cleanupFn();
  }
}

export async function getMetadata(config: any) {
  let cleanupFn: (() => void) | null = null;
  try {
    const { client, cleanup } = await createClient(config);
    cleanupFn = cleanup;

    const query = `
      SELECT table_schema as schema, table_name as name, table_type as type 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog') 
      ORDER BY table_schema, table_name;
    `
    const res = await client.query(query)
    
    // Group by schema
    const schemas: Record<string, any[]> = {}
    res.rows.forEach(row => {
      if (!schemas[row.schema]) schemas[row.schema] = []
      schemas[row.schema].push({ name: row.name, type: row.type })
    })

    const result = Object.keys(schemas).map(schema => ({
      name: schema,
      tables: schemas[schema]
    }))

    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  } finally {
    if (cleanupFn) cleanupFn();
  }
}

let activeQueryClient: { client: Client, cleanup: () => void, config: any } | null = null;
let currentExecutionId: string | null = null;

export async function executeQuery(config: any, sql: string) {
  const executionId = crypto.randomUUID();
  currentExecutionId = executionId;
  
  let cleanupFn: (() => void) | null = null;
  try {
    const created = await createClient(config);
    
    // Check if cancelled during connection
    if (currentExecutionId !== executionId) {
      created.cleanup();
      return { success: false, error: 'Query cancelled before execution' };
    }
    
    activeQueryClient = { ...created, config };
    cleanupFn = created.cleanup;
    const { client } = created;
    
    const start = performance.now()
    
    let cancelListener: ((id: string) => void) | null = null;
    const cancelPromise = new Promise<any>((_, reject) => {
      cancelListener = (id: string) => {
        if (id === executionId) reject(new Error('Query cancelled by user'));
      };
      executionEvents.once('cancel', cancelListener);
    });

    let res: any;
    try {
      res = await Promise.race([
        client.query(sql),
        cancelPromise
      ]);
    } finally {
      if (cancelListener) {
        executionEvents.removeListener('cancel', cancelListener);
      }
    }
    
    const end = performance.now()

    // Handling multiple queries vs single query
    const results = Array.isArray(res) ? res : [res];
    
    // We only return the last result for simplicity in this MVP
    const lastResult = results[results.length - 1];

    return { 
      success: true, 
      data: {
        rows: lastResult.rows,
        fields: lastResult.fields ? lastResult.fields.map(f => ({ name: f.name, type: f.dataTypeID })) : [],
        rowCount: lastResult.rowCount,
        command: lastResult.command,
        timeMs: Math.round(end - start)
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  } finally {
    if (cleanupFn) cleanupFn();
    if (currentExecutionId === executionId) {
      activeQueryClient = null;
      currentExecutionId = null;
    }
  }
}

export async function cancelQuery() {
  const execId = currentExecutionId;
  currentExecutionId = null; // Instantly abort any connection phase

  if (execId) {
    executionEvents.emit('cancel', execId);
  }

  if (activeQueryClient) {
    const { client, config, cleanup } = activeQueryClient;
    const processID = client.processID;

    if (processID) {
      createClient(config).then(cancelConn => {
        cancelConn.client.query('SELECT pg_cancel_backend($1)', [processID])
          .finally(() => cancelConn.cleanup());
      }).catch(e => console.error('Cancel request failed', e));
    }

    try {
      if ((client as any).connection && (client as any).connection.stream) {
        (client as any).connection.stream.destroy();
      }
      cleanup();
    } catch (e) {
      console.error('Error destroying socket:', e);
    }
    
    activeQueryClient = null;
  }
  
  return { success: true };
}

export async function exportDatabase(config: any, filePath: string) {
  let cleanupFn: (() => void) | null = null;
  try {
    const { client, cleanup } = await createClient(config);
    cleanupFn = cleanup;

    // Get all tables
    const tablesQuery = `
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog') AND table_type = 'BASE TABLE'
    `;
    const resTables = await client.query(tablesQuery);
    
    const ws = fs.createWriteStream(filePath);
    ws.write(`-- LeccorDBStudio Full Database Export\n`);
    ws.write(`-- Database: ${config.database}\n`);
    ws.write(`-- Date: ${new Date().toISOString()}\n\n`);

    for (const row of resTables.rows) {
      const schema = row.table_schema;
      const table = row.table_name;
      
      const colsQuery = `
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `;
      const resCols = await client.query(colsQuery, [schema, table]);
      
      const columns = resCols.rows.map((r: any) => {
        let type = r.data_type;
        if (r.character_maximum_length) type += `(${r.character_maximum_length})`;
        const nullable = r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        return `  "${r.column_name}" ${type} ${nullable}`;
      });
      
      ws.write(`CREATE TABLE "${schema}"."${table}" (\n${columns.join(',\n')}\n);\n\n`);
      
      try {
        const dataQuery = `SELECT * FROM "${schema}"."${table}" LIMIT 5000`; // Limit 5000 for MVP
        const resData = await client.query(dataQuery);
        
        if (resData.rows.length > 0) {
          const fields = resData.fields.map(f => `"${f.name}"`);
          
          for (const d of resData.rows) {
            const values = resData.fields.map(f => {
              const val = d[f.name];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (val instanceof Date) return `'${val.toISOString()}'`;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return val;
            });
            ws.write(`INSERT INTO "${schema}"."${table}" (${fields.join(', ')}) VALUES (${values.join(', ')});\n`);
          }
          ws.write('\n');
        }
      } catch (e: any) {
        ws.write(`-- Error exporting data for ${table}: ${e.message}\n\n`);
      }
    }
    
    ws.end();
    
    return new Promise((resolve) => {
      ws.on('finish', () => resolve({ success: true }));
      ws.on('error', (err) => resolve({ success: false, error: err.message }));
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    if (cleanupFn) cleanupFn();
  }
}
