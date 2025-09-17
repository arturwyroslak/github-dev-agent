import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { MemoryMCPConfig } from '../types';
import { Logger } from '../../../utils/logger';

/**
 * Memory Keeper MCP Server - Zarządzanie trwałą pamięcią dla AI
 * Bazuje na mkreyman/mcp-memory-keeper
 */
export class MemoryKeeperMCPServer extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: MemoryMCPConfig;
  private logger: Logger;
  private isRunning = false;
  private projectPath: string;

  constructor(config: MemoryMCPConfig, projectPath?: string) {
    super();
    this.config = {
      enabled: true,
      serverCommand: 'npx',
      serverArgs: ['@mcp/memory-keeper'],
      timeout: 30000,
      logLevel: 'INFO',
      memoryProvider: 'mem0',
      persistentStorage: true,
      ...config
    };
    this.projectPath = projectPath || process.cwd();
    this.logger = new Logger('MemoryKeeperMCP');
  }

  /**
   * Uruchamia serwer Memory Keeper MCP
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Memory Keeper MCP server jest już uruchomiony');
    }

    this.logger.info('Uruchamianie Memory Keeper MCP server...');

    try {
      const args = [...this.config.serverArgs];
      
      // Dodaj ścieżkę projektu
      if (this.projectPath) {
        args.push('--project-path', this.projectPath);
      }

      // Dodaj provider pamięci
      if (this.config.memoryProvider) {
        args.push('--memory-provider', this.config.memoryProvider);
      }

      // Dodaj opcję trwałego przechowywania
      if (this.config.persistentStorage) {
        args.push('--persistent-storage');
      }

      // Dodaj model embedding jeśli został podany
      if (this.config.embeddingModel) {
        args.push('--embedding-model', this.config.embeddingModel);
      }

      // Dodaj poziom logowania
      if (this.config.logLevel) {
        args.push('--log-level', this.config.logLevel);
      }

      this.process = spawn(this.config.serverCommand, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'production'
        }
      });

      this.setupProcessHandlers();
      await this.waitForServer();
      
      this.isRunning = true;
      this.logger.info('Memory Keeper MCP server uruchomiony pomyślnie');
      
    } catch (error) {
      this.logger.error('Błąd uruchamiania Memory Keeper MCP server:', error);
      throw error;
    }
  }

  /**
   * Zatrzymuje serwer Memory Keeper MCP
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.process) {
      return;
    }

    this.logger.info('Zatrzymywanie Memory Keeper MCP server...');
    
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
    this.logger.info('Memory Keeper MCP server zatrzymany');
  }

  /**
   * Zapisuje wspomnienie w pamięci
   */
  async storeMemory(content: string, metadata?: MemoryMetadata): Promise<MemoryResult> {
    return this.executeMemoryOperation('store_memory', {
      content,
      metadata: metadata || {}
    });
  }

  /**
   * Wyszukuje wspomnienia na podstawie zapytania
   */
  async searchMemories(query: string, options?: SearchOptions): Promise<MemoryResult> {
    return this.executeMemoryOperation('search_memories', {
      query,
      limit: options?.limit || 10,
      threshold: options?.threshold || 0.7,
      filters: options?.filters || {}
    });
  }

  /**
   * Pobiera konkretne wspomnienie po ID
   */
  async getMemory(memoryId: string): Promise<MemoryResult> {
    return this.executeMemoryOperation('get_memory', {
      memory_id: memoryId
    });
  }

  /**
   * Aktualizuje istniejące wspomnienie
   */
  async updateMemory(memoryId: string, content?: string, metadata?: MemoryMetadata): Promise<MemoryResult> {
    const params: any = { memory_id: memoryId };
    if (content) params.content = content;
    if (metadata) params.metadata = metadata;
    
    return this.executeMemoryOperation('update_memory', params);
  }

  /**
   * Usuwa wspomnienie z pamięci
   */
  async deleteMemory(memoryId: string): Promise<MemoryResult> {
    return this.executeMemoryOperation('delete_memory', {
      memory_id: memoryId
    });
  }

  /**
   * Pobiera wszystkie wspomnienia z opcjonalnym filtrowaniem
   */
  async listMemories(options?: ListMemoriesOptions): Promise<MemoryResult> {
    return this.executeMemoryOperation('list_memories', {
      limit: options?.limit || 50,
      offset: options?.offset || 0,
      filters: options?.filters || {},
      sort_by: options?.sortBy || 'created_at',
      sort_order: options?.sortOrder || 'desc'
    });
  }

  /**
   * Tworzy streszczenie wspomnień na podstawie zapytania
   */
  async summarizeMemories(query: string, options?: SummarizeOptions): Promise<MemoryResult> {
    return this.executeMemoryOperation('summarize_memories', {
      query,
      max_memories: options?.maxMemories || 20,
      summary_type: options?.summaryType || 'detailed'
    });
  }

  /**
   * Analizuje podobieństwa między wspomnieniami
   */
  async analyzeSimilarities(memoryId: string, options?: SimilarityOptions): Promise<MemoryResult> {
    return this.executeMemoryOperation('analyze_similarities', {
      memory_id: memoryId,
      limit: options?.limit || 10,
      threshold: options?.threshold || 0.7
    });
  }

  /**
   * Grupuje wspomnienia na podstawie podobieństwa
   */
  async clusterMemories(options?: ClusterOptions): Promise<MemoryResult> {
    return this.executeMemoryOperation('cluster_memories', {
      algorithm: options?.algorithm || 'kmeans',
      num_clusters: options?.numClusters || 5,
      min_cluster_size: options?.minClusterSize || 2
    });
  }

  /**
   * Eksportuje wspomnienia do pliku
   */
  async exportMemories(format: 'json' | 'csv' | 'markdown', filePath?: string): Promise<MemoryResult> {
    return this.executeMemoryOperation('export_memories', {
      format,
      file_path: filePath
    });
  }

  /**
   * Importuje wspomnienia z pliku
   */
  async importMemories(filePath: string, format?: 'json' | 'csv' | 'markdown'): Promise<MemoryResult> {
    return this.executeMemoryOperation('import_memories', {
      file_path: filePath,
      format: format || 'json'
    });
  }

  /**
   * Pobiera statystyki pamięci
   */
  async getMemoryStats(): Promise<MemoryResult> {
    return this.executeMemoryOperation('get_memory_stats', {});
  }

  /**
   * Czyści starą pamięć na podstawie kryteriów
   */
  async cleanupMemories(options?: CleanupOptions): Promise<MemoryResult> {
    return this.executeMemoryOperation('cleanup_memories', {
      older_than_days: options?.olderThanDays,
      min_score: options?.minScore,
      max_count: options?.maxCount,
      dry_run: options?.dryRun || false
    });
  }

  /**
   * Pobiera status serwera
   */
  getStatus(): ServerStatus {
    return {
      isRunning: this.isRunning,
      hasProcess: this.process !== null,
      pid: this.process?.pid,
      uptime: this.isRunning ? Date.now() : 0,
      projectPath: this.projectPath,
      memoryProvider: this.config.memoryProvider
    };
  }

  private async executeMemoryOperation(toolName: string, params: any): Promise<MemoryResult> {
    if (!this.isRunning) {
      throw new Error('Memory Keeper MCP server nie jest uruchomiony');
    }

    this.logger.info(`Wykonywanie operacji pamięci: ${toolName}`);

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
      this.logger.debug(`Memory Keeper MCP stdout: ${data.toString()}`);
      this.emit('stdout', data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      this.logger.debug(`Memory Keeper MCP stderr: ${data.toString()}`);
      this.emit('stderr', data.toString());
    });

    this.process.on('exit', (code, signal) => {
      this.logger.info(`Memory Keeper MCP process zakończony (kod: ${code}, sygnał: ${signal})`);
      this.isRunning = false;
      this.process = null;
      this.emit('exit', code, signal);
    });

    this.process.on('error', (error) => {
      this.logger.error('Błąd procesu Memory Keeper MCP:', error);
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

// Typy dla Memory Keeper MCP
export interface MemoryResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export interface MemoryMetadata {
  tags?: string[];
  category?: string;
  importance?: number; // 0-1
  context?: string;
  source?: string;
  userId?: string;
  [key: string]: any;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number; // 0-1, similarity threshold
  filters?: Record<string, any>;
}

export interface ListMemoriesOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SummarizeOptions {
  maxMemories?: number;
  summaryType?: 'brief' | 'detailed' | 'technical';
}

export interface SimilarityOptions {
  limit?: number;
  threshold?: number;
}

export interface ClusterOptions {
  algorithm?: 'kmeans' | 'hierarchical' | 'dbscan';
  numClusters?: number;
  minClusterSize?: number;
}

export interface CleanupOptions {
  olderThanDays?: number;
  minScore?: number;
  maxCount?: number;
  dryRun?: boolean;
}

export interface ServerStatus {
  isRunning: boolean;
  hasProcess: boolean;
  pid?: number;
  uptime: number;
  projectPath: string;
  memoryProvider?: string;
}