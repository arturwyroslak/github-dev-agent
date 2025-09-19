import React, { useState } from "react";
import SimpleChatInterface from "./components/chat/SimpleChatInterface";
import ChatSidebar from "./components/layout/ChatSidebar";

function App() {
  const [sidebarSelected, setSidebarSelected] = useState("chat");

  const startNewChat = () => {
    console.log('Starting new chat...');
    // Clear chat messages and reload
    window.location.reload();
  };

  const handleNavClick = (section: string) => {
    console.log(`Navigation clicked: ${section}`);
    setSidebarSelected(section);
    
    // Handle different sections
    switch (section) {
      case 'chat':
        // Already in chat - do nothing
        break;
      case 'repos':
        // Future: Navigate to repositories view
        console.log('Repositories view - Coming soon!');
        break;
      case 'settings':
        // Future: Navigate to settings view
        console.log('Settings view - Coming soon!');
        break;
      default:
        break;
    }
  };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "linear-gradient(135deg, #191924 0%, #201946 100%)",
      fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif"
    }}>
      <ChatSidebar 
        onNewChat={startNewChat} 
        selected={sidebarSelected} 
        onNavClick={handleNavClick}
      />
      
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {sidebarSelected === 'chat' && <SimpleChatInterface />}
        
        {sidebarSelected === 'repos' && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '1.2em'
          }}>
            🚧 Sekcja repozytoriów w przygotowaniu...
          </div>
        )}
        
        {sidebarSelected === 'settings' && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '1.2em'
          }}>
            ⚙️ Ustawienia w przygotowaniu...
          </div>
        )}
      </div>
    </div>
  );
}

export default App;