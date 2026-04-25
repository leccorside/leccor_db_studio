import { contextBridge, ipcRenderer } from 'electron'
import { exposeElectronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  db: {
    getConnections: () => ipcRenderer.invoke('db:getConnections'),
    saveConnection: (connection: any) => ipcRenderer.invoke('db:saveConnection', connection),
    deleteConnection: (id: string) => ipcRenderer.invoke('db:deleteConnection', id),
    getSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
    saveSetting: (key: string, value: string) => ipcRenderer.invoke('db:saveSetting', key, value),
    saveQueryHistory: (history: any) => ipcRenderer.invoke('db:saveQueryHistory', history),
    getQueryHistory: () => ipcRenderer.invoke('db:getQueryHistory'),
  },
  pg: {
    testConnection: (config: any) => ipcRenderer.invoke('pg:testConnection', config),
    getMetadata: (config: any) => ipcRenderer.invoke('pg:getMetadata', config),
    executeQuery: (config: any, sql: string) => ipcRenderer.invoke('pg:executeQuery', config, sql),
    cancelQuery: () => ipcRenderer.invoke('pg:cancelQuery'),
    exportDatabase: (config: any, filePath: string) => ipcRenderer.invoke('pg:exportDatabase', config, filePath)
  },
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    exposeElectronAPI()
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = electronAPI
  // @ts-ignore (define in d.ts)
  window.api = api
}
