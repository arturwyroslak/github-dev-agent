import React from "react";
import { FaComments, FaGithub, FaCog, FaPlusCircle } from "react-icons/fa";
import "./ChatSidebar.css";

interface SidebarProps {
  onNewChat: () => void;
  selected: string;
}

const ChatSidebar: React.FC<SidebarProps> = ({ onNewChat, selected }) => (
  <aside className="sidebar">
    <div className="sidebar-top">
      <div className="logo">🟣</div>
      <button className="sidebar-btn" title="Nowy Chat" onClick={onNewChat}>
        <FaPlusCircle />
      </button>
    </div>
    <nav>
      <button className={`sidebar-btn ${selected === "chat" ? "active" : ""}`} title="Chat">
        <FaComments />
      </button>
      <button className="sidebar-btn" title="Twoje repozytoria">
        <FaGithub />
      </button>
      <button className="sidebar-btn" title="Ustawienia">
        <FaCog />
      </button>
    </nav>
    <div className="sidebar-bottom">
      <span className="sidebar-user">user</span>
    </div>
  </aside>
);

export default ChatSidebar;