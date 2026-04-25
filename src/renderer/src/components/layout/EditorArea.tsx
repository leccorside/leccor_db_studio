import { useState, useEffect, useRef } from 'react';
import { Play, Save, X, Database, Plus } from 'lucide-react';
import SimpleEditor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-sql';

interface Tab {
  id: string;
  name: string;
  content: string;
}

interface EditorAreaProps {
  onExecute: (sql: string) => void;
  isExecuting: boolean;
  activeConnection: any;
  externalSqlRequest?: { sql: string, ts: number } | null;
}

export function EditorArea({ onExecute, isExecuting, activeConnection, externalSqlRequest }: EditorAreaProps) {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', name: 'query_1.sql', content: 'SELECT * FROM users;' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [selectedSql, setSelectedSql] = useState<string>('');
  const [isSavedStatus, setIsSavedStatus] = useState(false);

  // Load saved tabs on mount
  useEffect(() => {
    window.api.db.getSetting('workspace_tabs').then(saved => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.tabs && parsed.tabs.length > 0) {
            setTabs(parsed.tabs);
            setActiveTabId(parsed.activeTabId || parsed.tabs[0].id);
          }
        } catch (e) {
          console.error("Failed to parse saved tabs", e);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (externalSqlRequest) {
      const newId = crypto.randomUUID();
      const newTab: Tab = {
        id: newId,
        name: `Generated_Query.sql`,
        content: externalSqlRequest.sql
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newId);
    }
  }, [externalSqlRequest]);

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
    if (value === undefined || !activeTabId) return;
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, content: value } : t));
  };

  const handleSelect = (e: any) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    if (start !== undefined && end !== undefined && start !== end) {
      setSelectedSql(e.target.value.substring(start, end));
    } else {
      setSelectedSql('');
    }
  };

  const handleRun = () => {
    if (!activeTab) return;
    
    let sqlToRun = activeTab.content;
    if (selectedSql.trim()) {
      sqlToRun = selectedSql;
    }
    
    if (sqlToRun.trim()) {
      onExecute(sqlToRun);
    }
  };

  const handleSave = async () => {
    try {
      await window.api.db.saveSetting('workspace_tabs', JSON.stringify({ tabs, activeTabId }));
      setIsSavedStatus(true);
      setTimeout(() => setIsSavedStatus(false), 2000);
    } catch (e) {
      console.error("Failed to save tabs", e);
    }
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
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleRun}
          disabled={!activeTab || isExecuting || !activeConnection}
          className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          {isExecuting ? <Database size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
          {isExecuting ? 'Running...' : 'Run'}
        </button>
        {isExecuting && (
          <button 
            onClick={() => {
              const apiGroup = activeConnection?.driver === 'mysql' ? window.api.mysql : window.api.pg;
              apiGroup.cancelQuery();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            <X size={14} />
            Cancel
          </button>
        )}
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-3 py-1.5 bg-panel hover:bg-panel/80 text-zinc-300 rounded-md text-sm font-medium transition-colors border border-border shadow-sm"
        >
          {isSavedStatus ? <Save size={14} className="text-green-400" /> : <Save size={14} />}
          {isSavedStatus ? 'Saved!' : 'Save'}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .leccor-simple-editor {
          font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
          font-size: 14px !important;
          min-height: 100% !important;
        }
        .leccor-simple-editor textarea {
          outline: none !important;
        }
        .token.keyword { color: #c678dd; font-weight: bold; }
        .token.string { color: #98c379; }
        .token.number { color: #d19a66; }
        .token.operator { color: #56b6c2; }
        .token.punctuation { color: #abb2bf; }
        .token.function { color: #61afef; }
        .token.boolean { color: #d19a66; }
      `}} />
      <div className="flex-1 bg-background overflow-auto p-4">
        {activeTab && (
          <SimpleEditor
            value={activeTab.content}
            onValueChange={handleEditorChange}
            onSelect={handleSelect}
            onKeyUp={handleSelect}
            onMouseUp={handleSelect}
            highlight={code => Prism.highlight(code, Prism.languages.sql, 'sql')}
            padding={0}
            className="leccor-simple-editor w-full text-zinc-300"
            textareaClassName="focus:outline-none focus:ring-0 selection:bg-accent/30"
          />
        )}
      </div>
    </div>
  );
}
