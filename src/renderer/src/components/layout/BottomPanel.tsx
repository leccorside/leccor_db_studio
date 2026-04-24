import { useMemo, useState, useEffect } from 'react';
import { Table, Terminal, History, Maximize2, AlertCircle, Save, X } from 'lucide-react';
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
  lastQuerySql: string;
}

export function BottomPanel({ result, error, activeConnection, lastQuerySql }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<'grid' | 'messages' | 'history'>('grid');
  const [history, setHistory] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editedCells, setEditedCells] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset edits when result changes
  useEffect(() => {
    setEditedCells({});
    setEditingCell(null);
  }, [result]);

  useEffect(() => {
    if (activeTab === 'history') {
      window.api.db.getQueryHistory().then(setHistory);
    }
  }, [activeTab, result]); // reload history when tab opens or a new result comes in

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
            const rowIdx = info.row.index;
            const colId = f.name;
            const isEditing = editingCell?.row === rowIdx && editingCell?.col === colId;
            const editKey = `${rowIdx}:${colId}`;
            const isModified = editKey in editedCells;
            const initialVal = info.getValue();
            const val = isModified ? editedCells[editKey] : initialVal;

            if (isEditing) {
              return (
                <input
                  autoFocus
                  className="bg-panel border border-accent rounded px-1 w-full text-white outline-none"
                  defaultValue={val === null ? '' : val}
                  onBlur={(e) => {
                    setEditingCell(null);
                    if (e.target.value !== String(initialVal || '')) {
                      setEditedCells(prev => ({ ...prev, [editKey]: e.target.value }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingCell(null);
                      if (e.currentTarget.value !== String(initialVal || '')) {
                        setEditedCells(prev => ({ ...prev, [editKey]: e.currentTarget.value }));
                      }
                    }
                    if (e.key === 'Escape') setEditingCell(null);
                  }}
                />
              );
            }

            let displayContent;
            if (val === null) displayContent = <span className="text-zinc-500 italic">null</span>;
            else if (typeof val === 'boolean') displayContent = <span className="text-orange-300">{val ? 'true' : 'false'}</span>;
            else if (typeof val === 'number') displayContent = <span className="text-blue-300">{val}</span>;
            else displayContent = <span className="text-zinc-300">{String(val)}</span>;

            return (
              <div 
                className={`w-full h-full cursor-text ${isModified ? 'bg-orange-500/20 text-orange-200 px-1 rounded' : ''}`}
                onDoubleClick={() => setEditingCell({ row: rowIdx, col: colId })}
              >
                {displayContent}
              </div>
            );
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

  const handleSaveChanges = async () => {
    if (!lastQuerySql) return;
    
    // Extract table name from query
    const match = lastQuerySql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    if (!match) {
      alert("Não foi possível detectar a tabela a partir da query.");
      return;
    }
    const tableName = match[1];

    // Find PK field (assume 'id' or first column)
    const idField = result.fields.find((f: any) => f.name.toLowerCase() === 'id') 
      || result.fields[0];
    
    if (!idField) return;

    setIsSaving(true);
    
    try {
      // Group edits by row
      const editsByRow: Record<number, Record<string, any>> = {};
      Object.entries(editedCells).forEach(([key, val]) => {
        const [rowStr, col] = key.split(':');
        const row = parseInt(rowStr);
        if (!editsByRow[row]) editsByRow[row] = {};
        editsByRow[row][col] = val;
      });

      // Generate and execute updates
      for (const rowIdxStr of Object.keys(editsByRow)) {
        const rowIdx = parseInt(rowIdxStr);
        const rowEdits = editsByRow[rowIdx];
        const rowData = result.rows[rowIdx];
        const idValue = rowData[idField.name];

        const setStatements = Object.entries(rowEdits).map(([col, val]) => {
          // simple formatting, a real ORM would use parameterization
          const formattedVal = isNaN(Number(val)) ? `'${val}'` : val; 
          return `${col} = ${formattedVal}`;
        }).join(', ');

        const updateSql = `UPDATE ${tableName} SET ${setStatements} WHERE ${idField.name} = ${isNaN(Number(idValue)) ? `'${idValue}'` : idValue};`;
        
        await window.api.pg.executeQuery(activeConnection, updateSql);
      }
      
      setEditedCells({});
      // Idealy we would refresh the query here, but for MVP we just clear the orange highlights
      // To properly refresh we'd need App.tsx to pass a refresh function. 
      // We will leave the edited values in local state or show a success message.
      alert('Alterações salvas com sucesso! Execute a query novamente para atualizar a tabela.');
      
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

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
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 h-full text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-accent border-b-2 border-accent' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <History size={14} />
            History
          </button>
        </div>
        <div className="flex items-center gap-2 pr-2">
          {Object.keys(editedCells).length > 0 && activeTab === 'grid' && (
            <>
              <button 
                onClick={() => setEditedCells({})}
                className="text-zinc-400 hover:text-white px-2 py-1 text-xs rounded hover:bg-panel transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white px-3 py-1 text-xs font-medium rounded shadow-sm disabled:opacity-50 transition-colors"
              >
                <Save size={12} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
          <button className="text-zinc-400 hover:text-white p-1.5 rounded-md hover:bg-panel transition-colors">
            <Maximize2 size={14} />
          </button>
        </div>
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

        {activeTab === 'history' && (
          <div className="min-w-full">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-zinc-400 uppercase bg-panel/50 sticky top-0 z-10 shadow-sm backdrop-blur-md">
                <tr>
                  <th className="border-r border-b border-border px-4 py-2 font-medium w-32">Data/Hora</th>
                  <th className="border-r border-b border-border px-4 py-2 font-medium w-32">Status</th>
                  <th className="border-r border-b border-border px-4 py-2 font-medium">Query</th>
                  <th className="border-b border-border px-4 py-2 font-medium w-24">Duração</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-zinc-500">Nenhum histórico encontrado.</td>
                  </tr>
                ) : history.map(h => (
                  <tr key={h.id} className="hover:bg-panel/50 border-b border-border/50 transition-colors">
                    <td className="border-r border-border px-4 py-2 whitespace-nowrap text-zinc-400">
                      {new Date(h.created_at + 'Z').toLocaleString()}
                    </td>
                    <td className="border-r border-border px-4 py-2 whitespace-nowrap">
                      {h.success ? (
                        <span className="text-green-400">Sucesso</span>
                      ) : (
                        <span className="text-red-400" title={h.error_message}>Falha</span>
                      )}
                    </td>
                    <td className="border-r border-border px-4 py-2 text-zinc-300 truncate max-w-lg" title={h.sql}>
                      {h.sql}
                    </td>
                    <td className="border-border px-4 py-2 whitespace-nowrap text-zinc-400">
                      {h.execution_time_ms}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
