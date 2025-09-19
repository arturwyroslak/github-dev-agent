import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: number;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatResponse {
  success: boolean;
  data?: {
    success: boolean;
    content: string;
    intent: string;
    metadata: {
      sessionId: string;
      timestamp: string;
    };
  };
  error?: string;
}

const SimpleChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      content: inputValue.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMessage.content,  // Backend oczekuje 'query' nie 'message'
        }),
      });

      if (!response.ok) throw new Error("HTTP error " + response.status);

      const result: ChatResponse = await response.json();

      let assistantContent = "";
      
      if (result.success && result.data && result.data.success) {
        assistantContent = result.data.content;
      } else if (result.data && !result.data.success) {
        assistantContent = result.data.content || "Wystąpił błąd podczas przetwarzania zapytania.";
      } else {
        assistantContent = "Przepraszam, nie mogę w tej chwili odpowiedzieć. Spróbuj ponownie.";
      }

      const assistantMessage: Message = {
        id: Date.now() + 1,
        content: assistantContent,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          content: "Błąd komunikacji z serwerem. Sprawdź połączenie i spróbuj ponownie.",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

  const handleCopy = (content: string, id: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  return (
    <div className="__chat-main">
      <header className="__chat-header">
        <span>🤖</span> <span>GitHub Dev Agent</span>
      </header>
      <main className="__chat-body">
        {messages.length === 0 && (
          <div className="__chat-welcome">
            <h3>👋 Witaj w GitHub Dev Agent</h3>
            <p style={{ color: "#b1b1e3" }}>
              Twój asystent programistyczny. Zadaj pytanie dotyczące kodu, architektury lub problemów deweloperskich.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`__chat-msg ${msg.role === "user" ? "user" : "assistant"}`}
          >
            <div className="__chat-msg-meta">
              <span className="__avatar">
                {msg.role === "user" ? "👤" : "🤖"}
              </span>
              <span className="__who">
                {msg.role === "user" ? "Ty" : "Dev Agent"}
              </span>
              <span className="__t">{formatTime(msg.timestamp)}</span>
              {msg.role !== "user" && (
                <button
                  className="__copy-btn"
                  onClick={() => handleCopy(msg.content, msg.id)}>
                  📋
                  {copiedId === msg.id && <span className="__copied-ind">Skopiowano!</span>}
                </button>
              )}
            </div>
            <div className="__chat-msg-content">
              <ReactMarkdown
                components={{
                  code({ node, inline, children, ...props }) {
                    return inline
                      ? (
                        <code className="inline-code" {...props}>{children}</code>
                      ) : (
                        <pre className="code-block">
                          <code {...props}>{children}</code>
                        </pre>
                      );
                  },
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="__chat-msg assistant loading">
            <div className="__chat-msg-meta">
              <span className="__avatar">🤖</span>
              <span className="__who">Dev Agent</span>
              <span className="__t">myślę...</span>
            </div>
            <div className="__chat-msg-content">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>
      <form className="__chat-form" onSubmit={handleSubmit}>
        <input
          className="__chat-in"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Napisz wiadomość lub pytanie dotyczące kodu..."
          disabled={isLoading}
        />
        <button
          className="__chat-send"
          type="submit"
          disabled={!inputValue.trim() || isLoading}
        >
          {isLoading ? "..." : "Wyślij"}
        </button>
      </form>
      <style jsx>{`
      .__chat-main {
        flex: 1;
        min-width: 0;
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: linear-gradient(155deg, #242850 55%, #1a1628 100%);
        border-radius: 0 20px 20px 0;
        box-shadow: 0 8px 70px #23235b17;
      }
      .__chat-header {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 1.15em;
        color: #dbd1ff;
        font-weight: 700;
        height: 65px;
        padding: 0 30px;
        border-bottom: 2px solid #272856;
        letter-spacing: 0.03em;
      }
      .__chat-body {
        padding: 30px 4vw 0 4vw;
        flex: 1;
        overflow-y: auto;
        transition: background 0.2s;
      }
      .__chat-welcome {
        margin: 60px auto 0;
        text-align: center;
        color: #efeffaef;
        padding: 34px 0 0 0;
        opacity: .93;
      }
      .__chat-welcome h3 {
        font-size: 1.3em;
        margin-bottom: 16px;
      }
      .__chat-msg {
        margin: 0 0 28px 0;
        display: flex;
        flex-direction: column;
      }
      .__chat-msg.user {
        align-items: flex-end;
      }
      .__chat-msg.assistant {
        align-items: flex-start;
      }
      .__chat-msg-meta {
        display: flex;
        gap: 10px;
        align-items: center;
        color: #a7a7e1;
        font-size: 0.85em;
        margin-bottom: 3px;
      }
      .__avatar { font-size: 1.12em; }
      .__who { font-weight: bold; }
      .__t { opacity:.72 }
      .__copy-btn {
        margin-left: 0.5em;
        background: none;
        border: none;
        color: #aaaaff;
        cursor: pointer;
        font-size: 1em;
        position: relative;
      }
      .__copied-ind {
        margin-left: 4px;
        font-size: 0.91em;
        color: #58e7d3;
      }
      .__chat-msg-content {
        padding: 15px 20px;
        border-radius: 17px;
        background: rgba(56,33,110,0.22);
        color: #ecf1ff;
        box-shadow: 0 4px 12px #45459117;
        font-size: 1.08em;
        word-break: break-word;
        max-width: 620px;
      }
      .__chat-msg.user .__chat-msg-content {
        background: rgba(46,49,90,0.42);
        color: #e0e5f8;
        box-shadow: 0 2px 8px 2px #46477917;
      }
      .inline-code {
        background: #23223788;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
        color: #f3d47c;
      }
      .code-block {
        background: #15152c98;
        padding: 15px;
        border-radius: 8px;
        margin: 8px 0 0 0;
        border: 1.3px solid #563d9393;
        overflow-x: auto;
        font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
        color: #dddbe3;
      }
      .typing-indicator {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .typing-indicator span {
        width: 8px; height: 8px; border-radius: 50%;
        background: #cbc7f5b0;
        animation: pulse 1.2s infinite both;
      }
      .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
      .typing-indicator span:nth-child(3) { animation-delay: -0.32s; }
      @keyframes pulse {
        0%, 80%, 100% { transform: scale(.6); opacity: 0.45; }
        40% { transform: scale(1); opacity: 1; }
      }
      .__chat-form {
        display: flex; align-items: center; gap: 15px;
        background: #272850a2;
        padding: 20px 30px; border-top: 2px solid #262353;
        z-index: 1;
        position: relative;
      }
      .__chat-in {
        flex: 1;
        border: none;
        border-radius: 23px;
        padding: 15px 20px;
        font-size: 1.14em;
        background: #27273ba5;
        color: #fff;
        transition: border .12s;
      }
      .__chat-in:focus {
        outline: none;
        border: 2px solid #9b86eb;
      }
      .__chat-in::placeholder {
        color: rgba(255, 255, 255, 0.6);
      }
      .__chat-send {
        background: linear-gradient(120deg, #7158e6 40%, #a649f7 100%);
        color: #fff;
        border: none;
        border-radius: 20px;
        padding: 11px 20px;
        font-size: 1.06em;
        cursor: pointer;
        min-width: 85px;
        font-weight: 600;
        transition: background .14s, transform .14s;
        transform: scale(1);
      }
      .__chat-send:disabled {
        background: #4949679e;
        opacity: .67;
        cursor: not-allowed;
      }
      .__chat-send:not(:disabled):hover{
        background:linear-gradient(120deg,#8a72ee 40%,#a858ff 100%);
        transform:scale(1.07);
      }
      `}
      </style>
    </div>
  );
};

export default SimpleChatInterface;