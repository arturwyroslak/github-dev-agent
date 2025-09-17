import { TaskPlanner, GoalConstraints, TaskExecutionResult, GoalExecutionResult } from './task-planner';
import { pollinationsAI, CodingContext } from './pollinations-client';
import { MCPManager } from '../../modules/mcp';
import { Logger } from '../../utils/logger';
import { EventEmitter } from 'events';

/**
 * Fully Autonomous Agent - Inteligentny agent z self-improvement
 * Analizuje swoje własne wyniki, wnioskuje i adaptuje strategię wykonania
 */
export class AutonomousAgent extends EventEmitter {
  private taskPlanner: TaskPlanner;
  private logger: Logger;
  private mcpManager: MCPManager | null = null;
  private executionMemory: Map<string, ExecutionMemory> = new Map();
  private successPatterns: Map<string, SuccessPattern> = new Map();
  private maxReflectionDepth = 5; // Maksymalna głębokość rekurencyjnej analizy
  private learningRate = 0.1; // Szybkość uczenia z poprzednich wykonAń

  constructor(mcpManager?: MCPManager) {
    super();
    this.logger = new Logger('AutonomousAgent');
    this.mcpManager = mcpManager || null;
    this.taskPlanner = new TaskPlanner(mcpManager);
    
    // Przekazuj eventy z task plannera
    this.taskPlanner.on('plan-created', (data) => this.emit('plan-created', data));
    this.taskPlanner.on('task-completed', (data) => this.emit('task-completed', data));
    this.taskPlanner.on('reflection-completed', (data) => this.handleReflection(data));
  }

