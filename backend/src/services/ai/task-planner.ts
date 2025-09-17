import { Logger } from '../../utils/logger';
import { pollinationsAI, CodingContext, AIResponse } from './pollinations-client';
import { MCPManager } from '../../modules/mcp';
import { EventEmitter } from 'events';

/**
 * Autonomiczny planer zadań z self-reflection i goal achievement
 * Agent analizuje swoje własne wyniki i dostosowuje plan wykonania
 */
export class TaskPlanner extends EventEmitter {
  private logger: Logger;
  private mcpManager: MCPManager | null = null;
  private activePlans: Map<string, TaskPlan> = new Map();
  private executionHistory: Map<string, TaskExecution[]> = new Map();
  private maxIterations = 10; // Maksymalne iteracje dla złożonych celów
  private reflectionThreshold = 0.7; // Próg sukcesu dla kontynuacji

  constructor(mcpManager?: MCPManager) {
    super();
    this.logger = new Logger('TaskPlanner');
    this.mcpManager = mcpManager || null;
  }

  /**
   * Główna metoda - tworzy plan i wykonuje go autonomicznie
   */
  async executeGoal(
    goal: string,
    sessionId: string,
    context: CodingContext = {},
    constraints: GoalConstraints = {}
  ): Promise<GoalExecutionResult> {
    const executionId = this.generateExecutionId();
    this.logger.info(`[${executionId}] Rozpoczęcie wykonania celu: ${goal}`);
    
    try {
      // 1. ANALIZA CELU I TWORZENIE PLANU
      const plan = await this.createTaskPlan(goal, context, constraints);
      this.activePlans.set(executionId, plan);
      
      this.emit('plan-created', { executionId, plan, sessionId });
      this.logger.info(`[${executionId}] Plan utworzony: ${plan.tasks.length} zadań`);
      
      // 2. ITERACYJNE WYKONYWANIE ZADAŃ
      let iteration = 0;
      let overallSuccess = false;
      const results: TaskExecutionResult[] = [];
      
      while (iteration < this.maxIterations && !overallSuccess) {
        iteration++;
        this.logger.info(`[${executionId}] Iteracja ${iteration}/${this.maxIterations}`);
        
        // Wykonaj następne zadania z planu
        const iterationResults = await this.executeNextTasks(executionId, sessionId, context);
        results.push(...iterationResults);
        
        // SELF-REFLECTION: Analizuj wyniki
        const reflection = await this.analyzeResults(iterationResults, plan.goal, context);
        this.emit('reflection-completed', { executionId, iteration, reflection });
        
        // Oceń czy cel został osiągnięty
        if (reflection.goalAchieved) {
          overallSuccess = true;
          this.logger.info(`[${executionId}] CEL OSIĄGNIĘTY w iteracji ${iteration}!`);
          break;
        }
        
        // Jeśli nie osiągnięto celu, dostosuj plan
        if (reflection.confidenceScore < this.reflectionThreshold) {
          await this.adaptPlan(executionId, reflection, iterationResults);
          this.emit('plan-adapted', { executionId, iteration, newPlan: this.activePlans.get(executionId) });
        }
      }
      
      // 3. FINALNE PODSUMOWANIE
      const finalSummary = await this.generateFinalSummary(executionId, results, overallSuccess);
      
      // Zapisz wyniki w MCP dla przyszłych analiz
      await this.storeExecutionInMCP(executionId, plan, results, finalSummary);
      
      return {
        success: overallSuccess,
        executionId,
        goal,
        iterations: iteration,
        results,
        finalSummary,
        plan: this.activePlans.get(executionId)!,
        totalDuration: Date.now() - plan.createdAt.getTime()
      };
      
    } catch (error) {
      this.logger.error(`[${executionId}] Błąd wykonania celu:`, error);
      return {
        success: false,
        executionId,
        goal,
        iterations: 0,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        totalDuration: 0
      };
    } finally {
      // Cleanup
      this.activePlans.delete(executionId);
    }
  }

