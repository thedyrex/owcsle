'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { HelpCircle } from 'lucide-react';

interface UsaHowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  colorblindMode?: string;
}

const COL_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: 'Role',        desc: 'Player\'s role on the team (DPS, Tank, Support, Coach, AC, GM)' },
  2: { label: 'Prior Team',  desc: 'OWCS/OWL team they played on during/before OWWC' },
  3: { label: 'Year Active', desc: 'The year(s) they competed in OWWC (2017-2026)' },
};

export function UsaHowToPlayModal({ isOpen, onClose, colorblindMode }: UsaHowToPlayModalProps) {
  const cb = colorblindMode && colorblindMode !== 'none';
  const STATUS_COLORS = {
    correct: cb ? '#3b82f6' : '#4ade80',
    partial:  cb ? '#a855f7' : '#facc15',
    wrong:    cb ? '#f97316' : '#f87171',
  };
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function handleClose() {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }

  if (!isOpen || !mounted) return null;

  const bg      = dark ? '#111' : '#e8e8e8';
  const card    = dark ? '#1c1c1c' : '#f0f0f0';
  const text    = dark ? '#f0f0f0' : '#111';
  const divider = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const headerBg = dark ? '#0d0d0d' : '#dcdcdc';
  const accent  = '#4556e6';

  return createPortal(
    <>
      <style>{`
        @keyframes usaHtpBackdropIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes usaHtpBackdropOut { from { opacity:1; } to { opacity:0; } }
        @keyframes usaHtpPanelIn  { from { opacity:0; transform:translate(-50%,calc(-50% + 20px)); } to { opacity:1; transform:translate(-50%,-50%); } }
        @keyframes usaHtpPanelOut { from { opacity:1; transform:translate(-50%,-50%); } to { opacity:0; transform:translate(-50%,calc(-50% + 12px)); } }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 300,
        animation: closing ? 'usaHtpBackdropOut 0.2s ease-out forwards' : 'usaHtpBackdropIn 0.2s ease-out both',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301,
        width: 'min(520px, calc(100vw - 24px))',
        maxHeight: 'min(600px, calc(100vh - 48px))',
        background: bg,
        borderRadius: '4px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
        animation: closing ? 'usaHtpPanelOut 0.2s ease-out forwards' : 'usaHtpPanelIn 0.32s cubic-bezier(0.16,1,0.3,1) both',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '16px 24px 14px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `2px solid ${accent}`,
          background: headerBg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle style={{ width: '14px', height: '14px', color: accent }} />
            <span style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '13px', color: accent, letterSpacing: '0.05em' }}>
              HOW TO PLAY - USA OWWC EDITION
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
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <p style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '13px', color: text, margin: 0, lineHeight: 1.6 }}>
            Guess a USA OWWC player in 6 tries. Each guess reveals how close you are across 3 attributes.
          </p>

          <div style={{ borderTop: `1px solid ${divider}` }} />

          {/* Row structure */}
          <div>
            <h3 style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '13px', fontWeight: 700, color: text, margin: '0 0 12px 0' }}>HOW ROWS ARE STRUCTURED</h3>

            {/* Example row */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', justifyContent: 'center' }}>
              <div style={{ width: '150px', flexShrink: 0, height: '56px', background: card, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '14px', fontWeight: 700, color: text, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                PLAYER
              </div>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ width: '56px', height: '56px', flexShrink: 0, background: card, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '20px', fontWeight: 700, color: text, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  {n}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: card, width: '44px', height: '44px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '18px', fontWeight: 700, color: text, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                    {n}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '14px', fontWeight: 700, color: text }}>{COL_LABELS[n].label}</div>
                    <div style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '12px', color: text, opacity: 0.6 }}>{COL_LABELS[n].desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${divider}` }} />

          {/* Color guide */}
          <div>
            <h3 style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '13px', fontWeight: 700, color: text, margin: '0 0 12px 0' }}>CELL COLORS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {([
                { color: STATUS_COLORS.correct, label: 'Correct',  desc: 'Exact match' },
                { color: STATUS_COLORS.partial, label: 'Partial',  desc: 'Overlaps (e.g. shared team or year)' },
                { color: STATUS_COLORS.wrong,   label: 'Incorrect', desc: 'No match' },
              ] as const).map(({ color, label, desc }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '4px', background: color, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} />
                  <div>
                    <div style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '14px', fontWeight: 700, color: text }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '12px', color: text, opacity: 0.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ paddingBottom: '4px' }} />
        </div>
      </div>
    </>,
    document.body
  );
}
