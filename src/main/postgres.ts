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

export async function getMetadata(config: any) {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
  })

  try {
    await client.connect()
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
    try {
      await client.end()
    } catch (e) {
      // Ignore errors on close
    }
  }
}
