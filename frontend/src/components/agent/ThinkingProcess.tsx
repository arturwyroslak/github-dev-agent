import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Lightbulb, Search, CheckCircle, AlertCircle, 
  RefreshCw, Target, Zap, Clock, TrendingUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface AgentThought {
  id: string;
  type: 'planning' | 'analysis' | 'problem' | 'solution' | 'reflection' | 'research' | 'execution';
  content: string;
  timestamp: Date;
  confidence?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  relatedThoughts?: string[];
  metadata?: {
    duration?: number;
    complexity?: number;
    tokens?: number;
    model?: string;
  };
}

interface ThinkingProcessProps {
  thoughts: AgentThought[];
  isVisible: boolean;
  maxThoughts?: number;
  autoScroll?: boolean;
  showMetrics?: boolean;
  className?: string;
}

const thoughtIcons = {
  planning: Target,
  analysis: Search,
  problem: AlertCircle,
  solution: Lightbulb,
  reflection: RefreshCw,
  research: Brain,
  execution: Zap
};

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({
  thoughts,
  isVisible,
  maxThoughts = 20,
  autoScroll = true,
  showMetrics = true,
  className
}) => {
  const streamRef = useRef<HTMLDivElement>(null);
  const [displayedThoughts, setDisplayedThoughts] = useState<AgentThought[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [metrics, setMetrics] = useState({
    thoughtsPerMinute: 0,
    averageConfidence: 0,
    dominantThoughtType: 'analysis' as AgentThought['type']
  });

  // Update displayed thoughts with animation delay
  useEffect(() => {
    const newThoughts = thoughts.slice(-maxThoughts);
    
    if (newThoughts.length > displayedThoughts.length) {
      const latestThoughts = newThoughts.slice(displayedThoughts.length);
      
      latestThoughts.forEach((thought, index) => {
        setTimeout(() => {
          setDisplayedThoughts(prev => [...prev, thought]);
          
          if (thought.content.length > 50) {
            setIsStreaming(true);
            simulateStreaming(thought.content);
          }
        }, index * 300);
      });
    } else {
      setDisplayedThoughts(newThoughts);
    }
  }, [thoughts, maxThoughts, displayedThoughts.length]);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll && streamRef.current && isVisible) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [displayedThoughts, isVisible, autoScroll]);

  // Calculate metrics
  useEffect(() => {
    if (displayedThoughts.length === 0) return;

    const now = new Date();
    const recentThoughts = displayedThoughts.filter(
      thought => now.getTime() - thought.timestamp.getTime() < 60000
    );

    const avgConfidence = displayedThoughts
      .filter(t => t.confidence !== undefined)
      .reduce((sum, t) => sum + (t.confidence || 0), 0) / displayedThoughts.length;

    const typeCount = displayedThoughts.reduce((acc, thought) => {
      acc[thought.type] = (acc[thought.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantType = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as AgentThought['type'] || 'analysis';

    setMetrics({
      thoughtsPerMinute: recentThoughts.length,
      averageConfidence: avgConfidence || 0,
      dominantThoughtType: dominantType
    });
  }, [displayedThoughts]);

  const simulateStreaming = (text: string) => {
    let currentText = '';
    const words = text.split(' ');
    let wordIndex = 0;

    const streamInterval = setInterval(() => {
      if (wordIndex < words.length) {
        currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
        setStreamingText(currentText);
        wordIndex++;
      } else {
        setIsStreaming(false);
        setStreamingText('');
        clearInterval(streamInterval);
      }
    }, 100);
  };

  const getThoughtIcon = (type: AgentThought['type']) => {
    const IconComponent = thoughtIcons[type];
    return <IconComponent size={16} />;
  };

  const formatTimeAgo = (timestamp: Date) => {
    const seconds = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s temu`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m temu`;
    return `${Math.floor(seconds / 3600)}h temu`;
  };

  const getPriorityIndicator = (priority?: AgentThought['priority']) => {
    if (!priority) return null;
    
    const colors = {
      low: 'bg-blue-400',
      medium: 'bg-yellow-400',
      high: 'bg-orange-400',
      critical: 'bg-red-400'
    };

    return (
      <div className={`priority-indicator ${colors[priority]}`} title={`Priorytet: ${priority}`} />
    );
  };

  if (!isVisible) {
    return (
      <div className="thinking-process-collapsed">
        <motion.div 
          className="collapsed-indicator"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Brain size={16} />
          <span>{displayedThoughts.length} myśli</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`thinking-process ${className || ''}`}>
      {/* Header */}
      <div className="thinking-header">
        <div className="header-left">
          <motion.div 
            className="brain-icon-container"
            animate={{ rotate: isStreaming ? 360 : 0 }}
            transition={{ duration: 2, repeat: isStreaming ? Infinity : 0 }}
          >
            <Brain className="brain-icon" size={20} />
          </motion.div>
          <div className="header-info">
            <h3 className="header-title">Proces Myślenia</h3>
            <div className="header-subtitle">
              <span className="thought-count">{displayedThoughts.length} aktywnych myśli</span>
              {isStreaming && (
                <motion.div 
                  className="streaming-indicator"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <div className="streaming-dot" />
                  Strumieniowanie...
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {showMetrics && (
          <div className="thinking-metrics">
            <div className="metric-item">
              <Clock size={14} />
              <span>{metrics.thoughtsPerMinute}/min</span>
            </div>
            <div className="metric-item">
              <TrendingUp size={14} />
              <span>{Math.round(metrics.averageConfidence * 100)}%</span>
            </div>
            <div className="metric-item">
              <div className="dominant-type-indicator">
                {getThoughtIcon(metrics.dominantThoughtType)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thoughts Stream */}
      <div className="thoughts-stream" ref={streamRef}>
        <AnimatePresence mode="popLayout">
          {displayedThoughts.map((thought, index) => (
            <motion.div
              key={thought.id}
              layoutId={thought.id}
              initial={{ 
                opacity: 0, 
                x: -20, 
                scale: 0.95
              }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1
              }}
              exit={{ 
                opacity: 0, 
                x: 20, 
                scale: 0.95
              }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.05,
                ease: "easeOut"
              }}
              className={`thought-bubble ${thought.type}`}
            >
              {/* Thought Header */}
              <div className="thought-header">
                <div className="thought-type-indicator">
                  <motion.div 
                    className={`thought-icon ${thought.type}`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {getThoughtIcon(thought.type)}
                  </motion.div>
                  <div className="type-info">
                    <span className="thought-type-label">
                      {thought.type.charAt(0).toUpperCase() + thought.type.slice(1)}
                    </span>
                    <span className="thought-timestamp">
                      {formatTimeAgo(thought.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="thought-metadata">
                  {getPriorityIndicator(thought.priority)}
                  {thought.confidence !== undefined && (
                    <div 
                      className="confidence-badge"
                      title={`Pewność: ${Math.round(thought.confidence * 100)}%`}
                    >
                      <div 
                        className="confidence-fill"
                        style={{ width: `${thought.confidence * 100}%` }}
                      />
                      <span className="confidence-text">
                        {Math.round(thought.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Thought Content */}
              <div className="thought-content">
                <div className="markdown-content">
                  <ReactMarkdown
                    components={{
                      code: ({ children, className }) => (
                        <code className={`inline-code ${className || ''}`}>
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="code-block">{children}</pre>
                      )
                    }}
                  >
                    {thought.content}
                  </ReactMarkdown>
                </div>

                {/* Streaming Text Overlay */}
                {isStreaming && index === displayedThoughts.length - 1 && (
                  <div className="streaming-overlay">
                    <ReactMarkdown>{streamingText}</ReactMarkdown>
                    <motion.div 
                      className="typing-cursor"
                      animate={{ opacity: [0, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    >
                      |
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Thought Footer */}
              {thought.metadata && (
                <div className="thought-footer">
                  <div className="metadata-items">
                    {thought.metadata.duration && (
                      <span className="metadata-item">
                        <Clock size={12} />
                        {thought.metadata.duration}ms
                      </span>
                    )}
                    {thought.metadata.tokens && (
                      <span className="metadata-item">
                        <Zap size={12} />
                        {thought.metadata.tokens} tokens
                      </span>
                    )}
                    {thought.metadata.complexity && (
                      <span className="metadata-item">
                        <Target size={12} />
                        {Math.round(thought.metadata.complexity * 100)}% złożoność
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Thought Connections */}
              {thought.relatedThoughts && thought.relatedThoughts.length > 0 && (
                <div className="thought-connections">
                  <div className="connections-label">Powiązane:</div>
                  <div className="connection-dots">
                    {thought.relatedThoughts.map((relatedId, i) => (
                      <motion.div
                        key={relatedId}
                        className="connection-dot"
                        whileHover={{ scale: 1.2 }}
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Indicator for Long Thoughts */}
              {thought.content.length > 200 && (
                <div className="thought-progress">
                  <motion.div 
                    className="progress-bar"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: "easeOut" }}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {displayedThoughts.length === 0 && (
          <motion.div 
            className="empty-thoughts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Brain size={48} className="empty-icon" />
            <h4>Agent gotowy do myślenia</h4>
            <p>Myśli pojawią się tutaj podczas pracy agenta</p>
          </motion.div>
        )}
      </div>

      {/* Thought Stream Visualization */}
      <div className="stream-visualization">
        {displayedThoughts.slice(-10).map((thought, index) => (
          <motion.div
            key={thought.id}
            className={`stream-dot ${thought.type}`}
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.2
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ThinkingProcess;