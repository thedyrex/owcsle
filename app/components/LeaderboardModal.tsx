'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { Crown } from 'lucide-react';

function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${m > 0 ? `${m}:` : ''}${m > 0 ? s.toString().padStart(2, '0') : s}.${cs.toString().padStart(2, '0')}s`;
}

interface Entry {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  team_tag: string | null;
  player_title: string | null;
  arcade_xp: number;
  avg_time_ms: number | null;
  games_won: number;
  level: number;
  title: string;
  verified: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  currentUserId?: string;
}

const RANK_COLORS = ['#fbbf24', '#94a3b8', '#b45309'];

export function LeaderboardModal({ open, onClose, currentUserId }: Props) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const [entries, setEntries] = useState<Entry[]>([]);
  const [teamLogoMap, setTeamLogoMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('/api/teams')
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {};
        for (const t of (d.teams || [])) {
          if (t.team_logo) map[t.team_name] = t.team_logo;
        }
        setTeamLogoMap(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    setPage(0);
    setLoading(true);
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [open]);

  function handleClose() {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }

  if (!open || !mounted) return null;

  const bg = dark ? '#111' : '#e8e8e8';
  const rowBg = dark ? '#1c1c1c' : '#f0f0f0';
  const text = dark ? '#f0f0f0' : '#111';
  const subtext = dark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)';
  const divider = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';

  return createPortal(
    <>
      <style>{`
        @keyframes lbBackdropIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes lbBackdropOut { from { opacity:1; } to { opacity:0; } }
        @keyframes lbPanelIn  { from { opacity:0; transform:translate(-50%,calc(-50% + 20px)); } to { opacity:1; transform:translate(-50%,-50%); } }
        @keyframes lbPanelOut { from { opacity:1; transform:translate(-50%,-50%); } to { opacity:0; transform:translate(-50%,calc(-50% + 12px)); } }
        .lb-row { transition: filter 0.15s; cursor: default; }
        .lb-row:hover { filter: brightness(1.12); }
        .lb-grid { display: grid; grid-template-columns: 56px 1fr 70px 90px 100px; }
        .lb-avatar { width: 54px; height: 54px; flex-shrink: 0; }
        @media (max-width: 520px) {
          .lb-grid { grid-template-columns: 36px 1fr 48px 52px 0px; }
          .lb-col-avgtime { display: none !important; }
          .lb-avatar { width: 40px; height: 40px; }
          .lb-rank-num { font-size: 15px !important; }
          .lb-rank-num-top { font-size: 17px !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 300,
        animation: closing ? 'lbBackdropOut 0.2s ease-out forwards' : 'lbBackdropIn 0.2s ease-out both',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301,
        width: 'min(820px, calc(100vw - 16px))',
        maxHeight: 'calc(100vh - 48px)',
        background: bg,
        borderRadius: '4px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
        animation: closing ? 'lbPanelOut 0.2s ease-out forwards' : 'lbPanelIn 0.32s cubic-bezier(0.16,1,0.3,1) both',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 24px 14px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '2px solid #a855f7',
          background: dark ? '#0d0d0d' : '#dcdcdc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crown style={{ width: '14px', height: '14px', color: '#a855f7' }} />
            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '13px', color: '#a855f7', letterSpacing: '0.05em' }}>
              OWCSLE UNLIMITED LEADERBOARD
            </span>
          </div>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: text, opacity: 0.35, fontSize: '18px', lineHeight: 1,
            padding: '2px 4px', fontFamily: 'sans-serif', transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
          >✕</button>
        </div>

        {/* Column headers */}
        <div className="lb-grid" style={{
          padding: '7px 0',
          borderBottom: `1px solid ${divider}`,
          flexShrink: 0,
          background: dark ? '#0d0d0d' : '#dcdcdc',
        }}>
          {(['#', 'PLAYER', 'LEVEL', 'WINS', 'AVG TIME'] as const).map((h, i) => (
            <div key={h} className={i === 4 ? 'lb-col-avgtime' : ''} style={{ display: 'flex', justifyContent: i === 0 ? 'flex-start' : i === 1 ? 'flex-start' : 'center', paddingLeft: i === 0 ? '12px' : 0 }}>
              <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext, letterSpacing: '0.08em' }}>{h}</span>
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '56px', textAlign: 'center', fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: subtext }}>
              LOADING...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ padding: '56px', textAlign: 'center', fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: subtext }}>
              NO PLAYERS YET. BE THE FIRST!
            </div>
          ) : entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((entry, i) => {
            const globalI = page * PAGE_SIZE + i;
            const isMe = entry.id === currentUserId;
            const rankColor = globalI < 3 ? RANK_COLORS[globalI] : (isMe ? '#a855f7' : subtext);
            const accentColor = globalI < 3 ? RANK_COLORS[globalI] : '#a855f7';

            return (
              <div key={entry.id} className="lb-row lb-grid" style={{
                alignItems: 'center',
                height: '54px',
                borderBottom: `1px solid ${divider}`,
                position: 'relative',
                overflow: 'hidden',
                background: rowBg,
              }}>

                {/* Banner strip */}
                {entry.banner_url && (
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: '55%',
                    backgroundImage: `url(${entry.banner_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center right',
                    maskImage: 'linear-gradient(to right, transparent 0%, transparent 20%, rgba(0,0,0,0.6) 45%, black 65%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 20%, rgba(0,0,0,0.6) 45%, black 65%)',
                  }} />
                )}

                {/* "Me" highlight (no banner) */}
                {isMe && !entry.banner_url && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(168,85,247,0.08)', pointerEvents: 'none' }} />
                )}

                {/* Left accent bar */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                  background: globalI < 3 ? RANK_COLORS[globalI] : (isMe ? '#a855f7' : 'transparent'),
                }} />

                {/* Rank */}
                <div className="lb-rank-cell" style={{ position: 'relative', zIndex: 1, paddingLeft: '12px' }}>
                  <span className={globalI < 3 ? 'lb-rank-num-top' : 'lb-rank-num'} style={{
                    fontFamily: "var(--font-ow-esports), sans-serif",
                    fontSize: globalI < 3 ? '20px' : '15px',
                    color: rankColor,
                    textShadow: 'none',
                  }}>{globalI + 1}</span>
                </div>

                {/* Player */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, paddingRight: '8px', alignSelf: 'stretch' }}>

                  {/* Avatar */}
                  <div className="lb-avatar" style={{
                    background: '#a855f7', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {entry.avatar_url
                      ? <img src={entry.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '14px', color: '#fff' }}>
                          {entry.username.slice(0, 2).toUpperCase()}
                        </span>
                    }
                  </div>

                  {/* Name + subtitle */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{
                        fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '13px', color: text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        textShadow: 'none',
                      }}>{entry.username}</span>
                      {entry.verified && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="12" fill="#f97316" />
                          <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    {(entry.player_title || entry.team_tag) && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px' }}>
                        {entry.player_title && (
                          <span style={{
                            fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '8px',
                            color: '#f97316',
                            background: 'rgba(0,0,0,0.75)',
                            border: '1px solid rgba(249,115,22,0.5)',
                            borderRadius: '20px',
                            padding: '1px 6px',
                            whiteSpace: 'nowrap',
                          }}>{entry.player_title}</span>
                        )}
                        {entry.team_tag && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            border: `1px solid rgba(255,255,255,0.35)`,
                            borderRadius: '20px',
                            padding: '1px 6px 1px 3px',
                            background: 'rgba(0,0,0,0.75)',
                          }}>
                            {teamLogoMap[entry.team_tag] && (
                              <img src={teamLogoMap[entry.team_tag]} alt="" style={{ width: '12px', height: '12px', objectFit: 'contain' }} />
                            )}
                            <span style={{
                              fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '8px',
                              color: 'rgba(255,255,255,0.9)',
                              whiteSpace: 'nowrap',
                            }}>{entry.team_tag}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Level */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '14px', color: accentColor }}>
                    {entry.level}
                  </span>
                </div>

                {/* Games won */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '14px', color: text }}>
                    {entry.games_won ?? 0}
                  </span>
                </div>

                {/* Avg time */}
                <div className="lb-col-avgtime" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: text }}>
                    {entry.avg_time_ms != null ? formatMs(entry.avg_time_ms) : '\u2014'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {!loading && entries.length > PAGE_SIZE && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
            padding: '10px 24px', borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
            flexShrink: 0, background: dark ? '#0d0d0d' : '#dcdcdc',
          }}>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0} style={{
              fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px',
              background: 'none', border: 'none', cursor: page === 0 ? 'default' : 'pointer',
              color: page === 0 ? (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : '#a855f7',
              padding: '4px 8px',
            }}>← PREV</button>
            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: dark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)' }}>
              {page + 1} / {Math.ceil(entries.length / PAGE_SIZE)}
            </span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= entries.length} style={{
              fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px',
              background: 'none', border: 'none', cursor: (page + 1) * PAGE_SIZE >= entries.length ? 'default' : 'pointer',
              color: (page + 1) * PAGE_SIZE >= entries.length ? (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : '#a855f7',
              padding: '4px 8px',
            }}>NEXT →</button>
          </div>
        )}

      </div>
    </>,
    document.body
  );
}
