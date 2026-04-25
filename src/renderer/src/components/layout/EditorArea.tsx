import { useState, useEffect, useRef } from 'react';
import { Play, Save, X, Database, Plus } from 'lucide-react';
import SimpleEditor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-sql';
import getCaretCoordinates from 'textarea-caret';

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

const getWordUnderCursor = (text: string, pos: number) => {
  let start = pos;
  while (start > 0 && /[a-zA-Z0-9_.]/.test(text[start - 1])) {
    start--;
  }
  let end = pos;
  while (end < text.length && /[a-zA-Z0-9_.]/.test(text[end])) {
    end++;
  }
  return { word: text.slice(start, end), start, end };
};

const getCurrentQueryAtCursor = (text: string, pos: number) => {
  if (!text.trim()) return '';

  if (pos > 0 && text[pos - 1] === ';') {
    pos--;
  }

  let start = pos;
  while (start > 0 && text[start - 1] !== ';') {
    start--;
  }

  let end = pos;
  while (end < text.length && text[end] !== ';') {
    end++;
  }

  if (end < text.length && text[end] === ';') {
    end++;
  }

  return text.slice(start, end).trim() || text.trim();
};

export function EditorArea({ onExecute, isExecuting, activeConnection, externalSqlRequest }: EditorAreaProps) {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', name: 'query_1.sql', content: 'SELECT * FROM users;' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [selectedSql, setSelectedSql] = useState<string>('');
  const [isSavedStatus, setIsSavedStatus] = useState(false);

  // Autocomplete state
  const [tableNames, setTableNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [popupCoords, setPopupCoords] = useState({ top: 0, left: 0 });
  const [wordInfo, setWordInfo] = useState<{word: string, start: number, end: number, debug?: string} | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch tables for autocomplete
  useEffect(() => {
    if (activeConnection) {
      const apiGroup = activeConnection.driver === 'mysql' ? window.api.mysql : window.api.pg;
      apiGroup.getMetadata(activeConnection).then((res: any) => {
        if (res.success && res.data) {
          const names = res.data.flatMap((s: any) => s.tables.map((t: any) => t.name));
          setTableNames(names);
        }
      });
    } else {
      setTableNames([]);
    }
  }, [activeConnection]);

  // Load saved tabs when connection changes
  useEffect(() => {
    if (!activeConnection) {
      const newId = crypto.randomUUID();
      setTabs([{ id: newId, name: 'query_1.sql', content: '' }]);
      setActiveTabId(newId);
      return;
    }

    const settingKey = `workspace_tabs_${activeConnection.id}`;
    window.api.db.getSetting(settingKey).then(saved => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.tabs && parsed.tabs.length > 0) {
            setTabs(parsed.tabs);
            setActiveTabId(parsed.activeTabId || parsed.tabs[0].id);
          } else {
            const newId = crypto.randomUUID();
            setTabs([{ id: newId, name: 'query_1.sql', content: '' }]);
            setActiveTabId(newId);
          }
        } catch (e) {
          console.error("Failed to parse saved tabs", e);
        }
      } else {
        const newId = crypto.randomUUID();
        setTabs([{ id: newId, name: 'query_1.sql', content: '' }]);
        setActiveTabId(newId);
      }
    });
  }, [activeConnection?.id]);

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
      const newId = crypto.randomUUID();
      setTabs([{ id: newId, name: 'query_1.sql', content: '' }]);
      setActiveTabId(newId);
    } else if (id === activeTabId) {
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
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: value } : t));
  };

  const checkAutocomplete = () => {
    if (!wrapperRef.current) {
      setWordInfo({ word: 'NO_WRAPPER', start: 0, end: 0 });
      return;
    }
    const textarea = wrapperRef.current.querySelector('textarea');
    if (!textarea) {
      setWordInfo({ word: 'NO_TEXTAREA', start: 0, end: 0 });
      return;
    }
    
    const value = textarea.value;
    const pos = textarea.selectionStart;
    
    if (typeof pos !== 'number') {
      setWordInfo({ word: 'NO_POS', start: 0, end: 0 });
      return;
    }

    const { word, start, end } = getWordUnderCursor(value, pos);
    
    // Always set debug info
    setWordInfo({ word: word || 'EMPTY', start, end, debug: `P:${pos} L:${value.length}` });

    // Only suggest if we typed at least 2 characters and there's a match
    if (word.length >= 2) {
      const matched = tableNames.filter(t => t.toLowerCase().includes(word.toLowerCase()));
      // If we have matches, and it's not an exact full match already
      if (matched.length > 0 && matched[0].toLowerCase() !== word.toLowerCase()) {
        try {
          const coords = getCaretCoordinates(textarea, pos);
          setPopupCoords({ top: coords.top + coords.height + 4, left: coords.left });
          setSuggestions(matched.slice(0, 50)); // max 50 suggestions
          setSuggestionIndex(0);
          return;
        } catch (e) {
           setWordInfo({ word: 'ERR_COORDS', start, end });
        }
      }
    }
    setSuggestions([]);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
      return;
    }

    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[suggestionIndex]);
      } else if (e.key === 'Escape') {
        setSuggestions([]);
      }
    }
  };

  const applySuggestion = (suggestion: string) => {
    if (!activeTab || !wordInfo) return;
    const before = activeTab.content.substring(0, wordInfo.start);
    const after = activeTab.content.substring(wordInfo.end);
    const newContent = before + suggestion + after;
    
    handleEditorChange(newContent);
    setSuggestions([]);
    
    setTimeout(() => {
      const textarea = document.querySelector('.leccor-simple-editor textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        const newPos = wordInfo.start + suggestion.length;
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleRun = () => {
    if (!activeTab || isExecuting || !activeConnection) return;
    let sqlToRun = activeTab.content;
    
    if (selectedSql.trim()) {
      sqlToRun = selectedSql;
    } else {
      const textarea = wrapperRef.current?.querySelector('textarea');
      if (textarea) {
        sqlToRun = getCurrentQueryAtCursor(activeTab.content, textarea.selectionStart);
      }
    }

    if (sqlToRun.trim()) {
      onExecute(sqlToRun);
      setSuggestions([]);
    }
  };

  const handleSave = async () => {
    if (!activeConnection) return;
    try {
      const settingKey = `workspace_tabs_${activeConnection.id}`;
      await window.api.db.saveSetting(settingKey, JSON.stringify({ tabs, activeTabId }));
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
        <div className="flex items-center gap-2 text-xs text-zinc-500 ml-auto font-mono">
          <span>T: {tableNames.length}</span>
          <span>|</span>
          <span>W: {wordInfo?.word || 'none'}</span>
          <span>|</span>
          <span>D: {wordInfo?.debug || 'none'}</span>
          <span>|</span>
          <span>S: {suggestions.length}</span>
        </div>
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
      <div className="flex-1 bg-background overflow-auto p-4 relative" onClick={() => setSuggestions([])}>
        {activeTab && (
          <div className="relative w-full h-full" ref={wrapperRef}>
            <SimpleEditor
              value={activeTab.content}
              onValueChange={(val) => {
                handleEditorChange(val);
                setTimeout(checkAutocomplete, 50);
              }}
              onSelect={handleSelect}
              onKeyUp={(e) => {
                handleSelect(e);
                setTimeout(checkAutocomplete, 50);
              }}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              highlight={code => Prism.highlight(code, Prism.languages.sql, 'sql')}
              padding={0}
              className="leccor-simple-editor w-full text-zinc-300"
              textareaClassName="focus:outline-none focus:ring-0 selection:bg-accent/30"
            />
            
            {suggestions.length > 0 && (
              <div 
                className="absolute z-50 bg-panel border border-border rounded-md shadow-xl overflow-hidden text-sm"
                style={{ 
                  top: popupCoords.top, 
                  left: popupCoords.left,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  minWidth: '220px'
                }}
              >
                {suggestions.map((sug, i) => (
                  <div 
                    key={sug}
                    className={`px-3 py-1.5 cursor-pointer flex items-center gap-2 ${i === suggestionIndex ? 'bg-accent text-white' : 'text-zinc-300 hover:bg-white/5'}`}
                    onMouseDown={(e) => {
                      // use onMouseDown to prevent input blur before applySuggestion runs
                      e.preventDefault(); 
                      applySuggestion(sug);
                    }}
                  >
                    <Database size={12} className="opacity-50" />
                    <span>{sug}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
