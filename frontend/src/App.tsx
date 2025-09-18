import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

// Import main components
import { SimpleChatInterface } from './components/chat/SimpleChatInterface';

// Import styles
import './styles/components/chat.scss';

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
  
  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check backend health
        const healthResponse = await fetch('/api/health');
        if (!healthResponse.ok) {
          console.warn('Backend health check failed, continuing anyway');
        }
        
        // Simulate short loading time
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Initialization error:', error);
        // Don't block the UI for network errors
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Show loading screen
  if (isLoading) {
    return <LoadingSpinner />;
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
        <div className="app-container">
          <header className="app-header">
            <div className="header-content">
              <div className="logo">
                <div className="logo-icon">🤖</div>
                <h1 className="app-title">GitHub Dev Agent</h1>
              </div>
              
              <div className="header-info">
                <div className="status-indicator">
                  <div className="status-dot active" />
                  <span>Gotowy</span>
                </div>
              </div>
            </div>
          </header>
          
          <main className="app-main">
            <div className="chat-container">
              <SimpleChatInterface />
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;