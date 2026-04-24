import { describe, it, expect, vi, beforeEach } from 'vitest'
import { join } from 'path'
import crypto from 'crypto'

// Mock better-sqlite3
const mockPrepare = vi.fn();
const mockExec = vi.fn();
const mockClose = vi.fn();
const mockRun = vi.fn();
const mockGet = vi.fn();
const mockAll = vi.fn();

vi.mock('better-sqlite3', () => {
  return {
    default: class {
      constructor() {}
      exec = mockExec
      prepare = mockPrepare.mockReturnValue({
        run: mockRun,
        get: mockGet,
        all: mockAll
      })
      close = mockClose
    }
  };
});

// Mock Electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => __dirname), // Use current test dir as user data path for tests
  }
}))

import { initDB, getDB, saveSetting, getSetting, encrypt, decrypt, saveConnection, getConnections } from '../database'

describe('Database Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks for sqlite3 returns
    mockGet.mockReturnValue({ value: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' });
    mockAll.mockReturnValue([]);
    mockRun.mockReturnValue({ changes: 1, lastInsertRowid: 1 });
    
    // Initialize DB fresh for each test
    initDB()
  })

  it('should initialize DB correctly', () => {
    const db = getDB()
    expect(db).toBeDefined()
    expect(mockExec).toHaveBeenCalled()
  })

  it('should save and get settings', () => {
    mockGet.mockReturnValueOnce({ value: 'test_value' });
    
    saveSetting('test_key', 'test_value')
    const val = getSetting('test_key')
    
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO settings'))
    expect(val).toBe('test_value')
  })

  it('should encrypt and decrypt values correctly', () => {
    const rawText = 'my_super_secret_password'
    const encrypted = encrypt(rawText)
    
    expect(encrypted).not.toBe(rawText)
    expect(encrypted).toContain(':') // format is IV:Data
    
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(rawText)
  })

  it('should save and retrieve connections, encrypting passwords', () => {
    const conn = {
      id: 'conn-1',
      name: 'Test DB',
      driver: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'mypassword',
      use_ssh: true,
      ssh_password: 'sshpassword'
    }

    saveConnection(conn)

    // Verify saveConnection was called correctly
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO connections'))
    expect(mockRun).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test DB',
      use_ssh: 1
    }))
    
    // Verify getConnections works and decrypts
    mockAll.mockReturnValueOnce([{
      ...conn,
      use_ssh: 1,
      password: encrypt('mypassword'),
      ssh_password: encrypt('sshpassword')
    }]);

    const connections = getConnections()
    
    expect(connections).toHaveLength(1)
    expect(connections[0].name).toBe('Test DB')
    expect(connections[0].password).toBe('mypassword') // decrypted automatically by getConnections
    expect(connections[0].ssh_password).toBe('sshpassword')
    expect(connections[0].use_ssh).toBe(true)
  })
})
