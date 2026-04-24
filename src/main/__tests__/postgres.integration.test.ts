import { describe, it, expect, beforeAll } from 'vitest'
import { testConnection, getMetadata, executeQuery } from '../postgres'

describe('Postgres Integration Tests', () => {
  const config = {
    host: 'localhost',
    port: 5432,
    username: 'admin',
    password: 'password',
    database: 'leccordb_test',
    use_ssh: false
  }

  // We only run these tests if the Docker container is up.
  // We can check if the DB is available first, otherwise skip.
  let isDbAvailable = false;

  beforeAll(async () => {
    try {
      const res = await testConnection(config)
      isDbAvailable = res.success
      
      if (isDbAvailable) {
        // Create a test table for metadata and query tests
        const setupSql = `
          CREATE TABLE IF NOT EXISTS integration_test_table (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100)
          );
          INSERT INTO integration_test_table (name) VALUES ('Test Row 1') ON CONFLICT DO NOTHING;
        `
        await executeQuery(config, setupSql)
      } else {
        console.warn('PostgreSQL integration database is not available. Skipping integration tests.')
      }
    } catch (e) {
      console.warn('PostgreSQL integration database is not available.')
    }
  })

  it('should test connection successfully', async () => {
    if (!isDbAvailable) return;
    const result = await testConnection(config)
    expect(result.success).toBe(true)
  })

  it('should retrieve metadata from real database', async () => {
    if (!isDbAvailable) return;
    const result = await getMetadata(config)
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    
    const publicSchema = result.data?.find((schema: any) => schema.name === 'public')
    expect(publicSchema).toBeDefined()
    
    const testTable = publicSchema?.tables.find((t: any) => t.name === 'integration_test_table')
    expect(testTable).toBeDefined()
  })

  it('should execute a query and return results', async () => {
    if (!isDbAvailable) return;
    const sql = 'SELECT * FROM integration_test_table LIMIT 1'
    const result = await executeQuery(config, sql)
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.rows).toBeDefined()
    expect(result.data?.fields).toBeDefined()
    
    if (result.data?.rows.length > 0) {
      expect(result.data.rows[0].name).toContain('Test Row')
    }
  })
})
