import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Database, Server, Plus, MoreVertical, Loader2, FileText, Code } from 'lucide-react';

interface SchemaItem {
  name: string;
  type: string;
}

interface Schema {
  name: string;
  tables: SchemaItem[];
}

interface Connection {
  id: string;
  name: string;
  driver: string;
  // ...outros campos omitidos por simplicidade
}

interface SidebarProps {
  activeConnectionId?: string;
  onConnectionSelect?: (conn: any) => void;
  onGenerateSql?: (sql: string) => void;
}

export function Sidebar({ activeConnectionId, onConnectionSelect, onGenerateSql }: SidebarProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [expandedConns, setExpandedConns] = useState<Record<string, boolean>>({});
  const [metadataCache, setMetadataCache] = useState<Record<string, Schema[]>>({});
  const [loadingMetadata, setLoadingMetadata] = useState<Record<string, boolean>>({});

  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({});
  
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    schema: string;
    table: string;
    connId: string;
  } | null>(null);

  useEffect(() => {
    loadConnections();
    
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const loadConnections = async () => {
    const data = await window.api.db.getConnections();
    setConnections(data);
  };

  const toggleConnection = async (conn: any) => {
    if (onConnectionSelect) onConnectionSelect(conn);
    
    const isExpanded = !!expandedConns[conn.id];
    setExpandedConns(prev => ({ ...prev, [conn.id]: !isExpanded }));

    if (!isExpanded && !metadataCache[conn.id]) {
      setLoadingMetadata(prev => ({ ...prev, [conn.id]: true }));
      const result = await window.api.pg.getMetadata(conn);
      if (result.success && result.data) {
        setMetadataCache(prev => ({ ...prev, [conn.id]: result.data! }));
      } else {
        console.error('Error fetching metadata', result.error);
      }
      setLoadingMetadata(prev => ({ ...prev, [conn.id]: false }));
    }
  };

  const toggleSchema = (connId: string, schemaName: string) => {
    const key = `${connId}-${schemaName}`;
    setExpandedSchemas(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleContextMenu = (e: React.MouseEvent, connId: string, schema: string, table: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      schema,
      table,
      connId
    });
  };

  const handleGenerateSelect = () => {
    if (!contextMenu || !onGenerateSql) return;
    const sql = `SELECT * FROM "${contextMenu.schema}"."${contextMenu.table}" LIMIT 100;`;
    onGenerateSql(sql);
  };

  const handleGenerateDDL = async () => {
    if (!contextMenu || !onGenerateSql) return;
    const conn = connections.find(c => c.id === contextMenu.connId);
    if (!conn) return;

    // A very basic DDL generator querying information_schema
    const sql = `
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_schema = '${contextMenu.schema}' AND table_name = '${contextMenu.table}'
ORDER BY ordinal_position;
    `;
    
    try {
      const res = await window.api.pg.executeQuery(conn, sql);
      if (res.success && res.data.rows) {
        const columns = res.data.rows.map((row: any) => {
          let type = row.data_type;
          if (row.character_maximum_length) type += `(${row.character_maximum_length})`;
          const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          return `  "${row.column_name}" ${type} ${nullable}`;
        });
        
        const ddl = `CREATE TABLE "${contextMenu.schema}"."${contextMenu.table}" (\n${columns.join(',\n')}\n);`;
        onGenerateSql(ddl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-64 bg-sidebar border-r border-border flex flex-col h-full">
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <span className="font-semibold text-sm uppercase tracking-wider text-zinc-300">Explorer</span>
        <div className="flex gap-2">
          <button onClick={loadConnections} className="text-zinc-400 hover:text-white transition-colors" title="Reload">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-2">
          {connections.map(conn => (
            <div key={conn.id}>
              <div 
                onClick={() => toggleConnection(conn)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-panel cursor-pointer ${activeConnectionId === conn.id ? 'bg-panel text-accent font-medium' : 'text-zinc-300'}`}
              >
                {expandedConns[conn.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Server size={14} className="text-accent" />
                <span className="text-sm truncate select-none">{conn.name}</span>
              </div>
              
              {expandedConns[conn.id] && (
                <div className="ml-6 pl-2 border-l border-border flex flex-col gap-1">
                  {loadingMetadata[conn.id] && (
                    <div className="flex items-center gap-2 px-2 py-1.5 text-zinc-500 text-sm">
                      <Loader2 size={12} className="animate-spin" /> Carregando...
                    </div>
                  )}
                  
                  {metadataCache[conn.id]?.map(schema => {
                    const schemaKey = `${conn.id}-${schema.name}`;
                    const isSchemaExpanded = !!expandedSchemas[schemaKey];
                    return (
                      <div key={schema.name}>
                        <div 
                          onClick={() => toggleSchema(conn.id, schema.name)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-panel cursor-pointer text-zinc-400"
                        >
                          {isSchemaExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <Database size={14} className="text-zinc-500" />
                          <span className="text-sm truncate select-none">{schema.name}</span>
                        </div>
                        
                        {isSchemaExpanded && (
                          <div className="ml-4 pl-2 border-l border-border mt-1 flex flex-col gap-1">
                            {schema.tables.map(table => (
                              <div 
                                key={table.name} 
                                onContextMenu={(e) => handleContextMenu(e, conn.id, schema.name, table.name)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-panel cursor-pointer text-zinc-400 group"
                              >
                                <span className="text-xs text-blue-400 font-mono opacity-80 group-hover:opacity-100">
                                  {table.type === 'VIEW' ? 'VIW' : 'TBL'}
                                </span>
                                <span className="text-sm truncate select-none group-hover:text-white">{table.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          
          {connections.length === 0 && (
            <div className="px-4 py-8 text-center text-zinc-500 text-sm">
              Nenhuma conexão configurada.
            </div>
          )}
        </div>
      </div>

      {contextMenu?.visible && (
        <div 
          className="fixed z-50 bg-panel border border-border rounded-md shadow-xl py-1 w-48 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-xs text-zinc-500 font-medium border-b border-border/50 mb-1 truncate">
            {contextMenu.schema}.{contextMenu.table}
          </div>
          <button 
            onClick={() => { handleGenerateSelect(); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 hover:bg-accent/20 hover:text-accent text-zinc-300 flex items-center gap-2 transition-colors"
          >
            <FileText size={14} /> SELECT Statement
          </button>
          <button 
            onClick={() => { handleGenerateDDL(); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 hover:bg-accent/20 hover:text-accent text-zinc-300 flex items-center gap-2 transition-colors"
          >
            <Code size={14} /> CREATE Statement
          </button>
        </div>
      )}
    </div>
  );
}
