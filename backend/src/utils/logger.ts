import winston from 'winston';
import path from 'path';

/**
 * Advanced Logger with Winston
 * Provides structured logging with different levels and outputs
 */
export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string = 'Application') {
    this.context = context;
    this.logger = this.createLogger();
  }

  /**
   * Creates configured Winston logger instance
   */
  private createLogger(): winston.Logger {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

    // Custom format for development
    const devFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${context || this.context}] ${level}: ${message}${metaStr}`;
      })
    );

    // Structured format for production
    const prodFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const transports: winston.transport[] = [];

    // Console transport
    transports.push(
      new winston.transports.Console({
        format: isDevelopment ? devFormat : prodFormat,
        level: logLevel
      })
    );

    // File transports for production
    if (!isDevelopment) {
      const logsDir = process.env.LOGS_DIR || 'logs';
      
      // Combined logs
      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          format: prodFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );

      // Error logs
      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          format: prodFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      transports,
      // Don't exit on handled exceptions
      exitOnError: false,
      // Add default metadata
      defaultMeta: {
        service: 'github-dev-agent',
        context: this.context
      }
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  /**
   * Log info message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, { context: this.context, ...meta });
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, meta?: any): void {
    const errorMeta = error instanceof Error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    } : { error };

    this.logger.error(message, { 
      context: this.context, 
      ...errorMeta, 
      ...meta 
    });
  }

  /**
   * Log verbose message
   */
  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, { context: this.context, ...meta });
  }

  /**
   * Create child logger with extended context
   */
  child(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`);
  }

  /**
   * Start timing for performance measurement
   */
  startTimer(): winston.Profiler {
    return this.logger.startTimer();
  }

  /**
   * Log with custom level
   */
  log(level: string, message: string, meta?: any): void {
    this.logger.log(level, message, { context: this.context, ...meta });
  }

  /**
   * Get the underlying Winston logger
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

/**
 * Utility functions for logging
 */
export class LoggerUtils {
  /**
   * Create request logger middleware for Express
   */
  static createRequestLogger(logger: Logger) {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      const requestId = req.headers['x-request-id'] || Math.random().toString(36).substr(2, 9);
      
      // Add request ID to request for downstream usage
      req.requestId = requestId;
      
      logger.info('Request started', {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'warn' : 'info';
        
        logger.log(level, 'Request completed', {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('content-length')
        });
      });

      next();
    };
  }

  /**
   * Create async error logger
   */
  static createAsyncErrorLogger(logger: Logger) {
    return (error: Error, context?: string) => {
      logger.error(
        `Async error${context ? ` in ${context}` : ''}`,
        error,
        { asyncError: true }
      );
    };
  }

  /**
   * Format error for logging
   */
  static formatError(error: unknown): { message: string; stack?: string; name?: string } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }
    
    return {
      message: String(error)
    };
  }

  /**
   * Sanitize sensitive data from logs
   */
  static sanitizeLogData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'authorization',
      'cookie', 'auth', 'credentials', 'api_key', 'apikey'
    ];

    const sanitized = { ...data };
    
    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = LoggerUtils.sanitizeLogData(sanitized[key]);
      }
    }

    return sanitized;
  }
}

/**
 * Performance logging utility
 */
export class PerformanceLogger {
  private logger: Logger;
  private timers: Map<string, number> = new Map();

  constructor(context: string = 'Performance') {
    this.logger = new Logger(context);
  }

  /**
   * Start performance timer
   */
  start(operation: string): void {
    this.timers.set(operation, Date.now());
    this.logger.debug(`Started: ${operation}`);
  }

  /**
   * End performance timer and log result
   */
  end(operation: string, meta?: any): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      this.logger.warn(`No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);

    this.logger.info(`Completed: ${operation}`, {
      duration,
      ...meta
    });

    return duration;
  }

  /**
   * Measure async function execution time
   */
  async measure<T>(
    operation: string, 
    fn: () => Promise<T>, 
    meta?: any
  ): Promise<T> {
    this.start(operation);
    try {
      const result = await fn();
      this.end(operation, { ...meta, success: true });
      return result;
    } catch (error) {
      this.end(operation, { 
        ...meta, 
        success: false, 
        error: LoggerUtils.formatError(error) 
      });
      throw error;
    }
  }
}

// Default logger instance
export const defaultLogger = new Logger('App');

// Export logger for backward compatibility
export default Logger;