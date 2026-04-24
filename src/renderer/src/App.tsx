import { useState } from 'react'
import { ActivityBar } from './components/layout/ActivityBar'
import { Sidebar } from './components/layout/Sidebar'
import { EditorArea } from './components/layout/EditorArea'
import { BottomPanel } from './components/layout/BottomPanel'
import { ConnectionManager } from './components/ConnectionManager'

function App() {
  const [showConnections, setShowConnections] = useState(false)

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden text-white font-sans">
      <ActivityBar onOpenConnections={() => setShowConnections(true)} />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <EditorArea />
        <BottomPanel />
      </div>
      
      {showConnections && (
        <ConnectionManager onClose={() => setShowConnections(false)} />
      )}
    </div>
  )
}

export default App
