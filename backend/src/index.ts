import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import aiRoutes from './routes/ai';
import autonomousRoutes from './routes/autonomous';

// Import services
import { Logger } from './utils/logger';
import { MCPManager, defaultMCPServers } from './modules/mcp';
import { codingAgent } from './services/ai/coding-agent';

// Load environment variables
dotenv.config();

// Create logger
const logger = new Logger('Server');

// Application configuration
const config = {
  port: parseInt(process.env.PORT || '8080'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // requests per window
  mcp: {
    enabled: process.env.MCP_ENABLED === 'true',
    playwright: process.env.MCP_PLAYWRIGHT === 'true',
    contextPortal: process.env.MCP_CONTEXT_PORTAL === 'true',
    memoryKeeper: process.env.MCP_MEMORY_KEEPER === 'true'
  }
};

/**
 * Create and configure Express application
 */
function createApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https:'],
        fontSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  app.use(cors({
    origin: config.corsOrigin.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Compression and parsing
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimitWindow,
    max: config.rateLimitMax,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(config.rateLimitWindow / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/api/', limiter);

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // API routes
  app.use('/api/ai', aiRoutes);
  app.use('/api/autonomous', autonomousRoutes);

  // Health check
  app.get('/health', async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.nodeEnv,
        services: {
          ai: await codingAgent.healthCheck(),
          mcp: config.mcp.enabled ? await mcpManager?.areAllServersHealthy() : null
        }
      };
      
      res.json(health);
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Serve static files in production
  if (config.nodeEnv === 'production') {
    const frontendPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString()
    });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    
    res.status(err.status || 500).json({
      error: config.nodeEnv === 'production' ? 'Internal Server Error' : err.message,
      timestamp: new Date().toISOString(),
      ...(config.nodeEnv !== 'production' && { stack: err.stack })
    });
  });

  return app;
}

/**
 * Setup WebSocket server for real-time communication
 */
function setupWebSocket(server: any): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.corsOrigin.split(','),
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Send initial status
    socket.emit('agent-status', {
      type: 'status-update',
      payload: {
        status: 'ready',
        isThinking: false,
        confidence: 0.85
      }
    });

    // Handle agent queries
    socket.on('agent-query', async (data) => {
      try {
        logger.info(`Processing query from ${socket.id}: ${data.query?.substring(0, 50)}...`);
        
        // Emit thinking status
        socket.emit('agent-status', {
          type: 'status-update',
          payload: {
            status: 'thinking',
            isThinking: true,
            currentTask: 'Processing query'
          }
        });

        // Process with coding agent
        const response = await codingAgent.processRequest(
          data.query, 
          data.sessionId || socket.id,
          data.options
        );

        // Emit response
        socket.emit('agent-response', response);
        
        // Reset status
        socket.emit('agent-status', {
          type: 'status-update',
          payload: {
            status: 'ready',
            isThinking: false
          }
        });
        
      } catch (error) {
        logger.error(`Error processing query from ${socket.id}:`, error);
        socket.emit('agent-error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Initialize MCP Manager if enabled
 */
let mcpManager: MCPManager | null = null;

async function initializeMCP(): Promise<void> {
  if (!config.mcp.enabled) {
    logger.info('MCP is disabled');
    return;
  }

  try {
    logger.info('Initializing MCP Manager...');
    
    // Filter enabled servers
    const enabledServers = defaultMCPServers.filter(server => {
      switch (server.id) {
        case 'playwright':
          return config.mcp.playwright;
        case 'context-portal':
          return config.mcp.contextPortal;
        case 'memory-keeper':
          return config.mcp.memoryKeeper;
        default:
          return false;
      }
    });

    if (enabledServers.length === 0) {
      logger.warn('No MCP servers enabled');
      return;
    }

    mcpManager = new MCPManager();
    await mcpManager.initialize(enabledServers);
    
    // Connect coding agent to MCP
    (codingAgent as any).mcpManager = mcpManager;
    
    logger.info(`MCP Manager initialized with ${enabledServers.length} servers`);
  } catch (error) {
    logger.error('Failed to initialize MCP Manager:', error);
  }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  if (mcpManager) {
    await mcpManager.shutdown();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  if (mcpManager) {
    await mcpManager.shutdown();
  }
  
  process.exit(0);
});

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Starting GitHub Dev Agent Server...');
    
    // Initialize MCP if enabled
    await initializeMCP();
    
    // Create Express app
    const app = createApp();
    const server = createServer(app);
    
    // Setup WebSocket
    const io = setupWebSocket(server);
    
    // Store io instance for routes
    (app as any).io = io;
    
    // Start listening
    server.listen(config.port, config.host, () => {
      logger.info(`Server running on http://${config.host}:${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`CORS Origin: ${config.corsOrigin}`);
      logger.info(`MCP Enabled: ${config.mcp.enabled}`);
      
      if (config.nodeEnv === 'development') {
        logger.info('Frontend available at http://localhost:3000');
        logger.info('API Documentation: http://localhost:8080/health');
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

export { createApp, startServer };
export default createApp;