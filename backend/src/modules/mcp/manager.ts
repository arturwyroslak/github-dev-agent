import { EventEmitter } from 'events';
import { Logger } from '../../utils/logger';
import { 
  MCPConfig,
  MCPServerManager,
  MCPServerStatus,
  MCPToolCall,
  MCPToolResult,
  MCPResourceContent,
  MCPPromptResult,
  MCPServerEvents
} from './types';

// Import serwerów MCP
import { PlaywrightMCPServer } from './browsers/playwright';
import { ContextPortalMCPServer } from './memory/context-portal';
import { MemoryKeeperMCPServer } from './memory/memory-keeper';

/**
 * Główny menedżer serverów MCP
 * Zarządza cyklem życia i komunikacją z różnymi serverami MCP
 */
export class MCPManager extends EventEmitter {
  private servers: Map<string, MCPServerManager> = new Map();
  private config: MCPConfig;
  private logger: Logger;
  private isInitialized = false;

  constructor(config: MCPConfig) {
    super();
    this.config = config;
    this.logger = new Logger('MCPManager');
  }

  /**
   * Inicjalizuje wszystkie skonfigurowane serwery MCP
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('MCP Manager jest już zainicjalizowany');
      return;
    }

    this.logger.info('Inicjalizowanie MCP Manager...');

    try {
      // Inicjalizuj serwer Playwright jeśli skonfigurowany
      if (this.config.playwright?.enabled) {
        const playwrightServer = new PlaywrightMCPServer(this.config.playwright);
        const manager = new PlaywrightServerManager('playwright', playwrightServer);
        this.servers.set('playwright', manager);
        this.setupServerEventHandlers('playwright', manager);
      }

      // Inicjalizuj serwer Context Portal jeśli skonfigurowany
      if (this.config.contextPortal?.enabled) {
        const contextPortalServer = new ContextPortalMCPServer(
          this.config.contextPortal,
          this.config.contextPortal.workspaceId
        );
        const manager = new ContextPortalServerManager('context-portal', contextPortalServer);
        this.servers.set('context-portal', manager);
        this.setupServerEventHandlers('context-portal', manager);
      }

      // Inicjalizuj serwer Memory Keeper jeśli skonfigurowany
      if (this.config.memory?.enabled) {
        const memoryServer = new MemoryKeeperMCPServer(
          this.config.memory,
          this.config.memory.workspaceId
        );
        const manager = new MemoryKeeperServerManager('memory-keeper', memoryServer);
        this.servers.set('memory-keeper', manager);
        this.setupServerEventHandlers('memory-keeper', manager);
      }

      // Inicjalizuj dodatkowe niestandardowe serwery
      if (this.config.servers) {
        for (const [serverId, serverConfig] of Object.entries(this.config.servers)) {
          if (serverConfig.enabled) {
            // Tu można dodać obsługę niestandardowych serwerów
            this.logger.info(`Pominięto niestandardowy serwer: ${serverId} (nie zaimplementowano)`);
          }
        }
      }

      this.isInitialized = true;
      this.logger.info(`MCP Manager zainicjalizowany z ${this.servers.size} serverami`);
      this.emit('manager:initialized', this.getServerStatuses());
      
    } catch (error) {
      this.logger.error('Błąd inicjalizacji MCP Manager:', error);
      throw error;
    }
  }

  /**
   * Uruchamia wszystkie skonfigurowane serwery
   */
  async startAll(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MCP Manager nie jest zainicjalizowany');
    }

    this.logger.info('Uruchamianie wszystkich serwerów MCP...');
    const startPromises = Array.from(this.servers.values()).map(server => 
      server.start().catch(error => {
        this.logger.error(`Błąd uruchomienia serwera ${server.serverId}:`, error);
        throw error;
      })
    );