  /**
   * Tworzy szczegółowy plan zadań na podstawie celu
   */
  private async createTaskPlan(
    goal: string,
    context: CodingContext,
    constraints: GoalConstraints
  ): Promise<TaskPlan> {
    const planningPrompt = this.buildPlanningPrompt(goal, context, constraints);
    
    const response = await pollinationsAI.chat([
      { role: 'system', content: planningPrompt },
      { role: 'user', content: `GOAL: ${goal}\n\nUtwórz szczegółowy plan wykonania tego celu.` }
    ], { temperature: 0.3, maxTokens: 3000 });
    
    // Parsuj odpowiedź AI i stwórz strukturalny plan
    const parsedPlan = await this.parsePlanFromAI(response.content, goal);
    
    return {
      id: this.generateExecutionId(),
      goal,
      description: parsedPlan.description,
      tasks: parsedPlan.tasks,
      successCriteria: parsedPlan.successCriteria,
      createdAt: new Date(),
      estimatedDuration: parsedPlan.estimatedDuration,
      priority: constraints.priority || 'medium',
      constraints
    };
  }

  /**
   * Wykonuje następne zadania z planu
   */
  private async executeNextTasks(
    executionId: string,
    sessionId: string,
    context: CodingContext
  ): Promise<TaskExecutionResult[]> {
    const plan = this.activePlans.get(executionId);
    if (!plan) throw new Error(`Plan ${executionId} not found`);
    
    const results: TaskExecutionResult[] = [];
    
    // Znajdź zadania gotowe do wykonania (dependencies spełnione)
    const readyTasks = plan.tasks.filter(task => 
      task.status === 'pending' && this.areDependenciesSatisfied(task, plan.tasks)
    );
    
    this.logger.info(`[${executionId}] Wykonywanie ${readyTasks.length} zadań...`);
    
    for (const task of readyTasks.slice(0, 3)) { // Maksymalnie 3 zadania równocześnie
      const result = await this.executeTask(task, sessionId, context, executionId);
      results.push(result);
      
      // Aktualizuj status zadania w planie
      task.status = result.success ? 'completed' : 'failed';
      task.result = result;
      
      this.emit('task-completed', { executionId, task, result });
    }
    
    return results;
  }

