import { useMemo, useState } from 'react';
import { Table, Terminal, History, Maximize2, AlertCircle } from 'lucide-react';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper 
} from '@tanstack/react-table';

interface BottomPanelProps {
  result: any;
  error: string | null;
  activeConnection: any;
}

export function BottomPanel({ result, error, activeConnection }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<'grid' | 'messages'>('grid');

  const columns = useMemo(() => {
    if (!result || !result.fields) return [];
    
    const helper = createColumnHelper<any>();
    
    // Auto-generate columns based on fields returned by Postgres
    return [
      helper.display({
        id: 'index',
        header: '#',
        cell: info => <span className="text-zinc-500 text-center block">{info.row.index + 1}</span>,
        size: 50,
      }),
      ...result.fields.map((f: any) => 
        helper.accessor(f.name, {
          header: f.name,
          cell: info => {
            const val = info.getValue();
            if (val === null) return <span className="text-zinc-500 italic">null</span>;
            if (typeof val === 'boolean') return <span className="text-orange-300">{val ? 'true' : 'false'}</span>;
            if (typeof val === 'number') return <span className="text-blue-300">{val}</span>;
            return <span className="text-zinc-300">{String(val)}</span>;
          }
        })
      )
    ];
  }, [result]);

  const table = useReactTable({
    data: result?.rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Switch to messages tab on error
  useMemo(() => {
    if (error) setActiveTab('messages');
    else if (result) setActiveTab('grid');
  }, [error, result]);

  return (
    <div className="h-72 border-t border-border bg-panel flex flex-col shrink-0">
      <div className="flex items-center justify-between px-2 h-10 border-b border-border bg-sidebar">
        <div className="flex h-full gap-1">
          <button 
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-2 px-4 h-full text-sm font-medium transition-colors ${activeTab === 'grid' ? 'text-accent border-b-2 border-accent' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Table size={14} />
            Data Grid
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 h-full text-sm font-medium transition-colors ${activeTab === 'messages' ? 'text-accent border-b-2 border-accent' : 'text-zinc-400 hover:text-zinc-200'} ${error ? 'text-red-400' : ''}`}
          >
            {error ? <AlertCircle size={14} /> : <Terminal size={14} />}
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

      <div className="flex-1 overflow-auto bg-background/50 relative">
        {activeTab === 'grid' && (
          <div className="absolute min-w-full">
            {!result && !error && (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm mt-10">
                Nenhuma query executada.
              </div>
            )}
            
            {result && result.rows && (
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-zinc-400 uppercase bg-panel/50 sticky top-0 z-10 shadow-sm backdrop-blur-md">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="border-r border-b border-border px-4 py-2 font-medium whitespace-nowrap">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="font-mono text-sm">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-panel/50 border-b border-border/50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="border-r border-border px-4 py-1.5 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="p-4 font-mono text-sm">
            {error ? (
              <div className="text-red-400 whitespace-pre-wrap">{error}</div>
            ) : result ? (
              <div className="text-green-400">
                Query executed successfully.
                <br />
                {result.command} - {result.rowCount} row(s) affected.
              </div>
            ) : (
              <div className="text-zinc-500">No messages.</div>
            )}
          </div>
        )}
      </div>

      <div className="h-7 border-t border-border bg-sidebar flex items-center px-4 justify-between text-xs text-zinc-500">
        <div className="flex gap-4">
          <span>{activeConnection?.driver || 'Nenhuma conexão'}</span>
          <span>{activeConnection?.database || ''}</span>
        </div>
        <div className="flex gap-4">
          {result && (
            <>
              <span>{result.rowCount} rows</span>
              <span>{result.timeMs}ms</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
