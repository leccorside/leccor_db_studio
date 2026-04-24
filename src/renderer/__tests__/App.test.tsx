import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';

// Mock monaco editor since it requires a real DOM/browser environment
vi.mock('@monaco-editor/react', () => {
  return {
    default: () => <div data-testid="mock-monaco-editor" />,
    useMonaco: () => ({
      editor: {
        defineTheme: vi.fn(),
        setTheme: vi.fn()
      }
    })
  }
});

describe('App React Components', () => {
  beforeEach(() => {
    // Mock the global electron API bridge
    (window as any).api = {
      db: {
        getConnections: vi.fn().mockResolvedValue([
          { id: '1', name: 'Dev DB', driver: 'postgres' }
        ]),
        saveQueryHistory: vi.fn(),
        getQueryHistory: vi.fn().mockResolvedValue([])
      },
      pg: {
        getMetadata: vi.fn().mockResolvedValue({ success: true, data: [] }),
        executeQuery: vi.fn().mockResolvedValue({ success: true, data: { rows: [], fields: [], timeMs: 10 } })
      }
    };
  });

  it('renders main shell components', () => {
    render(<App />);
    
    // Activity bar should have the database icon
    expect(screen.getByTitle('Gerenciador de Conexões')).toBeDefined();
    
    // Sidebar should have 'Explorer' title
    expect(screen.getByText('Explorer')).toBeDefined();
    
    // Editor Area should have a Run button
    expect(screen.getByText(/Run/i)).toBeDefined();
    
    // Bottom Panel should have tabs
    expect(screen.getByText('Messages')).toBeDefined();
    expect(screen.getByText('History')).toBeDefined();
  });

  it('opens connection manager when ActivityBar button is clicked', () => {
    render(<App />);
    
    const connectionsBtn = screen.getByTitle('Gerenciador de Conexões');
    fireEvent.click(connectionsBtn);
    
    // ConnectionManager should appear with "Nova Conexão" button
    expect(screen.getByText('Nova Conexão', { selector: 'button' })).toBeDefined();
  });
});
