import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ApiResponse {
  success: boolean;
  data: {
    content: string;
    intent?: string;
    suggestions?: string[];
    metadata?: any;
  };
  sessionId?: string;
}

export const SimpleChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Fixed: Use correct backend endpoint /api/ai/chat
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content, // Backend expects 'query', not 'message'
          sessionId: sessionId || undefined,
          options: {
            language: 'typescript',
            framework: 'react'
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      // Set sessionId if returned
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.success ? data.data.content : 'Wystąpił błąd podczas przetwarzania.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Przepraszam, wystąpił błąd podczas komunikacji z serwerem. Spróbuj ponownie.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };
  
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);
  
  return (
    <div className="simple-chat">
      {/* Chat Header */}
      <div className="chat-header">
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
      </div>
      
      {/* Chat Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h3>👋 Witaj w GitHub Dev Agent</h3>
            <p>Jestem Twoim asystentem programistycznym. Mogę pomóc w:</p>
            <ul>
              <li>Analizie i refaktoryzacji kodu</li>
              <li>Debugowaniu problemów</li>
              <li>Projektowaniu architektury aplikacji</li>
              <li>Implementacji nowych funkcji</li>
              <li>Optymalizacji wydajności</li>
            </ul>
            <p>Zadaj mi pytanie lub opisz problem z którym się zmagasz!</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.type}`}>
            <div className="message-header">
              <span className="role">
                {message.type === 'user' ? '👤 Ty' : '🤖 Dev Agent'}
              </span>
              <span className="timestamp">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            <div className="message-content">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    return inline ? (
                      <code className="inline-code" {...props}>
                        {children}
                      </code>
                    ) : (
                      <pre className="code-block">
                        <code {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message message-assistant loading">
            <div className="message-header">
              <span className="role">🤖 Dev Agent</span>
              <span className="timestamp">myślę...</span>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat Input */}
      <div className="chat-input">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Wpisz swoją wiadomość..."
            rows={1}
            disabled={isLoading}
            className="message-textarea"
          />
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="send-button"
            type="button"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .simple-chat {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 100%;
          margin: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          color: #ffffff;
        }
        
        .chat-header {
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 15px 25px;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .logo-icon {
          font-size: 1.8em;
        }
        
        .app-title {
          margin: 0;
          font-size: 1.4em;
          font-weight: 600;
          background: linear-gradient(45deg, #64b3f4, #c2e59c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9em;
          color: rgba(255, 255, 255, 0.7);
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4ade80;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          scroll-behavior: smooth;
        }
        
        .welcome-message {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 30px;
          text-align: center;
          margin: 50px auto;
          max-width: 600px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .welcome-message h3 {
          margin-bottom: 15px;
          font-size: 1.5em;
          color: #64b3f4;
        }
        
        .welcome-message ul {
          text-align: left;
          max-width: 400px;
          margin: 20px auto;
        }
        
        .welcome-message li {
          margin: 8px 0;
          color: rgba(255, 255, 255, 0.8);
        }
        
        .message {
          margin-bottom: 25px;
          display: flex;
          flex-direction: column;
        }
        
        .message.message-user {
          align-items: flex-end;
        }
        
        .message.message-assistant {
          align-items: flex-start;
        }
        
        .message-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          font-size: 0.85em;
          color: rgba(255, 255, 255, 0.6);
        }
        
        .role {
          font-weight: 600;
        }
        
        .timestamp {
          font-size: 0.8em;
        }
        
        .message-content {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 15px 20px;
          max-width: 70%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .message.message-user .message-content {
          background: rgba(100, 179, 244, 0.15);
          border: 1px solid rgba(100, 179, 244, 0.3);
        }
        
        .message.message-assistant .message-content {
          background: rgba(194, 229, 156, 0.1);
          border: 1px solid rgba(194, 229, 156, 0.2);
        }
        
        .inline-code {
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', 'Consolas', monospace;
          color: #ffd700;
          font-size: 0.9em;
        }
        
        .code-block {
          background: rgba(0, 0, 0, 0.4);
          padding: 15px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 10px 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .code-block code {
          font-family: 'JetBrains Mono', 'Consolas', monospace;
          color: #e6e6e6;
          font-size: 0.9em;
        }
        
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          animation: typing 1.4s ease-in-out infinite both;
        }
        
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0s; }
        
        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .chat-input {
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
        }
        
        .input-container {
          display: flex;
          gap: 15px;
          max-width: 1000px;
          margin: 0 auto;
          align-items: flex-end;
        }
        
        .message-textarea {
          flex: 1;
          min-height: 50px;
          max-height: 120px;
          padding: 15px 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          border-radius: 25px;
          font-size: 16px;
          outline: none;
          resize: none;
          backdrop-filter: blur(10px);
          font-family: inherit;
        }
        
        .message-textarea::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        
        .message-textarea:focus {
          border-color: rgba(100, 179, 244, 0.6);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 20px rgba(100, 179, 244, 0.2);
        }
        
        .send-button {
          padding: 15px 25px;
          background: linear-gradient(45deg, #64b3f4, #c2e59c);
          color: white;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
          min-width: 80px;
          backdrop-filter: blur(10px);
        }
        
        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(100, 179, 244, 0.3);
          background: linear-gradient(45deg, #5aa3e4, #b2d58c);
        }
        
        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .chat-messages::-webkit-scrollbar {
          width: 8px;
        }
        
        .chat-messages::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        
        .chat-messages::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        
        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default SimpleChatInterface;