import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { autonomousAgent, AutonomousAgent } from '../services/ai/autonomous-agent';
import { taskPlanner } from '../services/ai/task-planner';
import { Logger } from '../utils/logger';
import rateLimit from 'express-rate-limit';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const logger = new Logger('AutonomousRoutes');

// Rate limiting dla autonomous operacji (bardziej restrykcyjne)
const autonomousLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 godzina
  max: 10, // maksymalnie 10 autonomous executions na godzinę
  message: {
    error: 'Za dużo autonomous executions. Limit: 10 na godzinę.',
    retryAfter: '1 hour'
  },
  standardHeaders: true
});

// Mniej restrykcyjne dla monitoring
const monitoringLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 200, // 200 monitoring calls na 15 minut
  standardHeaders: true
});

// WebSocket server dla real-time monitoring
const wss = new WebSocket.Server({ port: 8081 });
const activeConnections = new Map<string, WebSocket>();

wss.on('connection', (ws: WebSocket, req) => {
  const connectionId = uuidv4();
  activeConnections.set(connectionId, ws);
  
  logger.info(`New WebSocket connection: ${connectionId}`);
  
  ws.send(JSON.stringify({
    type: 'connected',
    connectionId,
    message: 'Connected to Autonomous Agent monitoring'
  }));
  
  ws.on('close', () => {
    activeConnections.delete(connectionId);
    logger.info(`WebSocket connection closed: ${connectionId}`);
  });
  
  ws.on('error', (error) => {
    logger.error(`WebSocket error [${connectionId}]:`, error);
    activeConnections.delete(connectionId);
  });
});

// Funkcja do broadcastowania updateów
function broadcastUpdate(type: string, data: any) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  
  activeConnections.forEach((ws, connectionId) => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      } else {
        activeConnections.delete(connectionId);
      }
    } catch (error) {
      logger.error(`Error broadcasting to ${connectionId}:`, error);
      activeConnections.delete(connectionId);
    }
  });
}

// Event handlers dla real-time updates
autonomousAgent.on('plan-created', (data) => {
  broadcastUpdate('plan-created', data);
});

autonomousAgent.on('task-completed', (data) => {
  broadcastUpdate('task-completed', data);
});

autonomousAgent.on('deep-analysis-completed', (data) => {
  broadcastUpdate('analysis-completed', data);
});

autonomousAgent.on('strategy-adapted', (data) => {
  broadcastUpdate('strategy-adapted', data);
});

/**
 * @swagger
 * /api/autonomous/execute-goal:
 *   post:
 *     summary: Autonomiczne wykonanie celu z self-reflection
 *     tags: [Autonomous Agent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - goal
 *             properties:
 *               goal:
 *                 type: string
 *                 description: Cel do osiągnięcia
 *                 example: "Stwórz kompletny REST API dla zarządzania użytkownikami"
 *               sessionId:
 *                 type: string
 *                 description: ID sesji (opcjonalne)
 *               context:
 *                 type: object
 *                 description: Kontekst projektu
 *                 properties:
 *                   language:
 *                     type: string
 *                   framework:
 *                     type: string
 *                   projectType:
 *                     type: string
 *               constraints:
 *                 type: object
 *                 description: Ograniczenia wykonania
 *                 properties:
 *                   timeLimit:
 *                     type: number
 *                   maxTasks:
 *                     type: number
 *                   priority:
 *                     type: string
 *                     enum: [high, medium, low]
 *     responses:
 *       200:
 *         description: Wynik autonomous execution
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     executionId:
 *                       type: string
 *                     goal:
 *                       type: string
 *                     attempts:
 *                       type: number
 *                     bestScore:
 *                       type: number
 *                     totalDuration:
 *                       type: number
 *                     learningInsights:
 *                       type: array
 *                       items:
 *                         type: string
 *       202:
 *         description: Execution started (asynchronous)
 */
