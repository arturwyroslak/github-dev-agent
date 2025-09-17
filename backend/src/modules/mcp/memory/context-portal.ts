import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { ContextPortalMCPConfig } from '../types';
import { Logger } from '../../../utils/logger';

/**
 * Context Portal MCP Server - Zarządzanie pamięcią kontekstową
 * Bazuje na context-portal-mcp
 */
export class ContextPortalMCPServer extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: ContextPortalMCPConfig;
  private logger: Logger;
  private isRunning = false;
  private workspaceId: string;

  constructor(config: ContextPortalMCPConfig, workspaceId?: string) {
    super();
    this.config = {
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
      autoDetectWorkspace: true,
      ...config,
      enabled: true
    };
    this.workspaceId = workspaceId || process.cwd();
    this.logger = new Logger('ContextPortalMCP');
  }

  /**
   * Uruchamia serwer Context Portal MCP
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Context Portal MCP server jest już uruchomiony');
    }

    this.logger.info('Uruchamianie Context Portal MCP server...');

    try {
      const args = [...(this.config.serverArgs || [])];
      
      // Dodaj workspace ID
      if (this.workspaceId) {
        args.push('--workspace-id', this.workspaceId);
      }

      // Dodaj poziom logowania
      if (this.config.logLevel) {
        args.push('--log-level', this.config.logLevel);
      }

      // Dodaj auto detect workspace
      if (this.config.autoDetectWorkspace) {
        args.push('--auto-detect-workspace');
      }

      this.process = spawn(this.config.serverCommand || 'uvx', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'production'
        }
      });

      this.setupProcessHandlers();
      await this.waitForServer();
      
      this.isRunning = true;
      this.logger.info('Context Portal MCP server uruchomiony pomyślnie');
      
    } catch (error) {
      this.logger.error('Błąd uruchamiania Context Portal MCP server:', error);
      throw error;
    }
  }

  /**
   * Zatrzymuje serwer Context Portal MCP
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.process) {
      return;
    }

    this.logger.info('Zatrzymywanie Context Portal MCP server...');
    
    this.process.kill('SIGTERM');
    
    await new Promise<void>((resolve) => {
      if (this.process) {
        this.process.on('exit', () => resolve());
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      } else {
        resolve();
      }
    });

    this.isRunning = false;
    this.process = null;
    this.logger.info('Context Portal MCP server zatrzymany');
  }

  /**
   * Pobiera kontekst produktu
   */
  async getProductContext(): Promise<ContextResult> {
    return this.executeContextOperation('get_product_context', {});
  }

  /**
   * Aktualizuje kontekst produktu
   */
  async updateProductContext(content: string, patchContent?: string): Promise<ContextResult> {
    return this.executeContextOperation('update_product_context', {
      content,
      patch_content: patchContent
    });
  }

  /**
   * Pobiera aktywny kontekst
   */
  async getActiveContext(): Promise<ContextResult> {
    return this.executeContextOperation('get_active_context', {});
  }

  /**
   * Aktualizuje aktywny kontekst
   */
  async updateActiveContext(content: string): Promise<ContextResult> {
    return this.executeContextOperation('update_active_context', {
      content
    });
  }

  /**
   * Loguje decyzję
   */
  async logDecision(decision: DecisionData): Promise<ContextResult> {
    return this.executeContextOperation('log_decision', decision);
  }

  /**
   * Pobiera decyzje
   */
  async getDecisions(): Promise<ContextResult> {
    return this.executeContextOperation('get_decisions', {});
  }

  /**
   * Wyszukuje decyzje metodą FTS
   */
  async searchDecisions(queryTerm: string, limit?: number): Promise<ContextResult> {
    return this.executeContextOperation('search_decisions_fts', {
      query_term: queryTerm,
      limit: limit || 10
    });
  }

  /**
   * Loguje postęp
   */
  async logProgress(progress: ProgressData): Promise<ContextResult> {
    return this.executeContextOperation('log_progress', progress);
  }

  /**
   * Pobiera postęp
   */
  async getProgress(): Promise<ContextResult> {
    return this.executeContextOperation('get_progress', {});
  }

  /**
   * Loguje wzorzec systemowy
   */
  async logSystemPattern(pattern: SystemPatternData): Promise<ContextResult> {
    return this.executeContextOperation('log_system_pattern', pattern);
  }

  /**
   * Pobiera wzorce systemowe
   */
  async getSystemPatterns(): Promise<ContextResult> {
    return this.executeContextOperation('get_system_patterns', {});
  }

  /**
   * Loguje niestandardowe dane
   */
  async logCustomData(data: CustomData): Promise<ContextResult> {
    return this.executeContextOperation('log_custom_data', data);
  }

  /**
   * Pobiera niestandardowe dane
   */
  async getCustomData(dataType?: string): Promise<ContextResult> {
    return this.executeContextOperation('get_custom_data', {
      data_type: dataType
    });
  }

  /**
   * Łączy elementy context portal
   */
  async linkItems(sourceId: string, targetId: string, linkType?: string): Promise<ContextResult> {
    return this.executeContextOperation('link_conport_items', {
      source_id: sourceId,
      target_id: targetId,
      link_type: linkType || 'related'
    });
  }

  /**
   * Pobiera powiązane elementy
   */
  async getLinkedItems(itemId: string): Promise<ContextResult> {
    return this.executeContextOperation('get_linked_items', {
      item_id: itemId
    });
  }

  /**
   * Pobiera status serwera
   */
  getStatus(): ServerStatus {
    const pid = this.process?.pid;
    return {
      isRunning: this.isRunning,
      hasProcess: this.process !== null,
      pid: pid !== undefined ? pid : 0,
      uptime: this.isRunning ? Date.now() : 0,
      workspaceId: this.workspaceId
    };
  }

  private async executeContextOperation(toolName: string, params: any): Promise<ContextResult> {
    if (!this.isRunning) {
      throw new Error('Context Portal MCP server nie jest uruchomiony');
    }

    this.logger.info(`Wykonywanie operacji kontekstu: ${toolName}`);

    try {
      const message = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params
        }
      };

      const response = await this.sendMessage(message);
      
      return {
        success: true,
        data: response.result,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Błąd wykonania operacji ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
        timestamp: new Date()
      };
    }
  }

  private setupProcessHandlers(): void {
    if (!this.process) return;

    this.process.stdout?.on('data', (data) => {
      this.logger.debug(`Context Portal MCP stdout: ${data.toString()}`);
      this.emit('stdout', data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      this.logger.debug(`Context Portal MCP stderr: ${data.toString()}`);
      this.emit('stderr', data.toString());
    });

    this.process.on('exit', (code, signal) => {
      this.logger.info(`Context Portal MCP process zakończony (kod: ${code}, sygnał: ${signal})`);
      this.isRunning = false;
      this.process = null;
      this.emit('exit', code, signal);
    });

    this.process.on('error', (error) => {
      this.logger.error('Błąd procesu Context Portal MCP:', error);
      this.emit('error', error);
    });
  }

  private async waitForServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout oczekiwania na uruchomienie serwera'));
      }, this.config.timeout);

      if (this.process) {
        this.process.on('spawn', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.process.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      } else {
        clearTimeout(timeout);
        reject(new Error('Nie można uruchomić procesu'));
      }
    });
  }

  private async sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('Proces nie jest dostępny'));
        return;
      }

      const messageStr = JSON.stringify(message) + '\n';
      
      const responseHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === message.id) {
            this.process?.stdout?.off('data', responseHandler);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response);
            }
          }
        } catch (error) {
          // Ignore parsing errors for non-JSON data
        }
      };

      this.process.stdout?.on('data', responseHandler);
      
      this.process.stdin.write(messageStr, (error) => {
        if (error) {
          this.process?.stdout?.off('data', responseHandler);
          reject(error);
        }
      });

      setTimeout(() => {
        this.process?.stdout?.off('data', responseHandler);
        reject(new Error('Timeout odpowiedzi na wiadomość'));
      }, this.config.timeout);
    });
  }
}

// Typy dla Context Portal MCP
export interface ContextResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export interface DecisionData {
  title: string;
  description: string;
  reasoning?: string;
  alternatives?: string[];
  impact?: string;
  stakeholders?: string[];
  tags?: string[];
}

export interface ProgressData {
  milestone: string;
  description: string;
  percentage?: number;
  status?: 'in_progress' | 'completed' | 'blocked' | 'pending';
  blockers?: string[];
  next_steps?: string[];
}

export interface SystemPatternData {
  pattern_name: string;
  description: string;
  context?: string;
  examples?: string[];
  anti_patterns?: string[];
  when_to_use?: string;
  when_not_to_use?: string;
}

export interface CustomData {
  data_type: string;
  title: string;
  content: any;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface ServerStatus {
  isRunning: boolean;
  hasProcess: boolean;
  pid: number;
  uptime: number;
  workspaceId: string;
}