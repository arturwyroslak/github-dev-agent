import { useState, useEffect } from 'react';

interface AgentThought {
  id: string;
  type: string;
  content: string;
  timestamp: Date;
  confidence?: number;
}

interface AgentStatus {
  status: 'idle' | 'thinking' | 'processing' | 'error';
  isThinking: boolean;
  currentTask?: string;
  confidence: number;
  neuralActivity?: number[];
  insights?: any[];
  learningProgress?: number;
}

interface SystemHealth {
  score: number;
  services: {
    ai: boolean;
    mcp: boolean;
    websocket: boolean;
  };
}

export const useAgentState = () => {
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    status: 'idle',
    isThinking: false,
    confidence: 0.85,
    neuralActivity: Array.from({ length: 20 }, () => Math.random()),
    insights: [],
    learningProgress: 0.7
  });
  
  const [activeExecutions, setActiveExecutions] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    score: 95,
    services: {
      ai: true,
      mcp: true,
      websocket: true
    }
  });
  
  const [thoughts, setThoughts] = useState<AgentThought[]>([]);

  const updateAgentStatus = (data: any) => {
    if (data.type === 'status-update') {
      setAgentStatus(prev => ({ ...prev, ...data.payload }));
    }
    
    if (data.type === 'new-thought') {
      setThoughts(prev => [...prev.slice(-19), data.payload]);
    }
    
    if (data.type === 'execution-update') {
      setActiveExecutions(prev => {
        const index = prev.findIndex(e => e.id === data.payload.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data.payload };
          return updated;
        } else {
          return [...prev, data.payload];
        }
      });
    }
  };

  // Simulate periodic updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate neural activity changes
      setAgentStatus(prev => ({
        ...prev,
        neuralActivity: Array.from({ length: 20 }, () => Math.random())
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return {
    agentStatus,
    activeExecutions,
    systemHealth,
    thoughts,
    updateAgentStatus
  };
};

export default useAgentState;