    await Promise.allSettled(startPromises);
    this.logger.info('Wszystkie serwery MCP uruchomione');
  }

  /**
   * Zatrzymuje wszystkie serwery
   */
  async stopAll(): Promise<void> {
    this.logger.info('Zatrzymywanie wszystkich serwerów MCP...');
    
    const stopPromises = Array.from(this.servers.values()).map(server => 
      server.stop().catch(error => {
        this.logger.error(`Błąd zatrzymania serwera ${server.serverId}:`, error);
      })
    );

    await Promise.allSettled(stopPromises);
    this.logger.info('Wszystkie serwery MCP zatrzymane');
  }

  /**
   * Zatrzymuje wszystkie serwery i czyści zasoby
   */
  async shutdown(): Promise<void> {
    this.logger.info('Rozpoczynanie shutdown MCP Manager...');
    
    try {
      await this.stopAll();
      this.servers.clear();
      this.isInitialized = false;
      this.emit('manager:shutdown');
      this.logger.info('MCP Manager został zamknięty');
    } catch (error) {
      this.logger.error('Błąd podczas shutdown MCP Manager:', error);
      throw error;
    }
  }
  async startServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Serwer ${serverId} nie istnieje`);
    }

    await server.start();
  }

  /**
   * Zatrzymuje konkretny serwer
   */
  async stopServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Serwer ${serverId} nie istnieje`);
    }

    await server.stop();
  }

  /**
   * Restartuje konkretny serwer
   */
  async restartServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Serwer ${serverId} nie istnieje`);
    }

    await server.restart();
  }

  /**
   * Wywołuje narzędzie na konkretnym serwerze
   */
  async callTool(serverId: string, toolCall: MCPToolCall): Promise<MCPToolResult> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Serwer ${serverId} nie istnieje`);
    }

    return server.callTool(toolCall);
  }

  /**
   * Pobiera zasób z konkretnego serwera
   */
  async getResource(serverId: string, uri: string): Promise<MCPResourceContent> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Serwer ${serverId} nie istnieje`);
    }

    return server.getResource(uri);
  }

  /**
   * Pobiera prompt z konkretnego serwera
   */
  async getPrompt(serverId: string, name: string, args?: Record<string, any>): Promise<MCPPromptResult> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Serwer ${serverId} nie istnieje`);
    }

    return server.getPrompt(name, args);
  }

  /**
   * Pobiera status konkretnego serwera
   */
  getServerStatus(serverId: string): MCPServerStatus | null {
    const server = this.servers.get(serverId);
    return server ? server.getStatus() : null;
  }

  /**
   * Pobiera statusy wszystkich serwerów
   */
  getServerStatuses(): MCPServerStatus[] {
    return Array.from(this.servers.values()).map(server => server.getStatus());
  }

  /**
   * Sprawdza czy konkretny serwer jest zdrowy
   */
  async isServerHealthy(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }

    return server.isHealthy();
  }

  /**
   * Sprawdza czy wszystkie serwery są zdrowe
   */
  async areAllServersHealthy(): Promise<boolean> {
    const healthChecks = await Promise.allSettled(
      Array.from(this.servers.values()).map(server => server.isHealthy())
    );

    return healthChecks.every(result => 
      result.status === 'fulfilled' && result.value === true
    );
  }

  /**
   * Pobiera listę ID dostępnych serwerów
   */
  getAvailableServers(): string[] {
    return Array.from(this.servers.keys());
  }

  /**
   * Sprawdza czy serwer istnieje
   */
  hasServer(serverId: string): boolean {
    return this.servers.has(serverId);
  }

  /**
   * Pobiera serwer (używaj ostrożnie - narusza enkapsulację)
   */
  getServer<T extends MCPServerManager>(serverId: string): T | null {
    return (this.servers.get(serverId) as T) || null;
  }

  private setupServerEventHandlers(serverId: string, server: MCPServerManager): void {
    // Przekazuj eventy serwera na poziom managera
    ['started', 'stopped', 'error', 'stdout', 'stderr'].forEach(event => {
      (server as any).on(event, (...args: any[]) => {
        this.emit(`server:${event}`, serverId, ...args);
      });
    });
  }
}

/**
 * Abstrakcyjna klasa bazowa dla managerów serwerów MCP
 */
abstract class BaseMCPServerManager extends EventEmitter implements MCPServerManager {
  protected server: any;
  public readonly serverId: string;
  protected logger: Logger;

  constructor(serverId: string, server: any) {
    super();
    this.serverId = serverId;
    this.server = server;
    this.logger = new Logger(`MCPManager:${serverId}`);
    
    // Przekazuj eventy z serwera
    this.server.on('stdout', (data: string) => this.emit('stdout', data));
    this.server.on('stderr', (data: string) => this.emit('stderr', data));
    this.server.on('error', (error: Error) => this.emit('error', error));
    this.server.on('exit', () => this.emit('stopped'));
  }

