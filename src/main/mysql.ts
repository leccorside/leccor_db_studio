import mysql from 'mysql2/promise'
import { Client as SSHClient } from 'ssh2'
import fs from 'fs'
import net from 'net'
import crypto from 'crypto'
import { EventEmitter } from 'events'
import { getQueryHistoryByConnection, saveConnection, saveQueryHistory } from './database'

const executionEvents = new EventEmitter()

async function createClient(config: any): Promise<{ client: mysql.Connection, cleanup: () => void }> {
  if (config.use_ssh) {
    return new Promise((resolve, reject) => {
      const ssh = new SSHClient();
      let localServer: net.Server | null = null;
      
      ssh.on('ready', async () => {
        const targetHostRaw = (config.host || '127.0.0.1').trim();
        const targetPort = config.port || 3306;

        localServer = net.createServer((sock) => {
          ssh.forwardOut(
            sock.remoteAddress || '127.0.0.1', 
            sock.remotePort || 0, 
            targetHostRaw,
            targetPort,
            (err, stream) => {
              if (err) {
                console.error('[SSH] forwardOut error:', err);
                reject(err);
                try { ssh.end(); } catch (e) {}
                try { localServer?.close(); } catch (e) {}
                return sock.end();
              }
              sock.pipe(stream).pipe(sock);
            }
          );
        });

        localServer.listen(0, '127.0.0.1', async () => {
          const localPort = (localServer?.address() as net.AddressInfo).port;
          
          const mysqlConfig: mysql.ConnectionOptions = {
            host: '127.0.0.1',
            port: localPort,
            user: config.username,
            password: config.password,
            database: config.database || undefined,
            connectTimeout: 15000,
            multipleStatements: true
          };
          
          try {
            const mysqlClient = await mysql.createConnection(mysqlConfig);
            resolve({
              client: mysqlClient,
              cleanup: () => {
                try { mysqlClient.end(); } catch (e) {}
                try { localServer?.close(); } catch (e) {}
                try { ssh.end(); } catch (e) {}
              }
            });
          } catch (err) {
            try { localServer?.close(); } catch (e) {}
            try { ssh.end(); } catch (e) {}
            reject(err);
          }
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
    const mysqlConfig: mysql.ConnectionOptions = {
      host: config.host,
      port: config.port || 3306,
      user: config.username,
      password: config.password,
      database: config.database || undefined,
      connectTimeout: 15000,
      multipleStatements: true
    };

    const client = await mysql.createConnection(mysqlConfig);
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
      SELECT TABLE_SCHEMA as \`schema\`, TABLE_NAME as name, TABLE_TYPE as type 
      FROM information_schema.tables 
      WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
      ORDER BY TABLE_SCHEMA, TABLE_NAME;
    `
    const [rows] = await client.query(query)
    
    // Group by schema
    const schemas: Record<string, any[]> = {}
    ;(rows as any[]).forEach(row => {
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

let activeQueryClient: { client: mysql.Connection, cleanup: () => void, config: any } | null = null;
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
    let fields: any;
    try {
      const result = await Promise.race([
        client.query(sql),
        cancelPromise
      ]);
      res = result[0];
      fields = result[1];
    } finally {
      if (cancelListener) {
        executionEvents.removeListener('cancel', cancelListener);
      }
    }
    
    const end = performance.now()

    // Handing multiple statements (if returned array of arrays)
    const results = Array.isArray(res) && Array.isArray(res[0]) ? res : [res];
    const lastResult = results[results.length - 1];
    
    // Also need fields for the last result
    const lastFields = Array.isArray(fields) && Array.isArray(fields[0]) ? fields[fields.length - 1] : fields;

    // Formatting result similarly to Postgres
    const rowCount = Array.isArray(lastResult) ? lastResult.length : (lastResult?.affectedRows || 0);
    const command = Array.isArray(lastResult) ? 'SELECT' : 'UPDATE/INSERT/DELETE';

    return { 
      success: true, 
      data: {
        rows: Array.isArray(lastResult) ? lastResult : [],
        fields: lastFields ? lastFields.map((f: any) => ({ name: f.name, type: f.columnType })) : [],
        rowCount: rowCount,
        command: command,
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
  currentExecutionId = null;

  if (execId) {
    executionEvents.emit('cancel', execId);
  }

  if (activeQueryClient) {
    const { client, cleanup } = activeQueryClient;
    const threadId = (client as any).threadId;

    if (threadId) {
      try {
        const cancelConn = await createClient(activeQueryClient.config);
        await cancelConn.client.query(`KILL QUERY ${threadId}`);
        cancelConn.cleanup();
      } catch (e) {
        console.error('Cancel request failed', e);
      }
    }

    try {
      client.destroy();
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

    const history = getQueryHistoryByConnection(config.id);
    const dbName = config.database;
    if (!dbName) throw new Error("Database not specified for export.");

    const ws = fs.createWriteStream(filePath);
    ws.write(`/* LECCOR_DB_STUDIO_EXPORT_V1\n`);
    ws.write(JSON.stringify({ connection: config, history: history }, null, 2));
    ws.write(`\n*/\n\n`);
    ws.write(`-- LeccorDBStudio Full Database Export\n`);
    ws.write(`-- Database: ${dbName}\n`);
    ws.write(`-- Date: ${new Date().toISOString()}\n\n`);
    
    ws.write(`SET FOREIGN_KEY_CHECKS=0;\n\n`);

    const [tablesRow]: any = await client.query(`SHOW TABLES`);
    
    for (const row of tablesRow) {
      const table = Object.values(row)[0] as string;
      
      const [createTableResult]: any = await client.query(`SHOW CREATE TABLE \`${table}\``);
      ws.write(createTableResult[0]['Create Table'] + ';\n\n');
      
      try {
        const [resData, fields]: any = await client.query(`SELECT * FROM \`${table}\` LIMIT 5000`);
        
        if (resData.length > 0) {
          const fieldNames = fields.map((f: any) => `\`${f.name}\``);
          
          for (const d of resData) {
            const values = fields.map((f: any) => {
              const val = d[f.name];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return val;
            });
            ws.write(`INSERT INTO \`${table}\` (${fieldNames.join(', ')}) VALUES (${values.join(', ')});\n`);
          }
          ws.write('\n');
        }
      } catch (e: any) {
        ws.write(`-- Error exporting data for ${table}: ${e.message}\n\n`);
      }
    }
    
    ws.write(`SET FOREIGN_KEY_CHECKS=1;\n`);
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

export async function importDatabase(config: any, filePath: string) {
  let cleanupFn: (() => void) | null = null;
  try {
    let sql = fs.readFileSync(filePath, 'utf-8');
    
    let importConfig = config;
    if (sql.startsWith('/* LECCOR_DB_STUDIO_EXPORT_V1')) {
      const endMarker = '*/';
      const endIndex = sql.indexOf(endMarker);
      if (endIndex !== -1) {
        const jsonStr = sql.substring('/* LECCOR_DB_STUDIO_EXPORT_V1\n'.length, endIndex);
        try {
          const metadata = JSON.parse(jsonStr);
          if (metadata.connection) {
            const newConnId = crypto.randomUUID();
            importConfig = {
              ...metadata.connection,
              id: newConnId,
              name: metadata.connection.name + ' (Importado)'
            };
            saveConnection(importConfig);
          }
          if (metadata.history && Array.isArray(metadata.history)) {
            for (const item of metadata.history) {
              saveQueryHistory({
                ...item,
                id: crypto.randomUUID(),
                connection_id: importConfig.id,
                connection_name: importConfig.name
              });
            }
          }
        } catch (e) {
          console.error('Error parsing export metadata', e);
        }
        sql = sql.substring(endIndex + endMarker.length);
      }
    }

    if (!importConfig) {
       return { success: false, error: 'Nenhuma conexão ativa selecionada e o arquivo não possui dados de conexão.' };
    }

    const { client, cleanup } = await createClient(importConfig);
    cleanupFn = cleanup;

    if (sql.trim().length > 0) {
      await client.query(sql);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    if (cleanupFn) cleanupFn();
  }
}
