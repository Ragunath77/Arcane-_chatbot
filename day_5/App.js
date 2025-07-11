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
import { FiMoreVertical, FiLogOut, FiEdit2, FiCheck, FiX, FiTrash2 } from "react-icons/fi";

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
  const [showDropdownMenu, setShowDropdownMenu] = useState({});
  const [editingThread, setEditingThread] = useState(null);
  const [editingName, setEditingName] = useState("");
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
          // Sort by lastActivity (most recent first), fallback to createdAt
          data.sort((a, b) => {
            const aTime = a.lastActivity?.toMillis() || a.createdAt?.toMillis() || 0;
            const bTime = b.lastActivity?.toMillis() || b.createdAt?.toMillis() || 0;
            return bTime - aTime;
          });
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
    const now = new Date();
    if (user) {
      const threadRef = doc(db, "chats", user.uid, "threads", id);
      await setDoc(threadRef, {
        name: "New Chat",
        createdAt: now,
        lastActivity: now,
        autoRenamed: false, // Track if auto-rename has been done
      });
    } else {
      localThreadsRef.current[id] = [];
      setThreads(prev => [{ id, name: "New Chat", createdAt: now, lastActivity: now, autoRenamed: false }, ...prev]);
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

  const updateThreadActivity = async (threadId) => {
    if (!threadId) return;
    
    const now = new Date();
    if (user) {
      const threadRef = doc(db, "chats", user.uid, "threads", threadId);
      await updateDoc(threadRef, { 
        lastActivity: now
      });
    } else {
      setThreads(prev => prev.map(t => 
        t.id === threadId 
          ? { ...t, lastActivity: now }
          : t
      ));
    }
  };

  const generateChatTitle = async (messages) => {
    try {
      // Get the conversation content (first few messages)
      const conversationContent = messages
        .slice(0, 4) // Get first 4 messages max
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Based on this conversation, generate a short, descriptive title (max 4-5 words) that captures the main topic or question being discussed:\n\n${conversationContent}\n\nRespond with only the title, no explanation.`
            }
          ]
        }),
      });

      const data = await response.json();
      return data.response?.trim() || "Chat";
    } catch (error) {
      console.error("Error generating title:", error);
      return "Chat";
    }
  };

  const autoRename = async (messages) => {
    if (!currentThreadId) return;
    
    // Find current thread
    const currentThread = user 
      ? threads.find(t => t.id === currentThreadId)
      : threads.find(t => t.id === currentThreadId);
    
    if (!currentThread || currentThread.autoRenamed) return;

    // Check if we have enough content (at least 30 characters in user messages)
    const userMessages = messages.filter(msg => msg.role === "user");
    const totalUserContent = userMessages.reduce((total, msg) => total + msg.content.length, 0);
    
    if (totalUserContent >= 30 && messages.length >= 2) {
      try {
        const newTitle = await generateChatTitle(messages);
        
        if (user) {
          const threadRef = doc(db, "chats", user.uid, "threads", currentThreadId);
          await updateDoc(threadRef, { 
            name: newTitle,
            autoRenamed: true,
            // Don't update lastActivity during auto-rename to preserve sort order
          });
        } else {
          setThreads(prev => prev.map(t => 
            t.id === currentThreadId 
              ? { ...t, name: newTitle, autoRenamed: true }
              : t
          ));
        }
      } catch (error) {
        console.error("Error auto-renaming thread:", error);
      }
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

    // Update thread activity when sending a message
    await updateThreadActivity(currentThreadId);

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

      // Auto-rename after AI response (but don't update lastActivity)
      await autoRename(finalChat);

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

  const handleThreadClick = (threadId) => {
    setCurrentThreadId(threadId);
    setShowDropdownMenu({}); // Close any open dropdown menus
    setEditingThread(null); // Close any editing
  };

  const handleDropdownClick = (e, threadId) => {
    e.stopPropagation(); // Prevent thread selection when clicking dropdown
    setShowDropdownMenu(prev => ({ ...prev, [threadId]: !prev[threadId] }));
  };

  const handleDeleteClick = (e, threadId) => {
    e.stopPropagation(); // Prevent thread selection when clicking delete
    deleteThread(threadId);
    setShowDropdownMenu(prev => ({ ...prev, [threadId]: false }));
  };

  const handleEditClick = (e, threadId, currentName) => {
    e.stopPropagation();
    setEditingThread(threadId);
    setEditingName(currentName);
    setShowDropdownMenu({}); // Close dropdown menu
  };

  const handleEditSave = async (e, threadId) => {
    e.stopPropagation();
    if (!editingName.trim()) return;

    if (user) {
      const threadRef = doc(db, "chats", user.uid, "threads", threadId);
      await updateDoc(threadRef, { 
        name: editingName.trim(),
        // Don't update lastActivity during manual rename
      });
    } else {
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, name: editingName.trim() } : t
      ));
    }
    
    setEditingThread(null);
    setEditingName("");
  };

  const handleEditCancel = (e) => {
    e.stopPropagation();
    setEditingThread(null);
    setEditingName("");
  };

  const handleEditKeyDown = (e, threadId) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditSave(e, threadId);
    } else if (e.key === "Escape") {
      handleEditCancel(e);
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

        <div className="new-chat-section">
          <button onClick={createNewThread} className="new-chat-btn">
            <span className="btn-text">+ New Chat</span>
            <span className="btn-icon">+</span>
          </button>
        </div>

        <div className="chat-list">
          {threads.map((t) => (
            <div 
              key={t.id} 
              className={`chat-thread ${t.id === currentThreadId ? "active" : ""}`}
              onClick={() => handleThreadClick(t.id)}
            >
              <div className="thread-content">
                {editingThread === t.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, t.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="thread-edit-input"
                    autoFocus
                  />
                ) : (
                  <div className="thread-name">
                    {t.name || "Untitled"}
                  </div>
                )}
              </div>
              <div className="thread-actions">
                {editingThread === t.id ? (
                  <div className="edit-actions">
                    <FiCheck
                      className="edit-save"
                      onClick={(e) => handleEditSave(e, t.id)}
                    />
                    <FiX
                      className="edit-cancel"
                      onClick={handleEditCancel}
                    />
                  </div>
                ) : (
                  <div className="dropdown-container">
                    <FiMoreVertical
                      className="dropdown-trigger"
                      onClick={(e) => handleDropdownClick(e, t.id)}
                    />
                    {showDropdownMenu[t.id] && (
                      <div className="dropdown-menu">
                        <div
                          className="dropdown-item"
                          onClick={(e) => handleEditClick(e, t.id, t.name)}
                        >
                          <FiEdit2 className="dropdown-icon" />
                          Rename
                        </div>
                        <div
                          className="dropdown-item delete-item"
                          onClick={(e) => handleDeleteClick(e, t.id)}
                        >
                          <FiTrash2 className="dropdown-icon" />
                          Delete
                        </div>
                      </div>
                    )}
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
            <button onClick={signOutUser} className="logout-btn">
              <FiLogOut />
              <span>Log out</span>
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