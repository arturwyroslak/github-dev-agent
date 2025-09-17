import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, TrendingUp, Target, BookOpen, 
  Award, Zap, Lightbulb, BarChart3,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';

interface LearningInsight {
  id: string;
  type: 'pattern' | 'improvement' | 'achievement' | 'trend' | 'recommendation';
  title: string;
  description: string;
  score?: number;
  trend?: 'up' | 'down' | 'stable';
  timestamp: Date;
  metadata?: {
    category?: string;
    impact?: 'low' | 'medium' | 'high';
    confidence?: number;
  };
}

interface LearningInsightsProps {
  insights?: LearningInsight[];
  learningProgress?: number;
  className?: string;
}

const defaultInsights: LearningInsight[] = [
  {
    id: '1',
    type: 'pattern',
    title: 'API Development Mastery',
    description: 'Wykryto wzorzec sukcesu w tworzeniu REST API. Agent ma 92% skuteczność w generowaniu kompletnych endpointów.',
    score: 92,
    trend: 'up',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    metadata: {
      category: 'code_generation',
      impact: 'high',
      confidence: 0.94
    }
  },
  {
    id: '2',
    type: 'improvement',
    title: 'Test Coverage Enhancement',
    description: 'Ulepszono generowanie testów jednostkowych o 15% w ostatnim tygodniu.',
    score: 85,
    trend: 'up',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    metadata: {
      category: 'testing',
      impact: 'medium',
      confidence: 0.87
    }
  },
  {
    id: '3',
    type: 'achievement',
    title: 'Error Handling Excellence',
    description: 'Osiągnięto milestone: 100+ implementacji z pełną obsługą błędów.',
    score: 98,
    trend: 'stable',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    metadata: {
      category: 'quality',
      impact: 'high',
      confidence: 0.96
    }
  },
  {
    id: '4',
    type: 'trend',
    title: 'TypeScript Adoption',
    description: 'Rosnąca preferencja dla TypeScript w generowanych projektach (+23%).',
    score: 78,
    trend: 'up',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    metadata: {
      category: 'technology',
      impact: 'medium',
      confidence: 0.81
    }
  },
  {
    id: '5',
    type: 'recommendation',
    title: 'Architecture Patterns',
    description: 'Rekomendacja: Więcej focus na microservices patterns w złożonych projektach.',
    trend: 'stable',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18),
    metadata: {
      category: 'architecture',
      impact: 'high',
      confidence: 0.89
    }
  }
];

