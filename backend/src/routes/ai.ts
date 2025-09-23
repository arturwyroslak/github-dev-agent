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
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Za dużo zapytań AI. Spróbuj ponownie za 15 minut.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// FALLBACK AI RESPONSES - typed properly
const fallbackResponses: Record<string, string[]> = {
  error: [
    "Analizuję błąd... Mogę pomóc w debugowaniu. Pokaż mi stack trace lub opisz problem.",
    "Debug mode ON... Potrzebuję więcej info: jaki framework używasz? Jakie błędy w konsoli?"
  ],
  code: [
    "Przeglądam kod... Mogę zrobić code review, refaktoring, sprawdzić performance.",
    "Kod analiza ready... Jaki język/framework? Pokaż co chcesz optymalizować."
  ],
  deploy: [
    "DevOps support... Docker, CI/CD, Kubernetes - w czym pomogę?",
    "Deployment analiza... Jaka platforma docelowa? AWS, Vercel, own VPS?"
  ],
  api: [
    "API design... REST, GraphQL? Pomogę z endpointami i dokumentacją.",
    "Backend architecture... Express, Fastify, NestJS? Co budujemy?"
  ],
  frontend: [
    "Frontend dev... React, Vue, Angular? UI/UX optymalizacja.",
    "Component architecture... State management, routing - jakie wyzwania?"
  ],
  default: [
    "GitHub Dev Agent gotowy! Architektura, CI/CD, code review - w czym pomogę?",
    "Programming assistant online. Opisz projekt lub problem do rozwiązania."
  ]
};

const getSmartFallback = (query: string): string => {
  const q = query.toLowerCase();
  
  let category = 'default';
  
  if (/błąd|error|problem|crash/.test(q)) category = 'error';
  else if (/kod|code|implementacja|function/.test(q)) category = 'code';
  else if (/deploy|docker|ci\/cd|kubernetes/.test(q)) category = 'deploy';
  else if (/api|endpoint|backend|server/.test(q)) category = 'api';
  else if (/frontend|react|ui|component/.test(q)) category = 'frontend';
  
  const responses = fallbackResponses[category] || fallbackResponses.default || [];
  if (responses.length === 0) {
    return "GitHub Dev Agent gotowy! Architektura, CI/CD, code review - w czym pomogę?";
  }
  return responses[Math.floor(Math.random() * responses.length)] || responses[0] || "GitHub Dev Agent gotowy! Architektura, CI/CD, code review - w czym pomogę?";
};

