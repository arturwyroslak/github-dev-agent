import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from 'react-error-boundary';

// Import main components
import { AgentCommandCenter } from './components/agent/AgentCommandCenter';
import { ThinkingProcess } from './components/agent/ThinkingProcess';
import { EnhancedChatInterface } from './components/chat/EnhancedChatInterface';
import { ExecutionPipeline } from './components/agent/ExecutionPipeline';
import { SystemHealthMonitor } from './components/agent/SystemHealthMonitor';
import { LearningInsights } from './components/agent/LearningInsights';

// Import hooks
import { useAgentState } from './hooks/useAgentState';
import { useWebSocket } from './hooks/useWebSocket';

// Import types
interface AppError {
  message: string;
  stack?: string;
}

interface ErrorFallbackProps {
  error: AppError;
  resetErrorBoundary: () => void;
}

/**
 * Error Fallback Component
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="error-fallback">
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2>Coś poszło nie tak</h2>
        <p className="error-message">{error.message}</p>
        <details className="error-details">
          <summary>Szczegóły błędu</summary>
          <pre className="error-stack">{error.stack}</pre>
        </details>
        <div className="error-actions">
          <button 
            onClick={resetErrorBoundary}
            className="retry-button"
          >
            Spróbuj ponownie
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="reload-button"
          >
            Odśwież stronę
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Loading Component
 */
const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-ring" />
        <div className="spinner-ring" />
        <div className="spinner-ring" />
      </div>
      <p className="loading-text">Ładowanie GitHub Dev Agent...</p>
    </div>
  );
};

/**
 * Main Application Component
 */
const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Initialize agent state and WebSocket
  const {
    agentStatus,
    activeExecutions,
    systemHealth,
    thoughts,
    updateAgentStatus
  } = useAgentState();

  const {
    isConnected,
    connectionState,
    sendMessage
  } = useWebSocket(
    process.env.NODE_ENV === 'production' 
      ? `wss://${window.location.host}` 
      : 'ws://localhost:8080',
    {
      onMessage: updateAgentStatus,
      onConnect: () => {
        console.log('Connected to GitHub Dev Agent');
        setConnectionError(null);
      },
      onDisconnect: () => {
        console.log('Disconnected from GitHub Dev Agent');
        setConnectionError('Połączenie zostało przerwane');
      }
    }
  );

  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Simulate initialization delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check backend health
        const healthResponse = await fetch('/health');
        if (!healthResponse.ok) {
          throw new Error('Backend nie jest dostępny');
        }
        
        const healthData = await healthResponse.json();
        console.log('Backend health:', healthData);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Initialization error:', error);
        setConnectionError(
          error instanceof Error 
            ? error.message 
            : 'Błąd inicjalizacji aplikacji'
        );
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Handle agent query
  const handleAgentQuery = (query: string, options?: any) => {
    if (isConnected) {
      sendMessage({
        type: 'agent-query',
        query,
        options,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Cannot send query: WebSocket not connected');
    }
  };

  // Handle thought generation
  const handleThoughtGenerated = (thought: any) => {
    updateAgentStatus({
      type: 'new-thought',
      payload: thought
    });
  };

  // Handle execution started
  const handleExecutionStarted = (execution: any) => {
    updateAgentStatus({
      type: 'execution-update',
      payload: {
        ...execution,
        id: execution.id || Date.now().toString(),
        status: 'running',
        startedAt: new Date()
      }
    });
  };

  // Show loading screen
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show connection error
  if (connectionError && connectionState === 'disconnected') {
    return (
      <div className="connection-error">
        <div className="error-container">
          <div className="error-icon">🔌</div>
          <h2>Problem z połączeniem</h2>
          <p>{connectionError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('App Error:', error, errorInfo);
      }}
      onReset={() => {
        window.location.reload();
      }}
    >
      <div className="app">
        <AnimatePresence mode="wait">
          <Routes>
            {/* Main Agent Interface */}
            <Route 
              path="/" 
              element={
                <AgentCommandCenter
                  agentStatus={agentStatus}
                  systemHealth={systemHealth}
                  isConnected={isConnected}
                  onQuery={handleAgentQuery}
                >
                  {/* Left Panel - Brain & Thinking */}
                  <div className="left-panel">
                    <div className="brain-section">
                      {/* Brain visualization will be here */}
                    </div>
                    
                    <ThinkingProcess
                      thoughts={thoughts}
                      isVisible={true}
                      showMetrics={true}
                    />
                  </div>

                  {/* Center Panel - Chat Interface */}
                  <div className="center-panel">
                    <EnhancedChatInterface
                      agentStatus={agentStatus}
                      onThoughtGenerated={handleThoughtGenerated}
                      onExecutionStarted={handleExecutionStarted}
                    />
                  </div>

                  {/* Right Panel - Execution & Health */}
                  <div className="right-panel">
                    <ExecutionPipeline
                      executions={activeExecutions}
                    />
                    
                    <SystemHealthMonitor
                      health={systemHealth}
                      isExpanded={false}
                    />
                    
                    <LearningInsights
                      learningProgress={agentStatus.learningProgress}
                    />
                  </div>
                </AgentCommandCenter>
              } 
            />

            {/* Health Dashboard */}
            <Route 
              path="/health" 
              element={
                <div className="health-dashboard">
                  <SystemHealthMonitor
                    health={systemHealth}
                    isExpanded={true}
                  />
                </div>
              } 
            />

            {/* Learning Analytics */}
            <Route 
              path="/learning" 
              element={
                <div className="learning-dashboard">
                  <LearningInsights
                    learningProgress={agentStatus.learningProgress}
                  />
                </div>
              } 
            />

            {/* Execution Monitor */}
            <Route 
              path="/executions" 
              element={
                <div className="execution-dashboard">
                  <ExecutionPipeline
                    executions={activeExecutions}
                  />
                </div>
              } 
            />

            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>

        {/* Connection Status Indicator */}
        <div className={`connection-status ${connectionState}`}>
          <div className="status-dot" />
          <span className="status-text">
            {connectionState === 'connected' ? 'Połączono' :
             connectionState === 'connecting' ? 'Łączenie...' :
             'Rozłączono'}
          </span>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;