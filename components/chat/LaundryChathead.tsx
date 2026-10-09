'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LaundryIcons } from '@/components/common/LaundryIcons';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const QUICK_PROMPTS = [
  '📦 Where is my laundry order?',
  '⚖️ How does doorstep weighing work?',
  '🍷 How do I remove wine/coffee stains?',
  '💳 Can I pay with GCash or Maya?',
];

export default function LaundryChathead() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Kumusta! 👋 I'm your GoWashGo AI Concierge. I can help track your active laundry orders, explain doorstep scale rates, or share expert stain removal tips. How can I help you today?",
      time: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 9000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  async function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, history }),
      });

      const json = await res.json();
      const replyText = json.reply || "I'm having trouble retrieving that information. Please check back shortly!";

      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Network connection issue. Please check your internet connection or try again!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!isMounted) return null;

  return (
    <>
      {/* ================= FLOATING CHATHEAD BUBBLE ================= */}
      <div
        style={{
          position: 'fixed',
          bottom: 76,
          right: 16,
          zIndex: 99998,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        {/* Proactive Greeting Tooltip */}
        {showTooltip && !isOpen && (
          <div
            style={{
              background: '#0E7490',
              color: '#FFFFFF',
              padding: '6px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              boxShadow: '0 8px 20px rgba(14, 116, 144, 0.35)',
              marginBottom: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              animation: 'bounce 2s infinite',
            }}
            onClick={() => setIsOpen(true)}
          >
            <span>Need laundry help? Chat with AI</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              style={{ background: 'none', border: 'none', color: '#A5F3FC', fontSize: 11, cursor: 'pointer', padding: 0 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Circular Chathead Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Open Laundry AI Chat"
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0E7490 0%, #155E75 100%)',
            border: '2.5px solid #FFFFFF',
            boxShadow: '0 8px 24px rgba(14, 116, 144, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <img
            src="/icons/gowashgo-icon.png"
            alt="GoWashGo Chat"
            width={32}
            height={32}
            style={{ borderRadius: 6, objectFit: 'contain' }}
          />

          {/* Green "Active" Ping Badge */}
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#10B981',
              border: '2px solid #FFFFFF',
            }}
          />
        </button>
      </div>

      {/* ================= CHAT WINDOW MODAL / POPUP ================= */}
      {isOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              background: 'rgba(28, 25, 23, 0.6)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
            onClick={() => setIsOpen(false)}
          >
            <div
              style={{
                background: '#FAF8F5',
                width: '100%',
                maxWidth: 420,
                height: '82dvh',
                maxHeight: 640,
                borderRadius: '24px 24px 0 0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 -15px 40px rgba(0, 0, 0, 0.3)',
                animation: 'slideUp 220ms ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Header (Sticky) */}
              <div
                style={{
                  padding: '14px 18px',
                  background: '#0E7490',
                  color: '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    <img src="/icons/gowashgo-icon.png" alt="GoWashGo" width={28} height={28} style={{ borderRadius: 4 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' }}>
                      GoWashGo AI Concierge
                    </div>
                    <div style={{ fontSize: 11, color: '#A5F3FC', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86EFAC' }} />
                      Powered by Gemini • Online
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 2. Chat Messages Body (Scrollable) */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: '86%',
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          background: isUser ? '#0E7490' : '#FFFFFF',
                          color: isUser ? '#FFFFFF' : '#1C1917',
                          padding: '10px 14px',
                          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          fontSize: 13,
                          lineHeight: 1.45,
                          whiteSpace: 'pre-wrap',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                          border: isUser ? 'none' : '1px solid #E7E2D8',
                        }}
                      >
                        {m.content}
                      </div>
                      <span style={{ fontSize: 10, color: '#A8A29E', marginTop: 3, padding: '0 4px' }}>
                        {m.time}
                      </span>
                    </div>
                  );
                })}

                {/* Typing Dots Indicator */}
                {loading && (
                  <div
                    style={{
                      background: '#FFFFFF',
                      padding: '10px 14px',
                      borderRadius: '16px 16px 16px 4px',
                      border: '1px solid #E7E2D8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      width: 54,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0E7490', animation: 'bounce 1s infinite' }} />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0E7490', animation: 'bounce 1s infinite 0.2s' }} />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0E7490', animation: 'bounce 1s infinite 0.4s' }} />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* 3. Quick Suggestion Pills */}
              <div
                style={{
                  padding: '6px 14px',
                  background: '#F3EFE6',
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  flexShrink: 0,
                  WebkitOverflowScrolling: 'touch',
                  borderTop: '1px solid #E7E2D8',
                }}
              >
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    disabled={loading}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #D5CEBF',
                      borderRadius: 14,
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#0E7490',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* 4. Sticky Input Field */}
              <div
                style={{
                  padding: '10px 14px 14px',
                  background: '#FAF8F5',
                  borderTop: '1px solid #E7E2D8',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your order or laundry care..."
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: '#FFFFFF',
                    border: '1.5px solid #D5CEBF',
                    borderRadius: 12,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: '#1C1917',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: input.trim() && !loading ? '#0E7490' : '#D5CEBF',
                    color: '#FFFFFF',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: input.trim() && !loading ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <LaundryIcons.ArrowRight size={18} color="#FFFFFF" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
