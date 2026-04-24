/// <reference types="vite/client" />
/// <reference types="electron-vite/node" />

interface Window {
  api: {
    db: {
      getConnections: () => Promise<any[]>;
      saveConnection: (connection: any) => Promise<any>;
      deleteConnection: (id: string) => Promise<any>;
      getSetting: (key: string) => Promise<string | null>;
      saveSetting: (key: string, value: string) => Promise<any>;
      saveQueryHistory: (history: any) => Promise<any>;
      getQueryHistory: () => Promise<any[]>;
    };
    pg: {
      testConnection: (config: any) => Promise<{success: boolean, error?: string}>;
      getMetadata: (config: any) => Promise<{success: boolean, data?: any[], error?: string}>;
      executeQuery: (config: any, sql: string) => Promise<{success: boolean, data?: any, error?: string}>;
    };
    dialog: {
      openFile: () => Promise<string | null>;
    };
  };
}
