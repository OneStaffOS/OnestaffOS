"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useRouter } from 'next/navigation';
import styles from './NotificationBell.module.css';

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshNotifications,
  } = useSocket();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refreshNotifications();
    }
  }, [isOpen, refreshNotifications]);

  const handleNotificationClick = async (notification: any) => {
    await markNotificationAsRead(notification._id);
    
    // Navigate to the ticket
    if (notification.ticketId) {
      router.push(`/support?ticket=${notification.ticketId}`);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllNotificationsAsRead();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TICKET_CREATED': return '🎫';
      case 'TICKET_ASSIGNED': return '👤';
      case 'TICKET_UPDATED': return '📝';
      case 'TICKET_COMMENTED': return '💬';
      case 'TICKET_RESOLVED': return '✅';
      case 'TICKET_CLOSED': return '🔒';
      case 'NEW_MESSAGE': return '💬';
      case 'WORKFLOW_UPDATED': return '📋';
      default: return '🔔';
    }
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        data-navbar-button
      >
        <span className={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button
                className={styles.markAllRead}
                onClick={handleMarkAllRead}
                data-navbar-button
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className={styles.notificationList}>
            {notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <span>🔔</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notification) => (
                <div
                  key={notification._id}
                  className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationTitle}>
                      {notification.title}
                    </div>
                    <div className={styles.notificationMessage}>
                      {notification.message}
                    </div>
                    <div className={styles.notificationMeta}>
                      <span className={styles.ticketNumber}>
                        {notification.ticketNumber}
                      </span>
                      <span className={styles.time}>
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <span className={styles.unreadDot}></span>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 20 && (
            <div className={styles.dropdownFooter}>
              <button onClick={() => router.push('/support')} data-navbar-button>
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}