import { Client } from 'pg'

export async function testConnection(config: any) {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
  })

  try {
    await client.connect()
    await client.query('SELECT 1')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  } finally {
    try {
      await client.end()
    } catch (e) {
      // Ignore errors on close
    }
  }
}
