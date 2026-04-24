import { ActivityBar } from './components/layout/ActivityBar'
import { Sidebar } from './components/layout/Sidebar'
import { EditorArea } from './components/layout/EditorArea'
import { BottomPanel } from './components/layout/BottomPanel'

function App() {
  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden text-white font-sans">
      <ActivityBar />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <EditorArea />
        <BottomPanel />
      </div>
    </div>
  )
}

export default App
