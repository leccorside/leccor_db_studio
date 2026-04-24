import { Database, Zap } from 'lucide-react'

function App() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-white p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-4 bg-accent/20 rounded-2xl">
          <Database className="w-12 h-12 text-accent" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">LeccorDB<span className="text-accent">Studio</span></h1>
      </div>
      
      <p className="text-zinc-400 text-lg mb-8 max-w-md text-center">
        A próxima geração de administração de bancos de dados. Performance e design em um só lugar.
      </p>

      <div className="flex gap-4">
        <div className="px-4 py-2 bg-panel border border-border rounded-lg flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium">Electron + React + Vite</span>
        </div>
      </div>
    </div>
  )
}

export default App
