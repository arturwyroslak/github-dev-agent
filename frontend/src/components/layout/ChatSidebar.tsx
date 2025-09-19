import React from "react";

interface SidebarProps {
  onNewChat: () => void;
  selected: string;
}

const ChatSidebar: React.FC<SidebarProps> = ({ onNewChat, selected }) => (
  <aside className="sidebar">
    <div className="sidebar-top">
      <div className="logo">🟣</div>
      <button className="sidebar-btn" title="Nowy Chat" onClick={onNewChat}>
        ➕
      </button>
    </div>
    <nav>
      <button className={`sidebar-btn ${selected === "chat" ? "active" : ""}`} title="Chat">
        💬
      </button>
      <button className="sidebar-btn" title="Twoje repozytoria">
        📦
      </button>
      <button className="sidebar-btn" title="Ustawienia">
        ⚙️
      </button>
    </nav>
    <div className="sidebar-bottom">
      <span className="sidebar-user">dev</span>
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
      }
      .sidebar-btn {
        background: none;
        border: none;
        color: #b1b9cf;
        margin: 11px 0;
        font-size: 1.6em;
        padding: 7px;
        cursor: pointer;
        border-radius: 10px;
        transition: background 0.18s, color 0.13s, transform 0.12s;
      }
      .sidebar-btn.active, .sidebar-btn:hover {
        color: #f6a8ff;
        background: #473a8440;
        transform: scale(1.09);
      }
      .sidebar-bottom {
        margin-top: auto;
        padding-bottom: 5px;
        color: #88aacc;
        font-size: 0.8em;
        letter-spacing: 0.04em;
      }
      .sidebar-user {
        padding: 5px 12px;
        background: #26304e9c;
        border-radius: 16px;
      }
    `}</style>
  </aside>
);

export default ChatSidebar;