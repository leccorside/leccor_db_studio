import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock `pg` Client
const mockQuery = vi.fn()
const mockConnect = vi.fn()
const mockEnd = vi.fn()

vi.mock('pg', () => {
  return {
    Client: class {
      connect = mockConnect
      query = mockQuery
      end = mockEnd
    }
  }
})

// Mock `ssh2` Client
const mockSshConnect = vi.fn()
const mockSshForwardOut = vi.fn()
const mockSshEnd = vi.fn()
const mockSshOn = vi.fn()

const mockSshClientInstance = {
  on: mockSshOn,
  connect: mockSshConnect,
  forwardOut: mockSshForwardOut,
  end: mockSshEnd
}

vi.mock('ssh2', () => {
  return {
    Client: class {
      on = mockSshOn
      connect = mockSshConnect
      forwardOut = mockSshForwardOut
      end = mockSshEnd
    }
  }
})

import { testConnection, getMetadata, executeQuery } from '../postgres'

describe('Postgres Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock behavior
    mockConnect.mockResolvedValue(undefined)
    mockConnect.mockImplementation((cb) => cb && cb(null)) // Support callback
    mockQuery.mockResolvedValue({ rows: [{ schema: 'public', name: 'users', type: 'BASE TABLE' }] })
    
    // Simulate successful SSH connection by triggering the 'ready' event callback
    mockSshOn.mockImplementation((event, cb) => {
      if (event === 'ready') setTimeout(() => cb(), 10)
      return mockSshClientInstance
    })
    
    // Simulate successful SSH forwarding by passing a dummy stream to callback
    mockSshForwardOut.mockImplementation((srcIp, srcPort, destIp, destPort, cb) => {
      cb(null, {}) // Pass empty object as dummy stream
    })
  })

  it('should test connection successfully without SSH', async () => {
    const config = { host: 'localhost', port: 5432, username: 'user', password: 'pwd', database: 'db' }
    
    const result = await testConnection(config)
    
    expect(result.success).toBe(true)
    expect(mockConnect).toHaveBeenCalled()
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1')
  })

  it('should handle test connection failure', async () => {
    mockConnect.mockRejectedValueOnce(new Error('Connection failed'))
    
    const config = { host: 'localhost', port: 5432 }
    const result = await testConnection(config)
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection failed')
  })

  it('should retrieve metadata successfully', async () => {
    const config = { host: 'localhost', port: 5432 }
    
    const result = await getMetadata(config)
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data![0].name).toBe('public')
    expect(result.data![0].tables[0].name).toBe('users')
  })

  it('should execute a query successfully', async () => {
    mockQuery.mockResolvedValueOnce({ 
      rows: [{ id: 1, name: 'Alice' }],
      fields: [{ name: 'id', dataTypeID: 23 }, { name: 'name', dataTypeID: 1043 }],
      rowCount: 1,
      command: 'SELECT'
    })

    const config = { host: 'localhost', port: 5432 }
    const sql = 'SELECT * FROM users'
    
    const result = await executeQuery(config, sql)
    
    expect(result.success).toBe(true)
    expect(result.data?.rows).toHaveLength(1)
    expect(result.data?.fields).toHaveLength(2)
    expect(result.data?.command).toBe('SELECT')
  })

  it('should test connection successfully WITH SSH', async () => {
    const config = { 
      host: 'localhost', 
      use_ssh: true,
      ssh_host: 'example.com',
      ssh_username: 'root'
    }
    
    const result = await testConnection(config)
    
    expect(mockSshConnect).toHaveBeenCalled()
    expect(mockSshForwardOut).toHaveBeenCalled()
    expect(mockConnect).toHaveBeenCalled() // pg should be connected over the stream
    expect(result.success).toBe(true)
  })
})
