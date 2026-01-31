"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface ChatMessage {
  _id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'agent' | 'system';
  message: string;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
}

interface Notification {
  _id: string;
  ticketId: string;
  ticketNumber: string;
  type: string;
  title: string;
  message: string;
  triggeredByName?: string;
  isRead: boolean;
  createdAt: string;
}

interface TypingUser {
  ticketId: string;
  userId: string;
  userName: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  unreadCount: number;
  currentTicketMessages: ChatMessage[];
  typingUsers: TypingUser[];
  joinTicketRoom: (ticketId: string) => void;
  leaveTicketRoom: (ticketId: string) => void;
  sendMessage: (ticketId: string, message: string, attachments?: string[]) => void;
  setTyping: (ticketId: string, isTyping: boolean) => void;
  markMessagesAsRead: (ticketId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  refreshNotifications: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTicketMessages, setCurrentTicketMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Socket.io runs on the same host as the backend API
    const rawSocketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const socketBase = rawSocketUrl
      .replace(/\/api\/v1\/?$/i, '')
      .replace(/\/api\/?$/i, '');

    const newSocket = io(`${socketBase}/tickets`, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('connect_error', () => setIsConnected(false));

    // Notification handlers
    newSocket.on('notification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    newSocket.on('notification_count', ({ count }) => {
      setUnreadCount(count);
    });

    // Chat handlers
    newSocket.on('chat_history', ({ ticketId, messages }) => {
      setCurrentTicketMessages(messages);
    });

    newSocket.on('new_message', ({ ticketId, message }) => {
      setCurrentTicketMessages((prev) => [...prev, message]);
    });

    newSocket.on('user_typing', ({ ticketId, userId, userName, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          // Add user if not already typing
          if (!prev.find((u) => u.userId === userId && u.ticketId === ticketId)) {
            return [...prev, { ticketId, userId, userName }];
          }
        } else {
          // Remove user
          return prev.filter((u) => !(u.userId === userId && u.ticketId === ticketId));
        }
        return prev;
      });
    });

    newSocket.on('messages_read', ({ ticketId }) => {
      setCurrentTicketMessages((prev) =>
        prev.map((msg) => ({ ...msg, isRead: true }))
      );
    });

    newSocket.on('user_joined', ({ ticketId, userId, userName }) => {
    });

    newSocket.on('user_left', ({ ticketId, userId, userName }) => {
      // Remove from typing users
      setTypingUsers((prev) =>
        prev.filter((u) => !(u.userId === userId && u.ticketId === ticketId))
      );
    });

    newSocket.on('ticket_updated', (update) => {
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  const joinTicketRoom = useCallback((ticketId: string) => {
    if (socket) {
      setCurrentTicketMessages([]);
      setTypingUsers([]);
      socket.emit('join_ticket', { ticketId });
    } else {
      console.error('Cannot join room - socket not available');
    }
  }, [socket, isConnected]);

  const leaveTicketRoom = useCallback((ticketId: string) => {
    if (socket) {
      socket.emit('leave_ticket', { ticketId });
      setCurrentTicketMessages([]);
      setTypingUsers([]);
    }
  }, [socket]);

  const sendMessage = useCallback((ticketId: string, message: string, attachments?: string[]) => {
    if (socket && isConnected) {
      socket.emit('send_message', { ticketId, message, attachments });
    } else {
      console.error('Cannot send message - not connected');
    }
  }, [socket, isConnected]);

  const setTyping = useCallback((ticketId: string, isTyping: boolean) => {
    if (socket && isConnected) {
      socket.emit('typing', { ticketId, isTyping });
    }
  }, [socket, isConnected]);

  const markMessagesAsRead = useCallback((ticketId: string) => {
    if (socket && isConnected) {
      socket.emit('mark_read', { ticketId });
    }
  }, [socket, isConnected]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/chat/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/chat/notifications/read-all`, {
        method: 'PATCH',
        credentials: 'include',
      });
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/chat/notifications?limit=50`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Fetch notifications on mount
  useEffect(() => {
    if (isAuthenticated) {
      refreshNotifications();
    }
  }, [isAuthenticated, refreshNotifications]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        unreadCount,
        currentTicketMessages,
        typingUsers,
        joinTicketRoom,
        leaveTicketRoom,
        sendMessage,
        setTyping,
        markMessagesAsRead,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}