"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import styles from "./Messages.module.css";
import { getChats, getOrCreateChat, getMessages, saveMessage, markChatAsRead } from "../actions/messages";
import { getUserProfile } from "../actions/users";
import { useSocketStore } from "../store/useSocketStore";
import { db } from "../lib/firebase/firebase-client";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function MessagesClient({ currentUser }) {
  const searchParams = useSearchParams();
  const socket = useSocketStore((s) => s.socket);
  const isConnected = useSocketStore((s) => s.isConnected);
  const onlineUsers = useSocketStore((s) => s.onlineUsers);
  const typingUsers = useSocketStore((s) => s.typingUsers);
  const addTypingUser = useSocketStore((s) => s.addTypingUser);
  const removeTypingUser = useSocketStore((s) => s.removeTypingUser);

  const initialUserId = searchParams.get("userId");

  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef(null);
  const currentRoomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const selectedChatRef = useRef(null);

  // Keep ref in sync with state for socket event handlers
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  // ========== AUTO-SCROLL ==========
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ========== LOAD INBOX ==========
  useEffect(() => {
    (async () => {
      setIsLoadingChats(true);
      const res = await getChats();
      if (res.chats) setConversations(res.chats);
      setIsLoadingChats(false);
    })();
  }, []);

  // ========== FIRESTORE REAL-TIME INBOX (safety net alongside Socket.IO) ==========
  useEffect(() => {
    if (!currentUser?.id || isLoadingChats) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.id)
    );

    let isInitialSnapshot = true;

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      // Skip the first snapshot — we already loaded via getChats()
      if (isInitialSnapshot) {
        isInitialSnapshot = false;
        return;
      }

      snapshot.docChanges().forEach(async (change) => {
        const data = change.doc.data();
        const chatId = change.doc.id;
        const otherUserId = data.participants.find((id) => id !== currentUser.id);

        if (change.type === "modified") {
          // Update existing conversation metadata in real-time
          setConversations((prev) =>
            prev
              .map((c) =>
                c.id === chatId
                  ? {
                      ...c,
                      lastMessage: data.lastMessage || "",
                      lastMessageAt: data.lastMessageAt?.toMillis() || 0,
                      unreadCount: selectedChatRef.current?.id === chatId ? 0 : (data.unreadCount?.[currentUser.id] || 0),
                    }
                  : c
              )
              .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
          );
        } else if (change.type === "added") {
          // New chat from another user — fetch their profile and add
          setConversations((prev) => {
            if (prev.some((c) => c.id === chatId)) return prev;
            return prev; // Will be added below after profile fetch
          });

          const userRes = await getUserProfile(otherUserId);
          if (userRes.user) {
            const newConv = {
              id: chatId,
              otherUserId,
              fullName: userRes.user.fullName || userRes.user.username,
              username: userRes.user.username,
              profilePic: userRes.user.profilePic || null,
              lastMessage: data.lastMessage || "",
              lastMessageAt: data.lastMessageAt?.toMillis() || 0,
              unreadCount: data.unreadCount?.[currentUser.id] || 0,
            };
            setConversations((prev) => {
              if (prev.some((c) => c.id === chatId)) return prev;
              return [...prev, newConv].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser?.id, isLoadingChats]);

  // ========== SOCKET EVENT LISTENERS ==========
  useEffect(() => {
    if (!socket) return;

    const onReceiveMessage = (data) => {
      const current = selectedChatRef.current;

      // Dedup: ignore if we already have this message ID
      if (current && data.chatId === current.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, { ...data, status: "sent" }];
        });
        // Auto mark as read since we're viewing this chat
        markChatAsRead(data.chatId, data.id);
        socket.emit("mark_read", { chatId: data.chatId });
      }

      // Update sidebar preview
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === data.chatId);
        if (exists) {
          return prev.map((c) =>
            c.id === data.chatId
              ? {
                  ...c,
                  lastMessage: data.text,
                  lastMessageAt: data.createdAt,
                  unreadCount: current?.id === data.chatId ? 0 : (c.unreadCount || 0) + 1,
                }
              : c
          ).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
        }
        // New conversation from unknown user — refresh inbox
        getChats().then((res) => { if (res.chats) setConversations(res.chats); });
        return prev;
      });
    };

    const onUserTyping = ({ chatId, userId }) => addTypingUser(chatId, userId);

    const onUserStopTyping = ({ chatId, userId }) => removeTypingUser(chatId, userId);

    socket.on("receive_message", onReceiveMessage);
    socket.on("user_typing", onUserTyping);
    socket.on("user_stop_typing", onUserStopTyping);

    return () => {
      socket.off("receive_message", onReceiveMessage);
      socket.off("user_typing", onUserTyping);
      socket.off("user_stop_typing", onUserStopTyping);
    };
  }, [socket]);

  // ========== URL-BASED CHAT SELECTION ==========
  useEffect(() => {
    if (!initialUserId || isLoadingChats) return;

    const init = async () => {
      const existing = conversations.find((c) => c.otherUserId === initialUserId);
      if (existing) {
        handleSelectConversation(existing);
        return;
      }
      const chatRes = await getOrCreateChat(initialUserId);
      if (!chatRes.chatId) return;

      const userRes = await getUserProfile(initialUserId);
      if (!userRes.user) return;

      const newConv = {
        id: chatRes.chatId,
        otherUserId: initialUserId,
        fullName: userRes.user.fullName || userRes.user.username,
        username: userRes.user.username,
        profilePic: userRes.user.profilePic || null,
        lastMessage: "",
        lastMessageAt: Date.now(),
        unreadCount: 0,
      };
      setConversations((prev) => {
        if (prev.some((c) => c.otherUserId === initialUserId)) return prev;
        return [newConv, ...prev];
      });
      handleSelectConversation(newConv);
    };

    init();
  }, [initialUserId, isLoadingChats]);

  // ========== SELECT CONVERSATION ==========
  const handleSelectConversation = async (conv) => {
    // Leave previous room
    if (currentRoomRef.current && socket) {
      socket.emit("leave_chat", currentRoomRef.current);
    }

    setSelectedChat(conv);
    setIsLoadingMessages(true);
    setMessages([]);

    // Join new room
    if (socket) {
      socket.emit("join_chat", conv.id);
      currentRoomRef.current = conv.id;
    }

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set("userId", conv.otherUserId);
    window.history.pushState({}, "", url);

    // Fetch history
    const res = await getMessages(conv.id);
    if (res.messages) {
      setMessages(res.messages.map((m) => ({ ...m, status: "sent" })));

      // Mark as read (cheap: 1 write)
      const lastMsg = res.messages[res.messages.length - 1];
      if (lastMsg) {
        markChatAsRead(conv.id, lastMsg.id);
        if (socket) socket.emit("mark_read", { chatId: conv.id });
      }
    }
    setIsLoadingMessages(false);

    // Clear unread in sidebar
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  // ========== BACK TO LIST ==========
  const handleBackToList = () => {
    if (currentRoomRef.current && socket) {
      socket.emit("leave_chat", currentRoomRef.current);
      currentRoomRef.current = null;
    }
    // Stop typing if we were
    if (isTypingRef.current && socket && selectedChat) {
      socket.emit("typing_stop", { chatId: selectedChat.id });
      isTypingRef.current = false;
    }
    setSelectedChat(null);
    const url = new URL(window.location);
    url.searchParams.delete("userId");
    window.history.pushState({}, "", url);
  };

  // ========== TYPING INDICATOR (debounced, no DB) ==========
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!socket || !selectedChat) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing_start", { chatId: selectedChat.id });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing_stop", { chatId: selectedChat.id });
    }, 2000);
  };

  // ========== SEND MESSAGE ==========
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    // Stop typing indicator
    if (isTypingRef.current && socket) {
      socket.emit("typing_stop", { chatId: selectedChat.id });
      isTypingRef.current = false;
      clearTimeout(typingTimeoutRef.current);
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const messageText = newMessage.trim();
    const now = Date.now();

    // 1. Optimistic UI — status: sending
    setMessages((prev) => [...prev, { id: tempId, text: messageText, senderId: currentUser.id, createdAt: now, status: "sending" }]);
    setNewMessage("");
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedChat.id ? { ...c, lastMessage: messageText, lastMessageAt: now } : c))
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    );

    // 2. Save to Firestore FIRST (source of truth)
    const res = await saveMessage(selectedChat.id, messageText, selectedChat.otherUserId);

    if (res.error) {
      // 3a. Mark failed
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      return;
    }

    // 3b. Save succeeded — emit via socket WITH acknowledgement
    if (socket) {
      socket.emit("send_message", {
        id: res.messageId,
        chatId: selectedChat.id,
        text: messageText,
        senderId: currentUser.id,
        receiverId: selectedChat.otherUserId,
        createdAt: res.createdAt,
      }, (ack) => {
        if (!ack?.success) console.warn("Socket ack failed, message still saved to DB");
      });
    }

    // 4. Update temp ID → real ID, status → sent
    setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: res.messageId, status: "sent" } : m)));
  };

  // ========== RETRY FAILED MESSAGE ==========
  const handleRetryMessage = async (failedMsg) => {
    setMessages((prev) => prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "sending" } : m)));

    const res = await saveMessage(selectedChat.id, failedMsg.text, selectedChat.otherUserId);

    if (res.error) {
      setMessages((prev) => prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "failed" } : m)));
      return;
    }

    if (socket) {
      socket.emit("send_message", {
        id: res.messageId,
        chatId: selectedChat.id,
        text: failedMsg.text,
        senderId: currentUser.id,
        receiverId: selectedChat.otherUserId,
        createdAt: res.createdAt,
      });
    }

    setMessages((prev) => prev.map((m) => (m.id === failedMsg.id ? { ...m, id: res.messageId, status: "sent" } : m)));
  };

  // ========== DERIVED STATE ==========
  const visibleConversations = conversations.filter((c) => c.lastMessage || c.id === selectedChat?.id);
  const currentChatTyping = selectedChat ? (typingUsers[selectedChat.id] || []) : [];
  const isOtherUserOnline = selectedChat ? onlineUsers.includes(selectedChat.otherUserId) : false;

  // ========== RENDER ==========
  return (
    <div className={styles.container}>
      {/* ===== SIDEBAR ===== */}
      <div className={`${styles.sidebar} ${selectedChat ? styles.sidebarHiddenOnMobile : ""}`}>
        <div className={styles.sidebarHeader}>Messages</div>
        <div className={styles.conversationsList}>
          {isLoadingChats ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className={styles.conversationItem} style={{ borderBottom: "none" }}>
                <div className={`${styles.skeleton} ${styles.skeletonAvatar}`}></div>
                <div className={styles.conversationInfo}>
                  <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
                  <div className={`${styles.skeleton} ${styles.skeletonTextShort}`}></div>
                </div>
              </div>
            ))
          ) : visibleConversations.length > 0 ? (
            visibleConversations.map((conv) => (
              <div
                key={conv.id}
                className={`${styles.conversationItem} ${selectedChat?.id === conv.id ? styles.conversationActive : ""}`}
                onClick={() => handleSelectConversation(conv)}
              >
                <div className={styles.avatar}>
                  {conv.profilePic ? (
                    <img src={conv.profilePic} alt={conv.fullName} />
                  ) : (
                    <span>{conv.username?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.conversationInfo}>
                  <div className={styles.conversationName}>
                    {conv.fullName}
                    {onlineUsers.includes(conv.otherUserId) && <span className={styles.onlineDot}></span>}
                  </div>
                  <div className={styles.conversationPreview}>
                    {conv.lastMessage || (conv.id === selectedChat?.id ? "New conversation" : "")}
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <div className={styles.unreadBadge}>{conv.unreadCount}</div>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: 20, color: "#9ca3af", textAlign: "center" }}>No conversations yet.</div>
          )}
        </div>
      </div>

      {/* ===== CHAT AREA ===== */}
      <div className={`${styles.chatArea} ${selectedChat || initialUserId ? styles.chatAreaVisible : ""}`}>
        {selectedChat ? (
          <>
            {/* Header */}
            <div className={styles.chatHeader}>
              <button className={styles.backButton} onClick={handleBackToList}>&larr; Back</button>
              <div className={styles.avatar} style={{ width: 40, height: 40, marginRight: 10 }}>
                {selectedChat.profilePic ? (
                  <img src={selectedChat.profilePic} alt={selectedChat.fullName} />
                ) : (
                  <span>{selectedChat.username ? selectedChat.username.charAt(0).toUpperCase() : ""}</span>
                )}
              </div>
              <div>
                <div className={styles.chatHeaderName}>{selectedChat.fullName}</div>
                <div className={`${styles.chatHeaderStatus} ${isOtherUserOnline ? styles.online : ""}`}>
                  {isOtherUserOnline ? "Online" : "Offline"}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messagesList}>
              {isLoadingMessages ? (
                <>
                  <div className={`${styles.messageWrapper} ${styles.messageReceived}`}>
                    <div className={`${styles.skeleton} ${styles.skeletonBubble}`}></div>
                  </div>
                  <div className={`${styles.messageWrapper} ${styles.messageSent}`}>
                    <div className={`${styles.skeleton} ${styles.skeletonBubble}`} style={{ width: "150px" }}></div>
                  </div>
                </>
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUser.id;
                  const statusClass = msg.status === "sending" ? styles.messageSending
                    : msg.status === "failed" ? styles.messageFailed : "";

                  return (
                    <div
                      key={msg.id}
                      className={`${styles.messageWrapper} ${isMine ? styles.messageSent : styles.messageReceived} ${statusClass}`}
                    >
                      <div>
                        <div className={styles.messageBubble}>{msg.text}</div>
                        <div className={styles.messageTime}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {isMine && msg.status === "sending" && <span> · Sending</span>}
                          {isMine && msg.status === "sent" && <span> · ✓</span>}
                          {isMine && msg.status === "failed" && (
                            <button className={styles.retryButton} onClick={() => handleRetryMessage(msg)}>
                              Failed · Tap to retry
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  <p>Say hello to {selectedChat.fullName}!</p>
                </div>
              )}

              {/* Typing indicator */}
              {currentChatTyping.length > 0 && (
                <div className={styles.typingIndicator}>
                  <div className={styles.typingDots}>
                    <span></span><span></span><span></span>
                  </div>
                  typing...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className={styles.messageInputArea} onSubmit={handleSendMessage}>
              <input
                type="text"
                className={styles.messageInput}
                placeholder="Message..."
                value={newMessage}
                onChange={handleInputChange}
              />
              <button type="submit" className={styles.sendButton} disabled={!newMessage.trim()}>
                &rarr;
              </button>
            </form>
          </>
        ) : initialUserId ? (
          <div className={styles.emptyState}><p>Starting conversation...</p></div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
              <Image src="/message-icon.svg" alt="Messages" width={80} height={80} />
            </div>
            <h2>Your Messages</h2>
            <p>Select a conversation or start a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
