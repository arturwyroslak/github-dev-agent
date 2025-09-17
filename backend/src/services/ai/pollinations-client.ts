import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from '../../utils/logger';

/**
 * Klient API Pollinations.ai - Darmowy dostęp do modeli OpenAI
 */
export class PollinationsAIClient {
  private client: AxiosInstance;
  private logger: Logger;
  private readonly baseURL = 'https://text.pollinations.ai';
  private defaultModel = 'openai';
  private requestCounter = 0;

  constructor() {
    this.logger = new Logger('PollinationsAI');
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000, // 60 sekund timeout dla długich odpowiedzi
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GitHub-Dev-Agent/1.0'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Wywołuje model AI z zaawansowaną inżynierią promptów
   */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<AIResponse> {
    try {
      const requestId = ++this.requestCounter;
      this.logger.info(`[${requestId}] Wywołanie AI:`, {
        model: options.model || this.defaultModel,
        messagesCount: messages.length,
        seed: options.seed
      });

      const payload = {
        model: options.model || this.defaultModel,
        messages: this.enhanceMessages(messages, options),
        seed: options.seed || this.generateSeed(),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4000,
        ...options.additionalParams
      };

      const startTime = Date.now();
      const response: AxiosResponse<PollinationsResponse> = await this.client.post(
        `/${payload.model}`,
        payload
      );

      const duration = Date.now() - startTime;
      this.logger.info(`[${requestId}] Odpowiedź otrzymana w ${duration}ms`);

      return this.processResponse(response.data, requestId, duration);
    } catch (error) {
      this.logger.error('Błąd wywołania AI:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Wywołanie specjalistyczne dla agenta kodującego
   */
  async askCodingAgent(
    userQuery: string,
    context: CodingContext = {}
  ): Promise<AIResponse> {
    const systemPrompt = this.buildAdvancedSystemPrompt(context);
    const enhancedUserQuery = this.enhanceUserQuery(userQuery, context);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: enhancedUserQuery
      }
    ];

    // Dodaj historię kontekstu jeśli dostępna
    if (context.conversationHistory) {
      messages.splice(1, 0, ...context.conversationHistory);
    }

    const options: any = {
      temperature: 0.3, // Niższa temperatura dla bardziej precyzyjnego kodu
      maxTokens: 6000
    };
    
    if (context.projectSeed !== undefined) {
      options.seed = context.projectSeed;
    }
    
    return this.chat(messages, options);
  }

  /**
   * Wywołanie dla analizy kodu i review
   */
  async analyzeCode(
    code: string,
    analysisType: CodeAnalysisType,
    context: CodingContext = {}
  ): Promise<AIResponse> {
    const systemPrompt = this.buildCodeAnalysisPrompt(analysisType, context);
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Przeanalizuj poniższy kod:\n\n\`\`\`${context.language || 'typescript'}\n${code}\n\`\`\``
      }
    ];

    return this.chat(messages, {
      temperature: 0.2, // Bardzo precyzyjna analiza
      maxTokens: 4000
    });
  }

