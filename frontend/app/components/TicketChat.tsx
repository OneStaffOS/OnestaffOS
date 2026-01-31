'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import styles from './TicketChat.module.css';

interface TicketChatProps {
  ticketId: string;
  ticketNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TicketChat({ ticketId, ticketNumber, isOpen, onClose }: TicketChatProps) {
  const {
    isConnected,
    currentTicketMessages,
    typingUsers,
    joinTicketRoom,
    leaveTicketRoom,
    sendMessage,
    setTyping,
    markMessagesAsRead,
  } = useSocket();

  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Join/leave room when chat opens/closes
  useEffect(() => {
    if (isOpen && ticketId) {
      // Attempt to join even if not connected - socket will queue the event
      // or it will join when connected
      joinTicketRoom(ticketId);
    }

    return () => {
      if (ticketId) {
        leaveTicketRoom(ticketId);
      }
    };
  }, [isOpen, ticketId, joinTicketRoom, leaveTicketRoom]);

  // Re-join room when connection is restored
  useEffect(() => {
    if (isConnected && isOpen && ticketId) {
      joinTicketRoom(ticketId);
    }
  }, [isConnected, isOpen, ticketId, joinTicketRoom]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTicketMessages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (isOpen && currentTicketMessages.length > 0) {
      markMessagesAsRead(ticketId);
    }
  }, [isOpen, currentTicketMessages.length, ticketId, markMessagesAsRead]);

  // Handle typing indicator
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      setTyping(ticketId, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTyping(ticketId, false);
    }, 2000);
  }, [isTyping, ticketId, setTyping]);

  const handleSendMessage = useCallback(() => {
    if (!message.trim()) return;

    sendMessage(ticketId, message.trim());
    setMessage('');
    setIsTyping(false);
    setTyping(ticketId, false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [message, ticketId, sendMessage, setTyping]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = currentTicketMessages.reduce((groups: any, msg) => {
    const date = formatDate(msg.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
    return groups;
  }, {});

  const currentTypingUsers = typingUsers.filter((u) => u.ticketId === ticketId);

  if (!isOpen) return null;

  return (
    <div className={styles.chatOverlay}>
      <div className={styles.chatContainer}>
        {/* Header */}
        <div className={styles.chatHeader}>
          <div className={styles.headerInfo}>
            <h3>💬 Live Chat</h3>
            <span className={styles.ticketNumber}>{ticketNumber}</span>
          </div>
          <div className={styles.headerActions}>
            <span className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Messages */}
        <div className={styles.messagesContainer}>
          {Object.entries(groupedMessages).map(([date, msgs]: [string, any]) => (
            <div key={date}>
              <div className={styles.dateSeparator}>
                <span>{date}</span>
              </div>
              {msgs.map((msg: any) => (
                <div
                  key={msg._id}
                  className={`${styles.message} ${msg.senderType === 'user' ? styles.userMessage : styles.agentMessage}`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.senderName}>
                      {msg.senderType === 'agent' ? '🎧 ' : '👤 '}
                      {msg.senderName}
                    </span>
                    <span className={styles.messageTime}>{formatTime(msg.createdAt)}</span>
                  </div>
                  <div className={styles.messageContent}>{msg.message}</div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={styles.attachments}>
                      {msg.attachments.map((att: string, idx: number) => (
                        <a key={idx} href={att} target="_blank" rel="noopener noreferrer">
                          📎 Attachment {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {currentTicketMessages.length === 0 && (
            <div className={styles.emptyChat}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}

          {/* Typing indicator */}
          {currentTypingUsers.length > 0 && (
            <div className={styles.typingIndicator}>
              <span className={styles.typingDots}>
                <span></span>
                <span></span>
                <span></span>
              </span>
              <span>
                {currentTypingUsers.map((u) => u.userName).join(', ')} {currentTypingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={styles.inputContainer}>
          <textarea
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message... (Press Enter to send)"
            rows={2}
            disabled={!isConnected}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSendMessage}
            disabled={!message.trim() || !isConnected}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
