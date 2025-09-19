import React, { useState } from "react";
import SimpleChatInterface from "./components/chat/SimpleChatInterface";
import ChatSidebar from "./components/layout/ChatSidebar";

function App() {
  const [sidebarSelected, setSidebarSelected] = useState("chat");

  const startNewChat = () => {
    window.location.reload();
  };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "linear-gradient(135deg, #191924 0%, #201946 100%)"
    }}>
      <ChatSidebar onNewChat={startNewChat} selected={sidebarSelected} />
      <SimpleChatInterface />
    </div>
  );
}

export default App;