  /**
   * Wywołanie dla generowania testów
   */
  async generateTests(
    code: string,
    testType: TestType,
    context: CodingContext = {}
  ): Promise<AIResponse> {
    const systemPrompt = this.buildTestGenerationPrompt(testType, context);
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Wygeneruj testy dla poniższego kodu:\n\n\`\`\`${context.language || 'typescript'}\n${code}\n\`\`\``
      }
    ];

    return this.chat(messages, {
      temperature: 0.4,
      maxTokens: 5000
    });
  }

  /**
   * Buduje zaawansowany prompt systemowy dla agenta kodującego
   */
  private buildAdvancedSystemPrompt(context: CodingContext): string {
    return `# 🤖 GitHub Development Agent - Expert Coding Assistant

## Twoja Rola i Tożsamość
Jesteś zaawansowanym agentem AI specjalizującym się w:
- **Tworzeniu wysokiej jakości kodu** w TypeScript, Python, JavaScript, Go, Rust
- **Architekturze systemów** i wzorcach projektowych
- **Integracji z ekosystemem GitHub** i narzędziami deweloperskimi
- **Automatyzacji procesów CI/CD** i DevOps
- **Implementacji MCP (Model Context Protocol)** servers i integracji

## Możliwości i Narzędzia MCP
Masz dostęp do następujących systemów MCP:

### 🌐 Browser Automation (Playwright MCP)
- Automatyzacja testów E2E i scraping danych
- Generowanie screenshotów i nagrywanie video
- Interakcje z UI aplikacji webowych

### 🧠 Context Memory (Context Portal MCP)
- Zarządzanie pamięcią projektu i decyzjami architektonicznymi
- Śledzenie postępów i wzorców systemowych
- Semantyczne wyszukiwanie w kontekście projektu

### 💾 Persistent Memory (Memory Keeper MCP)
- Długoterminowa pamięć preferencji i wzorców
- Analiza podobieństw i klastrowanie informacji
- Inteligentne streszczenia i insights

### 🔧 GitHub Operations
- Tworzenie i zarządzanie issues, PR, branches
- Automatyzacja workflow i CI/CD pipelines
- Analiza kodu i code review

## Standardy Kodowania

### TypeScript/JavaScript
- Używaj strict TypeScript z pełnym typowaniem
- Preferuj functional programming i immutability
- Implementuj proper error handling z Result<T, E> pattern
- Dokumentuj kod z JSDoc
- Testuj z Jest/Vitest i Testing Library

### Architektura
- Stosuj SOLID principles i Clean Architecture
- Implementuj dependency injection
- Używaj event-driven architecture gdzie to możliwe
- Zapewniaj wysoką testowalność i modularność

### Bezpieczeństwo
- Waliduj wszystkie inputy użytkowników
- Implementuj rate limiting i authentication
- Używaj environment variables dla secrets
- Stosuj principle of least privilege

## Format Odpowiedzi

### Dla Zadań Kodowania
\`\`\`typescript
// Kod z pełnym typowaniem i dokumentacją
/**
 * Opis funkcji/klasy
 * @param param1 - Opis parametru
 * @returns Opis zwracanej wartości
 */
function example(param1: string): Result<Data, Error> {
  // Implementation
}
\`\`\`

**Objaśnienie:**
- 🎯 **Cel:** Co robi ten kod
- ⚡ **Kluczowe funkcjonalności:** Lista głównych features
- 🔧 **Użycie:** Przykłady wykorzystania
- ⚠️ **Uwagi:** Potencjalne problemy lub ograniczenia

### Dla Analiz i Review
- ✅ **Mocne strony:** Co jest dobrze zaimplementowane
- ❌ **Problemy:** Identyfikacja błędów i code smells
- 🚀 **Sugerowane ulepszenia:** Konkretne rekomendacje
- 🔒 **Bezpieczeństwo:** Analiza potencjalnych luk

### Dla Architectury
- 🏗️ **Diagram architektury** (w ASCII lub Mermaid)
- 📦 **Komponenty:** Lista i odpowiedzialności
- 🔄 **Flow danych:** Jak przepływają informacje
- 🔧 **Technologie:** Rekomendowane narzędzia i biblioteki

## Kontekst Projektu
${this.formatProjectContext(context)}

## Instrukcje Wykonania
1. **Analizuj dokładnie** wymagania i kontekst
2. **Implementuj rozwiązania** zgodnie z najlepszymi praktykami
3. **Testuj mentalnie** kod pod kątem edge cases
4. **Dokumentuj jasno** wszystkie decyzje i trade-offs
5. **Sugeruj ulepszenia** procesu i architektury
6. **Wykorzystuj MCP tools** gdy to odpowiednie

**Pamiętaj:** Twoja rola to nie tylko pisanie kodu, ale mentorowanie przez przykład najlepszych praktyk developerskich.`;
  }

  /**
   * Buduje prompt dla analizy kodu
   */
  private buildCodeAnalysisPrompt(analysisType: CodeAnalysisType, context: CodingContext): string {
    const basePrompt = `# 🔍 Code Analysis Agent\n\nJesteś ekspertem w analizie kodu specjalizującym się w:`;
    
    const analysisPrompts = {
      'security': `
- **Audycie bezpieczeństwa:** Identyfikacja luk XSS, SQL injection, CSRF
- **Walidacji danych:** Sprawdzanie sanityzacji inputów
- **Zarządzaniu secrets:** Analiza proper handling credentials
- **Rate limiting:** Ocena mechanizmów throttling`,
      
      'performance': `
- **Optymalizacji wydajności:** Memory leaks, algorytmic complexity
- **Database queries:** N+1 problems, proper indexing
- **Bundle analysis:** Tree shaking, code splitting
- **Monitoring:** Metrics i observability patterns`,
      
      'architecture': `
- **Wzorcach projektowych:** SOLID, DRY, KISS principles
- **Dependency management:** Coupling, cohesion analysis
- **Testability:** Mock points, dependency injection
- **Scalability:** Horizontal scaling readiness`,
      
      'quality': `
- **Code smells:** Duplications, long methods, god classes
- **Maintainability:** Readable code, proper naming
- **Documentation:** Comments, README, API docs
- **Error handling:** Graceful degradation, logging`
    };

    return basePrompt + (analysisPrompts[analysisType] || analysisPrompts.quality) + `

## Format Analizy

### 📊 Metryki
- **Complexity Score:** /10
- **Maintainability:** /10  
- **Security Score:** /10
- **Performance Score:** /10

### 🔍 Szczegółowa Analiza
[Detailed findings here]

### 🎯 Priorytetowe Rekomendacje
1. **Krytyczne:** Muszą być naprawione
2. **Ważne:** Powinny być adresowane
3. **Opcjonalne:** Nice to have improvements

Kontekst: ${this.formatProjectContext(context)}`;
  }

  /**
   * Buduje prompt dla generowania testów
   */
  private buildTestGenerationPrompt(testType: TestType, context: CodingContext): string {
    const testPrompts = {
      'unit': 'testy jednostkowe z pełnym coverage i edge cases',
      'integration': 'testy integracyjne sprawdzające współpracę komponentów',
      'e2e': 'testy end-to-end symulujące rzeczywiste scenariusze użytkownika',
      'performance': 'testy wydajnościowe z benchmarking i load testing'
    };

    return `# 🧪 Test Generation Agent

Generujesz ${testPrompts[testType]} używając najlepszych praktyk:

## Framework i Narzędzia
- **Testing Framework:** Jest/Vitest + Testing Library
- **Mocking:** MSW dla API, mock functions dla dependencies  
- **Assertions:** Expect with custom matchers
- **Coverage:** Minimum 90% line/branch coverage

## Wzorce Testowe
- **AAA Pattern:** Arrange, Act, Assert
- **Given-When-Then:** BDD style dla czytelności
- **Test Doubles:** Proper mocks, stubs, fakes usage
- **Parametrized Tests:** Data-driven testing

## Test Structure
\`\`\`typescript
describe('ComponentName', () => {
  // Setup and teardown
  beforeEach(() => { /* setup */ });
  afterEach(() => { /* cleanup */ });
  
  describe('when condition', () => {
    it('should behave correctly', async () => {
      // Arrange
      // Act  
      // Assert
    });
  });
});
\`\`\`

Kontekst: ${this.formatProjectContext(context)}`;
  }

  /**
   * Formatuje kontekst projektu
   */
  private formatProjectContext(context: CodingContext): string {
    if (!context || Object.keys(context).length === 0) {
      return 'Brak dodatkowego kontekstu projektu.';
    }

    let formatted = '';
    
    if (context.projectType) {
      formatted += `\n- **Typ projektu:** ${context.projectType}`;
    }
    
    if (context.language) {
      formatted += `\n- **Główny język:** ${context.language}`;
    }
    
    if (context.framework) {
      formatted += `\n- **Framework:** ${context.framework}`;
    }
    
    if (context.architecture) {
      formatted += `\n- **Architektura:** ${context.architecture}`;
    }
    
    if (context.currentTask) {
      formatted += `\n- **Aktualne zadanie:** ${context.currentTask}`;
    }
    
    if (context.constraints && context.constraints.length > 0) {
      formatted += `\n- **Ograniczenia:** ${context.constraints.join(', ')}`;
    }

    return formatted || 'Brak szczegółów kontekstu.';
  }

  /**
   * Ulepsza komunikaty użytkownika
   */
  private enhanceUserQuery(query: string, context: CodingContext): string {
    let enhanced = query;

    // Dodaj kontekst techniczny jeśli dostępny
    if (context.language || context.framework) {
      enhanced += `\n\n**Kontekst techniczny:**`;
      if (context.language) enhanced += `\n- Język: ${context.language}`;
      if (context.framework) enhanced += `\n- Framework: ${context.framework}`;
    }

    // Dodaj ograniczenia jeśli są
    if (context.constraints && context.constraints.length > 0) {
      enhanced += `\n\n**Ograniczenia:** ${context.constraints.join(', ')}`;
    }

    // Dodaj preferencje stylu kodowania
    if (context.codeStyle) {
      enhanced += `\n\n**Styl kodowania:** ${context.codeStyle}`;
    }

    return enhanced;
  }

  /**
   * Ulepsza wszystkie wiadomości przed wysłaniem
   */
  private enhanceMessages(messages: ChatMessage[], options: ChatOptions): ChatMessage[] {
    const enhanced = [...messages];
    
    // Dodaj metadata do ostatniej wiadomości użytkownika jeśli jest
    const lastUserMessage = enhanced.reverse().find(m => m.role === 'user');
    if (lastUserMessage && options.metadata) {
      lastUserMessage.content += `\n\n---\n**Metadata:** ${JSON.stringify(options.metadata, null, 2)}`;
    }

    return enhanced.reverse();
  }

  /**
   * Przetwarza odpowiedź z API
   */
  private processResponse(
    response: PollinationsResponse,
    requestId: number,
    duration: number
  ): AIResponse {
    const choice = response.choices?.[0];
    if (!choice) {
      throw new Error('Brak odpowiedzi od modelu AI');
    }

    return {
      id: `pollinations_${requestId}`,
      content: choice.message.content,
      role: choice.message.role as 'assistant',
      model: response.model || this.defaultModel,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      metadata: {
        requestId,
        duration,
        finishReason: choice.finish_reason,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Generuje seed dla powtarzalności
   */
  private generateSeed(): number {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Konfiguruje interceptory axios
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug('Wysyłanie requestu:', {
          url: config.url,
          method: config.method,
          headers: config.headers
        });
        return config;
      },
      (error) => {
        this.logger.error('Błąd requestu:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug('Otrzymano odpowiedź:', {
          status: response.status,
          statusText: response.statusText
        });
        return response;
      },
      (error) => {
        this.logger.error('Błąd odpowiedzi:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Obsługuje błędy API
   */
  private handleError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'API Error';
      
      switch (status) {
        case 400:
          return new Error(`Bad Request: ${message}`);
        case 401:
          return new Error(`Unauthorized: ${message}`);
        case 429:
          return new Error(`Rate Limited: ${message}`);
        case 500:
          return new Error(`Server Error: ${message}`);
        default:
          return new Error(`HTTP ${status}: ${message}`);
      }
    } else if (error.request) {
      return new Error('Network Error: No response received');
    } else {
      return new Error(`Request Error: ${error.message}`);
    }
  }

  /**
   * Sprawdza dostępność API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.chat([{
        role: 'user',
        content: 'Hello, are you working?'
      }], { maxTokens: 10 });
      
      return response.content.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Pobiera dostępne modele
   */
  async getAvailableModels(): Promise<string[]> {
    // Pollinations.ai wspiera głównie model "openai"
    // Można rozszerzyć o inne modele w przyszłości
    return ['openai'];
  }
}

// Typy dla API
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  seed?: number;
  metadata?: Record<string, any>;
  additionalParams?: Record<string, any>;
}

export interface CodingContext {
  projectType?: string;
  language?: string;
  framework?: string;
  architecture?: string;
  currentTask?: string;
  constraints?: string[];
  codeStyle?: string;
  projectSeed?: number;
  conversationHistory?: ChatMessage[];
}

export type CodeAnalysisType = 'security' | 'performance' | 'architecture' | 'quality';
export type TestType = 'unit' | 'integration' | 'e2e' | 'performance';

export interface AIResponse {
  id: string;
  content: string;
  role: 'assistant';
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    requestId: number;
    duration: number;
    finishReason?: string;
    timestamp: string;
  };
}

interface PollinationsResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Singleton instance
export const pollinationsAI = new PollinationsAIClient();