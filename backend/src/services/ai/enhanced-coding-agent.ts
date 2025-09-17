import { CodingAgent, AgentOptions, AgentResponse, AgentIntent } from './coding-agent';
import { AutonomousAgent, ExecutionStrategy } from './autonomous-agent';
import { TaskPlanner, GoalConstraints } from './task-planner';
import { pollinationsAI, CodingContext } from './pollinations-client';
import { MCPManager } from '../../modules/mcp';
import { Logger } from '../../utils/logger';
import { EventEmitter } from 'events';

/**
 * Enhanced Coding Agent z integracją autonomicznych capabilities
 * Łączy chat interface z autonomous task execution
 */
export class EnhancedCodingAgent extends EventEmitter {
  private codingAgent: CodingAgent;
  private autonomousAgent: AutonomousAgent;
  private taskPlanner: TaskPlanner;
  private logger: Logger;
  private mcpManager: MCPManager | null = null;
  private learningDatabase: Map<string, LearningEntry> = new Map();
  private executionHistory: Map<string, EnhancedExecutionHistory> = new Map();

  constructor(mcpManager?: MCPManager) {
    super();
    this.logger = new Logger('EnhancedCodingAgent');
    this.mcpManager = mcpManager || null;
    
    this.codingAgent = new CodingAgent(mcpManager);
    this.autonomousAgent = new AutonomousAgent(mcpManager);
    this.taskPlanner = new TaskPlanner(mcpManager);
    
    this.setupEventHandlers();
  }

  /**
   * MAIN ENHANCED PROCESSING - Inteligentne rozpoznawanie czy użyć autonomous mode
   */
  async processEnhancedRequest(
    query: string,
    sessionId: string = 'enhanced',
    options: EnhancedAgentOptions = {}
  ): Promise<EnhancedAgentResponse> {
    const startTime = Date.now();
    
    this.logger.info(`[ENHANCED-${sessionId}] 🤖 Przetwarzanie enhanced request`);
    this.logger.info(`[ENHANCED-${sessionId}] Query: ${query.substring(0, 150)}...`);
    
    try {
      // 1. ANALIZA INTENCJI I ZŁOŻONOŚCI
      const analysis = await this.analyzeComplexity(query, options.context || {});
      this.emit('complexity-analyzed', { sessionId, analysis });
      
      // 2. DECYZJA: AUTONOMOUS vs STANDARD PROCESSING
      const shouldUseAutonomous = this.shouldUseAutonomousMode(analysis);
      
      this.logger.info(`[ENHANCED-${sessionId}] Mode selection: ${shouldUseAutonomous ? 'AUTONOMOUS' : 'STANDARD'}`);
      
      let response: EnhancedAgentResponse;
      
      if (shouldUseAutonomous) {
        // AUTONOMOUS MODE - Pełna dekompozycja i wykonanie
        response = await this.processAutonomously(query, sessionId, analysis, options);
      } else {
        // STANDARD MODE - Ulepszony chat z self-reflection
        response = await this.processWithReflection(query, sessionId, analysis, options);
      }
      
      // 3. POST-PROCESSING LEARNING
      await this.learnFromExecution(response, analysis, query);
      
      response.processingTime = Date.now() - startTime;
      response.mode = shouldUseAutonomous ? 'autonomous' : 'standard';
      
      this.emit('request-completed', { sessionId, response });
      return response;
      
    } catch (error) {
      this.logger.error(`[ENHANCED-${sessionId}] Błąd enhanced processing:`, error);
      
      return {
        success: false,
        content: `Przepraszam, wystąpił błąd podczas przetwarzania: ${error instanceof Error ? error.message : 'Unknown error'}`,
        intent: 'error',
        mode: 'error',
        processingTime: Date.now() - startTime,
        analysis,
        metadata: {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Analizuje złożoność i charakter zapytania
   */
  private async analyzeComplexity(
    query: string,
    context: CodingContext
  ): Promise<ComplexityAnalysis> {
    const analysisPrompt = `# 🔍 Query Complexity Analyzer

Przeanalizuj złożoność i charakter zapytania:

**QUERY:** "${query}"
**CONTEXT:** ${JSON.stringify(context, null, 2)}

## Kryteria Oceny:
- **Complexity Score (0-1):** Jak złożone jest zadanie?
- **Multi-step:** Czy wymaga wielu kroków?
- **Research Required:** Czy potrzebne researching?
- **MCP Operations:** Czy wymagane operacje MCP?
- **Estimated Duration:** Szacowany czas wykonania (minuty)
- **Goal Type:** Typ celu (simple_task, complex_project, research, analysis)

Format JSON:
\`\`\`json
{
  "complexityScore": 0.7,
  "isMultiStep": true,
  "requiresResearch": false,
  "requiresMCP": true,
  "estimatedDurationMinutes": 45,
  "goalType": "complex_project",
  "keyComponents": ["API development", "Testing", "Documentation"],
  "riskFactors": ["External dependencies", "Complex business logic"],
  "suggestedApproach": "incremental",
  "confidenceLevel": 0.85
}
\`\`\``;

    try {
      const response = await pollinationsAI.chat([
        { role: 'system', content: analysisPrompt },
        { role: 'user', content: 'Przeanalizuj złożoność tego zapytania.' }
      ], { temperature: 0.2, maxTokens: 1000 });
      
      return this.parseComplexityAnalysis(response.content);
      
    } catch (error) {
      this.logger.warn('Błąd analizy złożoności, używam fallback:', error);
      return this.createFallbackComplexityAnalysis(query);
    }
  }

  /**
   * Określa czy użyć autonomous mode
   */
  private shouldUseAutonomousMode(analysis: ComplexityAnalysis): boolean {
    // Kryteria dla autonomous mode:
    return (
      analysis.complexityScore > 0.6 &&  // Wysokie complexity
      analysis.isMultiStep &&           // Multi-step task  
      analysis.estimatedDurationMinutes > 15 && // Dłusze niż 15 min
      analysis.goalType !== 'simple_task' &&   // Nie prosty task
      analysis.confidenceLevel > 0.7    // Wysoka pewność analizy
    );
  }

  /**
   * Autonomous processing z pełną dekompozycją
   */
  private async processAutonomously(
    query: string,
    sessionId: string,
    analysis: ComplexityAnalysis,
    options: EnhancedAgentOptions
  ): Promise<EnhancedAgentResponse> {
    this.logger.info(`[ENHANCED-${sessionId}] 🤖 AUTONOMOUS MODE activated`);
    
    // Przygotuj constraints na podstawie analizy
    const constraints: GoalConstraints = {
      timeLimit: (analysis.estimatedDurationMinutes + 10) * 60 * 1000, // +10 min buffer
      maxTasks: Math.min(20, Math.ceil(analysis.complexityScore * 15)),
      priority: analysis.complexityScore > 0.8 ? 'high' : 'medium',
      technologies: analysis.keyComponents
    };
    
    // Uruchom autonomous execution
    const autonomousResult = await this.autonomousAgent.achieveGoal(
      query,
      sessionId,
      options.context || {},
      constraints
    );
    
    // Przygotuj enhanced response
    const enhancedContent = await this.synthesizeAutonomousResult(
      autonomousResult,
      query,
      analysis
    );
    
    return {
      success: autonomousResult.success,
      content: enhancedContent,
      intent: this.mapGoalTypeToIntent(analysis.goalType),
      mode: 'autonomous',
      analysis,
      autonomousResult,
      processingTime: autonomousResult.totalDuration,
      suggestions: await this.generateContextualSuggestions(autonomousResult, analysis),
      metadata: {
        sessionId,
        attempts: autonomousResult.attempts,
        bestScore: autonomousResult.bestScore,
        strategies: autonomousResult.finalStrategy ? [autonomousResult.finalStrategy.name] : [],
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Standard processing z self-reflection
   */
  private async processWithReflection(
    query: string,
    sessionId: string,
    analysis: ComplexityAnalysis,
    options: EnhancedAgentOptions
  ): Promise<EnhancedAgentResponse> {
    this.logger.info(`[ENHANCED-${sessionId}] 💬 STANDARD MODE z reflection`);
    
    // Standardowy chat response
    const chatResponse = await this.codingAgent.processRequest(
      query,
      sessionId,
      options
    );
    
    // SELF-REFLECTION: Czy odpowiedź jest wystarczająca?
    const reflection = await this.reflectOnResponse(
      chatResponse,
      query,
      analysis
    );
    
    // Jeśli reflection wskazuje na potrzebę ulepszenia
    if (reflection.needsImprovement && reflection.confidence > 0.7) {
      this.logger.info(`[ENHANCED-${sessionId}] 🔄 Improving response based on reflection`);
      
      const improvedResponse = await this.improveResponse(
        chatResponse,
        reflection,
        query,
        analysis
      );
      
      return {
        success: improvedResponse.success,
        content: improvedResponse.content,
        intent: improvedResponse.intent,
        mode: 'standard',
        analysis,
        reflection,
        originalResponse: chatResponse.content,
        improvements: reflection.suggestions,
        suggestions: improvedResponse.suggestions,
        metadata: {
          sessionId,
          improvedFromReflection: true,
          reflectionScore: reflection.overallScore,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Response OK, zwróć standard result
    return {
      success: chatResponse.success,
      content: chatResponse.content,
      intent: chatResponse.intent,
      mode: 'standard',
      analysis,
      reflection,
      suggestions: chatResponse.suggestions,
      metadata: {
        sessionId,
        reflectionScore: reflection.overallScore,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Self-reflection na odpowiedzi
   */
  private async reflectOnResponse(
    response: AgentResponse,
    originalQuery: string,
    analysis: ComplexityAnalysis
  ): Promise<ResponseReflection> {
    const reflectionPrompt = `# 🤔 Response Quality Reflection

Oceń jakość odpowiedzi na zapytanie:

**ORIGINAL QUERY:** "${originalQuery}"
**COMPLEXITY ANALYSIS:** ${JSON.stringify(analysis, null, 2)}
**RESPONSE:** "${response.content}"
**SUCCESS:** ${response.success}

## Kryteria Oceny:
- **Completeness:** Czy odpowiedź pełnie adresuje zapytanie?
- **Quality:** Jakość merytoryczna
- **Actionability:** Czy użytkownik może bezpośrednio użyć odpowiedzi?
- **Depth:** Czy głębokość odpowiedzi pasuje do złożoności zapytania?

Format JSON:
\`\`\`json
{
  "overallScore": 0.8,
  "completeness": 0.9,
  "quality": 0.8,
  "actionability": 0.7,
  "depth": 0.8,
  "needsImprovement": false,
  "confidence": 0.85,
  "strengths": ["Clear explanation", "Good examples"],
  "weaknesses": ["Could use more details on X"],
  "suggestions": [
    {
      "area": "examples",
      "improvement": "Add more practical examples",
      "priority": "medium"
    }
  ],
  "missingAspects": ["Error handling", "Edge cases"]
}
\`\`\``;

    try {
      const reflectionResponse = await pollinationsAI.chat([
        { role: 'system', content: reflectionPrompt },
        { role: 'user', content: 'Dokonaj reflection tej odpowiedzi.' }
      ], { temperature: 0.3, maxTokens: 1500 });
      
      return this.parseResponseReflection(reflectionResponse.content);
      
    } catch (error) {
      this.logger.warn('Błąd response reflection:', error);
      return this.createFallbackReflection(response);
    }
  }

  /**
   * Ulepsza odpowiedź na podstawie reflection
   */
  private async improveResponse(
    originalResponse: AgentResponse,
    reflection: ResponseReflection,
    query: string,
    analysis: ComplexityAnalysis
  ): Promise<AgentResponse> {
    const improvementPrompt = `# 🚀 Response Improvement Agent

Ulepsz odpowiedź na podstawie reflection:

**ORIGINAL QUERY:** "${query}"
**ORIGINAL RESPONSE:** "${originalResponse.content}"
**REFLECTION INSIGHTS:** ${JSON.stringify(reflection, null, 2)}

## Instrukcje Ulepszenia:
${reflection.suggestions.map(s => `- **${s.area.toUpperCase()}:** ${s.improvement} (Priority: ${s.priority})`).join('\n')}

## Missing Aspects to Address:
${reflection.missingAspects.map(aspect => `- ${aspect}`).join('\n')}

## Wymagania:
1. Zachowaj wszystkie dobre aspekty oryginału
2. Dodaj brakujące elementy
3. Popraw identyfikowane słabości
4. Utrzymaj praktyczny, actionable charakter
5. Dostosuj głębokość do złożoności zapytania

Stwórz ulepszyną wersję:`;

    try {
      const improvedResponse = await pollinationsAI.askCodingAgent(
        improvementPrompt,
        {
          currentTask: 'response_improvement',
          originalIntent: originalResponse.intent
        }
      );
      
      return {
        success: true,
        content: improvedResponse.content,
        intent: originalResponse.intent,
        shouldRemember: true,
        suggestions: await this.generateImprovedSuggestions(reflection, analysis),
        metadata: {
          ...originalResponse.metadata,
          improvedFromReflection: true,
          improvementScore: this.calculateImprovementScore(reflection)
        }
      };
      
    } catch (error) {
      this.logger.error('Błąd improvement response:', error);
      return originalResponse; // Fallback do oryginalnej odpowiedzi
    }
  }

  /**
   * Syntetyzuje wynik autonomous execution do readable response
   */
  private async synthesizeAutonomousResult(
    result: any,
    originalQuery: string,
    analysis: ComplexityAnalysis
  ): Promise<string> {
    if (!result.success) {
      return `Nie udało się w pełni osiągnąć celu po ${result.attempts} próbach. \n\n**Najlepszy wynik (score: ${result.bestScore}):**\n\n${result.bestResult?.finalSummary || 'Brak szczegółów wyników.'}`;
    }

    const synthesisPrompt = `Stwórz czytelne podsumowanie autonomous execution:

**ORIGINAL GOAL:** "${originalQuery}"
**SUCCESS:** ${result.success}
**ATTEMPTS:** ${result.attempts}
**SCORE:** ${result.bestScore}
**DURATION:** ${Math.round(result.totalDuration / 1000)}s

**RESULTS SUMMARY:**
${result.bestResult?.results?.map((r: any, i: number) => `${i+1}. ${r.taskId}: ${r.success ? '✅' : '❌'} (${r.duration}ms)`).join('\n') || 'Brak szczegółowych wyników'}

**LEARNING INSIGHTS:**
${result.learningInsights?.join('\n') || 'Brak insights'}

Stwórz profesjonalny, actionable response dla użytkownika w 3-4 akapitach.`;

    try {
      const synthesis = await pollinationsAI.chat([
        { role: 'user', content: synthesisPrompt }
      ], { temperature: 0.4, maxTokens: 2000 });
      
      return synthesis.content;
    } catch {
      // Fallback synthesis
      return `✅ **Cel osiągnięty** po ${result.attempts} próbach z wynikiem ${Math.round(result.bestScore * 100)}%!\n\n` +
             `Zakończono ${result.bestResult?.results?.filter((r: any) => r.success).length || 0} zadań w czasie ${Math.round(result.totalDuration / 1000)} sekund.\n\n` +
             `**Kluczowe osiągnięcia:**\n${result.learningInsights?.slice(0, 3).map((insight: string) => `• ${insight}`).join('\n') || '• Cel wykonany autonomicznie'}`;
    }
  }

  /**
   * Learning z wykonania dla przyszłych ulepszeń
   */
  private async learnFromExecution(
    response: EnhancedAgentResponse,
    analysis: ComplexityAnalysis,
    originalQuery: string
  ): Promise<void> {
    const learningEntry: LearningEntry = {
      queryType: analysis.goalType,
      complexityScore: analysis.complexityScore,
      modeUsed: response.mode,
      success: response.success,
      processingTime: response.processingTime,
      qualityScore: response.reflection?.overallScore || (response.success ? 0.8 : 0.4),
      patterns: this.extractPatterns(response, analysis),
      timestamp: new Date(),
      improvements: response.improvements || []
    };
    
    const key = this.generateLearningKey(analysis.goalType, analysis.complexityScore);
    
    if (this.learningDatabase.has(key)) {
      const existing = this.learningDatabase.get(key)!;
      existing.usageCount = (existing.usageCount || 1) + 1;
      existing.averageQuality = (existing.qualityScore + learningEntry.qualityScore) / 2;
      existing.patterns.push(...learningEntry.patterns);
    } else {
      this.learningDatabase.set(key, {
        ...learningEntry,
        usageCount: 1,
        averageQuality: learningEntry.qualityScore
      });
    }
    
    this.logger.info(`📚 Zapisane learning entry: ${key}`);
    
    // Zapisz w MCP dla długoterminowego uczenia
    if (this.mcpManager) {
      try {
        await this.mcpManager.callTool('memory-keeper', {
          name: 'store_memory',
          arguments: {
            content: `Enhanced agent learning: ${analysis.goalType} query with complexity ${analysis.complexityScore}`,
            metadata: {
              type: 'agent-learning',
              mode: response.mode,
              success: response.success,
              qualityScore: learningEntry.qualityScore
            }
          }
        });
      } catch (error) {
        this.logger.warn('Nie można zapisać learning w MCP:', error);
      }
    }
  }

  /**
   * Generuje contextualne sugestie
   */
  private async generateContextualSuggestions(
    result: any,
    analysis: ComplexityAnalysis
  ): Promise<string[]> {
    const baseSuggestions = [
      'Czy chcesz że przeanalizuję wyniki pod kątem bezpieczeństwa?',
      'Mogę wygenerować dokumentację dla tego rozwiązania',
      'Czy potrzebujesz testy dla tego kodu?'
    ];
    
    if (result.success) {
      return [
        'Czy chcesz że zoptymalizuję to rozwiązanie?',
        'Mogę stworzyć deployment guide dla tego projektu',
        'Czy potrzebujesz monitoring i observability?'
      ];
    } else {
      return [
        'Czy chcesz że spróbuję prostsze podejście?',
        'Mogę przeanalizować przyczyny niepowodzenia',
        'Czy pomagać z debugowaniem krok po kroku?'
      ];
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.codingAgent.on('response-generated', (data) => {
      this.emit('standard-response', data);
    });
    
    this.autonomousAgent.on('plan-created', (data) => {
      this.emit('autonomous-plan-created', data);
    });
    
    this.autonomousAgent.on('deep-analysis-completed', (data) => {
      this.emit('autonomous-analysis', data);
    });
  }

  /**
   * Statystyki enhanced agent
   */
  getEnhancedStats(): EnhancedAgentStats {
    const codingStats = this.codingAgent.getStats();
    const autonomousInsights = this.autonomousAgent.getExecutionInsights();
    
    const learningEntries = Array.from(this.learningDatabase.values());
    const avgQuality = learningEntries.reduce((sum, entry) => sum + entry.qualityScore, 0) / learningEntries.length || 0;
    const autonomousUsage = learningEntries.filter(entry => entry.modeUsed === 'autonomous').length;
    
    return {
      ...codingStats,
      autonomousExecutions: autonomousInsights.totalExecutions,
      autonomousSuccessRate: autonomousInsights.successRate,
      averageQualityScore: avgQuality,
      autonomousUsagePercent: learningEntries.length > 0 ? autonomousUsage / learningEntries.length : 0,
      learningDatabaseSize: this.learningDatabase.size,
      topPatterns: this.getTopLearningPatterns(),
      modeDistribution: {
        standard: learningEntries.filter(e => e.modeUsed === 'standard').length,
        autonomous: autonomousUsage,
        error: learningEntries.filter(e => e.modeUsed === 'error').length
      }
    };
  }

  private getTopLearningPatterns(): Array<{pattern: string, usage: number}> {
    const patternMap = new Map<string, number>();
    
    this.learningDatabase.forEach(entry => {
      entry.patterns.forEach(pattern => {
        patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
      });
    });
    
    return Array.from(patternMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern, usage]) => ({pattern, usage}));
  }

  // Helper methods
  private parseComplexityAnalysis(aiResponse: string): ComplexityAnalysis {
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[1]);
    } catch {
      return this.createFallbackComplexityAnalysis('');
    }
  }

  private createFallbackComplexityAnalysis(query: string): ComplexityAnalysis {
    const isComplex = query.length > 200 || query.toLowerCase().includes('create') && query.toLowerCase().includes('system');
    
    return {
      complexityScore: isComplex ? 0.7 : 0.3,
      isMultiStep: isComplex,
      requiresResearch: false,
      requiresMCP: false,
      estimatedDurationMinutes: isComplex ? 30 : 10,
      goalType: isComplex ? 'complex_project' : 'simple_task',
      keyComponents: ['coding'],
      riskFactors: [],
      suggestedApproach: 'incremental',
      confidenceLevel: 0.5
    };
  }

  private parseResponseReflection(aiResponse: string): ResponseReflection {
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[1]);
    } catch {
      return this.createFallbackReflection(null);
    }
  }

  private createFallbackReflection(response: AgentResponse | null): ResponseReflection {
    return {
      overallScore: response?.success ? 0.7 : 0.4,
      completeness: 0.7,
      quality: 0.7,
      actionability: 0.7,
      depth: 0.7,
      needsImprovement: false,
      confidence: 0.6,
      strengths: ['Response provided'],
      weaknesses: ['Analysis system error'],
      suggestions: [],
      missingAspects: []
    };
  }

  private mapGoalTypeToIntent(goalType: string): AgentIntent {
    const mapping: Record<string, AgentIntent> = {
      'simple_task': 'code_generation',
      'complex_project': 'architecture',
      'research': 'question',
      'analysis': 'code_review'
    };
    return mapping[goalType] || 'code_generation';
  }

  private calculateImprovementScore(reflection: ResponseReflection): number {
    return reflection.suggestions.length * 0.1 + (1 - reflection.overallScore) * 0.5;
  }

  private generateImprovedSuggestions(reflection: ResponseReflection, analysis: ComplexityAnalysis): string[] {
    const suggestions = ['Odpowiedź została ulepszona na podstawie self-reflection'];
    
    if (reflection.suggestions.some(s => s.area === 'examples')) {
      suggestions.push('Czy chcesz więcej praktycznych przykładów?');
    }
    
    if (analysis.complexityScore > 0.7) {
      suggestions.push('Mogę rozbić to na mniejsze kroki');
    }
    
    return suggestions;
  }

  private extractPatterns(response: EnhancedAgentResponse, analysis: ComplexityAnalysis): string[] {
    const patterns: string[] = [];
    
    if (response.mode === 'autonomous') patterns.push('autonomous-execution');
    if (analysis.complexityScore > 0.7) patterns.push('high-complexity');
    if (response.reflection?.needsImprovement) patterns.push('reflection-improvement');
    if (response.success) patterns.push('successful-completion');
    
    return patterns;
  }

  private generateLearningKey(goalType: string, complexity: number): string {
    const complexityBucket = complexity > 0.7 ? 'high' : complexity > 0.4 ? 'medium' : 'low';
    return `${goalType}_${complexityBucket}`;
  }
}

// Typy dla Enhanced Coding Agent
export interface EnhancedAgentOptions extends AgentOptions {
  forceAutonomous?: boolean;
  reflectionEnabled?: boolean;
  context?: CodingContext;
}

export interface ComplexityAnalysis {
  complexityScore: number;
  isMultiStep: boolean;
  requiresResearch: boolean;
  requiresMCP: boolean;
  estimatedDurationMinutes: number;
  goalType: 'simple_task' | 'complex_project' | 'research' | 'analysis';
  keyComponents: string[];
  riskFactors: string[];
  suggestedApproach: string;
  confidenceLevel: number;
}

export interface ResponseReflection {
  overallScore: number;
  completeness: number;
  quality: number;
  actionability: number;
  depth: number;
  needsImprovement: boolean;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: Array<{
    area: string;
    improvement: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  missingAspects: string[];
}

export interface EnhancedAgentResponse {
  success: boolean;
  content: string;
  intent: AgentIntent;
  mode: 'autonomous' | 'standard' | 'error';
  processingTime: number;
  analysis: ComplexityAnalysis;
  reflection?: ResponseReflection;
  autonomousResult?: any;
  originalResponse?: string;
  improvements?: Array<{area: string, improvement: string}>;
  suggestions?: string[];
  metadata: {
    sessionId: string;
    [key: string]: any;
  };
}

export interface LearningEntry {
  queryType: string;
  complexityScore: number;
  modeUsed: 'autonomous' | 'standard' | 'error';
  success: boolean;
  processingTime: number;
  qualityScore: number;
  patterns: string[];
  timestamp: Date;
  improvements: Array<{area: string, improvement: string}>;
  usageCount?: number;
  averageQuality?: number;
}

export interface EnhancedExecutionHistory {
  sessionId: string;
  queries: string[];
  responses: EnhancedAgentResponse[];
  learnings: string[];
  patterns: string[];
}

export interface EnhancedAgentStats {
  activeSessions: number;
  totalConversations: number;
  mcpConnected: boolean;
  uptime: number;
  autonomousExecutions: number;
  autonomousSuccessRate: number;
  averageQualityScore: number;
  autonomousUsagePercent: number;
  learningDatabaseSize: number;
  topPatterns: Array<{pattern: string, usage: number}>;
  modeDistribution: {
    standard: number;
    autonomous: number;
    error: number;
  };
}

// Singleton instance
export const enhancedCodingAgent = new EnhancedCodingAgent();