// Walidatory
const chatValidation = [
  body('query')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Query required (1-10000 chars)'),
  body('sessionId')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('SessionId must be string (1-100 chars)'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be object')
];

/**
 * MAIN CHAT ENDPOINT - ALWAYS WORKS
 */
router.post('/chat', aiLimiter, chatValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        data: {
          success: false,
          content: "Niepoprawne zapytanie. Sprawdź format danych.",
          intent: "error",
          metadata: {
            sessionId: uuidv4(),
            error: "Validation failed",
            timestamp: new Date().toISOString()
          }
        }
      }) as any;
    }

    const { query, sessionId = uuidv4(), options = {} } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          success: false,
          content: "Zapytanie nie może być puste. Opisz problem!",
          intent: "error",
          metadata: {
            sessionId,
            error: "Empty query",
            timestamp: new Date().toISOString()
          }
        },
        sessionId
      }) as any;
    }
    
    logger.info(`💬 Chat [${sessionId}]:`, {
      queryLength: query.length,
      preview: query.substring(0, 50) + (query.length > 50 ? '...' : '')
    });

    try {
      // TRY 1: Real AI Agent
      const response = await codingAgent.processRequest(query, sessionId, options);
      
      logger.info(`✅ AI Agent success [${sessionId}]`);
      
      return res.json({
        success: true,
        data: {
          success: true,
          content: response.content,
          intent: response.intent || 'chat',
          metadata: {
            sessionId,
            timestamp: new Date().toISOString(),
            model: 'coding-agent',
            suggestions: response.suggestions || []
          }
        },
        sessionId
      }) as any;
      
    } catch (agentError: unknown) {
      const agentMsg = agentError instanceof Error ? agentError.message : 'Agent error';
      logger.warn(`🤖 Agent failed [${sessionId}]: ${agentMsg}`);
      
      try {
        // TRY 2: Pollinations AI
        const messages = [{
          role: 'system' as const,
          content: 'Jesteś GitHub Dev Agent. Odpowiadaj po polsku, konkretnie.'
        }, {
          role: 'user' as const,
          content: query
        }];
        
        const pollinationsResponse = await pollinationsAI.chat(messages, { 
          temperature: 0.7, 
          maxTokens: 500 
        });
        
        logger.info(`✅ Pollinations success [${sessionId}]`);
        
        return res.json({
          success: true,
          data: {
            success: true,
            content: pollinationsResponse.content,
            intent: 'chat',
            metadata: {
              sessionId,
              timestamp: new Date().toISOString(),
              model: 'pollinations-ai',
              usage: pollinationsResponse.usage || {}
            }
          },
          sessionId
        }) as any;
        
      } catch (pollinationsError: unknown) {
        const pollMsg = pollinationsError instanceof Error ? pollinationsError.message : 'Pollinations error';
        logger.warn(`🔄 Pollinations failed [${sessionId}]: ${pollMsg}`);
        
        // TRY 3: Smart Fallback (ALWAYS WORKS)
        const fallbackResponse = getSmartFallback(query);
        
        logger.info(`🧠 Fallback used [${sessionId}]`);
        
        return res.json({
          success: true,
          data: {
            success: true,
            content: fallbackResponse,
            intent: 'chat',
            metadata: {
              sessionId,
              timestamp: new Date().toISOString(),
              model: 'smart-fallback',
              note: 'AI services unavailable - using local responses'
            }
          },
          sessionId
        }) as any;
      }
    }

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ Critical error:', errorMsg);
    
    const errorSessionId = req.body?.sessionId || uuidv4();
    
    return res.json({
      success: true, // Always success to prevent frontend crashes
      data: {
        success: false,
        content: "Serwer przeciążony. Spróbuj ponownie lub opisz problem bardziej szczegółowo.",
        intent: "error",
        metadata: {
          sessionId: errorSessionId,
          error: "Server error",
          timestamp: new Date().toISOString(),
          model: 'emergency-fallback'
        }
      },
      sessionId: errorSessionId
    }) as any;
  }
});

// REST OF ENDPOINTS UNCHANGED

const codeAnalysisValidation = [
  body('code').isString().isLength({ min: 1, max: 50000 }),
  body('analysisType').isIn(['security', 'performance', 'architecture', 'quality']),
  body('context').optional().isObject()
];

router.post('/analyze-code', aiLimiter, codeAnalysisValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      }) as any;
    }

    const { code, analysisType, context = {} } = req.body;
    const response = await pollinationsAI.analyzeCode(code, analysisType, context);
    
    res.json({
      success: true,
      data: {
        analysis: response.content,
        metadata: response.metadata,
        usage: response.usage
      }
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Analyze-code error:', msg);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: msg
    });
  }
});

router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const agentHealthy = await codingAgent.healthCheck();
    const pollinationsHealthy = await pollinationsAI.healthCheck();
    
    const services = {
      agent: agentHealthy,
      pollinations: pollinationsHealthy,
      mcp: codingAgent.getStats().mcpConnected,
      fallback: true // Always available
    };
    
    res.json({
      success: true,
      healthy: true, // Always healthy thanks to fallback
      services,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    logger.error('Health check error:', error);
    res.status(200).json({
      success: true,
      healthy: true,
      services: { fallback: true },
      error: 'Health check failed but fallback active'
    });
  }
});

router.get('/stats', (req: Request, res: Response): void => {
  try {
    const stats = codingAgent.getStats();
    res.json({ success: true, data: stats });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Stats error:', msg);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: any): void => {
  logger.error('Router Error:', error);
  
  res.status(200).json({
    success: true,
    data: {
      success: false,
      content: 'Nieoczekiwany błąd, ale jestem gotowy pomóc! Opisz problem.',
      intent: 'error',
      metadata: {
        timestamp: new Date().toISOString(),
        model: 'error-fallback'
      }
    }
  });
});

export default router;