export const LearningInsights: React.FC<LearningInsightsProps> = ({
  insights = defaultInsights,
  learningProgress = 0.73,
  className
}) => {
  const [selectedInsight, setSelectedInsight] = useState<LearningInsight | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [learningMetrics, setLearningMetrics] = useState({
    totalPatterns: 0,
    improvements: 0,
    achievements: 0,
    weeklyGrowth: 0
  });

  useEffect(() => {
    // Calculate learning metrics
    const patterns = insights.filter(i => i.type === 'pattern').length;
    const improvements = insights.filter(i => i.type === 'improvement').length;
    const achievements = insights.filter(i => i.type === 'achievement').length;
    
    setLearningMetrics({
      totalPatterns: patterns,
      improvements,
      achievements,
      weeklyGrowth: 12.5
    });
  }, [insights]);

  const getInsightIcon = (type: LearningInsight['type']) => {
    const icons = {
      pattern: Target,
      improvement: TrendingUp,
      achievement: Award,
      trend: BarChart3,
      recommendation: Lightbulb
    };
    return icons[type];
  };

  const getInsightColor = (type: LearningInsight['type']) => {
    const colors = {
      pattern: 'from-blue-500/20 to-blue-600/30 border-blue-400/50',
      improvement: 'from-green-500/20 to-green-600/30 border-green-400/50',
      achievement: 'from-purple-500/20 to-purple-600/30 border-purple-400/50',
      trend: 'from-orange-500/20 to-orange-600/30 border-orange-400/50',
      recommendation: 'from-yellow-500/20 to-yellow-600/30 border-yellow-400/50'
    };
    return colors[type];
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp size={12} className="text-green-400" />;
      case 'down': return <ArrowDown size={12} className="text-red-400" />;
      case 'stable': return <Minus size={12} className="text-gray-400" />;
      default: return null;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes}min temu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h temu`;
    const days = Math.floor(hours / 24);
    return `${days} dni temu`;
  };

  return (
    <div className={`learning-insights ${className || ''}`}>
      {/* Header */}
      <div className="insights-header">
        <div className="header-title">
          <Brain className="header-icon" size={20} />
          <h3>Learning Insights</h3>
        </div>
        
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              Lista
            </button>
            <button
              className={`toggle-btn ${viewMode === 'chart' ? 'active' : ''}`}
              onClick={() => setViewMode('chart')}
            >
              Wykres
            </button>
          </div>
        </div>
      </div>

      {/* Learning Progress */}
      <div className="learning-progress-section">
        <div className="progress-header">
          <span className="progress-label">Postęp uczenia</span>
          <span className="progress-value">{Math.round(learningProgress * 100)}%</span>
        </div>
        
        <div className="progress-bar-container">
          <motion.div
            className="progress-bar"
            initial={{ width: 0 }}
            animate={{ width: `${learningProgress * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          
          <div className="progress-milestones">
            {[0.25, 0.5, 0.75, 1].map(milestone => (
              <div
                key={milestone}
                className={`milestone ${learningProgress >= milestone ? 'reached' : ''}`}
                style={{ left: `${milestone * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Learning Metrics */}
      <div className="learning-metrics">
        <div className="metrics-grid">
          <motion.div 
            className="metric-card"
            whileHover={{ scale: 1.02 }}
          >
            <div className="metric-icon">
              <Target size={16} className="text-blue-400" />
            </div>
            <div className="metric-content">
              <div className="metric-value">{learningMetrics.totalPatterns}</div>
              <div className="metric-label">Wzorce</div>
            </div>
          </motion.div>
          
          <motion.div 
            className="metric-card"
            whileHover={{ scale: 1.02 }}
          >
            <div className="metric-icon">
              <TrendingUp size={16} className="text-green-400" />
            </div>
            <div className="metric-content">
              <div className="metric-value">{learningMetrics.improvements}</div>
              <div className="metric-label">Ulepszenia</div>
            </div>
          </motion.div>
          
          <motion.div 
            className="metric-card"
            whileHover={{ scale: 1.02 }}
          >
            <div className="metric-icon">
              <Award size={16} className="text-purple-400" />
            </div>
            <div className="metric-content">
              <div className="metric-value">{learningMetrics.achievements}</div>
              <div className="metric-label">Osiągnięcia</div>
            </div>
          </motion.div>
          
          <motion.div 
            className="metric-card"
            whileHover={{ scale: 1.02 }}
          >
            <div className="metric-icon">
              <Zap size={16} className="text-orange-400" />
            </div>
            <div className="metric-content">
              <div className="metric-value">+{learningMetrics.weeklyGrowth}%</div>
              <div className="metric-label">Tygodniowo</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content based on view mode */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div
            key="list"
            className="insights-list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {insights.map((insight, index) => {
              const InsightIcon = getInsightIcon(insight.type);
              
              return (
                <motion.div
                  key={insight.id}
                  className={`insight-card ${getInsightColor(insight.type)}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => setSelectedInsight(insight)}
                >
                  <div className="insight-header">
                    <div className="insight-type">
                      <div className="insight-icon">
                        <InsightIcon size={16} />
                      </div>
                      <span className="insight-type-label">
                        {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
                      </span>
                    </div>
                    
                    <div className="insight-meta">
                      {insight.score && (
                        <div className="insight-score">
                          <span>{insight.score}%</span>
                        </div>
                      )}
                      {insight.trend && (
                        <div className="insight-trend">
                          {getTrendIcon(insight.trend)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="insight-content">
                    <h4 className="insight-title">{insight.title}</h4>
                    <p className="insight-description">{insight.description}</p>
                  </div>
                  
                  <div className="insight-footer">
                    <div className="insight-timestamp">
                      {formatTimeAgo(insight.timestamp)}
                    </div>
                    
                    {insight.metadata && (
                      <div className="insight-metadata">
                        {insight.metadata.impact && (
                          <span className={`impact-badge ${insight.metadata.impact}`}>
                            {insight.metadata.impact}
                          </span>
                        )}
                        {insight.metadata.confidence && (
                          <span className="confidence-badge">
                            {Math.round(insight.metadata.confidence * 100)}% pewność
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="chart"
            className="insights-chart"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Learning Chart Visualization */}
            <div className="chart-container">
              <div className="chart-header">
                <h4>Rozkład typów insightów</h4>
              </div>
              
              <div className="chart-content">
                <svg className="insights-chart-svg" viewBox="0 0 200 200">
                  {/* Simple pie chart representation */}
                  {insights.reduce((acc, insight, index) => {
                    const types = insights.reduce((typeAcc, i) => {
                      typeAcc[i.type] = (typeAcc[i.type] || 0) + 1;
                      return typeAcc;
                    }, {} as Record<string, number>);
                    
                    const total = insights.length;
                    let currentAngle = 0;
                    
                    return Object.entries(types).map(([type, count], i) => {
                      const percentage = count / total;
                      const angle = percentage * 360;
                      const startAngle = currentAngle;
                      currentAngle += angle;
                      
                      const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
                      const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
                      const x2 = 100 + 80 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
                      const y2 = 100 + 80 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
                      
                      const largeArc = angle > 180 ? 1 : 0;
                      
                      const colors = ['#5B8CFF', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
                      
                      return (
                        <motion.path
                          key={type}
                          d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={colors[i % colors.length]}
                          opacity={0.8}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.1, type: "spring" }}
                        />
                      );
                    });
                  }, [])}
                </svg>
                
                <div className="chart-legend">
                  {Object.entries(
                    insights.reduce((acc, insight) => {
                      acc[insight.type] = (acc[insight.type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count], index) => {
                    const colors = ['#5B8CFF', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
                    
                    return (
                      <div key={type} className="legend-item">
                        <div 
                          className="legend-color"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className="legend-label">
                          {type} ({count})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed Insight Modal */}
      <AnimatePresence>
        {selectedInsight && (
          <motion.div
            className="insight-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedInsight(null)}
          >
            <motion.div
              className="insight-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{selectedInsight.title}</h3>
                <button 
                  className="modal-close"
                  onClick={() => setSelectedInsight(null)}
                >
                  ×
                </button>
              </div>
              
              <div className="modal-content">
                <div className="modal-insight-type">
                  <div className="insight-icon">
                    {React.createElement(getInsightIcon(selectedInsight.type), { size: 20 })}
                  </div>
                  <span>{selectedInsight.type}</span>
                </div>
                
                <p className="modal-description">{selectedInsight.description}</p>
                
                {selectedInsight.metadata && (
                  <div className="modal-metadata">
                    <div className="metadata-row">
                      {selectedInsight.metadata.category && (
                        <span className="metadata-item">
                          Kategoria: {selectedInsight.metadata.category}
                        </span>
                      )}
                      {selectedInsight.metadata.impact && (
                        <span className={`metadata-item impact ${selectedInsight.metadata.impact}`}>
                          Impact: {selectedInsight.metadata.impact}
                        </span>
                      )}
                    </div>
                    
                    {selectedInsight.metadata.confidence && (
                      <div className="confidence-section">
                        <span className="confidence-label">Confidence Level:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill"
                            style={{ width: `${selectedInsight.metadata.confidence * 100}%` }}
                          />
                        </div>
                        <span className="confidence-value">
                          {Math.round(selectedInsight.metadata.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LearningInsights;