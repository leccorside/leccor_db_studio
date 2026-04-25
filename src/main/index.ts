import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDB, getConnections, saveConnection, deleteConnection, getSetting, saveSetting, saveQueryHistory, getQueryHistory } from './database'
import { testConnection, getMetadata, executeQuery, cancelQuery, exportDatabase, importDatabase } from './postgres'
import * as mysqlHandlers from './mysql'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../resources/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Initialize Database
  initDB()

  // Register IPC Handlers
  ipcMain.handle('db:getConnections', () => getConnections())
  ipcMain.handle('db:saveConnection', (_, conn) => saveConnection(conn))
  ipcMain.handle('db:deleteConnection', (_, id) => deleteConnection(id))
  ipcMain.handle('db:getSetting', (_, key) => getSetting(key))
  ipcMain.handle('db:saveSetting', (_, key, value) => saveSetting(key, value))
  ipcMain.handle('db:saveQueryHistory', (_, history) => saveQueryHistory(history))
  ipcMain.handle('db:getQueryHistory', () => getQueryHistory())
  ipcMain.handle('pg:testConnection', (_, config) => testConnection(config))
  ipcMain.handle('pg:getMetadata', (_, config) => getMetadata(config))
  ipcMain.handle('pg:executeQuery', (_, config, sql) => executeQuery(config, sql))
  ipcMain.handle('pg:cancelQuery', () => cancelQuery())
  ipcMain.handle('pg:exportDatabase', (_, config, filePath) => exportDatabase(config, filePath))
  ipcMain.handle('pg:importDatabase', (_, config, filePath) => importDatabase(config, filePath))

  ipcMain.handle('mysql:testConnection', (_, config) => mysqlHandlers.testConnection(config))
  ipcMain.handle('mysql:getMetadata', (_, config) => mysqlHandlers.getMetadata(config))
  ipcMain.handle('mysql:executeQuery', (_, config, sql) => mysqlHandlers.executeQuery(config, sql))
  ipcMain.handle('mysql:cancelQuery', () => mysqlHandlers.cancelQuery())
  ipcMain.handle('mysql:exportDatabase', (_, config, filePath) => mysqlHandlers.exportDatabase(config, filePath))
  ipcMain.handle('mysql:importDatabase', (_, config, filePath) => mysqlHandlers.importDatabase(config, filePath))

  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
    const result = await dialog.showSaveDialog(options);
    if (!result.canceled) return result.filePath;
    return null;
  })

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.leccor.dbstudio')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
