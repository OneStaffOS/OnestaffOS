/**
 * Security Settings Page (Route: /dashboard/employee/security)
 * Allows users to manage their MFA settings and passkeys
 * 
 * Features:
 * - View registered passkeys
 * - Register new passkeys
 * - Rename passkeys
 * - Delete passkeys
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { axios } from '@/lib/axios-config';
import { useAuth } from '@/app/context/AuthContext';
import { startRegistration, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types';
import styles from './security.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Passkey {
  id: string;
  deviceName: string;
  deviceType: string;
  createdAt: string;
  lastUsedAt: string | null;
  isActive: boolean;
}

interface PasskeyStatus {
  mfaEnabled: boolean;
  passkeyCount: number;
}

export default function SecurityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [status, setStatus] = useState<PasskeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingPasskey, setEditingPasskey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [platformAuthAvailable, setPlatformAuthAvailable] = useState(false);

  // Check WebAuthn support
  useEffect(() => {
    setWebAuthnSupported(browserSupportsWebAuthn());
    // Check if platform authenticator (Touch ID, Face ID, Windows Hello) is available
    platformAuthenticatorIsAvailable().then(setPlatformAuthAvailable).catch(() => setPlatformAuthAvailable(false));
  }, []);

  // Fetch passkeys and status
  const fetchPasskeys = useCallback(async () => {
    try {
      setLoading(true);
      const [passkeysRes, statusRes] = await Promise.all([
        axios.get('/passkeys'),
        axios.get('/passkeys/status'),
      ]);

      setPasskeys(passkeysRes.data.data || []);
      setStatus(statusRes.data.data || null);
    } catch (err: any) {
      console.error('Failed to fetch passkeys:', err);
      setError('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  // Register a new passkey
  const handleRegisterPasskey = async () => {
    if (!webAuthnSupported) {
      setError('Your browser does not support passkeys. Please use a modern browser.');
      return;
    }

    if (!platformAuthAvailable) {
      setError('No platform authenticator (Touch ID, Face ID, Windows Hello) available on this device.');
      return;
    }

    setRegistering(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: Get registration options from server
      const optionsRes = await axios.post('/passkeys/register/options', {
        deviceName: deviceName || undefined,
      });

      const { options } = optionsRes.data;

      // Step 2: Start WebAuthn registration ceremony with platform authenticator
      const credential = await startRegistration(
        options as PublicKeyCredentialCreationOptionsJSON,
      );

      // Step 3: Verify registration with server
      const verifyRes = await axios.post('/passkeys/register/verify', {
        ...credential,
        deviceName: deviceName || getDeviceDescription(),
      });

      if (verifyRes.data.verified) {
        setSuccess('Passkey registered successfully!');
        setShowRegisterModal(false);
        setDeviceName('');
        fetchPasskeys();
      } else {
        setError('Passkey registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Passkey registration error:', err);
      
      // Handle user cancellation
      if (err.name === 'NotAllowedError') {
        setError('Registration was cancelled. Please try again.');
      } else if (err.name === 'InvalidStateError') {
        setError('This passkey is already registered.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to register passkey');
      }
    } finally {
      setRegistering(false);
    }
  };

  // Get device description based on platform
  const getDeviceDescription = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'iPhone/iPad';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Android/.test(ua)) return 'Android Device';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Linux/.test(ua)) return 'Linux Device';
    return 'Security Key';
  };

  // Rename a passkey
  const handleRenamePasskey = async (passkeyId: string) => {
    if (!editName.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      await axios.patch(`/passkeys/${passkeyId}/rename`, {
        deviceName: editName.trim(),
      });

      setSuccess('Passkey renamed successfully');
      setEditingPasskey(null);
      setEditName('');
      fetchPasskeys();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to rename passkey');
    }
  };

  // Delete a passkey
  const handleDeletePasskey = async (passkeyId: string) => {
    if (!confirm('Are you sure you want to delete this passkey? This cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/passkeys/${passkeyId}`);
      setSuccess('Passkey deleted successfully');
      fetchPasskeys();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete passkey');
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading security settings...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Security Settings</h1>
        <p className={styles.subtitle}>
          Manage your multi-factor authentication and passkeys
        </p>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setError('')} className={styles.closeBtn}>×</button>
        </div>
      )}

      {success && (
        <div className={styles.success}>
          {success}
          <button onClick={() => setSuccess('')} className={styles.closeBtn}>×</button>
        </div>
      )}

      {/* MFA Status Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Multi-Factor Authentication (MFA)</h2>
          <span className={`${styles.badge} ${status?.mfaEnabled ? styles.badgeEnabled : styles.badgeDisabled}`}>
            {status?.mfaEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div className={styles.cardBody}>
          <p>
            {status?.mfaEnabled
              ? `You have ${status.passkeyCount} passkey${status.passkeyCount !== 1 ? 's' : ''} registered. You'll be asked to verify your identity when logging in.`
              : 'Add a passkey to enable MFA. Once enabled, you\'ll use your device\'s biometrics (Face ID, Touch ID, or Windows Hello) to verify your identity when logging in.'}
          </p>
          
          {!webAuthnSupported && (
            <div className={styles.warning}>
               Your browser does not support passkeys. Please use a modern browser like Chrome, Safari, Firefox, or Edge.
            </div>
          )}
        </div>
      </div>

      {/* Passkeys Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Registered Passkeys</h2>
          <button
            className={styles.primaryButton}
            onClick={() => setShowRegisterModal(true)}
            disabled={!webAuthnSupported}
          >
            + Add Passkey
          </button>
        </div>
        <div className={styles.cardBody}>
          {passkeys.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}></div>
              <p>No passkeys registered yet</p>
              <p className={styles.emptyHint}>
                Add a passkey to secure your account with biometric authentication
              </p>
            </div>
          ) : (
            <div className={styles.passkeyList}>
              {passkeys.map((passkey) => (
                <div key={passkey.id} className={styles.passkeyItem}>
                  <div className={styles.passkeyIcon}>
                    {passkey.deviceType === 'platform' ? '' : ''}
                  </div>
                  <div className={styles.passkeyInfo}>
                    {editingPasskey === passkey.id ? (
                      <div className={styles.editNameForm}>
                        <input
                          type="text" value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Enter new name" className={styles.editInput}
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenamePasskey(passkey.id)}
                          className={styles.saveBtn}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingPasskey(null);
                            setEditName('');
                          }}
                          className={styles.cancelBtn}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.passkeyName}>
                          {passkey.deviceName}
                          {!passkey.isActive && (
                            <span className={styles.inactiveBadge}>Inactive</span>
                          )}
                        </div>
                        <div className={styles.passkeyMeta}>
                          <span>Added: {formatDate(passkey.createdAt)}</span>
                          <span>Last used: {formatDate(passkey.lastUsedAt)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {editingPasskey !== passkey.id && (
                    <div className={styles.passkeyActions}>
                      <button
                        onClick={() => {
                          setEditingPasskey(passkey.id);
                          setEditName(passkey.deviceName);
                        }}
                        className={styles.actionBtn}
                        title="Rename"
                      >
                        
                      </button>
                      <button
                        onClick={() => handleDeletePasskey(passkey.id)}
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        title="Delete"
                      >
                        
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRegisterModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Register New Passkey</h2>
            <p>
              Your device will prompt you to use Face ID, Touch ID, Windows Hello, 
              or a security key to create a new passkey.
            </p>
            
            <div className={styles.warningBox}>
              <strong> Important:</strong> When the browser popup appears, select{' '}
              <strong>&quot;This Device&quot;</strong> or your device name (e.g., &quot;MacBook Pro&quot;).{' '}
              <strong>Do NOT scan the QR code</strong> with your phone — that will not work for login on this device.
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="deviceName">Device Name (optional)</label>
              <input
                type="text" id="deviceName" value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={getDeviceDescription()}
                className={styles.input}
              />
              <span className={styles.hint}>
                A friendly name to identify this device later
              </span>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowRegisterModal(false)}
                className={styles.secondaryButton}
                disabled={registering}
              >
                Cancel
              </button>
              <button
                onClick={handleRegisterPasskey}
                className={styles.primaryButton}
                disabled={registering}
              >
                {registering ? 'Registering...' : 'Register Passkey'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className={styles.backLink}>
        <button onClick={() => router.back()} className={styles.linkButton}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}