  /**
   * Wykonuje pojedyncze zadanie
   */
  private async executeTask(
    task: Task,
    sessionId: string, 
    context: CodingContext,
    executionId: string
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    this.logger.info(`[${executionId}] Wykonywanie zadania: ${task.id} - ${task.description}`);
    
    try {
      let result: any;
    
      switch (task.type) {
        case 'code_generation':
          result = await this.executeCodeGeneration(task, context);
          break;
        case 'code_analysis':
          result = await this.executeCodeAnalysis(task, context);
          break;
        case 'testing':
          result = await this.executeTesting(task, context);
          break;
        case 'mcp_operation':
          result = await this.executeMCPOperation(task, context);
          break;
        case 'research':
          result = await this.executeResearch(task, context);
          break;
        case 'validation':
          result = await this.executeValidation(task, context);
          break;
        default:
          result = await this.executeGenericTask(task, context);
      }
      
      const duration = Date.now() - startTime;
      
      return {
        taskId: task.id,
        success: true,
        output: result,
        duration,
        timestamp: new Date(),
        metadata: {
          type: task.type,
          executionId,
          iteration: this.getCurrentIteration(executionId)
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${executionId}] Błąd wykonania zadania ${task.id}:`, error);
      
      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        timestamp: new Date(),
        metadata: {
          type: task.type,
          executionId,
          iteration: this.getCurrentIteration(executionId)
        }
      };
    }
  }

  /**
   * SELF-REFLECTION: Analizuje wyniki i ocenia postęp
   */
  private async analyzeResults(
    results: TaskExecutionResult[],
    goal: string,
    context: CodingContext
  ): Promise<ReflectionResult> {
    const reflectionPrompt = this.buildReflectionPrompt(results, goal, context);
    
    const response = await pollinationsAI.chat([
      { role: 'system', content: reflectionPrompt },
      { 
        role: 'user', 
        content: `ANALIZA WYNIKÓW:\n${this.formatResultsForAnalysis(results)}\n\nPrzeanalizuj te wyniki i oceń postęp w kierunku celu: "${goal}"` 
      }
    ], { temperature: 0.2, maxTokens: 2000 });
    
    // Parsuj analizę z AI
    const reflection = await this.parseReflectionFromAI(response.content);
    
    this.logger.info('Self-reflection result:', {
      goalAchieved: reflection.goalAchieved,
      confidenceScore: reflection.confidenceScore,
      issuesFound: reflection.issues.length,
      nextStepsCount: reflection.nextSteps.length
    });
    
    return reflection;
  }

  /**
   * Dostosowuje plan na podstawie analizy wyników
   */
  private async adaptPlan(
    executionId: string,
    reflection: ReflectionResult,
    results: TaskExecutionResult[]
  ): Promise<void> {
    const plan = this.activePlans.get(executionId);
    if (!plan) return;
    
    this.logger.info(`[${executionId}] Dostosowywanie planu na podstawie refleksji...`);
    
    // Identyfikuj problemy i dodaj nowe zadania
    for (const issue of reflection.issues) {
      if (issue.severity === 'critical') {
        const fixTask: Task = {
          id: this.generateTaskId(),
          description: `Napraw krytyczny problem: ${issue.description}`,
          type: 'code_generation',
          priority: 'high',
          status: 'pending',
          dependencies: [],
          successCriteria: [issue.suggestedFix],
          estimatedDuration: 15 * 60 * 1000, // 15 minut
          metadata: {
            isGeneratedFix: true,
            originalIssue: issue
          }
        };
        
        plan.tasks.unshift(fixTask); // Dodaj na początek jako priorytet
      }
    }
    
    // Dodaj nowe zadania z next steps
    for (const step of reflection.nextSteps) {
      if (!this.taskExists(plan, step.description)) {
        const newTask: Task = {
          id: this.generateTaskId(),
          description: step.description,
          type: step.type as TaskType,
          priority: step.priority as TaskPriority,
          status: 'pending',
          dependencies: step.dependencies || [],
          successCriteria: [step.successCriteria || 'Completed successfully'],
          estimatedDuration: (step.estimatedMinutes || 10) * 60 * 1000,
          metadata: {
            isAdaptive: true,
            generatedFromReflection: true
          }
        };
        
        plan.tasks.push(newTask);
      }
    }
    
    // Sortuj zadania według priorytetu
    plan.tasks.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    this.logger.info(`[${executionId}] Plan dostosowany: ${plan.tasks.length} zadań w kolejce`);
  }

  /**
   * Buduje zaawansowany prompt dla planowania
   */
  private buildPlanningPrompt(
    goal: string, 
    context: CodingContext, 
    constraints: GoalConstraints
  ): string {
    return `# 🧠 Autonomous Task Planner Agent

Jesteś ekspertem w dekompozycji celów na wykonalne zadania z self-reflection capabilities.

## Twoja Misja
Analizuj złożone cele i twórz szczegółowe plany wykonania składające się z atomowych zadań.

## Możliwości MCP
${this.mcpManager ? `
- **Browser Automation:** Navigate, click, screenshot, scrape data
- **Context Management:** Store decisions, track progress, link items  
- **Memory System:** Store insights, search similarities, cluster information
` : 'MCP nie jest dostępny - ograniczone do operacji AI.'}

## Format Planu
Odpowiedz w następującym formacie JSON:

\`\`\`json
{
  "description": "Krótki opis planu wykonania",
  "successCriteria": [
    "Konkretne kryterium sukcesu 1",
    "Konkretne kryterium sukcesu 2"
  ],
  "estimatedDuration": 1800000,
  "tasks": [
    {
      "id": "task-1",
      "description": "Szczegółowy opis zadania",
      "type": "code_generation|code_analysis|testing|mcp_operation|research|validation",
      "priority": "high|medium|low", 
      "dependencies": ["task-id-1", "task-id-2"],
      "successCriteria": ["Kryterium sukcesu zadania"],
      "estimatedDuration": 600000,
      "parameters": {
        "language": "typescript",
        "outputPath": "src/components/NewComponent.tsx"
      }
    }
  ]
}
\`\`\`

## Zasady Planowania
1. **Atomowość:** Każde zadanie musi być niezależnie wykonalne
2. **Dependency Management:** Jasno określ zależności między zadaniami
3. **Measurable Success:** Każde zadanie musi mieć konkretne kryteria sukcesu
4. **Realistic Timing:** Oszacowania czasowe oparte na rzeczywistych wymaganiach
5. **Progressive Refinement:** Plan może być adaptowany na podstawie wyników

## Typy Zadań
- **code_generation:** Tworzenie nowego kodu
- **code_analysis:** Analiza istniejącego kodu
- **testing:** Generowanie i wykonywanie testów
- **mcp_operation:** Operacje browser/context/memory
- **research:** Analiza wymagań i rozwiązań
- **validation:** Sprawdzanie rezultatów

## Kontekst Projektu
${this.formatContextForPlanning(context)}

## Ograniczenia
${this.formatConstraintsForPlanning(constraints)}`;
  }

  /**
   * Buduje prompt dla self-reflection
   */
  private buildReflectionPrompt(
    results: TaskExecutionResult[],
    goal: string,
    context: CodingContext
  ): string {
    return `# 🔍 Self-Reflection Analysis Agent

Jesteś ekspertem w analizie wyników i ocenie postępu w kierunku celów.

## Twoja Misja
Przeanalizuj wyniki wykonanych zadań i oceń czy cel został osiągnięty.

## Możliwości Analizy
- **Success Pattern Recognition:** Identyfikuj co działa dobrze
- **Failure Analysis:** Szczegółowa analiza przyczyn niepowodzeń
- **Gap Analysis:** Co jeszcze trzeba zrobić dla osiągnięcia celu
- **Risk Assessment:** Identyfikuj potencjalne problemy
- **Next Steps Planning:** Zaproponuj konkretne kolejne kroki

## Format Analizy
Odpowiedz w formacie JSON:

\`\`\`json
{
  "goalAchieved": false,
  "confidenceScore": 0.7,
  "progressPercentage": 65,
  "successfulTasks": ["task-1", "task-3"],
  "failedTasks": ["task-2"],
  "issues": [
    {
      "description": "Opis problemu", 
      "severity": "critical|high|medium|low",
      "suggestedFix": "Konkretne rozwiązanie"
    }
  ],
  "insights": [
    "Kluczowy wniosek 1",
    "Kluczowy wniosek 2"
  ],
  "nextSteps": [
    {
      "description": "Opis następnego kroku",
      "type": "code_generation|code_analysis|testing|mcp_operation|research|validation",
      "priority": "high|medium|low",
      "estimatedMinutes": 15,
      "dependencies": [],
      "successCriteria": "Jak zmierzyć sukces"
    }
  ],
  "recommendations": [
    "Rekomendacja 1",
    "Rekomendacja 2"
  ]
}
\`\`\`

## Kryteria Oceny
- **Goal Achievement:** Czy główny cel został osiągnięty?
- **Quality Assessment:** Czy wyniki są wysokiej jakości?
- **Completeness:** Czy wszystkie aspekty zostały pokryte?
- **Best Practices:** Czy kod/rozwiązanie följuje najlepsze praktyki?

CEL DO OSIĄGNIĘCIA: "${goal}"`;
  }

  /**
   * Parsuje plan z odpowiedzi AI
   */
  private async parsePlanFromAI(aiResponse: string, goal: string): Promise<ParsedPlan> {
    try {
      // Wyciągnij JSON z odpowiedzi
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        throw new Error('Nie znaleziono JSON w odpowiedzi AI');
      }
      
      const planData = JSON.parse(jsonMatch[1]);
      
      // Waliduj i mapuj na nasze typy
      const tasks: Task[] = planData.tasks.map((taskData: any, index: number) => ({
        id: taskData.id || `task-${index + 1}`,
        description: taskData.description,
        type: taskData.type as TaskType,
        priority: taskData.priority as TaskPriority,
        status: 'pending' as TaskStatus,
        dependencies: taskData.dependencies || [],
        successCriteria: taskData.successCriteria || [],
        estimatedDuration: taskData.estimatedDuration || 600000, // 10 min default
        parameters: taskData.parameters || {},
        metadata: {
          parsedFromAI: true,
          originalIndex: index
        }
      }));
      
      return {
        description: planData.description,
        tasks,
        successCriteria: planData.successCriteria || [],
        estimatedDuration: planData.estimatedDuration || 3600000 // 1 hour default
      };
      
    } catch (error) {
      this.logger.error('Błąd parsowania planu z AI:', error);
      
      // Fallback: stwórz prosty plan
      return {
        description: `Plan wykonania: ${goal}`,
        tasks: [{
          id: 'task-fallback-1',
          description: goal,
          type: 'code_generation',
          priority: 'medium',
          status: 'pending',
          dependencies: [],
          successCriteria: ['Completed successfully'],
          estimatedDuration: 1800000, // 30 min
          parameters: {},
          metadata: { isFallback: true }
        }],
        successCriteria: ['Goal completed successfully'],
        estimatedDuration: 1800000
      };
    }
  }

  /**
   * Parsuje wyniki refleksji z AI
   */
  private async parseReflectionFromAI(aiResponse: string): Promise<ReflectionResult> {
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        throw new Error('Nie znaleziono JSON w odpowiedzi refleksji');
      }
      
      const reflectionData = JSON.parse(jsonMatch[1]);
      
      return {
        goalAchieved: reflectionData.goalAchieved || false,
        confidenceScore: reflectionData.confidenceScore || 0.5,
        progressPercentage: reflectionData.progressPercentage || 0,
        successfulTasks: reflectionData.successfulTasks || [],
        failedTasks: reflectionData.failedTasks || [],
        issues: reflectionData.issues || [],
        insights: reflectionData.insights || [],
        nextSteps: reflectionData.nextSteps || [],
        recommendations: reflectionData.recommendations || [],
        timestamp: new Date()
      };
      
    } catch (error) {
      this.logger.error('Błąd parsowania refleksji z AI:', error);
      
      // Fallback reflection
      return {
        goalAchieved: false,
        confidenceScore: 0.3,
        progressPercentage: 30,
        successfulTasks: results.filter(r => r.success).map(r => r.taskId),
        failedTasks: results.filter(r => !r.success).map(r => r.taskId),
        issues: [{
          description: 'Błąd parsowania refleksji - wymagana ręczna analiza',
          severity: 'medium',
          suggestedFix: 'Przejrzyj wyniki ręcznie'
        }],
        insights: ['Wymagana ręczna analiza wyników'],
        nextSteps: [],
        recommendations: ['Sprawdź logi dla szczegółów'],
        timestamp: new Date()
      };
    }
  }

  /**
   * Wykonuje konkretne typy zadań
   */
  private async executeCodeGeneration(task: Task, context: CodingContext): Promise<string> {
    const response = await pollinationsAI.askCodingAgent(
      `Generate code for: ${task.description}`,
      context
    );
    return response.content;
  }

  private async executeCodeAnalysis(task: Task, context: CodingContext): Promise<string> {
    const code = task.parameters?.code || '';
    const response = await pollinationsAI.analyzeCode(code, 'quality', context);
    return response.content;
  }

  private async executeTesting(task: Task, context: CodingContext): Promise<string> {
    const code = task.parameters?.code || '';
    const response = await pollinationsAI.generateTests(code, 'unit', context);
    return response.content;
  }

  private async executeMCPOperation(task: Task, context: CodingContext): Promise<string> {
    if (!this.mcpManager) {
      throw new Error('MCP Manager nie jest dostępny');
    }
    
    const { server, tool, arguments: args } = task.parameters;
    const result = await this.mcpManager.callTool(server, { name: tool, arguments: args });
    
    return JSON.stringify(result, null, 2);
  }

  private async executeResearch(task: Task, context: CodingContext): Promise<string> {
    const response = await pollinationsAI.chat([
      {
        role: 'system',
        content: 'Jesteś ekspertem researcher w technologiach webowych i best practices.'
      },
      {
        role: 'user',
        content: `Research task: ${task.description}`
      }
    ], { temperature: 0.4 });
    
    return response.content;
  }

  private async executeValidation(task: Task, context: CodingContext): Promise<string> {
    const response = await pollinationsAI.chat([
      {
        role: 'system', 
        content: 'Jesteś ekspertem w walidacji kodu i quality assurance.'
      },
      {
        role: 'user',
        content: `Validate: ${task.description}\n\nCriteria: ${task.successCriteria.join(', ')}`
      }
    ], { temperature: 0.2 });
    
    return response.content;
  }

  private async executeGenericTask(task: Task, context: CodingContext): Promise<string> {
    const response = await pollinationsAI.askCodingAgent(
      task.description,
      { ...context, currentTask: task.type }
    );
    return response.content;
  }

  /**
   * Zapisuje wykonanie w MCP dla przyszłych analiz
   */
  private async storeExecutionInMCP(
    executionId: string,
    plan: TaskPlan,
    results: TaskExecutionResult[],
    summary: string
  ): Promise<void> {
    if (!this.mcpManager) return;
    
    try {
      // Zapisz w Context Portal
      await this.mcpManager.callTool('context-portal', {
        name: 'log_decision',
        arguments: {
          summary: `Autonomous execution: ${plan.goal}`,
          rationale: summary,
          implementation_details: JSON.stringify({
            executionId,
            tasksCompleted: results.filter(r => r.success).length,
            totalTasks: plan.tasks.length,
            duration: results.reduce((sum, r) => sum + r.duration, 0)
          }),
          tags: ['autonomous-execution', 'task-planner', plan.priority]
        }
      });
      
      // Zapisz w Memory Keeper
      await this.mcpManager.callTool('memory-keeper', {
        name: 'store_memory',
        arguments: {
          content: `Autonomous goal execution: ${plan.goal}. ${summary}`,
          metadata: {
            executionId,
            type: 'goal-execution',
            success: results.every(r => r.success),
            tasksCount: plan.tasks.length,
            timestamp: new Date().toISOString()
          }
        }
      });
      
    } catch (error) {
      this.logger.warn('Nie można zapisać wykonania w MCP:', error);
    }
  }

  /**
   * Generuje finalne podsumowanie
   */
  private async generateFinalSummary(
    executionId: string,
    results: TaskExecutionResult[],
    success: boolean
  ): Promise<string> {
    const summaryPrompt = `Stwórz zwięzłe podsumowanie wykonania zadań:

Wyniki: ${results.length} zadań
Udane: ${results.filter(r => r.success).length}
Nieudane: ${results.filter(r => !r.success).length}
Sukces ogólny: ${success}

Szczegóły wyników:
${results.map(r => `- ${r.taskId}: ${r.success ? 'SUCCESS' : 'FAILED'} (${r.duration}ms)`).join('\n')}

Stwórz profesjonalne podsumowanie w 2-3 zdaniach.`;

    try {
      const response = await pollinationsAI.chat([
        { role: 'user', content: summaryPrompt }
      ], { temperature: 0.3, maxTokens: 200 });
      
      return response.content;
    } catch {
      return `Wykonano ${results.length} zadań z ${results.filter(r => r.success).length} sukcesami. ${success ? 'Cel osiągnięty.' : 'Cel nie został w pełni osiągnięty.'}`;
    }
  }

  // Utility methods
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private getCurrentIteration(executionId: string): number {
    const history = this.executionHistory.get(executionId);
    return history ? history.length + 1 : 1;
  }

  private areDependenciesSatisfied(task: Task, allTasks: Task[]): boolean {
    return task.dependencies.every(depId => 
      allTasks.find(t => t.id === depId)?.status === 'completed'
    );
  }

  private taskExists(plan: TaskPlan, description: string): boolean {
    return plan.tasks.some(task => 
      task.description.toLowerCase().includes(description.toLowerCase()) ||
      description.toLowerCase().includes(task.description.toLowerCase())
    );
  }

  private formatResultsForAnalysis(results: TaskExecutionResult[]): string {
    return results.map(result => `
Task: ${result.taskId}
Status: ${result.success ? 'SUCCESS' : 'FAILED'}
Duration: ${result.duration}ms
Output: ${result.output ? result.output.substring(0, 200) + '...' : 'No output'}
Error: ${result.error || 'None'}
`).join('\n---\n');
  }

  private formatContextForPlanning(context: CodingContext): string {
    return Object.entries(context)
      .map(([key, value]) => `- **${key}:** ${value}`)
      .join('\n') || 'Brak dodatkowego kontekstu.';
  }

  private formatConstraintsForPlanning(constraints: GoalConstraints): string {
    const items: string[] = [];
    if (constraints.timeLimit) items.push(`Limit czasu: ${constraints.timeLimit}ms`);
    if (constraints.maxTasks) items.push(`Maksymalnie zadań: ${constraints.maxTasks}`);
    if (constraints.technologies) items.push(`Technologie: ${constraints.technologies.join(', ')}`);
    if (constraints.excludedOperations) items.push(`Wykluczone operacje: ${constraints.excludedOperations.join(', ')}`);
    
    return items.join('\n') || 'Brak szczególnych ograniczeń.';
  }

  /**
   * Pobiera status wykonania
   */
  getExecutionStatus(executionId: string): ExecutionStatus | null {
    const plan = this.activePlans.get(executionId);
    if (!plan) return null;
    
    const completed = plan.tasks.filter(t => t.status === 'completed').length;
    const failed = plan.tasks.filter(t => t.status === 'failed').length;
    const pending = plan.tasks.filter(t => t.status === 'pending').length;
    const inProgress = plan.tasks.filter(t => t.status === 'in_progress').length;
    
    return {
      executionId,
      goal: plan.goal,
      progress: {
        total: plan.tasks.length,
        completed,
        failed,
        pending,
        inProgress
      },
      estimatedTimeRemaining: pending * 600000, // Rough estimate
      currentPhase: this.determineCurrentPhase(plan)
    };
  }

  private determineCurrentPhase(plan: TaskPlan): string {
    const completedCount = plan.tasks.filter(t => t.status === 'completed').length;
    const totalCount = plan.tasks.length;
    const progress = completedCount / totalCount;
    
    if (progress < 0.25) return 'initialization';
    if (progress < 0.5) return 'development';  
    if (progress < 0.75) return 'testing';
    if (progress < 1) return 'finalization';
    return 'completed';
  }
}

