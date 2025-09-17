/**
 * Moduł MCP (Model Context Protocol)
 * 
 * Ten moduł zapewnia integracje z różnymi serwerami MCP w celu rozszerzenia
 * możliwości AI agentów o dodatkowe narzędzia i funkcjonalności.
 * 
 * Obsługiwane serwery MCP:
 * - Playwright - Automatyzacja przeglądarki
 * - Context Portal - Zarządzanie pamięcią kontekstową
 * - Memory Keeper - Trwała pamięć semantyczna
 * - GitHub (przyszłość) - Integracja z GitHub
 */

// Główny eksport managera MCP
export { MCPManager } from './manager';

// Eksport typów
export * from './types';

// Eksport serwerów MCP
export { PlaywrightMCPServer } from './browsers/playwright';
export { ContextPortalMCPServer } from './memory/context-portal';
export { MemoryKeeperMCPServer } from './memory/memory-keeper';

// Domyślne serwery MCP
export const defaultMCPServers = [
  {
    id: 'playwright',
    name: 'Playwright Browser Automation',
    description: 'Automatyzacja przeglądarki za pomocą Playwright',
    enabled: false
  },
  {
    id: 'context-portal', 
    name: 'Context Portal Memory',
    description: 'Zarządzanie pamięcią kontekstową',
    enabled: false
  },
  {
    id: 'memory-keeper',
    name: 'Memory Keeper',
    description: 'Trwała pamięć semantyczna',
    enabled: false
  }
];

// Eksport managerów serwerów
export {
  PlaywrightServerManager,
  ContextPortalServerManager,
  MemoryKeeperServerManager
} from './manager';

// Utility functions
import { MCPConfig } from './types';
import { MCPManager } from './manager';

/**
 * Tworzy domyślną konfigurację MCP
 */
export function createDefaultMCPConfig(options?: Partial<MCPConfig>): MCPConfig {
  return {
    playwright: {
      enabled: false,
      serverPath: 'npx',
      args: ['playwright-mcp-server'],
      timeout: 30000,
      logLevel: 'INFO',
      headless: true,
      slowMo: 0,
      devtools: false
    },
    contextPortal: {
      enabled: false,
      serverCommand: 'uvx',
      serverArgs: [
        '--from',
        'context-portal-mcp',
        'conport-mcp',
        '--mode',
        'stdio'
      ],
      timeout: 30000,
      logLevel: 'INFO',
      autoDetectWorkspace: true
    },
    memory: {
      enabled: false,
      serverCommand: 'npx',
      serverArgs: ['@mcp/memory-keeper'],
      timeout: 30000,
      logLevel: 'INFO',
      memoryProvider: 'mem0',
      persistentStorage: true
    },
    github: {
      enabled: false,
      serverPath: 'npx',
      args: ['@mcp/github'],
      timeout: 30000,
      logLevel: 'INFO'
    },
    ...options
  };
}

/**
 * Sprawdza czy konfiguracja MCP jest ważna
 */
