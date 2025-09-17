import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Bot, Zap, Activity, Target, TrendingUp, 
  Monitor, Settings, Maximize2, Minimize2 
} from 'lucide-react';
import { AgentBrainVisualizer } from './AgentBrainVisualizer';
import { ThinkingProcess } from './ThinkingProcess';
import { EnhancedChatInterface } from '../chat/EnhancedChatInterface';
import { ExecutionPipeline } from './ExecutionPipeline';
import { SystemHealthMonitor } from './SystemHealthMonitor';
import { LearningInsights } from './LearningInsights';
import { useAgentState } from '../../hooks/useAgentState';
import { useWebSocket } from '../../hooks/useWebSocket';

interface AgentCommandCenterProps {
  className?: string;
}

export const AgentCommandCenter: React.FC<AgentCommandCenterProps> = ({ className }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePanel, setActivePanel] = useState<'brain' | 'chat' | 'analytics'>('chat');
  
  const { 
    agentStatus, 
    activeExecutions, 
    systemHealth, 
    thoughts,
    updateAgentStatus 
  } = useAgentState();
  
  const { isConnected, lastMessage } = useWebSocket('ws://localhost:8081', {
    onMessage: (data) => {
      updateAgentStatus(data);
    }
  });

  useEffect(() => {
    // Auto-focus na brain panel gdy agent myśli
    if (agentStatus.isThinking && activePanel !== 'brain') {
      setActivePanel('brain');
    }
  }, [agentStatus.isThinking]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className={`agent-command-center ${isFullscreen ? 'fullscreen' : ''} ${className || ''}`}>
      {/* Animated Background */}
      <div className="command-center-background">
        <div className="gradient-orb gradient-orb-1" />
        <div className="gradient-orb gradient-orb-2" />
        <div className="gradient-orb gradient-orb-3" />
      </div>

      {/* Futuristic Header */}
      <motion.header 
        className="command-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-left">
          <div className="agent-status-indicator">
            <div className={`status-pulse ${agentStatus.status}`}>
              <div className="pulse-ring" />
              <div className="pulse-core" />
            </div>
            <div className="status-info">
              <h1 className="agent-title">GitHub Dev Agent</h1>
              <div className="status-details">
                <span className={`status-text ${agentStatus.status}`}>
                  {agentStatus.isThinking ? 'Myślę...' : 'Gotowy do pracy'}
                </span>
                <div className="connection-indicator">
                  <div className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`} />
                  <span className="connection-text">
                    {isConnected ? 'Połączony' : 'Rozłączony'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="system-metrics">
            <div className="metric-item">
              <Activity className="metric-icon" size={16} />
              <span className="metric-value">{activeExecutions.length}</span>
              <span className="metric-label">Aktywne</span>
            </div>
            <div className="metric-item">
              <Target className="metric-icon" size={16} />
              <span className="metric-value">{Math.round(agentStatus.confidence * 100)}%</span>
              <span className="metric-label">Pewność</span>
            </div>
            <div className="metric-item">
              <TrendingUp className="metric-icon" size={16} />
              <span className="metric-value">{systemHealth.score}</span>
              <span className="metric-label">Health</span>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className="action-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button className="action-btn" title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Main Command Grid */}
      <div className="command-grid">
        {/* Left Panel - Agent Brain Visualization */}
        <motion.div 
          className="brain-panel panel"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="panel-header">
            <div className="panel-title">
              <Brain className="panel-icon" size={20} />
              <h3>Neural Network</h3>
            </div>
            <div className="panel-badge">
              {agentStatus.isThinking ? (
                <motion.div 
                  className="thinking-badge"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <div className="thinking-dot" />
                  Myślę
                </motion.div>
              ) : (
                <div className="ready-badge">
                  <div className="ready-dot" />
                  Gotowy
                </div>
              )}
            </div>
          </div>
          
          <AgentBrainVisualizer 
            thinking={agentStatus.isThinking}
            currentTask={agentStatus.currentTask}
            confidence={agentStatus.confidence}
            neuralActivity={agentStatus.neuralActivity}
          />
          
          <ThinkingProcess 
            thoughts={thoughts}
            isVisible={activePanel === 'brain' || agentStatus.isThinking}
          />
        </motion.div>

        {/* Center Panel - Interactive Chat + Execution */}
        <motion.div 
          className="interaction-panel panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="interaction-content">
            <EnhancedChatInterface 
              agentStatus={agentStatus}
              onThoughtGenerated={(thought) => {
                // Add thought to stream
              }}
              onExecutionStarted={(execution) => {
                // Handle execution start
              }}
            />
            
            <AnimatePresence>
              {activeExecutions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="execution-section"
                >
                  <ExecutionPipeline 
                    executions={activeExecutions}
                    onTaskClick={(task) => {
                      // Handle task click
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right Panel - Real-time Analytics */}
        <motion.div 
          className="analytics-panel panel"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="panel-header">
            <div className="panel-title">
              <Monitor className="panel-icon" size={20} />
              <h3>System Analytics</h3>
            </div>
            <div className="analytics-toggle">
              <button 
                className={`toggle-btn ${activePanel === 'analytics' ? 'active' : ''}`}
                onClick={() => setActivePanel('analytics')}
              >
                Live
              </button>
            </div>
          </div>
          
          <SystemHealthMonitor 
            health={systemHealth}
            isExpanded={activePanel === 'analytics'}
          />
          
          <LearningInsights 
            insights={agentStatus.insights}
            learningProgress={agentStatus.learningProgress}
          />
        </motion.div>
      </div>

      {/* Floating Action Buttons */}
      <div className="floating-actions">
        <motion.button 
          className="fab primary"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            // Trigger autonomous mode
          }}
        >
          <Zap size={24} />
        </motion.button>
        
        <motion.button 
          className="fab secondary"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActivePanel('brain')}
        >
          <Brain size={20} />
        </motion.button>
      </div>

      {/* Status Toast Notifications */}
      <AnimatePresence>
        {lastMessage && (
          <motion.div
            className="status-toast"
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <div className="toast-icon">
              {lastMessage.type === 'success' ? '✅' : 
               lastMessage.type === 'error' ? '❌' : 
               lastMessage.type === 'info' ? 'ℹ️' : '🔄'}
            </div>
            <div className="toast-content">
              <div className="toast-title">{lastMessage.title}</div>
              <div className="toast-message">{lastMessage.message}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentCommandCenter;