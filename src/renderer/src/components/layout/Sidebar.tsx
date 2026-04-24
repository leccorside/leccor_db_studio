import { ChevronDown, Database, Server, Plus, MoreVertical } from 'lucide-react';

export function Sidebar() {
  return (
    <div className="w-64 bg-sidebar border-r border-border flex flex-col h-full">
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <span className="font-semibold text-sm uppercase tracking-wider text-zinc-300">Explorer</span>
        <div className="flex gap-2">
          <button className="text-zinc-400 hover:text-white transition-colors">
            <Plus size={16} />
          </button>
          <button className="text-zinc-400 hover:text-white transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        {/* Placeholder for connections */}
        <div className="px-2">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-panel cursor-pointer text-zinc-300">
            <ChevronDown size={14} />
            <Server size={14} className="text-accent" />
            <span className="text-sm">Local PostgreSQL</span>
          </div>
          
          <div className="ml-6 pl-2 border-l border-border mt-1 flex flex-col gap-1">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-panel cursor-pointer text-zinc-400">
              <ChevronDown size={14} />
              <Database size={14} className="text-zinc-500" />
              <span className="text-sm">leccor_db</span>
            </div>
            
            <div className="ml-4 pl-2 border-l border-border mt-1 flex flex-col gap-1">
               <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-panel cursor-pointer text-zinc-400">
                <span className="text-xs text-blue-400 font-mono">TBL</span>
                <span className="text-sm">users</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-panel cursor-pointer text-zinc-400">
                <span className="text-xs text-blue-400 font-mono">TBL</span>
                <span className="text-sm">products</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