export function validateMCPConfig(config: MCPConfig): boolean {
  try {
    // Sprawdz czy przynajmniej jeden serwer jest włączony
    const anyEnabled = Object.values(config).some(serverConfig => {
      if (typeof serverConfig === 'object' && serverConfig !== null) {
        return (serverConfig as any).enabled === true;
      }
      return false;
    });

    if (!anyEnabled) {
      console.warn('Brak włączonych serwerów MCP');
      return false;
    }

    // Sprawdź konfiguracje poszczególnych serwerów
    if (config.playwright?.enabled) {
      if (!config.playwright.serverPath || !config.playwright.args) {
        console.error('Nieprawidłowa konfiguracja Playwright MCP');
        return false;
      }
    }

    if (config.contextPortal?.enabled) {
      if (!config.contextPortal.serverCommand || !config.contextPortal.serverArgs) {
        console.error('Nieprawidłowa konfiguracja Context Portal MCP');
        return false;
      }
    }

    if (config.memory?.enabled) {
      if (!config.memory.serverCommand || !config.memory.serverArgs) {
        console.error('Nieprawidłowa konfiguracja Memory Keeper MCP');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Błąd walidacji konfiguracji MCP:', error);
    return false;
  }
}

/**
 * Pomocnicze funkcje do pracy z narzędziami MCP
 */
export const MCPUtils = {
  /**
   * Mapuje błąd na odpowiedź MCP Tool Result
   */
  createErrorResult: (error: Error | string) => ({
    content: [{
      type: 'text' as const,
      text: error instanceof Error ? error.message : error
    }],
    isError: true
  }),

  /**
   * Mapuje dane na odpowiedź MCP Tool Result
   */
  createSuccessResult: (data: any) => ({
    content: [{
      type: 'text' as const,
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    }],
    isError: false
  }),

  /**
   * Sprawdza czy narzędzie jest obsługiwane przez serwer
   */
  isToolSupported: (serverId: string, toolName: string): boolean => {
    const supportedTools: Record<string, string[]> = {
      'playwright': [
        'navigate', 'click', 'type', 'screenshot', 'get_text', 
        'execute_script', 'wait_for_element', 'close_page'
      ],
      'context-portal': [
        'get_product_context', 'update_product_context', 'get_active_context',
        'update_active_context', 'log_decision', 'get_decisions', 
        'search_decisions_fts', 'log_progress', 'get_progress',
        'log_system_pattern', 'get_system_patterns', 'log_custom_data',
        'get_custom_data', 'link_conport_items', 'get_linked_items'
      ],
      'memory-keeper': [
        'store_memory', 'search_memories', 'get_memory', 'update_memory',
        'delete_memory', 'list_memories', 'summarize_memories',
        'analyze_similarities', 'cluster_memories', 'export_memories',
        'import_memories', 'get_memory_stats', 'cleanup_memories'
      ]
    };

    return supportedTools[serverId]?.includes(toolName) || false;
  },

  /**
   * Parsuje URI zasobu MCP
   */
  parseResourceURI: (uri: string) => {
    try {
      const url = new URL(uri);
      return {
        protocol: url.protocol.slice(0, -1), // usuwa ':'
        host: url.host,
        path: url.pathname,
        params: Object.fromEntries(url.searchParams.entries())
      };
    } catch {
      return null;
    }
  },

  /**
   * Generuje unikalny ID dla żądań JSON-RPC
   */
  generateRequestId: (): string => {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Sprawdza timeout dla operacji MCP
   */
  withTimeout: async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout po ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  },

  /**
   * Retry logic dla operacji MCP
   */
  withRetry: async <T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3, 
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }
    
    throw lastError!;
  }
};

/**
 * Typy pomocnicze dla użytkowników modułu MCP
 */
export interface MCPModuleConfig {
  /** Ścieżka do workspace projektu */
  workspacePath?: string;
  /** Włącz tryb debug */
  debug?: boolean;
  /** Maksymalny czas oczekiwania na operacje */
  defaultTimeout?: number;
  /** Maksymalna liczba prób ponowienia */
  maxRetries?: number;
}

/**
 * Fabryka do tworzenia skonfigurowanego MCPManager
 */
export async function createMCPManager(
  config: Partial<MCPConfig> = {},
  moduleConfig: MCPModuleConfig = {}
): Promise<MCPManager> {
  const fullConfig = createDefaultMCPConfig(config);
  
  // Zastosuj konfiguracje modułu
  if (moduleConfig.workspacePath) {
    if (fullConfig.contextPortal) {
      fullConfig.contextPortal.workspaceId = moduleConfig.workspacePath;
    }
    if (fullConfig.memory) {
      fullConfig.memory.workspaceId = moduleConfig.workspacePath;
    }
  }
  
  if (moduleConfig.defaultTimeout) {
    Object.values(fullConfig).forEach(serverConfig => {
      if (typeof serverConfig === 'object' && serverConfig !== null) {
        (serverConfig as any).timeout = moduleConfig.defaultTimeout;
      }
    });
  }
  
  if (!validateMCPConfig(fullConfig)) {
    throw new Error('Nieprawidłowa konfiguracja MCP');
  }
  
  const manager = new MCPManager(fullConfig);
  await manager.initialize();
  
  return manager;
}

// Domyślny eksport
export default {
  MCPManager,
  createDefaultMCPConfig,
  validateMCPConfig,
  createMCPManager,
  MCPUtils,
  defaultMCPServers
};