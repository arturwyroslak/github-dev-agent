import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, User, Send, Mic, MicOff, Paperclip, 
  Trash2, Download, Code, Eye, Copy, Settings,
  Zap, Brain, AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const EnhancedChatInterface: React.FC = () => {
  const [messages, setMessages] = useState([{
    id: '1',
    sender: 'agent',
    content: 'Cześć! Jestem GitHub Dev Agent. Mogę pomóc w tworzeniu kodu, analizie i implementacji projektów.',
    timestamp: new Date(),
    type: 'text'
  }]);
  
  const [inputValue, setInputValue] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsAgentTyping(true);
    
    // Simulate agent response
    setTimeout(() => {
      const agentResponse = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content: `Analizuję: "${userMessage.content}". Przygotowuję odpowiedź...`,
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, agentResponse]);
      setIsAgentTyping(false);
    }, 2000);
  };

  return (
    <div className="enhanced-chat">
      <div className="chat-header">
        <div className="agent-avatar">
          <Bot size={24} />
        </div>
        <div className="agent-info">
          <h3>GitHub Dev Agent</h3>
          <div className="agent-status">
            <div className="status-dot ready" />
            <span>Gotowy do pomocy</span>
          </div>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.sender}`}>
            <div className="message-content">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        
        {isAgentTyping && (
          <div className="typing-indicator">
            <span>Agent pisze...</span>
          </div>
        )}
      </div>
      
      <div className="chat-input-container">
        <div className="input-row">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Opisz co chcesz stworzyć..."
            className="chat-textarea"
            rows={1}
          />
          <button
            className="send-button"
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedChatInterface;