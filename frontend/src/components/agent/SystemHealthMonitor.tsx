import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Cpu, Database, Wifi, 
  CheckCircle, AlertTriangle, XCircle,
  TrendingUp, TrendingDown, Monitor
} from 'lucide-react';

interface SystemHealth {
  score: number;
  services: {
    ai: boolean;
    mcp: boolean;
    websocket: boolean;
    database?: boolean;
    cache?: boolean;
  };
  metrics?: {
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    throughput: number;
  };
}

interface SystemHealthMonitorProps {
  health: SystemHealth;
  isExpanded?: boolean;
  className?: string;
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({
  health,
  isExpanded = false,
  className
}) => {
  const [realtimeMetrics, setRealtimeMetrics] = useState({
    requests: 0,
    errors: 0,
    avgResponseTime: 0,
    activeConnections: 0
  });
  
  const [healthHistory, setHealthHistory] = useState<number[]>([]);

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeMetrics(prev => ({
        requests: prev.requests + Math.floor(Math.random() * 5),
        errors: prev.errors + (Math.random() > 0.95 ? 1 : 0),
        avgResponseTime: 150 + Math.random() * 100,
        activeConnections: 8 + Math.floor(Math.random() * 15)
      }));
      
      setHealthHistory(prev => {
        const newScore = health.score + (Math.random() - 0.5) * 10;
        const clampedScore = Math.max(0, Math.min(100, newScore));
        return [...prev.slice(-19), clampedScore];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [health.score]);

  const getServiceIcon = (service: string) => {
    const icons = {
      ai: Activity,
      mcp: Cpu,
      websocket: Wifi,
      database: Database,
      cache: Monitor
    };
    return icons[service as keyof typeof icons] || Activity;
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 90) return CheckCircle;
    if (score >= 70) return AlertTriangle;
    return XCircle;
  };

  const HealthIcon = getHealthIcon(health.score);

  return (
    <div className={`system-health-monitor ${className || ''}`}>
      {/* Health Score Display */}
      <div className="health-score-section">
        <div className="score-display">
          <motion.div 
            className="score-circle"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <svg className="score-progress" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="8"
                fill="none"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                stroke={health.score >= 90 ? '#10B981' : health.score >= 70 ? '#F59E0B' : '#EF4444'}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - health.score / 100)}`}
                initial={{ strokeDashoffset: `${2 * Math.PI * 45}` }}
                animate={{ strokeDashoffset: `${2 * Math.PI * 45 * (1 - health.score / 100)}` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            
            <div className="score-content">
              <motion.div
                className={`score-number ${getHealthColor(health.score)}`}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                {health.score}
              </motion.div>
              <div className="score-label">Health</div>
            </div>
          </motion.div>
        </div>
        
        <div className="health-status">
          <motion.div 
            className="status-indicator"
            animate={{ y: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <HealthIcon 
              size={20} 
              className={getHealthColor(health.score)}
            />
            <span className="status-text">
              {health.score >= 90 ? 'Excellent' :
               health.score >= 70 ? 'Good' : 'Needs Attention'}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Services Status */}
      <div className="services-section">
        <h4 className="section-title">Services</h4>
        <div className="services-grid">
          {Object.entries(health.services).map(([service, status]) => {
            const ServiceIcon = getServiceIcon(service);
            
            return (
              <motion.div
                key={service}
                className={`service-item ${status ? 'online' : 'offline'}`}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Object.keys(health.services).indexOf(service) * 0.1 }}
              >
                <div className="service-icon">
                  <ServiceIcon size={16} />
                  <div className={`service-status-dot ${status ? 'online' : 'offline'}`} />
                </div>
                
                <div className="service-info">
                  <span className="service-name">
                    {service.charAt(0).toUpperCase() + service.slice(1)}
                  </span>
                  <span className={`service-status ${status ? 'online' : 'offline'}`}>
                    {status ? 'Online' : 'Offline'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Expanded Metrics */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="expanded-metrics"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Real-time Metrics */}
            <div className="metrics-section">
              <h4 className="section-title">Real-time Metrics</h4>
              
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-header">
                    <Activity size={16} className="metric-icon" />
                    <span className="metric-label">Requests</span>
                  </div>
                  <div className="metric-value">
                    <motion.span
                      key={realtimeMetrics.requests}
                      initial={{ scale: 1.2, color: '#5B8CFF' }}
                      animate={{ scale: 1, color: '#FFFFFF' }}
                      transition={{ duration: 0.2 }}
                    >
                      {realtimeMetrics.requests.toLocaleString()}
                    </motion.span>
                  </div>
                  <div className="metric-trend">
                    <TrendingUp size={12} className="trend-icon positive" />
                    <span className="trend-text">+5.2%</span>
                  </div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-header">
                    <XCircle size={16} className="metric-icon" />
                    <span className="metric-label">Errors</span>
                  </div>
                  <div className="metric-value">
                    <motion.span
                      key={realtimeMetrics.errors}
                      initial={{ scale: 1.2, color: '#EF4444' }}
                      animate={{ scale: 1, color: '#FFFFFF' }}
                      transition={{ duration: 0.2 }}
                    >
                      {realtimeMetrics.errors}
                    </motion.span>
                  </div>
                  <div className="metric-trend">
                    <TrendingDown size={12} className="trend-icon negative" />
                    <span className="trend-text">-12%</span>
                  </div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-header">
                    <Monitor size={16} className="metric-icon" />
                    <span className="metric-label">Response</span>
                  </div>
                  <div className="metric-value">
                    {Math.round(realtimeMetrics.avgResponseTime)}ms
                  </div>
                  <div className="metric-trend">
                    <TrendingUp size={12} className="trend-icon positive" />
                    <span className="trend-text">+2.1%</span>
                  </div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-header">
                    <Wifi size={16} className="metric-icon" />
                    <span className="metric-label">Connections</span>
                  </div>
                  <div className="metric-value">
                    {realtimeMetrics.activeConnections}
                  </div>
                  <div className="metric-trend">
                    <TrendingUp size={12} className="trend-icon positive" />
                    <span className="trend-text">+8.5%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Health History Chart */}
            <div className="health-history-section">
              <h4 className="section-title">Health History</h4>
              
              <div className="health-chart">
                <svg className="chart-svg" viewBox="0 0 400 100">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map(y => (
                    <line
                      key={y}
                      x1="0"
                      y1={100 - y}
                      x2="400"
                      y2={100 - y}
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="0.5"
                    />
                  ))}
                  
                  {/* Health line */}
                  <motion.polyline
                    points={healthHistory.map((score, index) => {
                      const x = (index / (healthHistory.length - 1)) * 400;
                      const y = 100 - score;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#5B8CFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  
                  {/* Data points */}
                  {healthHistory.map((score, index) => {
                    const x = (index / (healthHistory.length - 1)) * 400;
                    const y = 100 - score;
                    
                    return (
                      <motion.circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="3"
                        fill="#5B8CFF"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      />
                    );
                  })}
                </svg>
                
                <div className="chart-labels">
                  <span className="chart-label">0%</span>
                  <span className="chart-label">25%</span>
                  <span className="chart-label">50%</span>
                  <span className="chart-label">75%</span>
                  <span className="chart-label">100%</span>
                </div>
              </div>
            </div>

            {/* System Resources */}
            {health.metrics && (
              <div className="resources-section">
                <h4 className="section-title">System Resources</h4>
                
                <div className="resource-bars">
                  <div className="resource-item">
                    <div className="resource-header">
                      <Cpu size={14} />
                      <span className="resource-label">CPU Usage</span>
                      <span className="resource-value">{health.metrics.cpuUsage}%</span>
                    </div>
                    <div className="resource-bar">
                      <motion.div
                        className="resource-fill cpu"
                        initial={{ width: 0 }}
                        animate={{ width: `${health.metrics.cpuUsage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  
                  <div className="resource-item">
                    <div className="resource-header">
                      <Database size={14} />
                      <span className="resource-label">Memory Usage</span>
                      <span className="resource-value">{health.metrics.memoryUsage}%</span>
                    </div>
                    <div className="resource-bar">
                      <motion.div
                        className="resource-fill memory"
                        initial={{ width: 0 }}
                        animate={{ width: `${health.metrics.memoryUsage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <div className="health-actions">
        <motion.button
          className="health-action-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // Refresh health status
          }}
        >
          <Activity size={14} />
          Refresh
        </motion.button>
        
        <motion.button
          className="health-action-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // View detailed logs
          }}
        >
          <Monitor size={14} />
          Logs
        </motion.button>
      </div>
    </div>
  );
};

export default SystemHealthMonitor;