router.post('/execute-goal', autonomousLimiter, [
  body('goal')
    .isString()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Goal musi być tekstem o długości 10-1000 znaków'),
  body('sessionId')
    .optional()
    .isString()
    .isLength({ max: 100 }),
  body('context')
    .optional()
    .isObject(),
  body('constraints')
    .optional()
    .isObject(),
  body('async')
    .optional()
    .isBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { goal, sessionId = uuidv4(), context = {}, constraints = {}, async = false } = req.body;
    
    logger.info(`Autonomous execution request:`, {
      goal: goal.substring(0, 100),
      sessionId,
      async,
      language: context.language,
      timeLimit: constraints.timeLimit
    });

    if (async) {
      // Asynchroniczne wykonanie
      autonomousAgent.achieveGoal(goal, sessionId, context, constraints)
        .then(result => {
          broadcastUpdate('execution-completed', { sessionId, result });
          logger.info(`Async execution completed: ${sessionId}`);
        })
        .catch(error => {
          broadcastUpdate('execution-failed', { sessionId, error: error.message });
          logger.error(`Async execution failed: ${sessionId}`, error);
        });
      
      return res.status(202).json({
        success: true,
        message: 'Autonomous execution started',
        sessionId,
        monitoring: {
          websocket: 'ws://localhost:8081',
          statusEndpoint: `/api/autonomous/execution/${sessionId}/status`
        }
      });
    } else {
      // Synchroniczne wykonanie
      const result = await autonomousAgent.achieveGoal(goal, sessionId, context, constraints);
      
      res.json({
        success: true,
        data: result
      });
    }

  } catch (error) {
    logger.error('Błąd execute-goal endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/autonomous/execution/{executionId}/status:
 *   get:
 *     summary: Status wykonania autonomous goal
 *     tags: [Autonomous Agent]
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status wykonania
 */
router.get('/execution/:executionId/status', monitoringLimiter, [
  param('executionId').isString().isLength({ min: 1, max: 100 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { executionId } = req.params;
    
    const status = taskPlanner.getExecutionStatus(executionId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found',
        message: 'Execution may have completed or never existed'
      });
    }
    
    const monitoring = await autonomousAgent.monitorExecution(executionId);
    
    res.json({
      success: true,
      data: {
        ...status,
        monitoring
      }
    });

  } catch (error) {
    logger.error('Błąd execution status endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/autonomous/insights:
 *   get:
 *     summary: Insights z poprzednich wykonAń i wzorców sukcesu
 *     tags: [Autonomous Agent]
 *     responses:
 *       200:
 *         description: Insights i analytics
 */
router.get('/insights', monitoringLimiter, (req: Request, res: Response) => {
  try {
    const insights = autonomousAgent.getExecutionInsights();
    
    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    logger.error('Błąd insights endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/autonomous/recover:
 *   post:
 *     summary: Recovery z nieudanego wykonania
 *     tags: [Autonomous Agent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - executionId
 *               - failureAnalysis
 *             properties:
 *               executionId:
 *                 type: string
 *               failureAnalysis:
 *                 type: string
 *               recoveryStrategy:
 *                 type: string
 *                 enum: [retry, alternative, decompose, research, abort]
 *     responses:
 *       200:
 *         description: Wynik recovery
 */
router.post('/recover', autonomousLimiter, [
  body('executionId').isString().isLength({ min: 1, max: 100 }),
  body('failureAnalysis').isString().isLength({ min: 10, max: 2000 }),
  body('recoveryStrategy')
    .optional()
    .isIn(['retry', 'alternative', 'decompose', 'research', 'abort'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { executionId, failureAnalysis, recoveryStrategy } = req.body;
    
    logger.info(`Recovery request for execution: ${executionId}`);
    
    const recoveryResult = await autonomousAgent.recoverFromFailure(
      executionId,
      failureAnalysis
    );
    
    res.json({
      success: true,
      data: recoveryResult
    });

  } catch (error) {
    logger.error('Błąd recovery endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/autonomous/plan:
 *   post:
 *     summary: Twórz plan bez wykonania (dry-run)
 *     tags: [Autonomous Agent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - goal
 *             properties:
 *               goal:
 *                 type: string
 *               context:
 *                 type: object
 *               constraints:
 *                 type: object
 *     responses:
 *       200:
 *         description: Plan wykonania
 */
router.post('/plan', [
  body('goal').isString().isLength({ min: 10, max: 1000 }),
  body('context').optional().isObject(),
  body('constraints').optional().isObject()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { goal, context = {}, constraints = {} } = req.body;
    
    // Symuluj tworzenie planu bez wykonania
    const dryRunPlanner = new (taskPlanner.constructor as any)();
    const plan = await dryRunPlanner.createTaskPlan(goal, context, constraints);
    
    res.json({
      success: true,
      data: {
        plan,
        estimation: {
          totalTasks: plan.tasks.length,
          estimatedDuration: plan.estimatedDuration,
          complexity: this.calculatePlanComplexity(plan),
          riskLevel: this.assessPlanRisk(plan)
        }
      }
    });

  } catch (error) {
    logger.error('Błąd plan endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Plan generation failed'
    });
  }
});

/**
 * @swagger
 * /api/autonomous/history:
 *   get:
 *     summary: Historia autonomous executions
 *     tags: [Autonomous Agent]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: successOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: goalType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historia wykonAń
 */
router.get('/history', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('successOnly').optional().isBoolean(),
  query('goalType').optional().isString().isLength({ max: 50 })
], (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { limit = 20, successOnly, goalType } = req.query;
    
    // Pobierz historię z execution memory (implementacja)
    const insights = autonomousAgent.getExecutionInsights();
    
    // Tu powinno być prawdziwe pobieranie historii
    // Na razie zwracamy insights jako przykład
    
    res.json({
      success: true,
      data: {
        insights,
        filters: {
          limit: Number(limit),
          successOnly: successOnly === 'true',
          goalType: goalType as string
        },
        metadata: {
          totalExecutions: insights.totalExecutions,
          successRate: insights.successRate,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('Błąd history endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/autonomous/patterns:
 *   get:
 *     summary: Wzorce sukcesu i failure patterns
 *     tags: [Autonomous Agent]
 *     responses:
 *       200:
 *         description: Analiza wzorce
 */
router.get('/patterns', (req: Request, res: Response) => {
  try {
    const insights = autonomousAgent.getExecutionInsights();
    
    res.json({
      success: true,
      data: {
        successPatterns: insights.mostSuccessfulPatterns,
        failurePatterns: insights.commonFailures,
        trends: insights.learningTrends,
        recommendations: insights.recommendations,
        analytics: {
          totalDataPoints: insights.totalExecutions,
          confidenceLevel: insights.totalExecutions > 10 ? 'high' : 
                          insights.totalExecutions > 5 ? 'medium' : 'low'
        }
      }
    });

  } catch (error) {
    logger.error('Błąd patterns endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/autonomous/debug/{executionId}:
 *   get:
 *     summary: Debug info dla konkretnego execution
 *     tags: [Autonomous Agent]
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Debug information
 */
router.get('/debug/:executionId', [
  param('executionId').isString().isLength({ min: 1, max: 100 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { executionId } = req.params;
    
    // Pobierz debug info (implementacja zależy od internal storage)
    const debugInfo = {
      executionId,
      found: false, // Placeholder
      message: 'Debug info not implemented yet'
    };
    
    res.json({
      success: true,
      data: debugInfo
    });

  } catch (error) {
    logger.error('Błąd debug endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/autonomous/interrupt/{executionId}:
 *   post:
 *     summary: Przerwanie wykonywanego autonomous execution
 *     tags: [Autonomous Agent]
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               saveProgress:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Execution przerwany
 */
router.post('/interrupt/:executionId', [
  param('executionId').isString(),
  body('reason').optional().isString().isLength({ max: 500 }),
  body('saveProgress').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { executionId } = req.params;
    const { reason = 'User requested interruption', saveProgress = true } = req.body;
    
    logger.info(`Interruption request for execution: ${executionId}`);
    
    // TODO: Implementać prawdziwe przerwanie execution
    // Na razie placeholder response
    
    broadcastUpdate('execution-interrupted', {
      executionId,
      reason,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Execution interrupted',
      data: {
        executionId,
        reason,
        progressSaved: saveProgress,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Błąd interrupt endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/autonomous/learning/export:
 *   get:
 *     summary: Eksport zebranej wiedzy agenta
 *     tags: [Autonomous Agent]
 *     responses:
 *       200:
 *         description: Eksport wiedzy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patterns:
 *                   type: object
 *                 memory:
 *                   type: object
 *                 insights:
 *                   type: object
 */
router.get('/learning/export', (req: Request, res: Response) => {
  try {
    const insights = autonomousAgent.getExecutionInsights();
    
    // Przygotuj export data
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      insights,
      patterns: insights.mostSuccessfulPatterns,
      failures: insights.commonFailures,
      recommendations: insights.recommendations,
      metadata: {
        totalExecutions: insights.totalExecutions,
        dataQuality: insights.totalExecutions > 10 ? 'good' : 
                    insights.totalExecutions > 5 ? 'fair' : 'limited'
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="agent-learning-${Date.now()}.json"`);
    res.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    logger.error('Błąd learning export:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed'
    });
  }
});

/**
 * Endpoint dla testowania autonomous capabilities
 */
router.post('/test-goal', [
  body('complexity').isIn(['simple', 'medium', 'complex']),
  body('domain').optional().isString()
], async (req: Request, res: Response) => {
  try {
    const { complexity, domain = 'web-development' } = req.body;
    
    const testGoals = {
      simple: [
        'Stwórz funkcję do walidacji adresu email',
        'Wygeneruj prosty REST endpoint dla health check',
        'Napisz unit test dla funkcji sortowania'
      ],
      medium: [
        'Stwórz kompletny CRUD API dla user management',
        'Zaprojektuj i zaimplementuj system cache\'owania',
        'Utwórz middleware do autoryzacji JWT'
      ],
      complex: [
        'Zaprojektuj i zaimplementuj microservice architecture',
        'Stwórz kompletny system CI/CD pipeline',
        'Zaimplementuj real-time collaboration system'
      ]
    };
    
    const goals = testGoals[complexity as keyof typeof testGoals];
    const randomGoal = goals[Math.floor(Math.random() * goals.length)];
    
    // Uruchom test z niskim limitem czasu
    const result = await autonomousAgent.achieveGoal(
      randomGoal,
      `test-${Date.now()}`,
      { projectType: domain },
      { timeLimit: complexity === 'simple' ? 300000 : complexity === 'medium' ? 900000 : 1800000 }
    );
    
    res.json({
      success: true,
      data: {
        testGoal: randomGoal,
        complexity,
        domain,
        result
      }
    });

  } catch (error) {
    logger.error('Błąd test-goal endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Test execution failed'
    });
  }
});

// Helper functions (powinny być w service layer)
function calculatePlanComplexity(plan: any): string {
  const taskCount = plan.tasks.length;
  const dependencies = plan.tasks.reduce((sum: number, task: any) => sum + task.dependencies.length, 0);
  const avgDependencies = dependencies / taskCount;
  
  if (taskCount > 20 || avgDependencies > 3) return 'high';
  if (taskCount > 10 || avgDependencies > 1.5) return 'medium';
  return 'low';
}

function assessPlanRisk(plan: any): string {
  const highRiskTasks = plan.tasks.filter((task: any) => 
    task.type === 'mcp_operation' || 
    task.estimatedDuration > 1800000 // > 30 min
  ).length;
  
  const riskRatio = highRiskTasks / plan.tasks.length;
  
  if (riskRatio > 0.5) return 'high';
  if (riskRatio > 0.2) return 'medium';
  return 'low';
}

// Middleware dla WebSocket connection info
router.use('/ws-info', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      websocketUrl: 'ws://localhost:8081',
      activeConnections: activeConnections.size,
      supportedEvents: [
        'plan-created',
        'task-completed',
        'analysis-completed',
        'strategy-adapted',
        'execution-completed',
        'execution-failed',
        'execution-interrupted'
      ]
    }
  });
});

export default router;
export { broadcastUpdate };