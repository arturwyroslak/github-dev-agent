import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle, XCircle, Clock, Play } from 'lucide-react';

export const ExecutionPipeline: React.FC<{ executions: any[] }> = ({ executions }) => {
  return (
    <div className="execution-pipeline">
      <div className="pipeline-header">
        <Zap className="pipeline-icon" size={20} />
        <h3>Pipeline Wykonania</h3>
        <div className="execution-stats">
          <span className="active-count">{executions.length} aktywnych</span>
        </div>
      </div>
      
      {executions.map((execution) => (
        <div key={execution.id} className="execution-container">
          <div className="execution-card">
            <div className="execution-header">
              <h4>{execution.goal}</h4>
              <div className="execution-status">
                <div className={`status-indicator ${execution.status}`} />
                <span>{execution.status}</span>
              </div>
            </div>
            
            <div className="task-pipeline">
              {execution.tasks?.map((task: any, index: number) => (
                <motion.div
                  key={task.id}
                  className={`task-node ${task.status}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="task-icon">
                    {task.status === 'completed' && <CheckCircle size={16} />}
                    {task.status === 'failed' && <XCircle size={16} />}
                    {task.status === 'running' && <Play size={16} />}
                    {task.status === 'pending' && <Clock size={16} />}
                  </div>
                  
                  <div className="task-info">
                    <div className="task-title">{task.description}</div>
                    <div className="task-meta">
                      <span className="task-type">{task.type}</span>
                      {task.duration && (
                        <span className="task-duration">{task.duration}ms</span>
                      )}
                    </div>
                  </div>
                  
                  {task.status === 'running' && task.progress && (
                    <div className="task-progress">
                      <div 
                        className="progress-bar"
                        style={{ width: `${task.progress * 100}%` }}
                      />
                    </div>
                  )}
                </motion.div>
              )) || (
                <div className="no-tasks">
                  <span>Brak zadań do wyświetlenia</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {executions.length === 0 && (
        <div className="empty-pipeline">
          <Play size={48} className="empty-icon" />
          <h4>Brak aktywnych wykonań</h4>
          <p>Wykonania pojawią się tutaj gdy agent rozpocznie pracę</p>
        </div>
      )}
    </div>
  );
};

export default ExecutionPipeline;