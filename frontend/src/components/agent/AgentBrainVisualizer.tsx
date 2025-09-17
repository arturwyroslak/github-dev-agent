import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Activity } from 'lucide-react';

interface NeuralNode {
  id: string;
  x: number;
  y: number;
  active: boolean;
  intensity: number;
  type: 'input' | 'hidden' | 'output';
}

interface NeuralConnection {
  id: string;
  from: NeuralNode;
  to: NeuralNode;
  active: boolean;
  strength: number;
}

interface AgentBrainVisualizerProps {
  thinking: boolean;
  currentTask?: string;
  confidence: number;
  neuralActivity?: number[];
  className?: string;
}

export const AgentBrainVisualizer: React.FC<AgentBrainVisualizerProps> = ({
  thinking,
  currentTask,
  confidence,
  neuralActivity = [],
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [nodes, setNodes] = useState<NeuralNode[]>([]);
  const [connections, setConnections] = useState<NeuralConnection[]>([]);
  const [brainMetrics, setBrainMetrics] = useState({
    processingSpeed: 0,
    memoryUsage: 0,
    learningRate: 0
  });

  // Generate neural network structure
  useEffect(() => {
    const generateNetwork = () => {
      const newNodes: NeuralNode[] = [];
      const newConnections: NeuralConnection[] = [];

      // Input layer (left)
      for (let i = 0; i < 6; i++) {
        newNodes.push({
          id: `input-${i}`,
          x: 15,
          y: 20 + i * 12,
          active: false,
          intensity: 0,
          type: 'input'
        });
      }

      // Hidden layers (middle)
      for (let layer = 0; layer < 3; layer++) {
        const nodesInLayer = layer === 1 ? 8 : 6;
        for (let i = 0; i < nodesInLayer; i++) {
          newNodes.push({
            id: `hidden-${layer}-${i}`,
            x: 35 + layer * 20,
            y: 15 + i * 10,
            active: false,
            intensity: 0,
            type: 'hidden'
          });
        }
      }

      // Output layer (right)
      for (let i = 0; i < 4; i++) {
        newNodes.push({
          id: `output-${i}`,
          x: 85,
          y: 30 + i * 15,
          active: false,
          intensity: 0,
          type: 'output'
        });
      }

      // Generate connections
      newNodes.forEach(fromNode => {
        newNodes.forEach(toNode => {
          if (fromNode.x < toNode.x && Math.random() > 0.4) {
            newConnections.push({
              id: `${fromNode.id}-${toNode.id}`,
              from: fromNode,
              to: toNode,
              active: false,
              strength: Math.random()
            });
          }
        });
      });

      setNodes(newNodes);
      setConnections(newConnections);
    };

    generateNetwork();
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update neural activity when thinking
      if (thinking) {
        // Activate random nodes
        setNodes(prevNodes => 
          prevNodes.map(node => ({
            ...node,
            active: Math.random() > (node.type === 'input' ? 0.7 : 0.8),
            intensity: Math.random() * confidence
          }))
        );

        // Activate connections
        setConnections(prevConnections =>
          prevConnections.map(conn => ({
            ...conn,
            active: conn.from.active && Math.random() > 0.6,
            strength: Math.random() * confidence
          }))
        );

        // Update metrics
        setBrainMetrics({
          processingSpeed: 85 + Math.random() * 15,
          memoryUsage: 60 + Math.random() * 30,
          learningRate: confidence * 100 + Math.random() * 10
        });
      } else {
        // Gradual deactivation
        setNodes(prevNodes =>
          prevNodes.map(node => ({
            ...node,
            active: node.active && Math.random() > 0.1,
            intensity: node.intensity * 0.95
          }))
        );
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [thinking, confidence]);

  return (
    <div className={`brain-visualizer ${className || ''}`}>
      <div className="brain-container">
        {/* Neural Network Visualization */}
        <div className="neural-network">
          {/* Neural Nodes */}
          {nodes.map(node => (
            <motion.div
              key={node.id}
              className={`neural-node ${node.type} ${node.active ? 'active' : ''}`}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                opacity: 0.3 + (node.intensity * 0.7)
              }}
              animate={{
                scale: node.active ? [1, 1.3, 1] : 1,
                opacity: 0.3 + (node.intensity * 0.7)
              }}
              transition={{
                scale: { repeat: node.active ? Infinity : 0, duration: 1.5 },
                opacity: { duration: 0.3 }
              }}
            >
              <div className="node-core" />
              {node.active && (
                <motion.div 
                  className="node-pulse"
                  animate={{ scale: [0, 2], opacity: [0.8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
            </motion.div>
          ))}

          {/* Neural Connections */}
          <svg className="neural-connections" viewBox="0 0 100 100">
            {connections.map(connection => (
              <motion.line
                key={connection.id}
                x1={connection.from.x}
                y1={connection.from.y}
                x2={connection.to.x}
                y2={connection.to.y}
                className={`connection ${connection.active ? 'active' : ''}`}
                strokeOpacity={connection.active ? connection.strength : 0.1}
                animate={{
                  strokeDashoffset: connection.active ? [0, 20] : 0
                }}
                transition={{
                  strokeDashoffset: { repeat: Infinity, duration: 2 }
                }}
              />
            ))}
          </svg>
        </div>

        {/* Brain Activity Overlay */}
        <AnimatePresence>
          {thinking && (
            <motion.div 
              className="brain-activity-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="activity-ripple" />
              <div className="activity-ripple delay-1" />
              <div className="activity-ripple delay-2" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Agent Status Display */}
      <div className="agent-status-display">
        <div className="status-row">
          <div className="status-indicator">
            <motion.div 
              className={`status-light ${thinking ? 'thinking' : 'idle'}`}
              animate={{
                boxShadow: thinking ? 
                  ['0 0 10px #5B8CFF', '0 0 20px #5B8CFF', '0 0 10px #5B8CFF'] :
                  '0 0 5px #10B981'
              }}
              transition={{ repeat: thinking ? Infinity : 0, duration: 1.5 }}
            />
            <div className="status-text">
              <span className="status-label">
                {thinking ? 'Przetwarzanie' : 'Gotowy'}
              </span>
              {currentTask && (
                <span className="current-task">{currentTask}</span>
              )}
            </div>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="confidence-section">
          <div className="confidence-header">
            <span className="confidence-label">Pewność</span>
            <span className="confidence-value">{Math.round(confidence * 100)}%</span>
          </div>
          <div className="confidence-bar-container">
            <motion.div 
              className="confidence-bar"
              initial={{ width: 0 }}
              animate={{ width: `${confidence * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            <div className="confidence-segments">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="confidence-segment" />
              ))}
            </div>
          </div>
        </div>

        {/* Brain Metrics */}
        <div className="brain-metrics">
          <div className="metric-item">
            <Zap className="metric-icon" size={14} />
            <span className="metric-label">Szybkość</span>
            <span className="metric-value">{Math.round(brainMetrics.processingSpeed)}%</span>
          </div>
          <div className="metric-item">
            <Brain className="metric-icon" size={14} />
            <span className="metric-label">Pamięć</span>
            <span className="metric-value">{Math.round(brainMetrics.memoryUsage)}%</span>
          </div>
          <div className="metric-item">
            <Activity className="metric-icon" size={14} />
            <span className="metric-label">Uczenie</span>
            <span className="metric-value">{Math.round(brainMetrics.learningRate)}%</span>
          </div>
        </div>
      </div>

      {/* Neural Activity Visualization */}
      {neuralActivity.length > 0 && (
        <div className="neural-activity-chart">
          <div className="activity-waves">
            {neuralActivity.map((activity, index) => (
              <motion.div
                key={index}
                className="activity-wave"
                style={{ height: `${activity * 100}%` }}
                animate={{ height: `${activity * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Thinking Particles */}
      <AnimatePresence>
        {thinking && (
          <div className="thinking-particles">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="particle"
                initial={{ 
                  x: Math.random() * 100, 
                  y: Math.random() * 100, 
                  opacity: 0,
                  scale: 0
                }}
                animate={{
                  x: Math.random() * 100,
                  y: Math.random() * 100,
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentBrainVisualizer;