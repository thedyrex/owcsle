'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { MessageCircle } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => { setMounted(true); }, []);

  function handleClose() {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setFeedback('');
      setName('');
      setSubmitStatus('idle');
      onClose();
    }, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitStatus('idle');
    try {
      const res = await fetch(
        'https://discordapp.com/api/webhooks/1466579365969264784/s2DelYzuJmqGsSDyAsi78Wg3DpVUIpz0VApZkXF8WLee1AEI6SoHi6U-s5epvmzVrKuI',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `**New OWCSLE Feedback**\n${name.trim() ? `**Name:** ${name}\n` : ''}\`\`\`\n${feedback}\n\`\`\``,
            username: 'OWCSLE Feedback',
          }),
        }
      );
      if (res.ok || res.status === 204) {
        setSubmitStatus('success');
        setFeedback('');
        setTimeout(() => onClose(), 1500);
      } else {
        setSubmitStatus('error');
      }
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || !mounted) return null;

  const bg = dark ? '#111' : '#e8e8e8';
  const headerBg = dark ? '#0d0d0d' : '#dcdcdc';
  const inputBg = dark ? '#1c1c1c' : '#f0f0f0';
  const text = dark ? '#f0f0f0' : '#111';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

  return createPortal(
    <>
      <style>{`
        @keyframes fbBackdropIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes fbBackdropOut { from { opacity:1; } to { opacity:0; } }
        @keyframes fbPanelIn  { from { opacity:0; transform:translate(-50%,calc(-50% + 20px)); } to { opacity:1; transform:translate(-50%,-50%); } }
        @keyframes fbPanelOut { from { opacity:1; transform:translate(-50%,-50%); } to { opacity:0; transform:translate(-50%,calc(-50% + 12px)); } }
        .fb-input { outline: none; border: 1px solid ${border}; transition: border-color 0.15s; }
        .fb-input:focus { border-color: #f97316; }
      `}</style>

      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 300,
        animation: closing ? 'fbBackdropOut 0.2s ease-out forwards' : 'fbBackdropIn 0.2s ease-out both',
      }} />

      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301,
        width: 'min(420px, calc(100vw - 24px))',
        background: bg,
        borderRadius: '4px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
        animation: closing ? 'fbPanelOut 0.2s ease-out forwards' : 'fbPanelIn 0.32s cubic-bezier(0.16,1,0.3,1) both',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 24px 14px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '2px solid #f97316',
          background: headerBg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle style={{ width: '14px', height: '14px', color: '#f97316' }} />
            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '13px', color: '#f97316', letterSpacing: '0.05em' }}>
              FEEDBACK
            </span>
          </div>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: text, opacity: 0.35, fontSize: '18px', lineHeight: 1,
            padding: '2px 4px', transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
          >✕</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: '#f97316', letterSpacing: '0.04em', margin: 0 }}>
            SHARE YOUR THOUGHTS, REPORT BUGS, OR SUGGEST FEATURES!
          </p>

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name (optional)"
            disabled={isSubmitting}
            className="fb-input"
            style={{
              width: '100%', padding: '10px 14px', background: inputBg,
              color: text, borderRadius: '4px', fontSize: '13px',
              fontFamily: "var(--font-ow-esports), sans-serif",
              boxSizing: 'border-box',
            }}
          />

          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Type your feedback here..."
            disabled={isSubmitting}
            rows={5}
            className="fb-input"
            style={{
              width: '100%', padding: '10px 14px', background: inputBg,
              color: text, borderRadius: '4px', fontSize: '13px',
              fontFamily: "var(--font-ow-esports), sans-serif",
              resize: 'none', boxSizing: 'border-box',
            }}
          />

          {submitStatus === 'error' && (
            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: '#ef4444' }}>
              FAILED TO SEND. PLEASE TRY AGAIN.
            </span>
          )}
          {submitStatus === 'success' && (
            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: '#22c55e' }}>
              THANK YOU FOR YOUR FEEDBACK!
            </span>
          )}

          <button
            type="submit"
            disabled={!feedback.trim() || isSubmitting}
            style={{
              width: '100%', padding: '12px', background: '#f97316',
              border: 'none', borderRadius: '4px', cursor: 'pointer',
              fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px',
              color: '#fff', letterSpacing: '0.05em',
              opacity: !feedback.trim() || isSubmitting ? 0.45 : 1,
              transition: 'opacity 0.15s, filter 0.15s',
            }}
            onMouseEnter={e => { if (feedback.trim() && !isSubmitting) e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
          >
            {isSubmitting ? 'SENDING...' : 'SEND FEEDBACK'}
          </button>

          <div style={{ paddingBottom: '4px' }} />
        </form>
      </div>
    </>,
    document.body
  );
}
