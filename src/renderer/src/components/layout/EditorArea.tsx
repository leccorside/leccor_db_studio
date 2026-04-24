import { Play, Save, X } from 'lucide-react';

export function EditorArea() {
  return (
    <div className="flex-1 bg-background flex flex-col min-h-0">
      <div className="h-10 border-b border-border flex items-end px-2 gap-1 bg-sidebar">
        <div className="flex items-center gap-2 px-4 py-2 bg-background border-t border-x border-border rounded-t-lg border-b-background -mb-[1px] relative z-10 text-sm">
          <Database size={14} className="text-accent" />
          <span>query_1.sql</span>
          <button className="p-0.5 hover:bg-panel rounded text-zinc-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 text-zinc-500 hover:bg-panel/50 rounded-t-lg cursor-pointer text-sm">
          <span>setup.sql</span>
        </div>
      </div>

      <div className="flex border-b border-border bg-panel/30 p-2 gap-2">
        <button className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-md text-sm font-medium transition-colors">
          <Play size={14} fill="currentColor" />
          Run
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-panel hover:bg-panel/80 text-zinc-300 rounded-md text-sm font-medium transition-colors border border-border">
          <Save size={14} />
          Save
        </button>
      </div>

      <div className="flex-1 bg-background p-4 font-mono text-sm text-zinc-300 relative">
        <div className="absolute top-4 left-4 text-zinc-600 select-none">
          1<br/>2<br/>3<br/>4
        </div>
        <div className="ml-8">
          <span className="text-purple-400">SELECT</span> * <br/>
          <span className="text-purple-400">FROM</span> <span className="text-blue-300">users</span><br/>
          <span className="text-purple-400">WHERE</span> active <span className="text-white">=</span> <span className="text-orange-300">true</span><br/>
          <span className="text-purple-400">ORDER BY</span> created_at <span className="text-purple-400">DESC</span>;
        </div>
      </div>
    </div>
  );
}
