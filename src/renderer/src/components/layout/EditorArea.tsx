import { useState, useRef, useEffect } from 'react';
import { Play, Save, X, Database, Plus } from 'lucide-react';
import Editor, { useMonaco } from '@monaco-editor/react';

interface Tab {
  id: string;
  name: string;
  content: string;
}

interface EditorAreaProps {
  onExecute: (sql: string) => void;
  isExecuting: boolean;
  activeConnection: any;
}

export function EditorArea({ onExecute, isExecuting, activeConnection }: EditorAreaProps) {
  const monaco = useMonaco();
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', name: 'query_1.sql', content: 'SELECT * FROM users;' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('leccor-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword.sql', foreground: 'c678dd' },
          { token: 'identifier.sql', foreground: 'e5c07b' },
          { token: 'string.sql', foreground: '98c379' },
          { token: 'number.sql', foreground: 'd19a66' },
        ],
        colors: {
          'editor.background': '#0a0a0c',
          'editor.lineHighlightBackground': '#ffffff0a',
          'editorLineNumber.foreground': '#4f4f59',
          'editorIndentGuide.background': '#27272a',
        }
      });
      monaco.editor.setTheme('leccor-dark');
    }
  }, [monaco]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const handleAddTab = () => {
    const newId = crypto.randomUUID();
    const newTab: Tab = {
      id: newId,
      name: `query_${tabs.length + 1}.sql`,
      content: ''
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== id);
    if (newTabs.length === 0) {
      // Create an empty tab if we closed the last one
      const newId = crypto.randomUUID();
      setTabs([{ id: newId, name: 'query_1.sql', content: '' }]);
      setActiveTabId(newId);
    } else if (id === activeTabId) {
      // Make the previous tab active
      const closedIndex = tabs.findIndex(t => t.id === id);
      const newActiveIndex = Math.max(0, closedIndex - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
      setTabs(newTabs);
    } else {
      setTabs(newTabs);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!value || !activeTabId) return;
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, content: value } : t));
  };

  return (
    <div className="flex-1 bg-background flex flex-col min-h-0">
      <div className="h-10 border-b border-border flex items-end px-2 gap-1 bg-sidebar overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <div 
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-x border-t rounded-t-lg cursor-pointer ${
              activeTabId === tab.id 
                ? 'bg-background border-border border-b-background -mb-[1px] relative z-10 text-white' 
                : 'bg-transparent border-transparent text-zinc-500 hover:bg-panel/50 hover:text-zinc-300'
            }`}
          >
            <Database size={14} className={activeTabId === tab.id ? "text-accent" : ""} />
            <span className="truncate max-w-[120px]">{tab.name}</span>
            <button 
              onClick={(e) => handleCloseTab(tab.id, e)}
              className="p-0.5 hover:bg-panel rounded text-zinc-400 hover:text-white ml-2 opacity-50 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button 
          onClick={handleAddTab}
          className="p-2 ml-1 text-zinc-500 hover:text-zinc-300 hover:bg-panel rounded-md mb-1"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex border-b border-border bg-panel/30 p-2 gap-2">
        <button 
          onClick={() => activeTab && onExecute(activeTab.content)}
          disabled={!activeTab || isExecuting || !activeConnection}
          className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          {isExecuting ? <Database size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
          {isExecuting ? 'Running...' : 'Run'}
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-panel hover:bg-panel/80 text-zinc-300 rounded-md text-sm font-medium transition-colors border border-border shadow-sm">
          <Save size={14} />
          Save
        </button>
      </div>

      <div className="flex-1 bg-background relative py-2">
        {activeTab && (
          <Editor
            height="100%"
            language="sql"
            theme="leccor-dark"
            value={activeTab.content}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              roundedSelection: false,
              renderLineHighlight: "all",
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
