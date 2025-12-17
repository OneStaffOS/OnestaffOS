/**
 * Public Clock-In/Out Kiosk Page
 * Route: /clock-kiosk
 * 
 * US-5: Clock-In/Out using employee ID
 * This page allows employees to clock in/out using their employee number
 * without needing to log into the system. Designed for physical kiosks,
 * time clock stations, or external attendance systems.
 */

'use client';

import { useState } from 'react';
import axios from '@/lib/axios-config';
import styles from './kiosk.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function ClockKioskPage() {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastPunch, setLastPunch] = useState<{ name: string; type: string; time: string } | null>(null);

  const handleClock = async (type: 'IN' | 'OUT') => {
    if (!employeeNumber.trim()) {
      setMessage({ type: 'error', text: 'Please enter your employee number' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const response = await axios.post('/time-management/attendance/clock-by-id', {
        employeeNumber: employeeNumber.trim(),
        type,
        time: new Date().toISOString(),
      });

      const now = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });

      setMessage({
        type: 'success',
        text: `Successfully clocked ${type === 'IN' ? 'IN' : 'OUT'}`,
      });

      setLastPunch({
        name: employeeNumber,
        type,
        time: now,
      });

      // Clear the input after 3 seconds
      setTimeout(() => {
        setEmployeeNumber('');
        setMessage(null);
      }, 3000);

    } catch (err: any) {
      console.error('Clock punch failed:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to process punch';
      setMessage({ type: 'error', text: errorMsg });
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setMessage(null);
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'IN' | 'OUT') => {
    if (e.key === 'Enter') {
      handleClock(type);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.kioskCard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>🕐</div>
            <h1 className={styles.logoText}>OneStaff Time Clock</h1>
          </div>
          <div className={styles.datetime}>
            <div className={styles.time}>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          <div className={styles.instructionText}>
            Enter your Employee Number
          </div>

          <input
            type="text"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleClock('IN')}
            placeholder="Employee Number"
            className={styles.input}
            autoFocus
            disabled={loading}
          />

          {/* Action Buttons */}
          <div className={styles.buttonGroup}>
            <button
              onClick={() => handleClock('IN')}
              disabled={loading || !employeeNumber.trim()}
              className={`${styles.button} ${styles.buttonIn}`}
            >
              <span className={styles.buttonIcon}>▶</span>
              <span className={styles.buttonText}>Clock IN</span>
            </button>

            <button
              onClick={() => handleClock('OUT')}
              disabled={loading || !employeeNumber.trim()}
              className={`${styles.button} ${styles.buttonOut}`}
            >
              <span className={styles.buttonIcon}>⏸</span>
              <span className={styles.buttonText}>Clock OUT</span>
            </button>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
              <span className={styles.messageIcon}>
                {message.type === 'success' ? '✓' : '✕'}
              </span>
              <span>{message.text}</span>
            </div>
          )}

          {/* Last Punch Info */}
          {lastPunch && !message && (
            <div className={styles.lastPunch}>
              <div className={styles.lastPunchLabel}>Last Punch:</div>
              <div className={styles.lastPunchInfo}>
                Employee {lastPunch.name} clocked {lastPunch.type} at {lastPunch.time}
              </div>
            </div>
          )}

          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <span>Processing...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerText}>
            For assistance, contact HR or your supervisor
          </div>
        </div>
      </div>
    </div>
  );
}