  /**
   * MAIN ENTRY POINT - Autonomiczne osiąganie celów
   */
  async achieveGoal(
    goal: string,
    sessionId: string = 'autonomous',
    context: CodingContext = {},
    constraints: GoalConstraints = {}
  ): Promise<AutonomousExecutionResult> {
    const executionId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    this.logger.info(`[AUTONOMOUS-${executionId}] 🎯 ROZPOCZĘCIE AUTONOMICZNEGO OSIĄGANIA CELU`);
    this.logger.info(`[AUTONOMOUS-${executionId}] Cel: ${goal}`);
    
    const startTime = Date.now();
    let currentStrategy = await this.determineInitialStrategy(goal, context);
    let attemptCount = 0;
    const maxAttempts = 3;
    let bestResult: GoalExecutionResult | null = null;
    let bestScore = 0;
    
    try {
      while (attemptCount < maxAttempts) {
        attemptCount++;
        this.logger.info(`[AUTONOMOUS-${executionId}] 🔄 PRÓBA ${attemptCount}/${maxAttempts} ze strategią: ${currentStrategy.name}`);
        
        // Wykonaj cel z aktualną strategią
        const result = await this.taskPlanner.executeGoal(
          goal,
          sessionId,
          {
            ...context,
            ...currentStrategy.contextEnhancements
          },
          {
            ...constraints,
            ...currentStrategy.constraintModifications
          }
        );
        
        // DEEP SELF-ANALYSIS: Analizuj wyniki
        const analysis = await this.performDeepAnalysis(result, goal, currentStrategy);
        this.emit('deep-analysis-completed', { executionId, analysis, attempt: attemptCount });
        
        // Aktualizuj najlepszy wynik jeśli ten jest lepszy
        if (analysis.overallScore > bestScore) {
          bestScore = analysis.overallScore;
          bestResult = result;
        }
        
        // Jeśli osiągnięto cel z wystarczającą jakością
        if (result.success && analysis.overallScore >= 0.8) {
          this.logger.info(`[AUTONOMOUS-${executionId}] ✅ CEL OSIĄGNIĘTY Z WYSOKĄ JAKOŚCIĄ!`);
          
          // Zapisz sukces w pamięci wzorców
          await this.learnFromSuccess(currentStrategy, analysis, result);
          
          break;
        }
        
        // Jeśli nie osiągnięto celu lub jakość jest niska
        if (attemptCount < maxAttempts) {
          this.logger.warn(`[AUTONOMOUS-${executionId}] ❌ Próba ${attemptCount} nieudana (score: ${analysis.overallScore})`);
          
          // ADAPTIVE STRATEGY: Dostosuj strategię na podstawie analizy
          currentStrategy = await this.adaptStrategy(currentStrategy, analysis, result);
          this.emit('strategy-adapted', { executionId, newStrategy: currentStrategy, attempt: attemptCount });
          
          // Krótka pauza przed kolejną próbą
          await this.sleep(2000);
        }
      }
      
      const totalDuration = Date.now() - startTime;
      
      // Finalne post-execution learning
      await this.performPostExecutionLearning(executionId, bestResult, bestScore, attemptCount);
      
      return {
        success: bestResult?.success || false,
        executionId,
        goal,
        attempts: attemptCount,
        bestResult,
        bestScore,
        finalStrategy: currentStrategy,
        totalDuration,
        learningInsights: await this.extractLearningInsights(bestResult, currentStrategy),
        metadata: {
          sessionId,
          maxAttemptsReached: attemptCount >= maxAttempts,
          strategiesUsed: [currentStrategy.name], // Można rozszerzyć o historię
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      this.logger.error(`[AUTONOMOUS-${executionId}] Błąd autonomicznego wykonania:`, error);
      
      return {
        success: false,
        executionId,
        goal,
        attempts: attemptCount,
        bestResult: null,
        bestScore: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalDuration: Date.now() - startTime,
        metadata: {
          sessionId,
          errorAtAttempt: attemptCount
        }
      };
    }
  }

  /**
   * Określa początkową strategię na podstawie celu
   */
  private async determineInitialStrategy(
    goal: string,
    context: CodingContext
  ): Promise<ExecutionStrategy> {
    const strategyPrompt = `Przeanalizuj cel i określ najlepszą strategię wykonania:

CEL: "${goal}"
KONTEKST: ${JSON.stringify(context, null, 2)}

Dostępne strategie:
1. **incremental** - Krok po kroku, walidacja każdego etapu
2. **parallel** - Równoległe wykonywanie niezależnych zadań
3. **prototype** - Szybki prototyp, potem iteracyjne ulepszanie  
4. **research-first** - Głęboka analiza przed implementacją
5. **test-driven** - Testy przed implementacją

Wybierz JEDNĄ strategię i wyjaśnij dlaczego w 2 zdaniach.`;

    try {
      const response = await pollinationsAI.chat([
        { role: 'user', content: strategyPrompt }
      ], { temperature: 0.3, maxTokens: 300 });
      
      // Parsuj wybraną strategię
      const strategyName = this.extractStrategyName(response.content);
      const reasoning = response.content;
      
      return this.buildStrategy(strategyName, reasoning, context);
      
    } catch (error) {
      this.logger.warn('Nie można określić strategii, używam default:', error);
      return this.buildStrategy('incremental', 'Default fallback strategy', context);
    }
  }

  /**
   * Głęboka analiza wyników wykonania
   */
  private async performDeepAnalysis(
    result: GoalExecutionResult,
    goal: string,
    strategy: ExecutionStrategy
  ): Promise<DeepAnalysisResult> {
    const analysisPrompt = `# 🔭 Deep Result Analysis Agent

Przeprowadź głęboką analizę wyników wykonania zadania.

**ORIGINAL GOAL:** "${goal}"
**STRATEGY USED:** ${strategy.name}
**EXECUTION SUCCESS:** ${result.success}
**ITERATIONS:** ${result.iterations}
**TOTAL TASKS:** ${result.results.length}
**SUCCESSFUL TASKS:** ${result.results.filter(r => r.success).length}

## Szczegóły Wykonania
${this.formatExecutionForAnalysis(result)}

## Analiza Requirements
Oceń następujące aspekty (0.0-1.0):
- **Goal Achievement:** Czy cel został osiągnięty?
- **Code Quality:** Jakość wygenerowanego kodu
- **Efficiency:** Efektywność wykonania (czas/wynik)
- **Completeness:** Pełność rozwiązania
- **Best Practices:** Czy zastosowano najlepsze praktyki?

Format odpowiedzi JSON:
\`\`\`json
{
  "overallScore": 0.85,
  "scores": {
    "goalAchievement": 0.9,
    "codeQuality": 0.8,
    "efficiency": 0.8,
    "completeness": 0.85,
    "bestPractices": 0.9
  },
  "strengths": ["Co poszło dobrze"],
  "weaknesses": ["Co można poprawić"], 
  "rootCauses": ["Główne przyczyny problemów"],
  "improvementSuggestions": [
    {
      "area": "code_quality",
      "suggestion": "Konkretna sugestia poprawy",
      "priority": "high|medium|low",
      "estimatedImpact": 0.2
    }
  ],
  "alternativeApproaches": [
    {
      "name": "Nazwa alternatywnego podejścia",
      "description": "Opis podejścia",
      "expectedScore": 0.9
    }
  ]
}
\`\`\``;

    try {
      const response = await pollinationsAI.chat([
        { role: 'system', content: analysisPrompt },
        { role: 'user', content: 'Przeanalizuj powyższe wyniki i dokonaj głębokiej oceny.' }
      ], { temperature: 0.2, maxTokens: 2000 });
      
      return await this.parseDeepAnalysis(response.content);
      
    } catch (error) {
      this.logger.error('Błąd głębokiej analizy:', error);
      return this.createFallbackAnalysis(result);
    }
  }

  /**
   * Adaptuje strategię na podstawie analizy wyników
   */
  private async adaptStrategy(
    currentStrategy: ExecutionStrategy,
    analysis: DeepAnalysisResult,
    result: GoalExecutionResult
  ): Promise<ExecutionStrategy> {
    this.logger.info('🔄 Adaptacja strategii na podstawie analizy...');
    
    // Jeśli są alternatywne podejścia z wyższym oczekiwanym wynikiem
    const bestAlternative = analysis.alternativeApproaches
      .filter(alt => alt.expectedScore > analysis.overallScore)
      .sort((a, b) => b.expectedScore - a.expectedScore)[0];
    
    if (bestAlternative) {
      this.logger.info(`Wybranie alternatywnej strategii: ${bestAlternative.name}`);
      return this.buildStrategy(bestAlternative.name, bestAlternative.description, {});
    }
    
    // Jeśli nie ma lepszych alternatyw, ulepsz aktualną strategię
    const enhancedStrategy = { ...currentStrategy };
    
    // Zastosuj sugestie popraw
    for (const suggestion of analysis.improvementSuggestions) {
      if (suggestion.priority === 'high' && suggestion.estimatedImpact > 0.15) {
        this.applyImprovementSuggestion(enhancedStrategy, suggestion);
      }
    }
    
    // Dostosuj parametry na podstawie weakness
    if (analysis.weaknesses.some(w => w.toLowerCase().includes('time'))) {
      enhancedStrategy.timeAllocation.planning *= 0.8;
      enhancedStrategy.timeAllocation.execution *= 1.2;
    }
    
    if (analysis.weaknesses.some(w => w.toLowerCase().includes('quality'))) {
      enhancedStrategy.contextEnhancements.codeStyle = 'enterprise-grade';
      enhancedStrategy.contextEnhancements.qualityFocus = true;
    }
    
    return enhancedStrategy;
  }

  /**
   * Uczenie się z udanych wykonAń
   */
  private async learnFromSuccess(
    strategy: ExecutionStrategy,
    analysis: DeepAnalysisResult,
    result: GoalExecutionResult
  ): Promise<void> {
    const pattern: SuccessPattern = {
      strategyName: strategy.name,
      goalType: this.classifyGoalType(result.goal),
      successFactors: analysis.strengths,
      contextPatterns: this.extractContextPatterns(strategy),
      averageScore: analysis.overallScore,
      usageCount: 1,
      lastUsed: new Date(),
      metadata: {
        executionTime: result.totalDuration,
        iterationsRequired: result.iterations,
        tasksCount: result.results.length
      }
    };
    
    const patternKey = `${pattern.goalType}_${strategy.name}`;
    
    if (this.successPatterns.has(patternKey)) {
      // Aktualizuj istniejący wzorzec
      const existing = this.successPatterns.get(patternKey)!;
      existing.averageScore = (existing.averageScore * existing.usageCount + analysis.overallScore) / (existing.usageCount + 1);
      existing.usageCount++;
      existing.lastUsed = new Date();
      existing.successFactors = [...new Set([...existing.successFactors, ...analysis.strengths])];
    } else {
      this.successPatterns.set(patternKey, pattern);
    }
    
    this.logger.info(`✅ Nauczone nowego wzorca sukcesu: ${patternKey}`);
    
    // Zapisz w MCP Memory dla długoterminowego uczenia
    await this.storeLearningInMCP(pattern);
  }

  /**
   * Post-execution learning i podsumowanie
   */
  private async performPostExecutionLearning(
    executionId: string,
    result: GoalExecutionResult | null,
    score: number,
    attempts: number
  ): Promise<void> {
    if (!result) return;
    
    const learningPrompt = `# 📚 Post-Execution Learning Agent

Przeanalizuj całe wykonanie i wyciągnij kluczowe wnioski do nauki.

**EXECUTION SUMMARY:**
- Goal: ${result.goal}
- Success: ${result.success}
- Score: ${score}
- Attempts: ${attempts}
- Duration: ${result.totalDuration}ms
- Iterations: ${result.iterations}

**DETAILED RESULTS:**
${result.results.map(r => `
- Task: ${r.taskId}
- Success: ${r.success}
- Duration: ${r.duration}ms
- Output Length: ${r.output?.length || 0} chars
${r.error ? `- Error: ${r.error}` : ''}`).join('')}

Format odpowiedzi:
\`\`\`json
{
  "keyLearnings": ["Nauka 1", "Nauka 2"],
  "patternObservations": ["Obserwacja wzorca 1"],
  "futureImprovements": ["Ulepszenie 1"],
  "confidenceInFutureSuccess": 0.85,
  "recommendedApproachForSimilar": "Rekomendacja dla podobnych celów"
}
\`\`\``;

    try {
      const response = await pollinationsAI.chat([
        { role: 'system', content: learningPrompt },
        { role: 'user', content: 'Przeanalizuj wykonanie i wyciągnij wnioski.' }
      ], { temperature: 0.3, maxTokens: 1000 });
      
      const learning = await this.parseLearningFromAI(response.content);
      
      // Zapisz nauki w execution memory
      this.executionMemory.set(executionId, {
        goal: result.goal,
        finalScore: score,
        attempts,
        keyLearnings: learning.keyLearnings,
        patterns: learning.patternObservations,
        improvements: learning.futureImprovements,
        confidence: learning.confidenceInFutureSuccess,
        timestamp: new Date()
      });
      
      this.logger.info(`📚 Zapisane ${learning.keyLearnings.length} nauk z wykonania ${executionId}`);
      
    } catch (error) {
      this.logger.error('Błąd post-execution learning:', error);
    }
  }

  /**
   * Continuous Improvement - Wykorzystuj poprzednie nauki
   */
  private async enhanceStrategyWithHistory(
    strategy: ExecutionStrategy,
    goal: string
  ): Promise<ExecutionStrategy> {
    const goalType = this.classifyGoalType(goal);
    const relevantMemories = Array.from(this.executionMemory.values())
      .filter(memory => this.classifyGoalType(memory.goal) === goalType)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Top 3 najbardziej relevantne
    
    if (relevantMemories.length === 0) return strategy;
    
    const enhanced = { ...strategy };
    
    // Zastosuj nauki z historii
    for (const memory of relevantMemories) {
      for (const learning of memory.keyLearnings) {
        if (learning.toLowerCase().includes('quality')) {
          enhanced.contextEnhancements.qualityFocus = true;
        }
        if (learning.toLowerCase().includes('test')) {
          enhanced.emphasizeTesting = true;
        }
        if (learning.toLowerCase().includes('planning')) {
          enhanced.timeAllocation.planning *= 1.3;
        }
      }
    }
    
    this.logger.info(`💪 Strategia ulepszona na podstawie ${relevantMemories.length} poprzednich wykonAń`);
    return enhanced;
  }

  /**
   * Real-time monitoring wykonania
   */
  async monitorExecution(executionId: string): Promise<ExecutionMonitoring> {
    const status = this.taskPlanner.getExecutionStatus(executionId);
    
    if (!status) {
      return {
        found: false,
        message: 'Execution not found or completed'
      };
    }
    
    // Przewiduj czas zakończenia na podstawie dotychczasowej wydajności
    const avgTaskTime = this.calculateAverageTaskTime(executionId);
    const estimatedCompletion = new Date(Date.now() + (status.progress.pending * avgTaskTime));
    
    return {
      found: true,
      executionId,
      status,
      predictedCompletion: estimatedCompletion,
      healthScore: this.calculateExecutionHealthScore(status),
      recommendations: await this.generateRealTimeRecommendations(status)
    };
  }

  /**
   * Recovery mechanizm dla failed executions
   */
  async recoverFromFailure(
    executionId: string,
    failureAnalysis: string
  ): Promise<RecoveryResult> {
    this.logger.info(`🔧 Próba recovery dla execution ${executionId}`);
    
    const recoveryPrompt = `# 🚫 Failure Recovery Agent

Przeanalizuj niepowodzenie i zaproponuj strategię recovery.

**FAILURE ANALYSIS:**
${failureAnalysis}

Możliwe strategie recovery:
1. **retry** - Ponów z drobnymi modyfikacjami
2. **alternative** - Spróbuj całkowicie inną strategię
3. **decompose** - Podziel na mniejsze, prostsze zadania
4. **research** - Zbierz więcej informacji przed ponowien
5. **abort** - Przerwij i zaraportuj jako niemożliwe

Odpowiedz w formacie JSON z wybraną strategią i uzasadnieniem.`;

    try {
      const response = await pollinationsAI.chat([
        { role: 'system', content: recoveryPrompt },
        { role: 'user', content: 'Zaproponuj strategię recovery.' }
      ], { temperature: 0.4 });
      
      const recovery = await this.parseRecoveryStrategy(response.content);
      
      return {
        success: true,
        strategy: recovery.strategy,
        reasoning: recovery.reasoning,
        modifications: recovery.modifications,
        estimatedSuccessChance: recovery.estimatedSuccessChance
      };
      
    } catch (error) {
      return {
        success: false,
        strategy: 'abort',
        reasoning: 'Recovery analysis failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Pobiera insights z pamięci wykonAń
   */
  getExecutionInsights(): ExecutionInsights {
    const totalExecutions = this.executionMemory.size;
    const successfulExecutions = Array.from(this.executionMemory.values())
      .filter(memory => memory.finalScore > 0.7).length;
    
    const avgScore = Array.from(this.executionMemory.values())
      .reduce((sum, memory) => sum + memory.finalScore, 0) / totalExecutions || 0;
    
    const mostSuccessfulPatterns = Array.from(this.successPatterns.entries())
      .sort(([, a], [, b]) => b.averageScore - a.averageScore)
      .slice(0, 5);
    
    const commonFailurePatterns = this.identifyFailurePatterns();
    
    return {
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      averageScore: avgScore,
      mostSuccessfulPatterns: mostSuccessfulPatterns.map(([key, pattern]) => ({
        name: key,
        score: pattern.averageScore,
        usage: pattern.usageCount
      })),
      commonFailures: commonFailurePatterns,
      learningTrends: this.calculateLearningTrends(),
      recommendations: this.generateGlobalRecommendations()
    };
  }

  // Helper methods
  private extractStrategyName(response: string): string {
    const strategies = ['incremental', 'parallel', 'prototype', 'research-first', 'test-driven'];
    const found = strategies.find(s => response.toLowerCase().includes(s));
    return found || 'incremental';
  }

  private buildStrategy(
    name: string,
    reasoning: string,
    context: CodingContext
  ): ExecutionStrategy {
    const baseStrategies: Record<string, Partial<ExecutionStrategy>> = {
      'incremental': {
        timeAllocation: { planning: 0.2, execution: 0.6, validation: 0.2 },
        riskTolerance: 'low',
        iterationStyle: 'sequential'
      },
      'parallel': {
        timeAllocation: { planning: 0.3, execution: 0.5, validation: 0.2 },
        riskTolerance: 'medium',
        iterationStyle: 'parallel'
      },
      'prototype': {
        timeAllocation: { planning: 0.1, execution: 0.7, validation: 0.2 },
        riskTolerance: 'high',
        iterationStyle: 'rapid'
      },
      'research-first': {
        timeAllocation: { planning: 0.4, execution: 0.4, validation: 0.2 },
        riskTolerance: 'low',
        iterationStyle: 'methodical'
      },
      'test-driven': {
        timeAllocation: { planning: 0.2, execution: 0.4, validation: 0.4 },
        riskTolerance: 'low',
        iterationStyle: 'test-first',
        emphasizeTesting: true
      }
    };
    
    return {
      name,
      reasoning,
      contextEnhancements: {
        ...context,
        strategicFocus: name
      },
      constraintModifications: {},
      ...baseStrategies[name],
      timestamp: new Date()
    } as ExecutionStrategy;
  }

  private async parseDeepAnalysis(aiResponse: string): Promise<DeepAnalysisResult> {
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      return JSON.parse(jsonMatch[1]);
    } catch (error) {
      return this.createFallbackAnalysis(null);
    }
  }

  private createFallbackAnalysis(result: GoalExecutionResult | null): DeepAnalysisResult {
    return {
      overallScore: result?.success ? 0.6 : 0.3,
      scores: {
        goalAchievement: result?.success ? 0.7 : 0.2,
        codeQuality: 0.5,
        efficiency: 0.5,
        completeness: 0.5,
        bestPractices: 0.5
      },
      strengths: result?.success ? ['Task completed'] : [],
      weaknesses: result?.success ? ['Quality needs assessment'] : ['Execution failed'],
      rootCauses: ['Analysis system error'],
      improvementSuggestions: [],
      alternativeApproaches: []
    };
  }

  private formatExecutionForAnalysis(result: GoalExecutionResult): string {
    return `Results Summary:
${result.results.map((r, i) => `
${i + 1}. Task: ${r.taskId}
   Status: ${r.success ? '✅ SUCCESS' : '❌ FAILED'}
   Duration: ${r.duration}ms
   Output: ${r.output ? r.output.substring(0, 150) + '...' : 'No output'}
   ${r.error ? `Error: ${r.error}` : ''}`).join('')}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private classifyGoalType(goal: string): string {
    const lowerGoal = goal.toLowerCase();
    if (lowerGoal.includes('api') || lowerGoal.includes('endpoint')) return 'api-development';
    if (lowerGoal.includes('component') || lowerGoal.includes('ui')) return 'frontend-development';
    if (lowerGoal.includes('database') || lowerGoal.includes('model')) return 'backend-development';
    if (lowerGoal.includes('test')) return 'testing';
    if (lowerGoal.includes('deploy') || lowerGoal.includes('ci')) return 'devops';
    return 'general-development';
  }

  private async parseLearningFromAI(aiResponse: string): Promise<any> {
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) return this.createDefaultLearning();
      return JSON.parse(jsonMatch[1]);
    } catch {
      return this.createDefaultLearning();
    }
  }

  private createDefaultLearning() {
    return {
      keyLearnings: ['Execution completed'],
      patternObservations: ['Standard execution pattern'],
      futureImprovements: ['Monitor for optimization opportunities'],
      confidenceInFutureSuccess: 0.7,
      recommendedApproachForSimilar: 'Use similar strategy'
    };
  }

  private handleReflection(data: any): void {
    this.logger.info(`🤔 Reflection completed for ${data.executionId} (iteration ${data.iteration})`);
    this.emit('agent-reflection', data);
  }

  private calculateAverageTaskTime(executionId: string): number {
    // Implementacja obliczania średniego czasu zadania
    return 10 * 60 * 1000; // Default 10 minut
  }

  private calculateExecutionHealthScore(status: any): number {
    const completionRate = status.progress.completed / status.progress.total;
    const failureRate = status.progress.failed / status.progress.total;
    return Math.max(0, completionRate - (failureRate * 0.5));
  }

  private async generateRealTimeRecommendations(status: any): Promise<string[]> {
    return [
      'Monitor task dependencies',
      'Check for resource constraints',
      'Consider parallel execution'
    ];
  }

  private applyImprovementSuggestion(strategy: ExecutionStrategy, suggestion: any): void {
    // Implementacja zastosowania sugestii popraw
    switch (suggestion.area) {
      case 'code_quality':
        strategy.contextEnhancements.qualityFocus = true;
        break;
      case 'efficiency':
        strategy.timeAllocation.execution *= 0.9;
        break;
    }
  }

  private extractContextPatterns(strategy: ExecutionStrategy): string[] {
    return Object.keys(strategy.contextEnhancements);
  }

  private identifyFailurePatterns(): string[] {
    return ['Timeout errors', 'Dependency resolution', 'Quality thresholds'];
  }

  private calculateLearningTrends(): string[] {
    return ['Improving code quality', 'Better time estimation', 'Enhanced error handling'];
  }

  private generateGlobalRecommendations(): string[] {
    return [
      'Focus on incremental strategies for complex goals',
      'Emphasize testing for production code',
      'Use research-first approach for unfamiliar domains'
    ];
  }

  private async storeLearningInMCP(pattern: SuccessPattern): Promise<void> {
    if (!this.mcpManager) return;
    
    try {
      await this.mcpManager.callTool('memory-keeper', {
        name: 'store_memory',
        arguments: {
          content: `Success pattern: ${pattern.strategyName} for ${pattern.goalType}`,
          metadata: {
            type: 'success-pattern',
            strategy: pattern.strategyName,
            goalType: pattern.goalType,
            score: pattern.averageScore,
            factors: pattern.successFactors
          }
        }
      });
    } catch (error) {
      this.logger.warn('Cannot store learning in MCP:', error);
    }
  }

  private async parseRecoveryStrategy(aiResponse: string): Promise<any> {
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[1]);
    } catch {
      return {
        strategy: 'retry',
        reasoning: 'Simple retry strategy',
        modifications: {},
        estimatedSuccessChance: 0.5
      };
    }
  }

  private async extractLearningInsights(
    result: GoalExecutionResult | null,
    strategy: ExecutionStrategy
  ): Promise<string[]> {
    if (!result) return [];
    
    return [
      `Strategy "${strategy.name}" ${result.success ? 'succeeded' : 'failed'} after ${result.iterations} iterations`,
      `Total execution time: ${result.totalDuration}ms`,
      `Task success rate: ${result.results.filter(r => r.success).length}/${result.results.length}`
    ];
  }
}

// Typy dla Autonomous Agent
export interface ExecutionStrategy {
  name: string;
  reasoning: string;
  contextEnhancements: CodingContext & {
    strategicFocus?: string;
    qualityFocus?: boolean;
  };
  constraintModifications: Partial<GoalConstraints>;
  timeAllocation: {
    planning: number;
    execution: number;
    validation: number;
  };
  riskTolerance: 'low' | 'medium' | 'high';
  iterationStyle: 'sequential' | 'parallel' | 'rapid' | 'methodical' | 'test-first';
  emphasizeTesting?: boolean;
  timestamp: Date;
}

export interface DeepAnalysisResult {
  overallScore: number;
  scores: {
    goalAchievement: number;
    codeQuality: number;
    efficiency: number;
    completeness: number;
    bestPractices: number;
  };
  strengths: string[];
  weaknesses: string[];
  rootCauses: string[];
  improvementSuggestions: Array<{
    area: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: number;
  }>;
  alternativeApproaches: Array<{
    name: string;
    description: string;
    expectedScore: number;
  }>;
}

export interface SuccessPattern {
  strategyName: string;
  goalType: string;
  successFactors: string[];
  contextPatterns: string[];
  averageScore: number;
  usageCount: number;
  lastUsed: Date;
  metadata: Record<string, any>;
}

export interface ExecutionMemory {
  goal: string;
  finalScore: number;
  attempts: number;
  keyLearnings: string[];
  patterns: string[];
  improvements: string[];
  confidence: number;
  timestamp: Date;
}

export interface AutonomousExecutionResult {
  success: boolean;
  executionId: string;
  goal: string;
  attempts: number;
  bestResult: GoalExecutionResult | null;
  bestScore: number;
  finalStrategy?: ExecutionStrategy;
  error?: string;
  totalDuration: number;
  learningInsights?: string[];
  metadata?: Record<string, any>;
}

export interface ExecutionMonitoring {
  found: boolean;
  executionId?: string;
  status?: any;
  predictedCompletion?: Date;
  healthScore?: number;
  recommendations?: string[];
  message?: string;
}

export interface RecoveryResult {
  success: boolean;
  strategy: string;
  reasoning: string;
  modifications?: Record<string, any>;
  estimatedSuccessChance?: number;
  error?: string;
}

export interface ExecutionInsights {
  totalExecutions: number;
  successRate: number;
  averageScore: number;
  mostSuccessfulPatterns: Array<{
    name: string;
    score: number;
    usage: number;
  }>;
  commonFailures: string[];
  learningTrends: string[];
  recommendations: string[];
}

// Singleton instance
export const autonomousAgent = new AutonomousAgent();