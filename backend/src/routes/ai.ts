import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { codingAgent, CodingAgent } from '../services/ai/coding-agent';
import { pollinationsAI } from '../services/ai/pollinations-client';
import { Logger } from '../utils/logger';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const logger = new Logger('AIRoutes');

// Rate limiting dla endpointów AI
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 100, // maksymalnie 100 zapytań na IP
  message: {
    error: 'Za dużo zapytań AI. Spróbuj ponownie za 15 minut.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Walidatory dla różnych endpointów
const chatValidation = [
  body('query')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Zapytanie musi być tekstem o długości 1-10000 znaków'),
  body('sessionId')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('SessionId musi być tekstem o długości 1-100 znaków'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options musi być obiektem'),
  body('options.language')
    .optional()
    .isIn(['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'csharp', 'php'])
    .withMessage('Nieobsługiwany język programowania'),
  body('options.framework')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Framework musi być tekstem o max 50 znakach')
];

const codeAnalysisValidation = [
  body('code')
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Kod musi być tekstem o długości 1-50000 znaków'),
  body('analysisType')
    .isIn(['security', 'performance', 'architecture', 'quality'])
    .withMessage('Typ analizy musi być jednym z: security, performance, architecture, quality'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context musi być obiektem')
];

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chat z agentem kodującym
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Zapytanie do agenta
 *                 example: "Stwórz funkcję do sortowania tablicy obiektów"
 *               sessionId:
 *                 type: string
 *                 description: ID sesji (opcjonalne)
 *                 example: "session-123"
 *               options:
 *                 type: object
 *                 description: Opcje konfiguracyjne
 *                 properties:
 *                   language:
 *                     type: string
 *                     enum: [typescript, javascript, python, go, rust, java, csharp, php]
 *                   framework:
 *                     type: string
 *                   projectType:
 *                     type: string
 *     responses:
 *       200:
 *         description: Odpowiedź agenta
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
 *                     content:
 *                       type: string
 *                     intent:
 *                       type: string
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     metadata:
 *                       type: object
 */
router.post('/chat', aiLimiter, chatValidation, async (req: Request, res: Response) => {
  try {
    // Walidacja
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { query, sessionId = uuidv4(), options = {} } = req.body;
    
    logger.info(`Chat request [${sessionId}]:`, {
      queryLength: query.length,
      language: options.language,
      framework: options.framework
    });

    // Wywołaj agenta
    const response = await codingAgent.processRequest(query, sessionId, options);
    
    logger.info(`Chat response [${sessionId}]:`, {
      success: response.success,
      intent: response.intent,
      contentLength: response.content.length
    });

    res.json({
      success: true,
      data: response,
      sessionId
    });

  } catch (error) {
    logger.error('Błąd chat endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/ai/analyze-code:
 *   post:
 *     summary: Analiza kodu
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - analysisType
 *             properties:
 *               code:
 *                 type: string
 *                 description: Kod do analizy
 *               analysisType:
 *                 type: string
 *                 enum: [security, performance, architecture, quality]
 *                 description: Typ analizy
 *               context:
 *                 type: object
 *                 description: Kontekst projektu
 *     responses:
 *       200:
 *         description: Wynik analizy
 */
router.post('/analyze-code', aiLimiter, codeAnalysisValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { code, analysisType, context = {} } = req.body;
    
    logger.info('Code analysis request:', {
      codeLength: code.length,
      analysisType,
      language: context.language
    });

    const response = await pollinationsAI.analyzeCode(code, analysisType, context);
    
    res.json({
      success: true,
      data: {
        analysis: response.content,
        metadata: response.metadata,
        usage: response.usage
      }
    });

  } catch (error) {
    logger.error('Błąd analyze-code endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/ai/generate-tests:
 *   post:
 *     summary: Generowanie testów dla kodu
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - testType
 *             properties:
 *               code:
 *                 type: string
 *                 description: Kod do testowania
 *               testType:
 *                 type: string
 *                 enum: [unit, integration, e2e, performance]
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: Wygenerowane testy
 */
router.post('/generate-tests', aiLimiter, [
  body('code').isString().isLength({ min: 1, max: 50000 }),
  body('testType').isIn(['unit', 'integration', 'e2e', 'performance']),
  body('context').optional().isObject()
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

    const { code, testType, context = {} } = req.body;
    
    logger.info('Test generation request:', {
      codeLength: code.length,
      testType,
      language: context.language
    });

    const response = await pollinationsAI.generateTests(code, testType, context);
    
    res.json({
      success: true,
      data: {
        tests: response.content,
        testType,
        metadata: response.metadata,
        usage: response.usage
      }
    });

  } catch (error) {
    logger.error('Błąd generate-tests endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/ai/sessions/{sessionId}:
 *   delete:
 *     summary: Usuń sesję agenta
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sesja usunięta
 */
router.delete('/sessions/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'SessionId is required'
      });
    }

    codingAgent.clearSession(sessionId);
    
    logger.info(`Cleared session: ${sessionId}`);
    
    res.json({
      success: true,
      message: 'Session cleared'
    });

  } catch (error) {
    logger.error('Błąd clearing session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/ai/stats:
 *   get:
 *     summary: Statystyki agenta
 *     tags: [AI]
 *     responses:
 *       200:
 *         description: Statystyki agenta
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
 *                     activeSessions:
 *                       type: number
 *                     totalConversations:
 *                       type: number
 *                     mcpConnected:
 *                       type: boolean
 *                     uptime:
 *                       type: number
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = codingAgent.getStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Błąd stats endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/ai/health:
 *   get:
 *     summary: Sprawdzenie zdrowia agenta i wszystkich dependencies
 *     tags: [AI]
 *     responses:
 *       200:
 *         description: Status zdrowia
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 healthy:
 *                   type: boolean
 *                 services:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       type: boolean
 *                     pollinations:
 *                       type: boolean
 *                     mcp:
 *                       type: boolean
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const agentHealthy = await codingAgent.healthCheck();
    const pollinationsHealthy = await pollinationsAI.healthCheck();
    
    const services = {
      agent: agentHealthy,
      pollinations: pollinationsHealthy,
      mcp: codingAgent.getStats().mcpConnected
    };
    
    const overall = Object.values(services).every(status => status);
    
    res.json({
      success: true,
      healthy: overall,
      services,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Błąd health endpoint:', error);
    res.status(500).json({
      success: false,
      healthy: false,
      error: 'Health check failed'
    });
  }
});

/**
 * @swagger
 * /api/ai/models:
 *   get:
 *     summary: Lista dostępnych modeli AI
 *     tags: [AI]
 *     responses:
 *       200:
 *         description: Lista modeli
 */
router.get('/models', async (req: Request, res: Response) => {
  try {
    const models = await pollinationsAI.getAvailableModels();
    
    res.json({
      success: true,
      data: {
        models,
        default: 'openai',
        provider: 'pollinations.ai'
      }
    });

  } catch (error) {
    logger.error('Błąd models endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models'
    });
  }
});

/**
 * @swagger
 * /api/ai/raw-chat:
 *   post:
 *     summary: Bezpośredni chat z Pollinations AI (bez agenta)
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [system, user, assistant]
 *                     content:
 *                       type: string
 *               options:
 *                 type: object
 *                 properties:
 *                   temperature:
 *                     type: number
 *                   maxTokens:
 *                     type: number
 *                   seed:
 *                     type: number
 *     responses:
 *       200:
 *         description: Odpowiedź AI
 */
router.post('/raw-chat', aiLimiter, [
  body('messages')
    .isArray({ min: 1, max: 50 })
    .withMessage('Messages musi być tablicą 1-50 elementów'),
  body('messages.*.role')
    .isIn(['system', 'user', 'assistant'])
    .withMessage('Role musi być jednym z: system, user, assistant'),
  body('messages.*.content')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content musi być tekstem 1-10000 znaków'),
  body('options')
    .optional()
    .isObject()
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

    const { messages, options = {} } = req.body;
    
    logger.info('Raw chat request:', {
      messagesCount: messages.length,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    });

    const response = await pollinationsAI.chat(messages, options);
    
    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Błąd raw-chat endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Middleware do obsługi błędów specyficznych dla AI
 */
router.use((error: Error, req: Request, res: Response, next: any) => {
  logger.error('AI Router Error:', error);
  
  // Specjalna obsługa błędów API
  if (error.message.includes('Rate Limited')) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Za dużo zapytań. Spróbuj ponownie później.'
    });
  }
  
  if (error.message.includes('Network Error')) {
    return res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: 'Pollinations AI nie jest dostępny. Spróbuj ponownie później.'
    });
  }
  
  // Ogólny błąd
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'Unexpected error occurred'
  });
});

export default router;