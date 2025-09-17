/**
 * Typy konfiguracyjne dla serverów MCP
 */

// Bazowa konfiguracja MCP Server
export interface BaseMCPConfig {
  enabled: boolean;
  timeout?: number;
  logLevel?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  logFile?: string;
}

// Konfiguracja serwera GitHub MCP
export interface GitHubMCPConfig extends BaseMCPConfig {
  serverPath?: string;
  args?: string[];
  token?: string;
}

// Konfiguracja serwera Playwright MCP
export interface PlaywrightMCPConfig extends BaseMCPConfig {
  serverPath?: string;
  args?: string[];
  headless?: boolean;
  slowMo?: number;
  devtools?: boolean;
}

// Konfiguracja serwera Context Portal MCP
export interface ContextPortalMCPConfig extends BaseMCPConfig {
  serverCommand?: string;
  serverArgs?: string[];
  workspaceId?: string;
  autoDetectWorkspace?: boolean;
  workspaceSearchStart?: string;
}

// Konfiguracja serwera Memory MCP (np. mem0-mcp)
export interface MemoryMCPConfig extends BaseMCPConfig {
  serverCommand?: string;
  serverArgs?: string[];
  workspaceId?: string;
  memoryProvider?: 'mem0' | 'txtai' | 'chroma' | 'custom';
  persistentStorage?: boolean;
  embeddingModel?: string;
}

// Główna konfiguracja MCP
export interface MCPConfig {
  github?: GitHubMCPConfig;
  playwright?: PlaywrightMCPConfig;
  contextPortal?: ContextPortalMCPConfig;
  memory?: MemoryMCPConfig;
  servers?: Record<string, BaseMCPConfig>;
}

// Typy dla odpowiedzi z serverów MCP
export interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  serverId?: string;
}

// Typy dla komunikacji JSON-RPC
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Typy dla narzędzi MCP
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// Typy dla zasobów MCP
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

// Typy dla promptów MCP
export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export interface MCPPromptResult {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image';
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }>;
}

// Typy statusu serwera
export interface MCPServerStatus {
  serverId: string;
  isRunning: boolean;
  hasProcess: boolean;
  pid: number;
  uptime: number;
  lastError?: string;
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    logging?: boolean;
  };
}

// Typy dla managerów MCP
export interface MCPServerManager {
  serverId: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  getStatus(): MCPServerStatus;
  isHealthy(): Promise<boolean>;
  callTool(toolCall: MCPToolCall): Promise<MCPToolResult>;
  getResource(uri: string): Promise<MCPResourceContent>;
  getPrompt(name: string, args?: Record<string, any>): Promise<MCPPromptResult>;
}

// Typy dla eventów MCP
export interface MCPServerEvents {
  'server:started': (serverId: string) => void;
  'server:stopped': (serverId: string) => void;
  'server:error': (serverId: string, error: Error) => void;
  'server:stdout': (serverId: string, data: string) => void;
  'server:stderr': (serverId: string, data: string) => void;
  'tool:called': (serverId: string, toolCall: MCPToolCall) => void;
  'tool:result': (serverId: string, result: MCPToolResult) => void;
  'resource:requested': (serverId: string, uri: string) => void;
  'prompt:requested': (serverId: string, name: string) => void;
}

// Utility types
export type MCPServerType = 'github' | 'playwright' | 'context-portal' | 'memory' | 'custom';

export type MCPCapability = 'tools' | 'resources' | 'prompts' | 'logging' | 'sampling';

export type MCPLogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

// Wspólne interfejsy dla różnych typów serwerów
export interface WithWorkspace {
  workspaceId?: string;
}

export interface WithTimeout {
  timeout?: number;
}

export interface WithRetry {
  maxRetries?: number;
  retryDelay?: number;
}

export interface WithAuth {
  token?: string;
  apiKey?: string;
  credentials?: Record<string, string>;
}

// Rozszerzone konfiguracje z dodatkowymi opcjami
export interface EnhancedGitHubMCPConfig extends GitHubMCPConfig, WithRetry, WithAuth {
  repositories?: string[];
  defaultBranch?: string;
  webhookSecret?: string;
}

export interface EnhancedPlaywrightMCPConfig extends PlaywrightMCPConfig, WithRetry {
  browserType?: 'chromium' | 'firefox' | 'webkit';
  viewport?: { width: number; height: number };
  userAgent?: string;
  locale?: string;
  timezone?: string;
}

export interface EnhancedContextPortalMCPConfig extends ContextPortalMCPConfig, WithWorkspace {
  databasePath?: string;
  backupInterval?: number;
  maxHistoryEntries?: number;
  enableVectorSearch?: boolean;
}

export interface EnhancedMemoryMCPConfig extends MemoryMCPConfig, WithWorkspace {
  vectorDimension?: number;
  similarityThreshold?: number;
  maxMemoryEntries?: number;
  memoryRetentionDays?: number;
}