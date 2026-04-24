import { useMemo, useState, useEffect } from 'react';
import { Table, Terminal, History, Maximize2, AlertCircle, Save, X, Download, ChevronDown, Settings, Sigma, Edit, Plus, Copy, Trash2, Loader2 } from 'lucide-react';
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
  onRefresh?: () => void;
}

export function BottomPanel({ result, error, activeConnection, lastQuerySql, onRefresh }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<'grid' | 'messages' | 'history'>('grid');
  const [history, setHistory] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editedCells, setEditedCells] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  const [localRows, setLocalRows] = useState<any[]>([]);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
  const [addedRows, setAddedRows] = useState<Set<number>>(new Set());
  const [deletedRows, setDeletedRows] = useState<Set<number>>(new Set());
  
  const [editingRowModal, setEditingRowModal] = useState<number | null>(null);
  const [modalFormData, setModalFormData] = useState<Record<string, any>>({});
  const [isModalSaving, setIsModalSaving] = useState(false);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.export-menu-container')) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset edits when result changes
  useEffect(() => {
    setEditedCells({});
    setEditingCell(null);
    setLocalRows(result?.rows || []);
    setSelectedRowIdx(null);
    setAddedRows(new Set());
    setDeletedRows(new Set());
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
    data: localRows,
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
    const match = lastQuerySql.match(/FROM\s+([a-zA-Z0-9_.]+)/i);
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
        if (addedRows.has(rowIdx) || deletedRows.has(rowIdx)) continue;
        
        const rowEdits = editsByRow[rowIdx];
        const rowData = localRows[rowIdx];
        const idValue = rowData[idField.name];

        const setStatements = Object.entries(rowEdits).map(([col, val]) => {
          const formattedVal = isNaN(Number(val)) || val === '' ? `'${val}'` : val; 
          return `${col} = ${formattedVal}`;
        }).join(', ');

        const updateSql = `UPDATE ${tableName} SET ${setStatements} WHERE ${idField.name} = ${isNaN(Number(idValue)) ? `'${idValue}'` : idValue};`;
        await window.api.pg.executeQuery(activeConnection, updateSql);
      }

      // Handle INSERTS
      for (const rowIdx of addedRows) {
        if (deletedRows.has(rowIdx)) continue;
        const rowData = localRows[rowIdx];
        const rowEdits = editsByRow[rowIdx] || {};
        const finalData = { ...rowData, ...rowEdits };
        
        const cols: string[] = [];
        const vals: string[] = [];
        for (const f of result.fields) {
          let val = finalData[f.name];
          if (val !== null && val !== undefined && val !== '') {
            cols.push(f.name);
            vals.push(isNaN(Number(val)) ? `'${val}'` : val);
          }
        }
        if (cols.length > 0) {
          const insertSql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${vals.join(', ')});`;
          await window.api.pg.executeQuery(activeConnection, insertSql);
        }
      }

      // Handle DELETES
      for (const rowIdx of deletedRows) {
        if (addedRows.has(rowIdx)) continue;
        const rowData = localRows[rowIdx];
        const idValue = rowData[idField.name];
        if (idValue !== null && idValue !== undefined) {
          const deleteSql = `DELETE FROM ${tableName} WHERE ${idField.name} = ${isNaN(Number(idValue)) ? `'${idValue}'` : idValue};`;
          await window.api.pg.executeQuery(activeConnection, deleteSql);
        }
      }
      
      setEditedCells({});
      setAddedRows(new Set());
      setDeletedRows(new Set());
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

  const handleExport = (format: string) => {
    if (!result || !result.rows || result.rows.length === 0) {
      alert("No data to export");
      return;
    }

    let content = '';
    const fields = result.fields.map((f: any) => f.name);

    if (format === 'CSV') {
      content = fields.join(',') + '\n';
      content += result.rows.map((r: any) => 
        fields.map((f: string) => {
          let val = r[f];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
          return val;
        }).join(',')
      ).join('\n');
    } else if (format === 'JSON') {
      content = JSON.stringify(result.rows, null, 2);
    } else if (format === 'SQL') {
      const tableName = 'exported_table';
      content = result.rows.map((r: any) => {
        const values = fields.map((f: string) => {
          let val = r[f];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          return val;
        });
        return `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${values.join(', ')});`;
      }).join('\n');
    } else if (format === 'HTML') {
      content = `<table>\n  <thead>\n    <tr>${fields.map((f:string) => `<th>${f}</th>`).join('')}</tr>\n  </thead>\n  <tbody>\n`;
      content += result.rows.map((r: any) => 
        `    <tr>${fields.map((f:string) => `<td>${r[f] !== null && r[f] !== undefined ? r[f] : ''}</td>`).join('')}</tr>`
      ).join('\n');
      content += `\n  </tbody>\n</table>`;
    } else if (format === 'TXT') {
      content = fields.join('\t') + '\n';
      content += result.rows.map((r: any) => 
        fields.map((f: string) => r[f] !== null && r[f] !== undefined ? String(r[f]).replace(/\t/g, ' ') : '').join('\t')
      ).join('\n');
    }

    // Trigger native download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_${new Date().getTime()}.${format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [calculatingCount, setCalculatingCount] = useState(false);
  const handleCalculateCount = async () => {
    if (!lastQuerySql || !activeConnection) return;
    
    // Simple naive parser to extract the FROM clause. This is MVP level.
    const match = lastQuerySql.match(/FROM\s+([a-zA-Z0-9_.]+)/i);
    if (!match) {
      alert("Could not detect table name from query.");
      return;
    }
    const tableName = match[1];
    
    setCalculatingCount(true);
    try {
      const countSql = `SELECT count(*) as total FROM ${tableName};`;
      const res = await window.api.pg.executeQuery(activeConnection, countSql);
      if (res && res.rows && res.rows[0]) {
        alert(`Total rows in ${tableName}: ${res.rows[0].total}`);
      }
    } catch (e: any) {
      alert('Error calculating count: ' + e.message);
    } finally {
      setCalculatingCount(false);
    }
  };

  const handleEditCell = () => {
    if (selectedRowIdx === null) return;
    
    // Initialize modal form data with current row data + pending edits
    const rowData = localRows[selectedRowIdx];
    const rowEdits: Record<string, any> = {};
    Object.keys(editedCells).forEach(key => {
      const [rIdx, col] = key.split(':');
      if (parseInt(rIdx) === selectedRowIdx) {
        rowEdits[col] = editedCells[key];
      }
    });
    
    setModalFormData({ ...rowData, ...rowEdits });
    setEditingRowModal(selectedRowIdx);
  };

  const handleAddRow = () => {
    if (!result || !result.fields) return;
    const newRow: any = {};
    result.fields.forEach((f: any) => newRow[f.name] = null);
    
    setLocalRows(prev => {
      const next = [...prev, newRow];
      setAddedRows(prevSet => new Set(prevSet).add(next.length - 1));
      setSelectedRowIdx(next.length - 1);
      return next;
    });
  };

  const handleDuplicateRow = () => {
    if (selectedRowIdx === null) return;
    const newRow = { ...localRows[selectedRowIdx] };
    
    setLocalRows(prev => {
      const next = [...prev, newRow];
      setAddedRows(prevSet => new Set(prevSet).add(next.length - 1));
      setSelectedRowIdx(next.length - 1);
      return next;
    });
  };

  const handleDeleteRow = () => {
    if (selectedRowIdx === null) return;
    setDeletedRows(prev => {
      const next = new Set(prev);
      if (next.has(selectedRowIdx)) next.delete(selectedRowIdx);
      else next.add(selectedRowIdx);
      return next;
    });
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
          
          {lastQuerySql && (
            <div className="flex items-center ml-4 pl-4 border-l border-border/50 text-xs text-zinc-500 font-mono truncate max-w-[400px]" title={lastQuerySql}>
              <span className="truncate">{lastQuerySql.replace(/\n/g, ' ')}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pr-2">
          {(Object.keys(editedCells).length > 0 || addedRows.size > 0 || deletedRows.size > 0) && activeTab === 'grid' && (
            <>
              <button 
                onClick={() => {
                  setEditedCells({});
                  setAddedRows(new Set());
                  setDeletedRows(new Set());
                  setLocalRows(result?.rows || []);
                }}
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
                  {table.getRowModel().rows.map(row => {
                    const isDeleted = deletedRows.has(row.index);
                    const isAdded = addedRows.has(row.index);
                    const isSelected = selectedRowIdx === row.index;
                    
                    let rowClasses = "border-b transition-colors cursor-pointer ";
                    if (isSelected) rowClasses += "bg-accent/20 border-accent/50 ";
                    else if (isDeleted) rowClasses += "bg-red-500/10 border-red-500/30 line-through text-red-300/50 ";
                    else if (isAdded) rowClasses += "bg-green-500/10 border-green-500/30 ";
                    else rowClasses += "hover:bg-panel/50 border-border/50 ";

                    return (
                      <tr 
                        key={row.id} 
                        onClick={() => setSelectedRowIdx(row.index)}
                        className={rowClasses}
                      >
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="border-r border-border px-4 py-1.5 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
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

      <div className="h-8 border-t border-border bg-sidebar flex items-center px-4 justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-4">
          <span>{activeConnection?.driver || 'Nenhuma conexão'}</span>
          <span>{activeConnection?.database || ''}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab === 'grid' && (
            <div className="flex items-center gap-3 border-r border-border/50 pr-3">
              
              <div className="flex items-center gap-1 border-r border-border/50 pr-3">
                <button 
                  onClick={handleEditCell}
                  disabled={selectedRowIdx === null}
                  className="text-zinc-400 hover:text-blue-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors p-1 rounded hover:bg-panel" title="Edit cell"
                >
                  <Edit size={14} />
                </button>
                <button 
                  onClick={handleAddRow}
                  disabled={!result || !result.rows}
                  className="text-zinc-400 hover:text-green-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors p-1 rounded hover:bg-panel" title="Add row"
                >
                  <Plus size={14} />
                </button>
                <button 
                  onClick={handleDuplicateRow}
                  disabled={selectedRowIdx === null}
                  className="text-zinc-400 hover:text-blue-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors p-1 rounded hover:bg-panel" title="Duplicate row"
                >
                  <Copy size={14} />
                </button>
                <button 
                  onClick={handleDeleteRow}
                  disabled={selectedRowIdx === null}
                  className="text-zinc-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors p-1 rounded hover:bg-panel" title="Delete current row"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="relative export-menu-container">
                <button 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="flex items-center gap-1 hover:text-zinc-300 transition-colors py-1"
                >
                  <Download size={13} className="text-blue-400" />
                  <span>Export data</span>
                  <ChevronDown size={11} />
                </button>
                {isExportMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-1 bg-panel border border-border rounded shadow-lg py-1 w-32 z-50">
                    <div onClick={() => { handleExport('CSV'); setIsExportMenuOpen(false); }} className="px-3 py-1 hover:bg-accent/20 hover:text-white cursor-pointer">CSV</div>
                    <div onClick={() => { handleExport('JSON'); setIsExportMenuOpen(false); }} className="px-3 py-1 hover:bg-accent/20 hover:text-white cursor-pointer">JSON</div>
                    <div onClick={() => { handleExport('SQL'); setIsExportMenuOpen(false); }} className="px-3 py-1 hover:bg-accent/20 hover:text-white cursor-pointer">SQL</div>
                    <div onClick={() => { handleExport('HTML'); setIsExportMenuOpen(false); }} className="px-3 py-1 hover:bg-accent/20 hover:text-white cursor-pointer">HTML</div>
                    <div onClick={() => { handleExport('TXT'); setIsExportMenuOpen(false); }} className="px-3 py-1 hover:bg-accent/20 hover:text-white cursor-pointer">TXT</div>
                  </div>
                )}
              </div>
              
              <button className="hover:text-zinc-300 transition-colors" title="Settings">
                <Settings size={13} className="text-blue-400" />
              </button>
              
              <div className="flex items-center bg-background border border-border rounded">
                <input 
                  type="text" 
                  defaultValue="200" 
                  className="w-12 bg-transparent text-center outline-none text-zinc-300 text-xs py-0.5" 
                />
              </div>
              
              <button 
                onClick={handleCalculateCount}
                disabled={calculatingCount}
                className="hover:text-zinc-300 transition-colors disabled:opacity-50" 
                title="Calculate total row count"
              >
                <Sigma size={14} className={calculatingCount ? "text-zinc-500 animate-spin" : "text-blue-400"} />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-4 min-w-[120px] justify-end">
            {result && (
              <>
                <span>{result.rowCount} rows</span>
                <span>{result.timeMs}ms</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Row Modal */}
      {editingRowModal !== null && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-sidebar border border-border rounded-lg shadow-2xl w-[500px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Edit size={16} className="text-accent" />
                Edit Record Row #{editingRowModal + 1}
              </h3>
              <button onClick={() => setEditingRowModal(null)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3">
              {result.fields.map((f: any) => {
                const val = modalFormData[f.name];
                return (
                  <div key={f.name} className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-400 font-mono">{f.name}</label>
                    <input 
                      type="text"
                      className="bg-background border border-border rounded px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-accent font-mono"
                      value={val === null || val === undefined ? '' : String(val)}
                      onChange={(e) => setModalFormData({...modalFormData, [f.name]: e.target.value})}
                      placeholder={val === null || val === undefined ? 'NULL' : ''}
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-panel/50 rounded-b-lg">
              <button 
                onClick={() => setEditingRowModal(null)}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={isModalSaving}
                onClick={async () => {
                  const originalData = localRows[editingRowModal];
                  const updates: Record<string, any> = {};
                  let hasChanges = false;
                  
                  Object.keys(modalFormData).forEach(col => {
                    const newVal = modalFormData[col];
                    const originalVal = originalData[col];
                    // If changed compared to original
                    if (String(newVal) !== String(originalVal || '')) {
                      updates[col] = newVal;
                      hasChanges = true;
                    }
                  });
                  
                  if (!hasChanges) {
                    setEditingRowModal(null);
                    return;
                  }

                  const match = lastQuerySql.match(/FROM\s+([a-zA-Z0-9_.]+)/i);
                  if (!match) {
                    alert("Não foi possível detectar a tabela a partir da query para autossalvamento.");
                    setEditingRowModal(null);
                    return;
                  }
                  
                  const tableName = match[1];
                  const idField = result.fields.find((f: any) => f.name.toLowerCase() === 'id') || result.fields[0];
                  const idValue = originalData[idField.name];

                  const setStatements = Object.entries(updates).map(([col, val]) => {
                    const formattedVal = val === null ? 'NULL' : (isNaN(Number(val)) || val === '' ? `'${val}'` : val); 
                    return `${col} = ${formattedVal}`;
                  }).join(', ');

                  const updateSql = `UPDATE ${tableName} SET ${setStatements} WHERE ${idField.name} = ${isNaN(Number(idValue)) ? `'${idValue}'` : idValue};`;
                  
                  setIsModalSaving(true);
                  try {
                    await window.api.pg.executeQuery(activeConnection, updateSql);
                    if (onRefresh) onRefresh();
                  } catch (e: any) {
                    alert('Erro ao salvar edição: ' + e.message);
                  } finally {
                    setIsModalSaving(false);
                    setEditingRowModal(null);
                  }
                }}
                className="flex items-center gap-2 px-4 py-1.5 text-sm bg-accent hover:bg-accent/90 text-white rounded font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                {isModalSaving && <Loader2 size={14} className="animate-spin" />}
                {isModalSaving ? 'Saving...' : 'Apply Edit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