// Typy dla Task Planner
export type TaskType = 'code_generation' | 'code_analysis' | 'testing' | 'mcp_operation' | 'research' | 'validation';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[];
  successCriteria: string[];
  estimatedDuration: number; // milliseconds
  parameters?: Record<string, any>;
  result?: TaskExecutionResult;
  metadata?: Record<string, any>;
}

export interface TaskPlan {
  id: string;
  goal: string;
  description: string;
  tasks: Task[];
  successCriteria: string[];
  createdAt: Date;
  estimatedDuration: number;
  priority: TaskPriority;
  constraints: GoalConstraints;
}

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ReflectionResult {
  goalAchieved: boolean;
  confidenceScore: number; // 0-1
  progressPercentage: number; // 0-100
  successfulTasks: string[];
  failedTasks: string[];
  issues: Array<{
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    suggestedFix: string;
  }>;
  insights: string[];
  nextSteps: Array<{
    description: string;
    type: string;
    priority: string;
    estimatedMinutes?: number;
    dependencies?: string[];
    successCriteria?: string;
  }>;
  recommendations: string[];
  timestamp: Date;
}

export interface GoalConstraints {
  timeLimit?: number; // milliseconds
  maxTasks?: number;
  priority?: TaskPriority;
  technologies?: string[];
  excludedOperations?: string[];
}

export interface GoalExecutionResult {
  success: boolean;
  executionId: string;
  goal: string;
  iterations: number;
  results: TaskExecutionResult[];
  finalSummary?: string;
  plan?: TaskPlan;
  error?: string;
  totalDuration: number;
}

export interface ParsedPlan {
  description: string;
  tasks: Task[];
  successCriteria: string[];
  estimatedDuration: number;
}

export interface ExecutionStatus {
  executionId: string;
  goal: string;
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    inProgress: number;
  };
  estimatedTimeRemaining: number;
  currentPhase: string;
}

export interface TaskExecution {
  executionId: string;
  results: TaskExecutionResult[];
  timestamp: Date;
}

// Singleton instance  
export const taskPlanner = new TaskPlanner();
