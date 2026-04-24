import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import crypto from 'crypto'

let db: Database.Database | null = null

export function initDB() {
  const dbPath = join(app.getPath('userData'), 'leccor_db_studio.sqlite')
  db = new Database(dbPath)

  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      driver TEXT NOT NULL,
      host TEXT,
      port INTEGER,
      username TEXT,
      password TEXT,
      database TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS query_history (
      id TEXT PRIMARY KEY,
      connection_id TEXT,
      connection_name TEXT,
      sql TEXT NOT NULL,
      execution_time_ms INTEGER,
      success BOOLEAN,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Safely add new columns for SSH
  const sshCols = [
    'use_ssh BOOLEAN DEFAULT 0',
    'ssh_host TEXT',
    'ssh_port INTEGER',
    'ssh_username TEXT',
    'ssh_password TEXT',
    'ssh_keyfile TEXT'
  ]

  for (const col of sshCols) {
    try {
      db.exec(`ALTER TABLE connections ADD COLUMN ${col}`);
    } catch (e: any) {
      // Column already exists, ignore
      if (!e.message.includes('duplicate column name')) {
        console.error('Error adding column', e);
      }
    }
  }

  // Ensure encryption key exists
  const keyObj = getSetting('encryption_key')
  if (!keyObj) {
    saveSetting('encryption_key', crypto.randomBytes(32).toString('hex'))
  }
}

// --- Encryption Utilities ---
const ALGORITHM = 'aes-256-cbc';

function getEncryptionKey(): Buffer {
  const hexKey = getSetting('encryption_key');
  if (!hexKey) throw new Error('Encryption key not found');
  return Buffer.from(hexKey, 'hex');
}

export function encrypt(text: string): string {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (e) {
    console.error('Encryption failed', e);
    return text;
  }
}

export function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('Decryption failed', e);
    return text;
  }
}
// ----------------------------

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function getConnections() {
  const db = getDB()
  const stmt = db.prepare('SELECT * FROM connections ORDER BY name ASC')
  const rows = stmt.all() as any[]
  
  // Decrypt passwords
  return rows.map(r => ({
    ...r,
    use_ssh: r.use_ssh === 1,
    password: decrypt(r.password),
    ssh_password: decrypt(r.ssh_password)
  }))
}

export function saveConnection(connection: any) {
  const db = getDB()
  const stmt = db.prepare(`
    INSERT INTO connections (id, name, driver, host, port, username, password, database, use_ssh, ssh_host, ssh_port, ssh_username, ssh_password, ssh_keyfile)
    VALUES (@id, @name, @driver, @host, @port, @username, @password, @database, @use_ssh, @ssh_host, @ssh_port, @ssh_username, @ssh_password, @ssh_keyfile)
    ON CONFLICT(id) DO UPDATE SET
      name = @name,
      driver = @driver,
      host = @host,
      port = @port,
      username = @username,
      password = @password,
      database = @database,
      use_ssh = @use_ssh,
      ssh_host = @ssh_host,
      ssh_port = @ssh_port,
      ssh_username = @ssh_username,
      ssh_password = @ssh_password,
      ssh_keyfile = @ssh_keyfile,
      updated_at = CURRENT_TIMESTAMP
  `)
  return stmt.run({
    ...connection,
    use_ssh: connection.use_ssh ? 1 : 0,
    password: encrypt(connection.password),
    ssh_password: encrypt(connection.ssh_password)
  })
}

export function deleteConnection(id: string) {
  const db = getDB()
  const stmt = db.prepare('DELETE FROM connections WHERE id = ?')
  return stmt.run(id)
}

export function getSetting(key: string) {
  const db = getDB()
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?')
  const result = stmt.get(key) as { value: string } | undefined
  return result ? result.value : null
}

export function saveSetting(key: string, value: string) {
  const db = getDB()
  const stmt = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `)
  return stmt.run(key, value)
}

export function saveQueryHistory(history: any) {
  const db = getDB()
  const stmt = db.prepare(`
    INSERT INTO query_history (id, connection_id, connection_name, sql, execution_time_ms, success, error_message)
    VALUES (@id, @connection_id, @connection_name, @sql, @execution_time_ms, @success, @error_message)
  `)
  return stmt.run({
    id: history.id || require('crypto').randomUUID(),
    connection_id: history.connection_id,
    connection_name: history.connection_name,
    sql: history.sql,
    execution_time_ms: history.execution_time_ms || 0,
    success: history.success ? 1 : 0,
    error_message: history.error_message || null
  })
}

export function getQueryHistory() {
  const db = getDB()
  // Limit to 100 entries for performance
  const stmt = db.prepare('SELECT * FROM query_history ORDER BY created_at DESC LIMIT 100')
  const rows = stmt.all() as any[]
  // Convert boolean
  return rows.map(r => ({
    ...r,
    success: r.success === 1
  }))
}