  async start(): Promise<void> {
    try {
      await this.server.start();
      this.emit('started');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.server.stop();
      this.emit('stopped');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  getStatus(): MCPServerStatus {
    const baseStatus = this.server.getStatus();
    return {
      serverId: this.serverId,
      ...baseStatus
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const status = this.getStatus();
      return status.isRunning && status.hasProcess;
    } catch {
      return false;
    }
  }

  abstract callTool(toolCall: MCPToolCall): Promise<MCPToolResult>;
  abstract getResource(uri: string): Promise<MCPResourceContent>;
  abstract getPrompt(name: string, args?: Record<string, any>): Promise<MCPPromptResult>;
}

/**
 * Manager dla serwera Playwright MCP
 */
class PlaywrightServerManager extends BaseMCPServerManager {
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      const result = await this.server.executeBrowserAction({
        type: this.mapToolNameToAction(toolCall.name),
        params: toolCall.arguments
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result.data)
        }],
        isError: !result.success
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: error instanceof Error ? error.message : 'Nieznany błąd'
        }],
        isError: true
      };
    }
  }

  async getResource(uri: string): Promise<MCPResourceContent> {
    throw new Error('Resources nie są obsługiwane przez Playwright MCP');
  }

  async getPrompt(name: string, args?: Record<string, any>): Promise<MCPPromptResult> {
    throw new Error('Prompts nie są obsługiwane przez Playwright MCP');
  }

  private mapToolNameToAction(toolName: string): string {
    // Mapuj nazwy narzędzi MCP na akcje przegladarki
    const mapping: Record<string, string> = {
      'navigate': 'navigate',
      'click': 'click',
      'type': 'type',
      'screenshot': 'screenshot',
      'get_text': 'getText',
      'execute_script': 'executeScript',
      'wait_for_element': 'waitForElement',
      'close_page': 'closePage'
    };
    
    return mapping[toolName] || toolName;
  }
}

/**
 * Manager dla serwera Context Portal MCP
 */
class ContextPortalServerManager extends BaseMCPServerManager {
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      let result;
      
      // Mapuj wywołanie narzędzia na metodę serwera
      switch (toolCall.name) {
        case 'get_product_context':
          result = await this.server.getProductContext();
          break;
        case 'update_product_context':
          result = await this.server.updateProductContext(
            toolCall.arguments.content,
            toolCall.arguments.patch_content
          );
          break;
        case 'log_decision':
          result = await this.server.logDecision(toolCall.arguments);
          break;
        case 'search_decisions':
          result = await this.server.searchDecisions(
            toolCall.arguments.query_term,
            toolCall.arguments.limit
          );
          break;
        // Dodaj więcej mapowań według potrzeb
        default:
          throw new Error(`Nieobsługiwane narzędzie: ${toolCall.name}`);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result.data)
        }],
        isError: !result.success
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: error instanceof Error ? error.message : 'Nieznany błąd'
        }],
        isError: true
      };
    }
  }

  async getResource(uri: string): Promise<MCPResourceContent> {
    throw new Error('Resources nie są obsługiwane przez Context Portal MCP');
  }

  async getPrompt(name: string, args?: Record<string, any>): Promise<MCPPromptResult> {
    throw new Error('Prompts nie są obsługiwane przez Context Portal MCP');
  }
}

/**
 * Manager dla serwera Memory Keeper MCP
 */
class MemoryKeeperServerManager extends BaseMCPServerManager {
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      let result;
      
      // Mapuj wywołanie narzędzia na metodę serwera
      switch (toolCall.name) {
        case 'store_memory':
          result = await this.server.storeMemory(
            toolCall.arguments.content,
            toolCall.arguments.metadata
          );
          break;
        case 'search_memories':
          result = await this.server.searchMemories(
            toolCall.arguments.query,
            toolCall.arguments
          );
          break;
        case 'get_memory':
          result = await this.server.getMemory(toolCall.arguments.memory_id);
          break;
        case 'update_memory':
          result = await this.server.updateMemory(
            toolCall.arguments.memory_id,
            toolCall.arguments.content,
            toolCall.arguments.metadata
          );
          break;
        case 'delete_memory':
          result = await this.server.deleteMemory(toolCall.arguments.memory_id);
          break;
        // Dodaj więcej mapowań według potrzeb
        default:
          throw new Error(`Nieobsługiwane narzędzie: ${toolCall.name}`);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result.data)
        }],
        isError: !result.success
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: error instanceof Error ? error.message : 'Nieznany błąd'
        }],
        isError: true
      };
    }
  }

  async getResource(uri: string): Promise<MCPResourceContent> {
    throw new Error('Resources nie są obsługiwane przez Memory Keeper MCP');
  }

  async getPrompt(name: string, args?: Record<string, any>): Promise<MCPPromptResult> {
    throw new Error('Prompts nie są obsługiwane przez Memory Keeper MCP');
  }
}

export {
  PlaywrightServerManager,
  ContextPortalServerManager,
  MemoryKeeperServerManager
};