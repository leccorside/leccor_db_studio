import { Client } from 'pg'
import { Client as SSHClient } from 'ssh2'
import fs from 'fs'

async function createClient(config: any): Promise<{ client: Client, cleanup: () => void }> {
  if (config.use_ssh) {
    return new Promise((resolve, reject) => {
      const ssh = new SSHClient();
      
      ssh.on('ready', () => {
        ssh.forwardOut(
          '127.0.0.1', 
          0, // any local port
          config.host || '127.0.0.1', 
          config.port || 5432, 
          (err, stream) => {
            if (err) {
              ssh.end();
              return reject(err);
            }
            
            const pgClient = new Client({
              user: config.username,
              password: config.password,
              database: config.database,
              stream: stream,
            });

            pgClient.connect(err => {
              if (err) {
                ssh.end();
                return reject(err);
              }
              resolve({
                client: pgClient,
                cleanup: () => {
                  try { pgClient.end(); } catch (e) {}
                  try { ssh.end(); } catch (e) {}
                }
              });
            });
          }
        );
      }).on('error', (err) => {
        reject(err);
      });

      const sshConfig: any = {
        host: config.ssh_host,
        port: config.ssh_port || 22,
        username: config.ssh_username,
      };

      if (config.ssh_keyfile && fs.existsSync(config.ssh_keyfile)) {
        sshConfig.privateKey = fs.readFileSync(config.ssh_keyfile);
      } else {
        sshConfig.password = config.ssh_password;
      }

      ssh.connect(sshConfig);
    });
  } else {
    const client = new Client({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
    });
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

export async function executeQuery(config: any, sql: string) {
  let cleanupFn: (() => void) | null = null;
  try {
    const { client, cleanup } = await createClient(config);
    cleanupFn = cleanup;
    
    const start = performance.now()
    const res = await client.query(sql)
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
  }
}
