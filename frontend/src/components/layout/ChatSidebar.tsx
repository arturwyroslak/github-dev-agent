import React from "react";

interface SidebarProps {
  onNewChat: () => void;
  selected: string;
  onNavClick?: (section: string) => void;
}

const ChatSidebar: React.FC<SidebarProps> = ({ onNewChat, selected, onNavClick }) => {
  
  const handleNavClick = (section: string) => {
    console.log(`📋 Sidebar navigation: ${section}`);
    
    if (onNavClick) {
      onNavClick(section);
    }
    
    // Visual feedback and logging
    switch (section) {
      case 'chat':
        console.log('💬 Chat section active');
        break;
      case 'repos':
        console.log('📦 Repositories section clicked');
        break;
      case 'settings':
        console.log('⚙️ Settings section clicked');
        break;
      default:
        console.log('❓ Unknown section:', section);
        break;
    }
  };

  const handleNewChat = () => {
    console.log('➕ New Chat button clicked');
    onNewChat();
  };
  
  const handleLogoClick = () => {
    console.log('🟣 Logo clicked - refresh to home');
    window.location.reload();
  };
  
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div 
          className="logo" 
          title="GitHub Dev Agent - Click to refresh"
          onClick={handleLogoClick}
        >
          🟣
        </div>
        
        <button 
          className="sidebar-btn new-chat-btn" 
          title="Rozpocznij nowy czat" 
          onClick={handleNewChat}
        >
          ➕
        </button>
      </div>
      
      <nav>
        <button 
          className={`sidebar-btn ${selected === "chat" ? "active" : ""}`} 
          title="Czat z AI Assistant"
          onClick={() => handleNavClick('chat')}
        >
          💬
        </button>
        
        <button 
          className={`sidebar-btn ${selected === "repos" ? "active" : ""}`}
          title="Twoje repozytoria GitHub"
          onClick={() => handleNavClick('repos')}
        >
          📦
        </button>
        
        <button 
          className={`sidebar-btn ${selected === "settings" ? "active" : ""}`}
          title="Ustawienia aplikacji"
          onClick={() => handleNavClick('settings')}
        >
          ⚙️
        </button>
      </nav>
      
      <div className="sidebar-bottom">
        <span className="sidebar-user" title="Zalogowany użytkownik">
          👨‍💻 dev
        </span>
      </div>
      
      <style jsx>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 70px;
          min-width: 70px;
          height: 100vh;
          background: linear-gradient(160deg, #202437 60%, #223344 100%);
          border-right: 1.5px solid rgba(255,255,255,0.09);
          box-shadow: 2px 0 18px 0 rgba(24, 28, 50, 0.4);
          padding: 20px 0 10px 0;
          position: relative;
          z-index: 10;
          user-select: none;
        }
        
        .sidebar-top {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        
        .logo {
          font-size: 2.4em;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 4px;
          border-radius: 50%;
        }
        
        .logo:hover {
          transform: rotate(15deg) scale(1.15);
          background: rgba(100, 179, 244, 0.1);
          box-shadow: 0 0 20px rgba(100, 179, 244, 0.3);
        }
        
        .logo:active {
          transform: rotate(15deg) scale(1.05);
        }
        
        .sidebar-btn {
          background: none;
          border: none;
          color: #b1b9cf;
          margin: 6px 0;
          font-size: 1.7em;
          padding: 10px;
          cursor: pointer;
          border-radius: 12px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          position: relative;
          overflow: hidden;
        }
        
        .sidebar-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }
        
        .sidebar-btn:hover::before {
          transform: translateX(100%);
        }
        
        .sidebar-btn:hover {
          color: #f6a8ff;
          background: rgba(71, 58, 132, 0.4);
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(246, 168, 255, 0.25);
        }
        
        .sidebar-btn.active {
          color: #f6a8ff;
          background: rgba(71, 58, 132, 0.7);
          transform: scale(1.08);
          box-shadow: 0 0 16px rgba(246, 168, 255, 0.5);
        }
        
        .new-chat-btn {
          border: 2px solid transparent;
        }
        
        .new-chat-btn:hover {
          background: rgba(76, 175, 80, 0.3) !important;
          color: #4caf50 !important;
          transform: scale(1.2) !important;
          border-color: rgba(76, 175, 80, 0.5);
          box-shadow: 0 0 20px rgba(76, 175, 80, 0.3) !important;
        }
        
        .sidebar-btn:active {
          transform: scale(0.9);
          transition: transform 0.1s;
        }
        
        nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .sidebar-bottom {
          margin-top: auto;
          padding: 8px 0;
          color: #88aacc;
          font-size: 0.75em;
          letter-spacing: 0.04em;
        }
        
        .sidebar-user {
          padding: 8px 6px;
          background: rgba(38, 48, 78, 0.6);
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.25s ease;
          text-align: center;
          display: block;
          width: 100%;
        }
        
        .sidebar-user:hover {
          background: rgba(38, 48, 78, 0.9);
          color: #ffffff;
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        /* Enhanced tooltips */
        .sidebar-btn:hover::after,
        .logo:hover::after {
          content: attr(title);
          position: absolute;
          left: 65px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.65em;
          white-space: nowrap;
          z-index: 1000;
          opacity: 0;
          animation: slideIn 0.3s ease forwards;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .sidebar-user:hover::after {
          content: attr(title);
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.6em;
          white-space: nowrap;
          z-index: 1000;
          opacity: 0;
          animation: fadeInUp 0.2s ease forwards;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-50%) translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        /* Ripple effect for button clicks */
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        .sidebar-btn:active::after {
          content: '';
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          animation: ripple 0.4s linear;
        }
      `}</style>
    </aside>
  );
};

export default ChatSidebar;