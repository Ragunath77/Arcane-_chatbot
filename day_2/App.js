import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const chatBoxRef = useRef(null);

  const showError = (msg, duration = 4000) => {
    if (!errorMsg) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), duration);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const updatedChat = [...chat, userMessage];
    const recentChat = updatedChat.slice(-8);

    setChat(updatedChat);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: recentChat }),
      });

      const isJSON = res.headers.get("content-type")?.includes("application/json");
      const data = isJSON ? await res.json() : {};

      if (!res.ok) {
        const rawMessage = data?.error || "";
        const isRateLimit = rawMessage.toLowerCase().includes("rate limit");

        if (res.status === 429 || isRateLimit) {
          showError("You're sending messages too quickly. Please wait a moment.");
        } else {
          showError("Something went wrong. Please try again shortly.");
        }
        return;
      }

      const aiReply = data.response || "No response from AI.";
      const newChat = [...updatedChat, { role: "assistant", content: aiReply }];
      setChat(newChat);
      localStorage.setItem("chatHistory", JSON.stringify(newChat));
    } catch (err) {
      showError("You're sending messages too quickly. Please wait a moment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatBoxRef.current?.scrollTo({
      top: chatBoxRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat, loading]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setChat([]);
    localStorage.removeItem("chatHistory");
  };

  return (
    <div className={`App ${darkMode ? "dark-mode" : ""}`}>
      {errorMsg && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {!sidebarOpen && (
        <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
      )}

      <div className={`sidebar ${sidebarOpen ? "" : "collapsed"} ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          {sidebarOpen && (
            <div className="bot-name-container">
              <div className="bot-name">Arcane</div>
              <div className="bot-subtitle">AI Assistant</div>
            </div>
          )}
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "«" : "»"}
          </button>
        </div>

        <div className="sidebar-footer">
          <button onClick={clearChat} className="clear-btn">
            🗑️ <span className="btn-label">Clear Chat</span>
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="mode-btn">
            {darkMode ? "🌞" : "🌙"}{" "}
            <span className="btn-label">{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="chat-box" ref={chatBoxRef}>
          {chat.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              <img
                src={msg.role === "user" ? "/user.png" : "/bot.png"}
                alt={msg.role}
                className="avatar"
              />
              <div className="bubble">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="msg assistant">
              <img src="/bot.png" alt="AI" className="avatar" />
              <div className="bubble typing">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            </div>
          )}
        </div>

        <div className="input-area">
          <textarea
            rows="3"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message and press Enter..."
          />
          <button onClick={sendMessage} disabled={loading} className="send-btn">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
