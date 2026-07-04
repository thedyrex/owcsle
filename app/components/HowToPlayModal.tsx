'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { HelpCircle } from 'lucide-react';

interface Team {
  id: number;
  team_name: string;
  team_logo: string | null;
  region: string;
  team_color: string | null;
}

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REGIONS = ['NA', 'EMEA', 'KR', 'CN'];

function isLight(hex: string | null): boolean {
  if (!hex) return false;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

const COL_LABELS: Record<number, string> = {
  1: 'Region',
  2: 'Nationality',
  3: 'Role',
  4: 'Sub-Role',
  5: 'Team',
};

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tooltip, setTooltip] = useState<number | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => { setMounted(true); setIsTouch(window.matchMedia('(hover: none)').matches); }, []);

  useEffect(() => {
    if (isOpen) fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.teams || [])).catch(() => {});
  }, [isOpen]);

  function handleClose() {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }

  if (!isOpen || !mounted) return null;

  const bg = dark ? '#111' : '#e8e8e8';
  const card = dark ? '#1c1c1c' : '#f0f0f0';
  const text = dark ? '#f0f0f0' : '#111';
  const divider = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const headerBg = dark ? '#0d0d0d' : '#dcdcdc';

  return createPortal(
    <>
      <style>{`
        @keyframes htpBackdropIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes htpBackdropOut { from { opacity:1; } to { opacity:0; } }
        @keyframes htpPanelIn  { from { opacity:0; transform:translate(-50%,calc(-50% + 20px)); } to { opacity:1; transform:translate(-50%,-50%); } }
        @keyframes htpPanelOut { from { opacity:1; transform:translate(-50%,-50%); } to { opacity:0; transform:translate(-50%,calc(-50% + 12px)); } }
        .htp-row-wrap { display:flex; flex-wrap:nowrap; gap:6px; margin-bottom:12px; }
        .htp-player-cell { flex:2; min-width:0; height:60px; display:flex; align-items:center; justify-content:center; border-radius:4px; font-size:18px; font-weight:700; }
        .htp-num-cell { flex:1; min-width:0; height:60px; display:flex; align-items:center; justify-content:center; border-radius:4px; font-size:22px; font-weight:700; }
        @media (max-width:480px) {
          .htp-player-cell { height:40px; font-size:13px; }
          .htp-num-cell { height:40px; font-size:15px; }
        }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 300,
        animation: closing ? 'htpBackdropOut 0.2s ease-out forwards' : 'htpBackdropIn 0.2s ease-out both',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301,
        width: 'min(580px, calc(100vw - 24px))',
        maxHeight: 'min(620px, calc(100vh - 48px))',
        background: bg,
        borderRadius: '4px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
        animation: closing ? 'htpPanelOut 0.2s ease-out forwards' : 'htpPanelIn 0.32s cubic-bezier(0.16,1,0.3,1) both',
        overflow: 'hidden',
      }} onClick={e => { e.stopPropagation(); setTooltip(null); }}>

        {/* Header */}
        <div style={{
          padding: '16px 24px 14px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '2px solid #f97316',
          background: headerBg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle style={{ width: '14px', height: '14px', color: '#f97316' }} />
            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '13px', color: '#f97316', letterSpacing: '0.05em' }}>
              HOW TO PLAY
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

          {/* Subtitle */}
          <p style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '13px', color: text, margin: 0, lineHeight: 1.5 }}>
            Guess a player to find the attributes leading to the correct answer.
          </p>

          {/* Teams */}
          <div>
            <h3 style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '18px', color: text, margin: '0 0 12px 0', fontWeight: 700 }}>Teams</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} onClick={() => setTooltip(null)}>
              {REGIONS.map(region => {
                const regionTeams = teams.filter(t => t.region === region);
                if (!regionTeams.length) return null;
                return (
                  <div key={region}>
                    <div style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '12px', fontWeight: 700, color: text, marginBottom: '6px' }}>{region}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {regionTeams.map(team => (
                        <div key={team.id} className="htp-team" style={{ position: 'relative' }}
                          onMouseEnter={() => { if (!isTouch) setTooltip(team.id); }}
                          onMouseLeave={() => { if (!isTouch) setTooltip(prev => prev === team.id ? null : prev); }}
                          onClick={e => { e.stopPropagation(); setTooltip(prev => prev === team.id ? null : team.id); }}>
                          <div style={{
                            width: '52px', height: '52px', borderRadius: '4px',
                            background: team.team_color || '#333',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', cursor: 'pointer', transition: 'filter 0.15s',
                          }}
                            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                          >
                            {team.team_logo
                              ? <img src={team.team_logo} alt={team.team_name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                              : <span style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '10px', color: '#fff' }}>{team.team_name.slice(0, 2)}</span>
                            }
                          </div>
                          <div className="htp-tooltip" style={{
                            position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                            background: team.team_color || '#333', borderRadius: '4px',
                            padding: '3px 8px', whiteSpace: 'nowrap', pointerEvents: 'none',
                            fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '11px', color: isLight(team.team_color) ? '#111' : '#fff',
                            opacity: tooltip === team.id ? 1 : 0, transition: 'opacity 0.15s', zIndex: 10,
                          }}>
                            {team.team_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: `1px solid ${divider}` }} />

          {/* Row structure */}
          <div>
            <h3 style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '13px', fontWeight: 700, color: text, margin: '0 0 12px 0' }}>HOW ROWS ARE STRUCTURED</h3>
            <div className="htp-row-wrap">
              <div className="htp-player-cell" style={{ background: card, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontFamily: "var(--font-poster-gothic), sans-serif", color: text }}>
                Player
              </div>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="htp-num-cell" style={{ background: card, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontFamily: "var(--font-poster-gothic), sans-serif", color: text }}>
                  {n}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: card, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',width: '48px', height: '48px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '20px', fontWeight: 700, color: text }}>
                    {n}
                  </div>
                  <span style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '15px', color: text }}>{COL_LABELS[n]}</span>
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
