import { describe, it, expect, vi, beforeEach } from 'vitest'
import { join } from 'path'
import crypto from 'crypto'

// Mock Electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => __dirname), // Use current test dir as user data path for tests
  }
}))

import { initDB, getDB, saveSetting, getSetting, encrypt, decrypt, saveConnection, getConnections } from '../database'

describe('Database Unit Tests', () => {
  beforeEach(() => {
    // Try to close if already open
    try {
      const db = getDB()
      db.close()
    } catch (e) {}

    // Delete test db if exists
    const fs = require('fs')
    const dbPath = join(__dirname, 'leccor_db_studio.sqlite')
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath)
      } catch (e) {
        console.warn('Could not delete db file, it might be locked', e)
      }
    }
    
    // Initialize DB fresh for each test
    initDB()
  })

  it('should initialize DB correctly', () => {
    const db = getDB()
    expect(db).toBeDefined()
  })

  it('should save and get settings', () => {
    saveSetting('test_key', 'test_value')
    const val = getSetting('test_key')
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
    const connections = getConnections()
    
    expect(connections).toHaveLength(1)
    expect(connections[0].name).toBe('Test DB')
    expect(connections[0].password).toBe('mypassword') // decrypted automatically by getConnections
    expect(connections[0].ssh_password).toBe('sshpassword')
    expect(connections[0].use_ssh).toBe(true)

    // Verify it was actually encrypted in the db
    const rawDb = getDB()
    const rawRow = rawDb.prepare('SELECT password FROM connections WHERE id = ?').get('conn-1') as any
    expect(rawRow.password).not.toBe('mypassword')
    expect(rawRow.password).toContain(':')
  })
})
