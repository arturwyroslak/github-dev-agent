import { pollinationsAI, PollinationsAIClient, CodingContext, CodeAnalysisType, TestType } from './pollinations-client';
import { MCPManager } from '../../modules/mcp';
import { Logger } from '../../utils/logger';
import { EventEmitter } from 'events';

/**
 * Zaawansowany agent kodujący z integracją MCP i AI
 * Wykorzystuje Pollinations.ai jako darmowy backend LLM
 */
export class CodingAgent extends EventEmitter {
  private aiClient: PollinationsAIClient;
  private mcpManager: MCPManager | null = null;
  private logger: Logger;
  private conversationHistory: Map<string, any[]> = new Map();
  private projectContext: Map<string, CodingContext> = new Map();

  constructor(mcpManager?: MCPManager) {
    super();
    this.aiClient = pollinationsAI;
    this.mcpManager = mcpManager || null;
    this.logger = new Logger('CodingAgent');
  }

  /**
   * Główna metoda agenta - interpretuje zapytanie i wykonuje akcje
   */
  async processRequest(
    query: string,
    sessionId: string = 'default',
    options: AgentOptions = {}
  ): Promise<AgentResponse> {
    try {
      this.logger.info(`[${sessionId}] Przetwarzanie zapytania: ${query.substring(0, 100)}...`);
      
      // Pobierz lub utwórz kontekst sesji
      const context = this.getOrCreateContext(sessionId, options);
      
      // Analizuj intencję zapytania
      const intent = await this.analyzeIntent(query, context);
      this.emit('intent-detected', { sessionId, intent });
      
      // Wykonaj odpowiednią akcję na podstawie intencji
      const response = await this.executeIntent(intent, query, context, sessionId);
      
      // Zapisz w historii konwersacji
      this.updateConversationHistory(sessionId, query, response.content);
      
      // Zapamiętaj kluczowe informacje w MCP
      if (this.mcpManager && response.shouldRemember) {
        await this.storeInMCP(response, context, sessionId);
      }
      
      this.emit('response-generated', { sessionId, response });
      return response;
      
    } catch (error) {
      this.logger.error(`Błąd przetwarzania zapytania [${sessionId}]:`, error);
      return {
        success: false,
        content: `Przepraszam, wystąpił błąd podczas przetwarzania zapytania: ${error instanceof Error ? error.message : 'Unknown error'}`,
        intent: 'error',
        metadata: {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Analizuje intencję użytkownika
   */
  private async analyzeIntent(query: string, context: CodingContext): Promise<AgentIntent> {
    const intentPrompt = `Przeanalizuj następujące zapytanie i określ główną intencję użytkownika:

"${query}"

Możliwe intencje:
- code_generation: Tworzenie nowego kodu
- code_review: Przegląd i analiza istniejącego kodu  
- debugging: Znajdowanie i naprawianie błędów
- testing: Generowanie testów
- refactoring: Refaktoryzacja kodu
- architecture: Projektowanie architektury
- documentation: Tworzenie dokumentacji
- mcp_operation: Operacje z serwerami MCP (browser, memory, context)
- question: Pytania techniczne
- other: Inne

Odpowiedz TYLKO nazwą intencji.`;
    
    try {
      const response = await this.aiClient.chat([
        { role: 'user', content: intentPrompt }
      ], { temperature: 0.1, maxTokens: 50 });
      
      const intent = response.content.toLowerCase().trim() as AgentIntent;
      this.logger.debug(`Wykryta intencja: ${intent}`);
      return intent;
    } catch (error) {
      this.logger.warn('Nie można określić intencji, używam default:', error);
      return 'code_generation';
    }
  }

  /**
   * Wykonuje akcję na podstawie wykrytej intencji
   */
  private async executeIntent(
    intent: AgentIntent,
    query: string,
    context: CodingContext,
    sessionId: string
  ): Promise<AgentResponse> {
    switch (intent) {
      case 'code_generation':
        return this.handleCodeGeneration(query, context, sessionId);
      
      case 'code_review':
        return this.handleCodeReview(query, context, sessionId);
      
      case 'debugging':
        return this.handleDebugging(query, context, sessionId);
      
      case 'testing':
        return this.handleTestGeneration(query, context, sessionId);
      
      case 'refactoring':
        return this.handleRefactoring(query, context, sessionId);
      
      case 'architecture':
        return this.handleArchitecture(query, context, sessionId);
      
      case 'documentation':
        return this.handleDocumentation(query, context, sessionId);
      
      case 'mcp_operation':
        return this.handleMCPOperation(query, context, sessionId);
      
      case 'question':
        return this.handleQuestion(query, context, sessionId);
      
      default:
        return this.handleGeneral(query, context, sessionId);
    }
  }

  /**
   * Obsługuje generowanie kodu
   */
  private async handleCodeGeneration(
    query: string,
    context: CodingContext,
    sessionId: string
  ): Promise<AgentResponse> {
    this.logger.info('Generowanie kodu...');
    
    const response = await this.aiClient.askCodingAgent(query, context);
    
    return {
      success: true,
      content: response.content,
      intent: 'code_generation',
      shouldRemember: true,
      metadata: {
        sessionId,
        tokens: response.usage.totalTokens,
        model: response.model,
        timestamp: new Date().toISOString()
      },
      suggestions: [
        'Czy chcesz że wygeneruję testy dla tego kodu?',
        'Mogę przeanalizować ten kod pod kątem bezpieczeństwa',
        'Czy potrzebujesz dokumentacji dla tego kodu?'
      ]
    };
  }

  /**
   * Obsługuje przegląd kodu
   */
  private async handleCodeReview(
    query: string,
    context: CodingContext,
    sessionId: string
  ): Promise<AgentResponse> {
    this.logger.info('Przeprowadzanie code review...');
    
    // Wyciągnij kod z zapytania
    const codeMatch = query.match(/```[\s\S]*?```/);
    if (!codeMatch) {
      return {
        success: false,
        content: 'Nie znalazłem kodu do przeglądu. Proszę wklej kod w blokach ```',
        intent: 'code_review',
        metadata: { sessionId }
      };
    }
    
    const code = codeMatch[0].replace(/```\w*\n?|```/g, '').trim();
    const response = await this.aiClient.analyzeCode(code, 'quality', context);
    
    return {
      success: true,
      content: response.content,
      intent: 'code_review',
      shouldRemember: true,
      metadata: {
        sessionId,
        codeLength: code.length,
        tokens: response.usage.totalTokens,
        timestamp: new Date().toISOString()
      },
      suggestions: [
        'Mogę przeprowadzić głębszą analizę bezpieczeństwa',
        'Czy chcesz analizę wydajności tego kodu?',
        'Mogę zaproponować refaktoryzację'
      ]
    };
  }

  /**
   * Obsługuje debugowanie
   */
  private async handleDebugging(
    query: string,
    context: CodingContext,
    sessionId: string
  ): Promise<AgentResponse> {
    this.logger.info('Debugowanie kodu...');
    
    const debugContext = {
      ...context,
      currentTask: 'debugging'
    };
    
    const response = await this.aiClient.askCodingAgent(
      `Debug następujący problem: ${query}`,
      debugContext
    );
    
    return {
      success: true,
      content: response.content,
      intent: 'debugging',
      shouldRemember: true,
      metadata: {
        sessionId,
        tokens: response.usage.totalTokens,
        timestamp: new Date().toISOString()
      },
      suggestions: [
        'Czy chcesz że dodam testy zapobiegające tym błędom?',
        'Mogę sprawdzić inne podobne miejsca w kodzie',
        'Czy potrzebujesz pomocy z testowaniem poprawki?'
      ]
    };
  }

  /**
   * Obsługuje generowanie testów
   */
  private async handleTestGeneration(
    query: string,
    context: CodingContext,
    sessionId: string
  ): Promise<AgentResponse> {
    this.logger.info('Generowanie testów...');
    
    // Wyciągnij kod z zapytania
    const codeMatch = query.match(/```[\s\S]*?```/);
    if (!codeMatch) {
      return {
        success: false,
        content: 'Nie znalazłem kodu do testowania. Proszę wklej kod w blokach ```',
        intent: 'testing',
        metadata: { sessionId }
      };
    }
    
    const code = codeMatch[0].replace(/```\w*\n?|```/g, '').trim();
    
    // Określ typ testu na podstawie zapytania
    let testType: TestType = 'unit';
    if (query.toLowerCase().includes('integration')) testType = 'integration';
    if (query.toLowerCase().includes('e2e')) testType = 'e2e';
    if (query.toLowerCase().includes('performance')) testType = 'performance';
    
    const response = await this.aiClient.generateTests(code, testType, context);
    
    return {
      success: true,
      content: response.content,
      intent: 'testing',
      shouldRemember: true,
      metadata: {
        sessionId,
        testType,
        codeLength: code.length,
        tokens: response.usage.totalTokens,
        timestamp: new Date().toISOString()
      },
      suggestions: [
        'Czy chcesz że uruchomię testy automatycznie?',
        'Mogę wygenerować dodatkowe testy edge case',
        'Czy potrzebujesz pomocy z konfiguracją testów?'
      ]
    };
  }

  /**
   * Obsługuje operacje MCP
   */
  private async handleMCPOperation(
    query: string,
    context: CodingContext,
    sessionId: string
  ): Promise<AgentResponse> {
    this.logger.info('Wykonywanie operacji MCP...');
    
    if (!this.mcpManager) {
      return {
        success: false,
        content: 'MCP Manager nie jest skonfigurowany. Nie mogę wykonać operacji MCP.',
        intent: 'mcp_operation',
        metadata: { sessionId }
      };
    }
    
    try {
      // Przeanalizuj które narzędzie MCP użyć
      const mcpAction = await this.determineMCPAction(query);
      const result = await this.executeMCPAction(mcpAction, query);
      
      return {
        success: true,
        content: result,
        intent: 'mcp_operation',
        shouldRemember: false,
        metadata: {
          sessionId,
          mcpAction: mcpAction.tool,
          server: mcpAction.server,
          timestamp: new Date().toISOString()
        },
        suggestions: [
          'Czy chcesz wykonać więcej operacji MCP?',
          'Mogę zapisać wyniki w kontekście projektu',
          'Czy potrzebujesz pomocy z interpretacją wyników?'
        ]
      };
    } catch (error) {
      return {
        success: false,
        content: `Błąd wykonania operacji MCP: ${error instanceof Error ? error.message : 'Unknown error'}`,
        intent: 'mcp_operation',
        metadata: { sessionId, error: String(error) }
      };
    }
  }

  /**
   * Obsługuje pytania techniczne
   */
  private async handleQuestion(
    query: string,
    context: CodingContext,
    sessionId: string
  ): Promise<AgentResponse> {
    this.logger.info('Odpowiadanie na pytanie techniczne...');
    
    const response = await this.aiClient.askCodingAgent(
      `Odpowiedz na pytanie: ${query}`,
      context
    );
    
    return {
      success: true,
      content: response.content,
      intent: 'question',
      shouldRemember: false,
      metadata: {
        sessionId,
        tokens: response.usage.totalTokens,
        timestamp: new Date().toISOString()
      },
      suggestions: [
        'Czy chcesz że pokażę przykład kodu?',
        'Mogę wygenerować implementację tego rozwiązania',
        'Czy potrzebujesz więcej szczegółów technicznych?'
      ]
    };
  }

  /**
   * Obsługuje pozostałe zapytania
   */
  private async handleGeneral(
    query: string,
    context: CodingContext,
    sessionId: string
  ): Promise<AgentResponse> {
    this.logger.info('Obsługa ogólnego zapytania...');
    
    const response = await this.aiClient.askCodingAgent(query, context);
    
    return {
      success: true,
      content: response.content,
      intent: 'other',
      shouldRemember: false,
      metadata: {
        sessionId,
        tokens: response.usage.totalTokens,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Dodaj pozostałe metody...
  private async handleRefactoring(query: string, context: CodingContext, sessionId: string): Promise<AgentResponse> {
    // Implementacja refaktoryzacji
    const response = await this.aiClient.askCodingAgent(`Refaktoryzuj kod: ${query}`, context);
    return {
      success: true,
      content: response.content,
      intent: 'refactoring',
      shouldRemember: true,
      metadata: { sessionId, tokens: response.usage.totalTokens, timestamp: new Date().toISOString() }
    };
  }

  private async handleArchitecture(query: string, context: CodingContext, sessionId: string): Promise<AgentResponse> {
    // Implementacja projektowania architektury
    const response = await this.aiClient.askCodingAgent(`Zaprojektuj architekturę: ${query}`, context);
    return {
      success: true,
      content: response.content,
      intent: 'architecture',
      shouldRemember: true,
      metadata: { sessionId, tokens: response.usage.totalTokens, timestamp: new Date().toISOString() }
    };
  }

  private async handleDocumentation(query: string, context: CodingContext, sessionId: string): Promise<AgentResponse> {
    // Implementacja dokumentacji
    const response = await this.aiClient.askCodingAgent(`Utwórz dokumentację: ${query}`, context);
    return {
      success: true,
      content: response.content,
      intent: 'documentation', 
      shouldRemember: true,
      metadata: { sessionId, tokens: response.usage.totalTokens, timestamp: new Date().toISOString() }
    };
  }

  /**
   * Określa jaką akcję MCP wykonać
   */
  private async determineMCPAction(query: string): Promise<MCPAction> {
    // Prosta logika dopasowania - można ulepszyć AI
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('screenshot') || lowerQuery.includes('navigate') || lowerQuery.includes('click')) {
      return { server: 'playwright', tool: 'browser_automation' };
    }
    
    if (lowerQuery.includes('remember') || lowerQuery.includes('context') || lowerQuery.includes('decision')) {
      return { server: 'context-portal', tool: 'context_management' };
    }
    
    if (lowerQuery.includes('memory') || lowerQuery.includes('store') || lowerQuery.includes('recall')) {
      return { server: 'memory-keeper', tool: 'memory_management' };
    }
    
    return { server: 'context-portal', tool: 'general' };
  }

  /**
   * Wykonuje akcję MCP
   */
  private async executeMCPAction(action: MCPAction, query: string): Promise<string> {
    if (!this.mcpManager) {
      throw new Error('MCP Manager nie jest dostępny');
    }
    
    // Przykładowa implementacja - należy rozszerzyć
    const result = await this.mcpManager.callTool(action.server, {
      name: action.tool,
      arguments: { query }
    });
    
    return `Wykonano operację ${action.tool} na serwerze ${action.server}:\n${JSON.stringify(result, null, 2)}`;
  }

  /**
   * Pobiera lub tworzy kontekst sesji
   */
  private getOrCreateContext(sessionId: string, options: AgentOptions): CodingContext {
    if (!this.projectContext.has(sessionId)) {
      this.projectContext.set(sessionId, {
        projectType: options.projectType || 'web-application',
        language: options.language || 'typescript',
        framework: options.framework || 'node.js',
        architecture: options.architecture || 'microservices',
        constraints: options.constraints || [],
        codeStyle: options.codeStyle || 'clean-code',
        projectSeed: Math.floor(Math.random() * 1000000)
      });
    }
    
    const context = this.projectContext.get(sessionId)!;
    
    // Dodaj historię konwersacji
    if (this.conversationHistory.has(sessionId)) {
      context.conversationHistory = this.conversationHistory.get(sessionId)!.slice(-10); // Ostatnie 10 wiadomości
    }
    
    return context;
  }

  /**
   * Aktualizuje historię konwersacji
   */
  private updateConversationHistory(sessionId: string, query: string, response: string): void {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }
    
    const history = this.conversationHistory.get(sessionId)!;
    history.push(
      { role: 'user', content: query },
      { role: 'assistant', content: response }
    );
    
    // Ograniczenie historii do 50 wiadomości
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  /**
   * Zapisuje ważne informacje w MCP
   */
  private async storeInMCP(
    response: AgentResponse,
    context: CodingContext,
    sessionId: string
  ): Promise<void> {
    if (!this.mcpManager) return;
    
    try {
      // Zapisz w Context Portal
      if (response.intent === 'code_generation' || response.intent === 'architecture') {
        await this.mcpManager.callTool('context-portal', {
          name: 'log_decision',
          arguments: {
            summary: `Agent wygenerował ${response.intent}`,
            rationale: response.content.substring(0, 500),
            tags: ['ai-generated', response.intent, context.language || 'unknown']
          }
        });
      }
      
      // Zapisz w Memory Keeper
      await this.mcpManager.callTool('memory-keeper', {
        name: 'store_memory',
        arguments: {
          content: `Sesja ${sessionId}: ${response.content.substring(0, 200)}...`,
          metadata: {
            sessionId,
            intent: response.intent,
            timestamp: new Date().toISOString(),
            context: context.projectType
          }
        }
      });
      
    } catch (error) {
      this.logger.warn('Nie można zapisać w MCP:', error);
    }
  }

  /**
   * Pobiera statystyki agenta
   */
  getStats(): AgentStats {
    return {
      activeSessions: this.projectContext.size,
      totalConversations: Array.from(this.conversationHistory.values())
        .reduce((sum, history) => sum + history.length / 2, 0),
      mcpConnected: this.mcpManager !== null,
      uptime: process.uptime()
    };
  }

  /**
   * Czyści sesję
   */
  clearSession(sessionId: string): void {
    this.projectContext.delete(sessionId);
    this.conversationHistory.delete(sessionId);
    this.logger.info(`Wyczyszczono sesję: ${sessionId}`);
  }

  /**
   * Sprawdza zdrowie agenta
   */
  async healthCheck(): Promise<boolean> {
    try {
      const aiHealthy = await this.aiClient.healthCheck();
      const mcpHealthy = this.mcpManager ? await this.mcpManager.areAllServersHealthy() : true;
      return aiHealthy && mcpHealthy;
    } catch {
      return false;
    }
  }
}

// Typy dla agenta
export type AgentIntent = 
  | 'code_generation'
  | 'code_review' 
  | 'debugging'
  | 'testing'
  | 'refactoring'
  | 'architecture'
  | 'documentation'
  | 'mcp_operation'
  | 'question'
  | 'other'
  | 'error';

export interface AgentOptions {
  projectType?: string;
  language?: string;
  framework?: string;
  architecture?: string;
  constraints?: string[];
  codeStyle?: string;
}

export interface AgentResponse {
  success: boolean;
  content: string;
  intent: AgentIntent;
  shouldRemember?: boolean;
  suggestions?: string[];
  metadata: {
    sessionId: string;
    [key: string]: any;
  };
}

export interface MCPAction {
  server: string;
  tool: string;
}

export interface AgentStats {
  activeSessions: number;
  totalConversations: number;
  mcpConnected: boolean;
  uptime: number;
}

// Singleton instance
export const codingAgent = new CodingAgent();