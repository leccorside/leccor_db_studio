import { useState } from 'react'
import { ActivityBar } from './components/layout/ActivityBar'
import { Sidebar } from './components/layout/Sidebar'
import { EditorArea } from './components/layout/EditorArea'
import { BottomPanel } from './components/layout/BottomPanel'
import { ConnectionManager } from './components/ConnectionManager'

function App() {
  const [showConnections, setShowConnections] = useState(false)
  const [activeConnection, setActiveConnection] = useState<any>(null)
  const [queryResult, setQueryResult] = useState<any>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [lastQuerySql, setLastQuerySql] = useState<string>('')
  const [externalSqlRequest, setExternalSqlRequest] = useState<{ sql: string, ts: number } | null>(null)
  const [editingConnId, setEditingConnId] = useState<string | undefined>()
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0)

  const handleExecute = async (sql: string) => {
    if (!activeConnection) {
      setQueryError('Selecione uma conexão ativa primeiro.')
      return
    }
    
    setIsExecuting(true)
    setQueryError(null)
    setQueryResult(null)
    setLastQuerySql(sql)

    const apiGroup = activeConnection.driver === 'mysql' ? window.api.mysql : window.api.pg;
    const result = await apiGroup.executeQuery(activeConnection, sql)
    
    if (result.success) {
      setQueryResult(result.data)
      window.api.db.saveQueryHistory({
        connection_id: activeConnection.id,
        connection_name: activeConnection.name,
        sql: sql,
        execution_time_ms: result.data.timeMs,
        success: true
      })
    } else {
      setQueryError(result.error || 'Erro desconhecido')
      window.api.db.saveQueryHistory({
        connection_id: activeConnection.id,
        connection_name: activeConnection.name,
        sql: sql,
        execution_time_ms: 0,
        success: false,
        error_message: result.error || 'Erro desconhecido'
      })
    }
    
    setIsExecuting(false)
  }

  const handleGenerateSql = (sql: string) => {
    setExternalSqlRequest({ sql, ts: Date.now() })
  }

  const handleEditConnection = (connId: string) => {
    setEditingConnId(connId)
    setShowConnections(true)
  }

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden text-white font-sans">
      <ActivityBar onOpenConnections={() => {setEditingConnId(undefined); setShowConnections(true)}} />
      <Sidebar 
        activeConnectionId={activeConnection?.id} 
        onConnectionSelect={setActiveConnection} 
        onGenerateSql={handleGenerateSql} 
        onEditConnection={handleEditConnection}
        refreshTrigger={sidebarRefreshTrigger}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <EditorArea onExecute={handleExecute} isExecuting={isExecuting} activeConnection={activeConnection} externalSqlRequest={externalSqlRequest} />
        <BottomPanel result={queryResult} error={queryError} activeConnection={activeConnection} lastQuerySql={lastQuerySql} onRefresh={() => handleExecute(lastQuerySql)} />
      </div>
      
      {showConnections && (
        <ConnectionManager 
          onClose={() => {setShowConnections(false); setEditingConnId(undefined); setSidebarRefreshTrigger(prev => prev + 1)}} 
          initialSelectedId={editingConnId} 
        />
      )}
    </div>
  )
}

export default App
