import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

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
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function getConnections() {
  const db = getDB()
  const stmt = db.prepare('SELECT * FROM connections ORDER BY name ASC')
  return stmt.all()
}

export function saveConnection(connection: any) {
  const db = getDB()
  const stmt = db.prepare(`
    INSERT INTO connections (id, name, driver, host, port, username, password, database)
    VALUES (@id, @name, @driver, @host, @port, @username, @password, @database)
    ON CONFLICT(id) DO UPDATE SET
      name = @name,
      driver = @driver,
      host = @host,
      port = @port,
      username = @username,
      password = @password,
      database = @database,
      updated_at = CURRENT_TIMESTAMP
  `)
  return stmt.run(connection)
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
