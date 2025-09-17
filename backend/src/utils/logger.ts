import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Production-ready logging utility with structured logging
 * Supports multiple transports, log rotation, and contextual logging
 */

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  verbose: 5,
  silly: 6
};

// Custom colors for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
  verbose: 'cyan',
  silly: 'grey'
};

winston.addColors(logColors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${service || 'App'}] ${level}: ${message} ${metaStr}`;
  })
);

// File transport configuration
const fileTransportConfig = {
  filename: path.join(logsDir, 'application.log'),
  handleExceptions: true,
  handleRejections: true,
  maxsize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  tailable: true,
  format: logFormat
};

// Error file transport
const errorFileTransportConfig = {
  ...fileTransportConfig,
  filename: path.join(logsDir, 'error.log'),
  level: 'error'
};

// Create winston logger instance
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  defaultMeta: {
    service: 'github-dev-agent',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // File transports
    new winston.transports.File(fileTransportConfig),
    new winston.transports.File(errorFileTransportConfig),
    
    // Console transport for development
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true
      })
    ] : [])
  ],
  exitOnError: false
});

// HTTP request logging stream
const httpLogStream = {
  write: (message: string) => {
    winstonLogger.http(message.trim());
  }
};

/**
 * Enhanced Logger class with contextual logging and performance tracking
 */
export class Logger {
  private context: string;
  private metadata: Record<string, any>;

  constructor(context: string = 'App', metadata: Record<string, any> = {}) {
    this.context = context;
    this.metadata = metadata;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string, metadata: Record<string, any> = {}): Logger {
    return new Logger(`${this.context}:${context}`, { ...this.metadata, ...metadata });
  }

  /**
   * Add persistent metadata to all log entries
   */
  setMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  /**
   * Clear all metadata
   */
  clearMetadata(): void {
    this.metadata = {};
  }

  /**
   * Log with custom level
   */
  private log(level: string, message: string, meta?: Record<string, any>): void {
    const logMeta = {
      ...this.metadata,
      ...meta,
      service: this.context
    };

    winstonLogger.log(level, message, logMeta);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
    const errorMeta = { ...meta };
    
    if (error instanceof Error) {
      errorMeta.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error.cause && typeof error.cause === 'object' ? { cause: error.cause } : {})
      };
    } else if (error) {
      errorMeta.error = error;
    }

    this.log('error', message, errorMeta);
  }

  /**
   * Warning level logging
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }

  /**
   * Info level logging
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }

  /**
   * HTTP level logging
   */
  http(message: string, meta?: Record<string, any>): void {
    this.log('http', message, meta);
  }

  /**
   * Debug level logging
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.log('debug', message, meta);
  }

  /**
   * Verbose level logging
   */
  verbose(message: string, meta?: Record<string, any>): void {
    this.log('verbose', message, meta);
  }

  /**
   * Silly level logging
   */
  silly(message: string, meta?: Record<string, any>): void {
    this.log('silly', message, meta);
  }

  /**
   * Performance timing utilities
   */
  time(label: string): void {
    console.time(`${this.context}:${label}`);
  }

  timeEnd(label: string, message?: string): void {
    console.timeEnd(`${this.context}:${label}`);
    if (message) {
      this.debug(`${message} - ${label} completed`);
    }
  }

  /**
   * Async operation wrapper with automatic timing and error handling
   */
  async profile<T>(
    operation: string,
    fn: () => Promise<T>,
    meta?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    const operationId = `${operation}-${Date.now()}`;
    
    this.debug(`Starting operation: ${operation}`, { operationId, ...meta });
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.info(`Operation completed: ${operation}`, {
        operationId,
        duration,
        success: true,
        ...meta
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.error(`Operation failed: ${operation}`, error, {
        operationId,
        duration,
        success: false,
        ...meta
      });
      
      throw error;
    }
  }

  /**
   * Log GitHub API operations
   */
  githubApi(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    rateLimitRemaining?: number
  ): void {
    this.http(`GitHub API: ${method} ${endpoint}`, {
      method,
      endpoint,
      statusCode,
      duration,
      rateLimitRemaining,
      type: 'github-api'
    });
  }

  /**
   * Log MCP operations
   */
  mcpOperation(
    operation: string,
    server: string,
    success: boolean,
    duration: number,
    meta?: Record<string, any>
  ): void {
    const level = success ? 'info' : 'warn';
    this.log(level, `MCP Operation: ${operation}`, {
      operation,
      server,
      success,
      duration,
      type: 'mcp-operation',
      ...meta
    });
  }

  /**
   * Log user actions for audit trail
   */
  userAction(
    userId: string,
    action: string,
    resource?: string,
    meta?: Record<string, any>
  ): void {
    this.info(`User Action: ${action}`, {
      userId,
      action,
      resource,
      type: 'user-action',
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * Log security events
   */
  security(
    event: string,
    level: 'info' | 'warn' | 'error' = 'warn',
    meta?: Record<string, any>
  ): void {
    this.log(level, `Security Event: ${event}`, {
      event,
      type: 'security',
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * Check if logging level is enabled
   */
  isLevelEnabled(level: string): boolean {
    return winstonLogger.isLevelEnabled(level);
  }
}

// Create default logger instance
export const logger = new Logger('App');

// Export HTTP log stream for middleware
export { httpLogStream };

// Export winston logger for advanced use cases
export { winstonLogger };

// Performance monitoring utilities
export class PerformanceLogger {
  private static instances = new Map<string, number>();

  static start(operation: string): void {
    this.instances.set(operation, Date.now());
  }

  static end(operation: string, logger: Logger = new Logger('Performance')): number {
    const startTime = this.instances.get(operation);
    if (!startTime) {
      logger.warn(`Performance measurement not found for operation: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.instances.delete(operation);
    
    logger.info(`Performance: ${operation} completed in ${duration}ms`, {
      operation,
      duration,
      type: 'performance'
    });

    return duration;
  }

  static measure<T>(operation: string, fn: () => T, logger: Logger = new Logger('Performance')): T {
    this.start(operation);
    try {
      const result = fn();
      this.end(operation, logger);
      return result;
    } catch (error) {
      this.end(operation, logger);
      throw error;
    }
  }

  static async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    logger: Logger = new Logger('Performance')
  ): Promise<T> {
    this.start(operation);
    try {
      const result = await fn();
      this.end(operation, logger);
      return result;
    } catch (error) {
      this.end(operation, logger);
      throw error;
    }
  }
}

export default Logger;
