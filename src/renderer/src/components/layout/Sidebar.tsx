import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Database, Server, Plus, MoreVertical, Loader2 } from 'lucide-react';

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

export function Sidebar() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [expandedConns, setExpandedConns] = useState<Record<string, boolean>>({});
  const [metadataCache, setMetadataCache] = useState<Record<string, Schema[]>>({});
  const [loadingMetadata, setLoadingMetadata] = useState<Record<string, boolean>>({});

  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadConnections();
    // A simple event listener could be added here to reload connections when changed, 
    // but for simplicity we rely on manual reload or reopening the app for now
  }, []);

  const loadConnections = async () => {
    const data = await window.api.db.getConnections();
    setConnections(data);
  };

  const toggleConnection = async (conn: any) => {
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
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-panel cursor-pointer text-zinc-300"
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
                              <div key={table.name} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-panel cursor-pointer text-zinc-400 group">
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
    </div>
  );
}
