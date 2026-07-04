'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { BarChart3 } from 'lucide-react';
import { GameStats } from '@/hooks/useStats';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
  winRate: number;
}

export function StatsModal({ isOpen, onClose, stats, winRate }: StatsModalProps) {
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

  const bg = dark ? '#111' : '#e8e8e8';
  const text = dark ? '#f0f0f0' : '#111';
  const subtext = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const divider = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const headerBg = dark ? '#0d0d0d' : '#dcdcdc';
  const barBg = dark ? '#2a2a2a' : '#e0e0e0';
  const barFill = dark ? '#525252' : '#a3a3a3';

  const maxGuesses = Math.max(...stats.guessDistribution, 1);

  return createPortal(
    <>
      <style>{`
        @keyframes smBackdropIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes smBackdropOut { from { opacity:1; } to { opacity:0; } }
        @keyframes smPanelIn  { from { opacity:0; transform:translate(-50%,calc(-50% + 20px)); } to { opacity:1; transform:translate(-50%,-50%); } }
        @keyframes smPanelOut { from { opacity:1; transform:translate(-50%,-50%); } to { opacity:0; transform:translate(-50%,calc(-50% + 12px)); } }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 300,
        animation: closing ? 'smBackdropOut 0.2s ease-out forwards' : 'smBackdropIn 0.2s ease-out both',
      }} />

      {/* Panel */}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301,
        width: 'min(440px, calc(100vw - 24px))',
        background: bg,
        borderRadius: '4px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
        animation: closing ? 'smPanelOut 0.2s ease-out forwards' : 'smPanelIn 0.32s cubic-bezier(0.16,1,0.3,1) both',
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
            <BarChart3 style={{ width: '14px', height: '14px', color: '#f97316' }} />
            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '13px', color: '#f97316', letterSpacing: '0.05em' }}>
              STATISTICS
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
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { value: stats.gamesPlayed, label: 'GAMES PLAYED' },
              { value: `${winRate}%`, label: 'WIN RATE' },
              { value: stats.currentStreak, label: 'CURRENT STREAK' },
              { value: stats.bestStreak, label: 'BEST STREAK' },
            ].map(({ value, label }) => (
              <div key={label} style={{ padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '28px', fontWeight: 700, color: text, lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '8px', color: subtext, marginTop: '6px', letterSpacing: '0.04em', lineHeight: 1.3 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: `1px solid ${divider}` }} />

          {/* Guess distribution */}
          <div>
            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: text, letterSpacing: '0.05em' }}>
              GUESS DISTRIBUTION
            </span>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {stats.guessDistribution.map((count, i) => {
                const pct = maxGuesses > 0 ? (count / maxGuesses) * 100 : 0;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '14px', fontWeight: 700, color: text, width: '12px', textAlign: 'right', flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, background: barBg, height: '24px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.max(pct, count > 0 ? 8 : 0)}%`,
                        height: '100%',
                        background: barFill,
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                        paddingRight: '8px', transition: 'width 0.4s ease',
                      }}>
                        {count > 0 && (
                          <span style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '12px', fontWeight: 700, color: '#fff' }}>{count}</span>
                        )}
                      </div>
                      {count === 0 && (
                        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '12px', fontWeight: 700, color: subtext }}>0</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ paddingBottom: '4px' }} />
        </div>
      </div>
    </>,
    document.body
  );
}
