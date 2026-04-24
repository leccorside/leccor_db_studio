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
    };
    pg: {
      testConnection: (config: any) => Promise<{success: boolean, error?: string}>;
    };
  };
}
