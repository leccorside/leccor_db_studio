import { useState, useEffect } from 'react'
import { X, Server, Play, Save, Plus, Trash2 } from 'lucide-react'

interface Connection {
  id: string
  name: string
  driver: string
  host?: string
  port?: number
  username?: string
  password?: string
  database?: string
}

export function ConnectionManager({ onClose }: { onClose: () => void }) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Connection>>({ driver: 'postgres', port: 5432 })
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    const data = await window.api.db.getConnections()
    setConnections(data)
  }

  const handleSelect = (conn: Connection) => {
    setSelectedId(conn.id)
    setFormData(conn)
    setTestStatus('idle')
    setTestMessage('')
  }

  const handleNew = () => {
    setSelectedId(null)
    setFormData({ driver: 'postgres', port: 5432, host: 'localhost' })
    setTestStatus('idle')
    setTestMessage('')
  }

  const handleSave = async () => {
    if (!formData.name || !formData.driver) return
    const idToSave = selectedId || crypto.randomUUID()
    const connToSave = { ...formData, id: idToSave }
    await window.api.db.saveConnection(connToSave)
    await loadConnections()
    setSelectedId(idToSave)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conexão?')) return
    await window.api.db.deleteConnection(id)
    if (selectedId === id) handleNew()
    await loadConnections()
  }

  const handleTest = async () => {
    setTestStatus('testing')
    setTestMessage('')
    const result = await window.api.pg.testConnection(formData)
    if (result.success) {
      setTestStatus('success')
      setTestMessage('Conexão bem sucedida!')
    } else {
      setTestStatus('error')
      setTestMessage(result.error || 'Erro desconhecido ao conectar.')
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-border rounded-xl shadow-2xl flex flex-col md:flex-row w-full max-w-4xl max-h-[80vh] overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <button 
              onClick={handleNew}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-md text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Nova Conexão
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            {connections.map(conn => (
              <div 
                key={conn.id}
                onClick={() => handleSelect(conn)}
                className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm ${selectedId === conn.id ? 'bg-accent/20 text-accent' : 'text-zinc-300 hover:bg-panel'}`}
              >
                <div className="flex items-center gap-2">
                  <Server size={14} />
                  <span>{conn.name}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(conn.id) }}
                  className="text-zinc-500 hover:text-red-400 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-background">
          <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
            <h2 className="font-semibold text-lg">{selectedId ? 'Editar Conexão' : 'Nova Conexão'}</h2>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-panel transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium text-zinc-400">Nome da Conexão</label>
                <input 
                  type="text" 
                  className="w-full bg-panel border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent text-white"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Produção PostgreSQL"
                />
              </div>

              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-zinc-400">Driver</label>
                <select 
                  className="w-full bg-panel border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent text-white"
                  value={formData.driver || 'postgres'}
                  onChange={e => setFormData({...formData, driver: e.target.value})}
                >
                  <option value="postgres">PostgreSQL</option>
                  <option value="mysql" disabled>MySQL (Em breve)</option>
                  <option value="sqlite" disabled>SQLite (Em breve)</option>
                </select>
              </div>

              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-zinc-400">Database</label>
                <input 
                  type="text" 
                  className="w-full bg-panel border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent text-white"
                  value={formData.database || ''}
                  onChange={e => setFormData({...formData, database: e.target.value})}
                  placeholder="postgres"
                />
              </div>

              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-zinc-400">Host</label>
                <input 
                  type="text" 
                  className="w-full bg-panel border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent text-white"
                  value={formData.host || ''}
                  onChange={e => setFormData({...formData, host: e.target.value})}
                  placeholder="localhost"
                />
              </div>

              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-zinc-400">Porta</label>
                <input 
                  type="number" 
                  className="w-full bg-panel border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent text-white"
                  value={formData.port || ''}
                  onChange={e => setFormData({...formData, port: parseInt(e.target.value)})}
                  placeholder="5432"
                />
              </div>

              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-zinc-400">Usuário</label>
                <input 
                  type="text" 
                  className="w-full bg-panel border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent text-white"
                  value={formData.username || ''}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  placeholder="postgres"
                />
              </div>

              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-zinc-400">Senha</label>
                <input 
                  type="password" 
                  className="w-full bg-panel border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent text-white"
                  value={formData.password || ''}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            {testStatus !== 'idle' && (
              <div className={`p-4 rounded-md text-sm border ${
                testStatus === 'testing' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                testStatus === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {testStatus === 'testing' ? 'Testando conexão...' : testMessage}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-panel flex justify-between shrink-0">
            <button 
              onClick={handleTest}
              className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-background border border-border text-zinc-300 rounded-md text-sm font-medium transition-colors"
            >
              <Play size={16} /> Testar Conexão
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-md text-sm font-medium transition-colors"
            >
              <Save size={16} /> Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
