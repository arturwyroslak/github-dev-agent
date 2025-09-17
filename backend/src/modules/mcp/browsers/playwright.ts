import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { PlaywrightMCPConfig } from '../types';
import { Logger } from '../../../utils/logger';

/**
 * MCP Server Playwright - Integracja z serverem automatyzacji przeglądarki
 * Bazuje na Automata-Labs-team/MCP-Server-Playwright
 */
export class PlaywrightMCPServer extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: PlaywrightMCPConfig;
  private logger: Logger;
  private isRunning = false;

  constructor(config: PlaywrightMCPConfig) {
    super();
    this.config = {
      enabled: true,
      serverPath: 'npx',
      args: ['playwright-mcp-server'],
      timeout: 30000,
      ...config
    };
    this.logger = new Logger('PlaywrightMCP');
  }

  /**
   * Uruchamia serwer MCP Playwright
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Playwright MCP server jest już uruchomiony');
    }

    this.logger.info('Uruchamianie Playwright MCP server...');

    try {
      this.process = spawn(this.config.serverPath, this.config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'production'
        }
      });

      this.setupProcessHandlers();
      await this.waitForServer();
      
      this.isRunning = true;
      this.logger.info('Playwright MCP server uruchomiony pomyślnie');
      
    } catch (error) {
      this.logger.error('Błąd uruchamiania Playwright MCP server:', error);
      throw error;
    }
  }

  /**
   * Zatrzymuje serwer MCP Playwright
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.process) {
      return;
    }

    this.logger.info('Zatrzymywanie Playwright MCP server...');
    
    this.process.kill('SIGTERM');
    
    // Oczekuj na zakończenie procesu
    await new Promise<void>((resolve) => {
      if (this.process) {
        this.process.on('exit', () => resolve());
        // Force kill po 5 sekundach
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
    this.logger.info('Playwright MCP server zatrzymany');
  }

  /**
   * Wykonuje operację automatyzacji przeglądarki
   */
  async executeBrowserAction(action: BrowserAction): Promise<BrowserActionResult> {
    if (!this.isRunning) {
      throw new Error('Playwright MCP server nie jest uruchomiony');
    }

    this.logger.info(`Wykonywanie akcji przeglądarki: ${action.type}`);

    try {
      const message = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: this.mapActionToTool(action.type),
          arguments: action.params
        }
      };

      const response = await this.sendMessage(message);
      
      return {
        success: true,
        data: response.result,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Błąd wykonania akcji przeglądarki:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
        timestamp: new Date()
      };
    }
  }

  /**
   * Nawiguje do podanego URL
   */
  async navigateToUrl(url: string, options?: NavigationOptions): Promise<BrowserActionResult> {
    return this.executeBrowserAction({
      type: 'navigate',
      params: {
        url,
        ...options
      }
    });
  }

  /**
   * Wykonuje kliknięcie na element
   */
  async clickElement(selector: string, options?: ClickOptions): Promise<BrowserActionResult> {
    return this.executeBrowserAction({
      type: 'click',
      params: {
        selector,
        ...options
      }
    });
  }

  /**
   * Wpisuje tekst do pola
   */
  async typeText(selector: string, text: string, options?: TypeOptions): Promise<BrowserActionResult> {
    return this.executeBrowserAction({
      type: 'type',
      params: {
        selector,
        text,
        ...options
      }
    });
  }

  /**
   * Wykonuje screenshot strony
   */
  async takeScreenshot(options?: ScreenshotOptions): Promise<BrowserActionResult> {
    return this.executeBrowserAction({
      type: 'screenshot',
      params: {
        ...options
      }
    });
  }

  /**
   * Pobiera tekst z elementu
   */
  async getElementText(selector: string): Promise<BrowserActionResult> {
    return this.executeBrowserAction({
      type: 'getText',
      params: {
        selector
      }
    });
  }

  /**
   * Wykonuje JavaScript w kontekście strony
   */
  async executeScript(script: string): Promise<BrowserActionResult> {
    return this.executeBrowserAction({
      type: 'executeScript',
      params: {
        script
      }
    });
  }

  /**
   * Oczekuje na element na stronie
   */
  async waitForElement(selector: string, options?: WaitOptions): Promise<BrowserActionResult> {
    return this.executeBrowserAction({
      type: 'waitForElement',
      params: {
        selector,
        ...options
      }
    });
  }

  /**
   * Zamyka aktualną stronę/tab
   */
  async closePage(): Promise<BrowserActionResult> {
    return this.executeBrowserAction({
      type: 'closePage',
      params: {}
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
      uptime: this.isRunning ? Date.now() : 0
    };
  }

  private setupProcessHandlers(): void {
    if (!this.process) return;

    this.process.stdout?.on('data', (data) => {
      this.logger.debug(`Playwright MCP stdout: ${data.toString()}`);
      this.emit('stdout', data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      this.logger.debug(`Playwright MCP stderr: ${data.toString()}`);
      this.emit('stderr', data.toString());
    });

    this.process.on('exit', (code, signal) => {
      this.logger.info(`Playwright MCP process zakończony (kod: ${code}, sygnał: ${signal})`);
      this.isRunning = false;
      this.process = null;
      this.emit('exit', code, signal);
    });

    this.process.on('error', (error) => {
      this.logger.error('Błąd procesu Playwright MCP:', error);
      this.emit('error', error);
    });
  }

  private async waitForServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout oczekiwania na uruchomienie serwera'));
      }, this.config.timeout);

      // Sprawdź czy proces się uruchomił
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
      
      // Setup response handler
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
      
      // Send message
      this.process.stdin.write(messageStr, (error) => {
        if (error) {
          this.process?.stdout?.off('data', responseHandler);
          reject(error);
        }
      });

      // Timeout handling
      setTimeout(() => {
        this.process?.stdout?.off('data', responseHandler);
        reject(new Error('Timeout odpowiedzi na wiadomość'));
      }, this.config.timeout);
    });
  }

  private mapActionToTool(actionType: string): string {
    const toolMap: Record<string, string> = {
      'navigate': 'playwright_navigate',
      'click': 'playwright_click',
      'type': 'playwright_type',
      'screenshot': 'playwright_screenshot',
      'getText': 'playwright_get_text',
      'executeScript': 'playwright_execute_script',
      'waitForElement': 'playwright_wait_for_element',
      'closePage': 'playwright_close_page'
    };

    return toolMap[actionType] || actionType;
  }
}

// Typy dla Playwright MCP
export interface BrowserAction {
  type: string;
  params: Record<string, any>;
}

export interface BrowserActionResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  timeout?: number;
}

export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
  force?: boolean;
}

export interface TypeOptions {
  delay?: number;
  clear?: boolean;
}

export interface ScreenshotOptions {
  path?: string;
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  quality?: number;
  type?: 'jpeg' | 'png';
}

export interface WaitOptions {
  timeout?: number;
  visible?: boolean;
  hidden?: boolean;
}

export interface ServerStatus {
  isRunning: boolean;
  hasProcess: boolean;
  pid?: number;
  uptime: number;
}