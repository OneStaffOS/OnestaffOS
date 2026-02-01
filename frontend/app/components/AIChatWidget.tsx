"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { axios } from '@/lib/axios-config';
import { ChatEncryption, isEncryptionSupported, EncryptedPayload } from '@/lib/encryption';
import styles from './AIChatWidget.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  confidence?: number;
  isLoading?: boolean;
}

interface ChatbotResponse {
  success: boolean;
  data?: {
    message?: string; // Optional - not present in encrypted responses
    intent: string;
    confidence: number;
    predictions: Array<{ intent: string; confidence: number }>;
    requiresEscalation: boolean;
    timestamp: string;
  };
  encryptedData?: {
    ciphertext: string;
    iv: string;
    tag: string;
  };
  isEncrypted?: boolean;
  error?: string;
}

interface AIChatWidgetProps {
  /** Whether the chat is open by default */
  defaultOpen?: boolean;
  /** Position of the chat widget */
  position?: 'bottom-right' | 'bottom-left';
  /** Custom greeting message */
  greeting?: string;
  /** Whether to use authenticated endpoint */
  useAuth?: boolean;
  /** Whether to enable end-to-end encryption */
  enableEncryption?: boolean;
}

const DEFAULT_GREETING = "👋 Hi! I'm your IT Help Desk assistant. How can I help you today?";

const QUICK_ACTIONS = [
  { label: '🔑 Reset Password', message: 'How do I reset my password?' },
  { label: '📶 VPN Issues', message: 'I have VPN connection problems' },
  { label: '💻 Laptop Help', message: 'My laptop is having issues' },
  { label: '📧 Email Problems', message: 'I need help with my email' },
];

