import { Table, Terminal, History, Maximize2 } from 'lucide-react';

export function BottomPanel() {
  return (
    <div className="h-72 border-t border-border bg-panel flex flex-col shrink-0">
      <div className="flex items-center justify-between px-2 h-10 border-b border-border bg-sidebar">
        <div className="flex h-full gap-1">
          <button className="flex items-center gap-2 px-4 h-full text-accent border-b-2 border-accent text-sm font-medium">
            <Table size={14} />
            Data Grid
          </button>
          <button className="flex items-center gap-2 px-4 h-full text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">
            <Terminal size={14} />
            Messages
          </button>
          <button className="flex items-center gap-2 px-4 h-full text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">
            <History size={14} />
            History
          </button>
        </div>
        <button className="text-zinc-400 hover:text-white p-1.5 rounded-md hover:bg-panel transition-colors">
          <Maximize2 size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-background/50">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs text-zinc-400 uppercase bg-panel/50 sticky top-0">
            <tr>
              <th className="border-r border-b border-border px-4 py-2 font-medium w-12 text-center">#</th>
              <th className="border-r border-b border-border px-4 py-2 font-medium">id</th>
              <th className="border-r border-b border-border px-4 py-2 font-medium">name</th>
              <th className="border-r border-b border-border px-4 py-2 font-medium">email</th>
              <th className="border-b border-border px-4 py-2 font-medium">created_at</th>
            </tr>
          </thead>
          <tbody className="font-mono text-zinc-300">
            <tr className="hover:bg-panel/30 border-b border-border/50">
              <td className="border-r border-border px-4 py-2 text-zinc-500 text-center">1</td>
              <td className="border-r border-border px-4 py-2 text-accent">uuid-1</td>
              <td className="border-r border-border px-4 py-2">John Doe</td>
              <td className="border-r border-border px-4 py-2">john@example.com</td>
              <td className="px-4 py-2 text-zinc-400">2026-04-24 10:00:00</td>
            </tr>
            <tr className="hover:bg-panel/30 border-b border-border/50">
              <td className="border-r border-border px-4 py-2 text-zinc-500 text-center">2</td>
              <td className="border-r border-border px-4 py-2 text-accent">uuid-2</td>
              <td className="border-r border-border px-4 py-2">Jane Smith</td>
              <td className="border-r border-border px-4 py-2">jane@example.com</td>
              <td className="px-4 py-2 text-zinc-400">2026-04-24 11:30:00</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="h-7 border-t border-border bg-sidebar flex items-center px-4 justify-between text-xs text-zinc-500">
        <div className="flex gap-4">
          <span>PostgreSQL 15.0</span>
          <span>leccor_db</span>
        </div>
        <div className="flex gap-4">
          <span>2 rows</span>
          <span>15ms</span>
        </div>
      </div>
    </div>
  );
}
