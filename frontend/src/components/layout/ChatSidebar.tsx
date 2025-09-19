import React from "react";

interface SidebarProps {
  onNewChat: () => void;
  selected: string;
  onNavClick?: (section: string) => void;
}

const ChatSidebar: React.FC<SidebarProps> = ({ onNewChat, selected, onNavClick }) => {
  
  const handleNavClick = (section: string) => {
    if (onNavClick) {
      onNavClick(section);
    }
    
    // Placeholder functionality for different sections
    switch (section) {
      case 'chat':
        console.log('Chat section selected');
        break;
      case 'repos':
        console.log('Repositories section - Coming soon!');
        alert('🚧 Sekcja repozytoriów w przygotowaniu!');
        break;
      case 'settings':
        console.log('Settings section - Coming soon!');
        alert('⚙️ Ustawienia w przygotowaniu!');
        break;
      default:
        break;
    }
  };

  const handleNewChat = () => {
    console.log('Creating new chat...');
    onNewChat();
  };
  
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo" title="GitHub Dev Agent">🟣</div>
        <button 
          className="sidebar-btn new-chat-btn" 
          title="Nowy Chat" 
          onClick={handleNewChat}
        >
          ➕
        </button>
      </div>
      
      <nav>
        <button 
          className={`sidebar-btn ${selected === "chat" ? "active" : ""}`} 
          title="Chat"
          onClick={() => handleNavClick('chat')}
        >
          💬
        </button>
        
        <button 
          className="sidebar-btn" 
          title="Twoje repozytoria"
          onClick={() => handleNavClick('repos')}
        >
          📦
        </button>
        
        <button 
          className="sidebar-btn" 
          title="Ustawienia"
          onClick={() => handleNavClick('settings')}
        >
          ⚙️
        </button>
      </nav>
      
      <div className="sidebar-bottom">
        <span className="sidebar-user" title="Zalogowany jako dev">dev</span>
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
          box-shadow: 2px 0 18px 0 #181c3242;
          padding: 20px 0 10px 0;
          position: relative;
          z-index: 2;
        }
        
        .sidebar-top {
          margin-bottom: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        
        .logo {
          font-size: 2.2em;
          margin-bottom: 8px;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        .logo:hover {
          transform: rotate(10deg) scale(1.1);
        }
        
        .sidebar-btn {
          background: none;
          border: none;
          color: #b1b9cf;
          margin: 8px 0;
          font-size: 1.6em;
          padding: 8px;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          position: relative;
        }
        
        .sidebar-btn:hover {
          color: #f6a8ff;
          background: rgba(71, 58, 132, 0.4);
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(246, 168, 255, 0.2);
        }
        
        .sidebar-btn.active {
          color: #f6a8ff;
          background: rgba(71, 58, 132, 0.6);
          transform: scale(1.05);
          box-shadow: 0 0 12px rgba(246, 168, 255, 0.4);
        }
        
        .new-chat-btn:hover {
          background: rgba(76, 175, 80, 0.3) !important;
          color: #4caf50 !important;
          transform: scale(1.15) !important;
        }
        
        .sidebar-btn:active {
          transform: scale(0.95);
        }
        
        .sidebar-bottom {
          margin-top: auto;
          padding-bottom: 5px;
          color: #88aacc;
          font-size: 0.8em;
          letter-spacing: 0.04em;
        }
        
        .sidebar-user {
          padding: 6px 10px;
          background: rgba(38, 48, 78, 0.6);
          border-radius: 16px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .sidebar-user:hover {
          background: rgba(38, 48, 78, 0.8);
          color: #ffffff;
        }
        
        /* Tooltip enhancement */
        .sidebar-btn:hover::after {
          content: attr(title);
          position: absolute;
          left: 60px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.7em;
          white-space: nowrap;
          z-index: 1000;
          opacity: 0;
          animation: fadeIn 0.2s ease forwards;
        }
        
        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }
      `}</style>
    </aside>
  );
};

export default ChatSidebar;