export default function AIChatWidget({
  defaultOpen = false,
  position = 'bottom-right',
  greeting = DEFAULT_GREETING,
  useAuth = true,
  enableEncryption = true,
}: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHealthy, setIsHealthy] = useState(true);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const encryptionRef = useRef<ChatEncryption | null>(null);
  const sessionKeyRef = useRef<string | null>(null);

  // Generate unique ID for messages
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: generateId(),
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [greeting, messages.length]);

  // Check health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get('/ai-chatbot/health');
        setIsHealthy(response.data?.data?.status === 'healthy');
      } catch {
        setIsHealthy(false);
      }
    };
    checkHealth();
  }, []);

  const initEncryption = useCallback(async () => {
    if (!enableEncryption || !isEncryptionSupported()) {
      setEncryptionReady(false);
      return false;
    }

    try {
      const response = await axios.get('/ai-chatbot/encryption/public-key');
      if (response.data?.success && response.data?.data?.publicKey) {
        encryptionRef.current?.destroy();
        encryptionRef.current = new ChatEncryption('ai_chatbot');
        const encryptedSessionKey = await encryptionRef.current.initialize(
          response.data.data.publicKey
        );
        sessionKeyRef.current = encryptedSessionKey;
        setEncryptionReady(true);
        setEncryptionError(null);
        return true;
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
    }

    setEncryptionError('Encryption unavailable');
    setEncryptionReady(false);
    return false;
  }, [enableEncryption]);

  // Initialize encryption
  useEffect(() => {
    initEncryption();

    return () => {
      if (encryptionRef.current) {
        encryptionRef.current.destroy();
      }
    };
  }, [initEncryption]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isTyping) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Add loading message
    const loadingId = generateId();
    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      },
    ]);

    try {
      const requestChatbot = async (
        text: string,
        attempt: number,
        forcePlaintext: boolean = false
      ): Promise<{
        response: ChatbotResponse;
        messageContent: string;
      }> => {
        let response: { data: ChatbotResponse };

        const canEncrypt = !forcePlaintext && encryptionReady && encryptionRef.current && sessionKeyRef.current;
        if (canEncrypt) {
          const encryptedPayload = await encryptionRef.current!.encrypt(text);
          const endpoint = useAuth ? '/ai-chatbot/chat/encrypted' : '/ai-chatbot/quick-help/encrypted';
          const sessionId = encryptionRef.current?.getSessionId();

          response = await axios.post<ChatbotResponse>(endpoint, {
            encryptedMessage: {
              ciphertext: encryptedPayload.ciphertext,
              iv: encryptedPayload.iv,
              tag: encryptedPayload.tag,
            },
            encryptedSessionKey: sessionKeyRef.current,
            sessionId: sessionId || undefined,
          });
        } else {
          const endpoint = useAuth ? '/ai-chatbot/chat' : '/ai-chatbot/quick-help';
          response = await axios.post<ChatbotResponse>(endpoint, {
            message: text,
          });
        }

        const payload = response.data;
        let messageContent = payload.data?.message || "I'm sorry, I couldn't process your request.";

        if (payload.encryptedData && encryptionRef.current) {
          try {
            messageContent = await encryptionRef.current.decrypt(payload.encryptedData);
          } catch (decryptError) {
            console.error('Failed to decrypt response:', decryptError);
            if (attempt === 0 && !forcePlaintext) {
              const refreshed = await initEncryption();
              if (refreshed) {
                return requestChatbot(text, attempt + 1, false);
              }
            }
            if (payload.data?.message) {
              messageContent = payload.data.message;
            } else {
              messageContent = "I received a response but couldn't decrypt it. Please try again.";
            }
          }
        }

        return { response: payload, messageContent };
      };

      const { response, messageContent } = await requestChatbot(messageText.trim(), 0);

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingId);
        if (response.success && response.data) {
          return [
            ...filtered,
            {
              id: generateId(),
              role: 'assistant',
              content: messageContent,
              timestamp: new Date(response.data.timestamp),
              intent: response.data.intent,
              confidence: response.data.confidence,
            },
          ];
        }
        return [
          ...filtered,
          {
            id: generateId(),
            role: 'assistant',
            content: response.error || "I'm sorry, I couldn't process your request.",
            timestamp: new Date(),
          },
        ];
      });
    } catch (error) {
      // Remove loading message and add error
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingId);
        return [
          ...filtered,
          {
            id: generateId(),
            role: 'assistant',
            content: "I'm having trouble connecting right now. Please try again later or contact support directly.",
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  const clearChat = () => {
    setMessages([
      {
        id: generateId(),
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      },
    ]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        className={`${styles.chatButton} ${styles[position]}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open chat"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z"
            fill="currentColor"
          />
          <path d="M7 9H17V11H7V9ZM7 12H14V14H7V12ZM7 6H17V8H7V6Z" fill="currentColor" />
        </svg>
        <span className={styles.buttonLabel}>IT Help</span>
        {!isHealthy && <span className={styles.offlineDot} />}
      </button>
    );
  }

  return (
    <div className={`${styles.chatWidget} ${styles[position]}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.avatar}>🤖</div>
          <div>
            <h3 className={styles.title}>IT Help Desk</h3>
            <span className={`${styles.status} ${isHealthy ? styles.online : styles.offline}`}>
              {isHealthy ? '● Online' : '● Offline'}
              {enableEncryption && (
                <span 
                  className={styles.encryptionBadge}
                  title={encryptionReady ? 'End-to-end encrypted' : encryptionError || 'Encryption unavailable'}
                >
                  {encryptionReady ? ' 🔒' : ' 🔓'}
                </span>
              )}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.headerButton}
            onClick={clearChat}
            title="Clear chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            className={styles.headerButton}
            onClick={() => setIsOpen(false)}
            title="Minimize"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 13H5V11H19V13Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.message} ${styles[message.role]}`}
          >
            {message.role === 'assistant' && (
              <div className={styles.messageAvatar}>🤖</div>
            )}
            <div className={styles.messageContent}>
              {message.isLoading ? (
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <>
                  <div className={styles.messageText}>
                    {(message.content || '').split('\n').map((line, i, arr) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < arr.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className={styles.messageTime}>
                    {formatTime(message.timestamp)}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className={styles.quickActions}>
          {QUICK_ACTIONS.map((action, index) => (
            <button
              key={index}
              className={styles.quickAction}
              onClick={() => handleQuickAction(action.message)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form className={styles.inputArea} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question..."
          rows={1}
          disabled={isTyping}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!inputValue.trim() || isTyping}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </form>

      {/* Footer */}
      <div className={styles.footer}>
        <span>Powered by AI</span>
        <a href="/dashboard/help/knowledge-base" className={styles.kbLink}>
          📚 Knowledge Base
        </a>
      </div>
    </div>
  );
}
