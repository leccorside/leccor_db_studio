import { Database, Folder, Settings, Search, Play } from 'lucide-react';

export function ActivityBar() {
  return (
    <div className="w-14 bg-background border-r border-border flex flex-col items-center py-4 justify-between h-full">
      <div className="flex flex-col gap-4">
        <button className="p-3 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
          <Database size={20} />
        </button>
        <button className="p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-panel transition-colors">
          <Search size={20} />
        </button>
        <button className="p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-panel transition-colors">
          <Folder size={20} />
        </button>
      </div>
      
      <div className="flex flex-col gap-4">
        <button className="p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-panel transition-colors">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}
