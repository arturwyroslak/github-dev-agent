/**
 * Serwisy AI - Główny eksport
 * 
 * Ten moduł eksportuje wszystkie serwisy związane z AI:
 * - Klient Pollinations.ai (darmowy dostęp do OpenAI)
 * - Zaawansowany agent kodujący z rozpoznawaniem intencji
 * - Integracja z systemami MCP
 */

// Główne eksporty
export { PollinationsAIClient, pollinationsAI } from './pollinations-client';
export { CodingAgent, codingAgent } from './coding-agent';

// Re-export for default
import { PollinationsAIClient, pollinationsAI } from './pollinations-client';
import { CodingAgent, codingAgent } from './coding-agent';

// Eksport typów
export type {
  ChatMessage,
  ChatOptions,
  CodingContext,
  CodeAnalysisType,
  TestType,
  AIResponse
} from './pollinations-client';

export type {
  AgentIntent,
  AgentOptions,
  AgentResponse,
  AgentStats,
  MCPAction
} from './coding-agent';

// Utility functions
export const AIUtils = {
  /**
   * Tworzy sesję dla agenta z domyślnymi ustawieniami
   */
  createSession: (projectType?: string) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const options = {
      projectType: projectType || 'web-application',
      language: 'typescript',
      framework: 'node.js',
      architecture: 'microservices',
      codeStyle: 'clean-code'
    };
    
    return { sessionId, options };
  },

  /**
   * Ekstraktuje bloki kodu z tekstu
   */
  extractCodeBlocks: (text: string) => {
    const codeBlockRegex = /```([\w]*)?\n?([\s\S]*?)```/g;
    const blocks: Array<{ language?: string; code: string }> = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (!match[2]) continue; // Skip if no code content
      const block: { language?: string; code: string } = {
        code: match[2].trim()
      };
      if (match[1]) {
        block.language = match[1];
      }
      blocks.push(block);
    }
    
    return blocks;
  },

  /**
   * Czyści i formatuje kod
   */
  cleanCode: (code: string) => {
    return code
      .replace(/^\s*\/\/.*$/gm, '') // Usuwa komentarze jednoliniowe
      .replace(/\/\*[\s\S]*?\*\//g, '') // Usuwa komentarze wieloliniowe
      .replace(/^\s*$/gm, '') // Usuwa puste linie
      .trim();
  },

  /**
   * Określa język na podstawie rozszerzenia pliku
   */
  detectLanguage: (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'cs': 'csharp',
      'php': 'php',
      'cpp': 'cpp',
      'c': 'c',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin'
    };
    
    return languageMap[extension || ''] || 'text';
  },

  /**
   * Waliduje zapytanie przed wysłaniem do AI
   */
  validateQuery: (query: string): { valid: boolean; error?: string } => {
    if (!query || typeof query !== 'string') {
      return { valid: false, error: 'Query musi być tekstem' };
    }
    
    if (query.length < 1) {
      return { valid: false, error: 'Query nie może być pusty' };
    }
    
    if (query.length > 10000) {
      return { valid: false, error: 'Query jest za długi (max 10000 znaków)' };
    }
    
    return { valid: true };
  },

  /**
   * Formatuje odpowiedź AI dla display
   */
  formatResponse: (response: string) => {
    return response
      .replace(/```(\w+)?\n/g, '\n```$1\n') // Popraw formatowanie bloków kodu
      .replace(/\n{3,}/g, '\n\n') // Ogranicz podwójne linie do maksymalnie 2
      .trim();
  },

  /**
   * Tworzy kontekst na podstawie pliku projektu
   */
  createContextFromFile: (filename: string, content: string) => {
    const language = AIUtils.detectLanguage(filename);
    const lines = content.split('\n').length;
    const size = content.length;
    
    let framework = 'unknown';
    let projectType = 'unknown';
    
    // Prosta detekcja frameworka
    if (content.includes('import React') || content.includes('from "react"')) {
      framework = 'react';
      projectType = 'web-frontend';
    } else if (content.includes('express') || content.includes('fastify')) {
      framework = 'node.js';
      projectType = 'web-backend';
    } else if (content.includes('django') || content.includes('flask')) {
      framework = 'python-web';
      projectType = 'web-backend';
    }
    
    return {
      language,
      framework,
      projectType,
      fileInfo: {
        name: filename,
        lines,
        size
      }
    };
  },

  /**
   * Generuje podsumowanie konwersacji
   */
  summarizeConversation: (messages: Array<{ role: string; content: string }>) => {
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    
    const topics = new Set<string>();
    messages.forEach(m => {
      if (m.content.toLowerCase().includes('function')) topics.add('functions');
      if (m.content.toLowerCase().includes('class')) topics.add('classes');
      if (m.content.toLowerCase().includes('test')) topics.add('testing');
      if (m.content.toLowerCase().includes('bug') || m.content.toLowerCase().includes('error')) topics.add('debugging');
      if (m.content.toLowerCase().includes('performance')) topics.add('performance');
      if (m.content.toLowerCase().includes('security')) topics.add('security');
    });
    
    return {
      messageCount: messages.length,
      userMessages,
      assistantMessages,
      totalCharacters: totalChars,
      topics: Array.from(topics),
      lastActivity: new Date().toISOString()
    };
  },

  /**
   * Sprawdza czy zapytanie dotyczy kodu
   */
  isCodeRelated: (query: string): boolean => {
    const codeKeywords = [
      'function', 'class', 'variable', 'method', 'algorithm',
      'code', 'implementation', 'syntax', 'debug', 'error',
      'test', 'unit test', 'integration', 'refactor',
      'optimize', 'performance', 'security', 'vulnerability',
      'api', 'endpoint', 'database', 'query',
      'javascript', 'typescript', 'python', 'java', 'go', 'rust'
    ];
    
    const lowerQuery = query.toLowerCase();
    return codeKeywords.some(keyword => lowerQuery.includes(keyword)) ||
           /```[\s\S]*```/.test(query); // Zawiera blok kodu
  },

  /**
   * Ekstraktuje metadane z kodu
   */
  extractCodeMetadata: (code: string, language?: string) => {
    const metadata: any = {
      language: language || 'unknown',
      lines: code.split('\n').length,
      characters: code.length,
      functions: [],
      classes: [],
      imports: []
    };
    
    // Proste parsowanie dla TypeScript/JavaScript
    if (language === 'typescript' || language === 'javascript') {
      // Znajdź funkcje
      const functionRegex = /(?:function\s+|const\s+\w+\s*=\s*(?:async\s+)?\(|\w+\s*\([^)]*\)\s*(?:=>|{))/g;
      const functions = code.match(functionRegex);
      if (functions) {
        metadata.functions = functions.map(f => f.trim());
      }
      
      // Znajdź klasy
      const classRegex = /class\s+\w+/g;
      const classes = code.match(classRegex);
      if (classes) {
        metadata.classes = classes;
      }
      
      // Znajdź importy
      const importRegex = /import\s+.*?from\s+['"][^'"]+['"]/g;
      const imports = code.match(importRegex);
      if (imports) {
        metadata.imports = imports;
      }
    }
    
    return metadata;
  }
};

// Fabryki dla szybkiego tworzenia instancji
export const createCodingSession = AIUtils.createSession;
export const createAIContext = AIUtils.createContextFromFile;

// Domyślny eksport
export default {
  PollinationsAIClient,
  pollinationsAI,
  CodingAgent,
  codingAgent,
  AIUtils,
  createCodingSession,
  createAIContext
};