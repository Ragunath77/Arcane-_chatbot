import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import {
  signInWithGoogle,
  signOutUser,
  listenToAuthState,
} from "./auth";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { FiMoreVertical } from "react-icons/fi";

function App() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState({});
  const chatBoxRef = useRef(null);
  const localThreadsRef = useRef({}); // for guest user messages

  // Load user & threads
  useEffect(() => {
    const unsubscribe = listenToAuthState((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const threadsRef = collection(db, "chats", currentUser.uid, "threads");
        return onSnapshot(threadsRef, (snapshot) => {
          const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
          setThreads(data);
          if (!currentThreadId && data.length > 0) {
            setCurrentThreadId(data[0].id);
          }
        });
      } else {
        setThreads([]);
        setChat([]);
        localThreadsRef.current = {}; // clear guest messages
      }
    });
    return () => unsubscribe();
  }, [currentThreadId]);

  // Load messages
  useEffect(() => {
    if (user && currentThreadId) {
      const messagesRef = collection(db, "chats", user.uid, "threads", currentThreadId, "messages");
      const q = query(messagesRef, orderBy("createdAt"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map((doc) => doc.data());
        setChat(messages);
        autoRename(messages);
      });
      return () => unsubscribe();
    } else if (!user && currentThreadId) {
      const messages = localThreadsRef.current[currentThreadId] || [];
      setChat(messages);
    } else {
      setChat([]);
    }
  }, [user, currentThreadId]);

  const showError = (msg, duration = 4000) => {
    if (!errorMsg) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), duration);
    }
  };

  const createNewThread = async () => {
    const id = uuidv4();
    if (user) {
      const threadRef = doc(db, "chats", user.uid, "threads", id);
      await setDoc(threadRef, {
        name: "New Chat",
        createdAt: new Date(),
      });
    } else {
      localThreadsRef.current[id] = [];
      setThreads(prev => [{ id, name: "New Chat", createdAt: new Date() }, ...prev]);
    }
    setCurrentThreadId(id);
  };

  const deleteThread = async (id) => {
    const confirmDelete = window.confirm("Delete this thread?");
    if (!confirmDelete) return;
    if (user) {
      const messagesRef = collection(db, "chats", user.uid, "threads", id, "messages");
      const snapshot = await getDocs(messagesRef);
      await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
      await deleteDoc(doc(db, "chats", user.uid, "threads", id));
    } else {
      delete localThreadsRef.current[id];
      setThreads(prev => prev.filter(t => t.id !== id));
    }
    if (id === currentThreadId) {
      setCurrentThreadId(null);
      setChat([]);
    }
  };

  const autoRename = async (messages) => {
    if (!user) return;
    if (messages.length === 2 && messages[1].role === "user") {
      const title = messages[1].content.trim().slice(0, 25) || "New Chat";
      const threadRef = doc(db, "chats", user.uid, "threads", currentThreadId);
      await updateDoc(threadRef, { name: title });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentThreadId) return;

    const userMessage = {
      role: "user",
      content: input,
      createdAt: new Date(),
    };

    const updatedChat = [...chat, userMessage];
    const recentChat = updatedChat.slice(-8).map(({ role, content }) => ({ role, content }));

    setInput("");
    setLoading(true);
    setChat(updatedChat);

    if (user) {
      const messagesRef = collection(db, "chats", user.uid, "threads", currentThreadId, "messages");
      await addDoc(messagesRef, userMessage);
    } else {
      localThreadsRef.current[currentThreadId] = updatedChat;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: recentChat }),
      });
      const data = await res.json();
      const aiMessage = {
        role: "assistant",
        content: data.response || "No response.",
        createdAt: new Date(),
      };

      const finalChat = [...updatedChat, aiMessage];
      setChat(finalChat);

      if (user) {
        const messagesRef = collection(db, "chats", user.uid, "threads", currentThreadId, "messages");
        await addDoc(messagesRef, aiMessage);
      } else {
        localThreadsRef.current[currentThreadId] = finalChat;
      }

      if (!user && threads.find(t => t.id === currentThreadId)?.name === "New Chat") {
        const newName = userMessage.content.slice(0, 25);
        setThreads(prev => prev.map(t => t.id === currentThreadId ? { ...t, name: newName } : t));
      }
    } catch (err) {
      showError("You're sending messages too quickly.");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (!currentThreadId) return;
    if (user) {
      const ref = collection(db, "chats", user.uid, "threads", currentThreadId, "messages");
      const messages = await getDocs(ref);
      messages.forEach((msg) => deleteDoc(doc(ref, msg.id)));
    } else {
      localThreadsRef.current[currentThreadId] = [];
    }
    setChat([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserAvatar = () => user?.photoURL || "/user.png";

  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, loading]);

  return (
    <div className={`App ${darkMode ? "dark-mode" : ""}`}>
      {errorMsg && <div className="error-banner">⚠️ {errorMsg}</div>}

      {!sidebarOpen && (
        <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
      )}

      <div className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <div className="bot-name-container">
            <div className="bot-name">Arcane</div>
            <div className="bot-subtitle">AI Assistant</div>
          </div>
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "«" : "»"}
          </button>
        </div>

        <div className="chat-list">
          <button onClick={createNewThread} className="new-chat-btn">+ New Chat</button>
          {threads.map((t) => (
            <div key={t.id} className={`chat-thread ${t.id === currentThreadId ? "active" : ""}`}>
              <div onClick={() => setCurrentThreadId(t.id)} className="thread-title">
                {t.name || "Untitled"}
              </div>
              <div style={{ position: "relative" }}>
                <FiMoreVertical
                  className="thread-menu"
                  onClick={() => setShowDeleteMenu(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                  style={{ cursor: "pointer", marginLeft: "auto" }}
                />
                {showDeleteMenu[t.id] && (
                  <div
                    className="delete-confirm"
                    onClick={() => {
                      deleteThread(t.id);
                      setShowDeleteMenu(prev => ({ ...prev, [t.id]: false }));
                    }}
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      background: "white",
                      border: "1px solid #ccc",
                      padding: "4px 8px",
                      cursor: "pointer",
                      zIndex: 1,
                    }}
                  >
                    Delete
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button onClick={() => setDarkMode(!darkMode)} className="mode-btn">
            {darkMode ? "🌞 Light" : "🌙 Dark"}
          </button>
          {!user ? (
            <button onClick={signInWithGoogle} className="google-btn">
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
              <span>Sign in with Google</span>
            </button>
          ) : (
            <button onClick={signOutUser} className="google-btn">
              <img
                src={getUserAvatar()}
                alt="User"
                onError={(e) => (e.target.src = "/user.png")}
              />
              <span>{user.displayName}</span>
            </button>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="chat-box" ref={chatBoxRef}>
          {chat.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              <img src={msg.role === "user" ? getUserAvatar() : "/bot.png"} className="avatar" alt={msg.role} />
              <div className="bubble">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="msg assistant">
              <img src="/bot.png" className="avatar" alt="typing..." />
              <div className="bubble typing"><span>.</span><span>.</span><span>.</span></div>
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
          <button onClick={sendMessage} disabled={loading || !currentThreadId} className="send-btn">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
