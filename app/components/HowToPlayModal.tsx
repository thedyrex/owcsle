'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { HelpCircle } from 'lucide-react';
import { useT } from './LanguageProvider';

interface Team {
  id: number;
  team_name: string;
  team_logo: string | null;
  region: string;
  team_color: string | null;
}

interface ExamplePlayer {
  player_name: string;
  region: string;
  role_type: string;
  flag_url: string | null;
  role_icon: string | null;
  logo_url: string | null;
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

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  const t = useT();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [example, setExample] = useState<ExamplePlayer | null>(null);
  const [tooltip, setTooltip] = useState<number | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => { setMounted(true); setIsTouch(window.matchMedia('(hover: none)').matches); }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.teams || [])).catch(() => {});
    fetch('/api/players').then(r => r.json()).then(d => {
      const list: ExamplePlayer[] = d.players || d || [];
      const pick = list.find(p => p.player_name === 'LIP')
        || list.find(p => p.role_type === 'HS')
        || list[0];
      if (pick) setExample(pick);
    }).catch(() => {});
  }, [isOpen]);

  function handleClose() {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }

  if (!isOpen || !mounted) return null;

  const bg = dark ? '#111' : '#e8e8e8';
  const card = dark ? '#1c1c1c' : '#f0f0f0';
  const text = dark ? '#f0f0f0' : '#111';
  const muted = dark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.45)';
  const divider = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const headerBg = dark ? '#0d0d0d' : '#dcdcdc';

  const eyebrow: React.CSSProperties = {
    fontFamily: 'var(--font-ow-esports), sans-serif', fontSize: '11px',
    letterSpacing: '0.09em', color: muted, textTransform: 'uppercase',
    display: 'block', marginBottom: '10px',
  };
  // Feedback colours - identical to the board (Tailwind green/yellow/red-400).
  const OK = '#4ade80', MID = '#facc15', NO = '#f87171';

  // A real guess for the example - fetched live, with a stable fallback (LIP).
  const EX: ExamplePlayer = example ?? {
    player_name: 'LIP', region: 'KR', role_type: 'HS',
    flag_url: 'https://cdn.owcsle.xyz/images/flags/flag-e79084cc.png',
    role_icon: 'https://cdn.owcsle.xyz/images/role-icons/dps.svg',
    logo_url: 'https://cdn.owcsle.xyz/images/team-logos/logo-459c60c8.png',
    team_color: '#000000',
  };
  const hideImg = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; };

  return createPortal(
    <>
      <style>{`
        @keyframes htpBackdropIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes htpBackdropOut { from { opacity:1; } to { opacity:0; } }
        @keyframes htpPanelIn  { from { opacity:0; transform:translate(-50%,calc(-50% + 20px)); } to { opacity:1; transform:translate(-50%,-50%); } }
        @keyframes htpPanelOut { from { opacity:1; transform:translate(-50%,-50%); } to { opacity:0; transform:translate(-50%,calc(-50% + 12px)); } }
        .htp-ex { display:flex; gap:6px; justify-content:center; }
        .htp-ex .p { flex:1 1 auto; min-width:0; max-width:150px; }
        .htp-ex .a { flex:0 0 54px; }
        .htp-ex .c { height:54px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,0.22); }
        .htp-lab { display:flex; gap:6px; margin-top:6px; justify-content:center; }
        .htp-lab .p { flex:1 1 auto; min-width:0; max-width:150px; } .htp-lab .a { flex:0 0 54px; }
        .htp-lab div { text-align:center; }
        @media (max-width:480px) {
          .htp-ex .a { flex-basis:44px; }
          .htp-ex .c { height:44px; }
          .htp-lab .a { flex-basis:44px; }
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
              {t('howto.title')}
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
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Objective */}
          <p style={{ fontFamily: "var(--font-poster-gothic), sans-serif", fontSize: '15px', color: text, margin: 0, lineHeight: 1.5 }}>
            {t('howto.objective')}
          </p>

          {/* Worked example */}
          <div>
            <span style={eyebrow}>{t('howto.readingGuess')}</span>
            <div className="htp-ex">
              <div className="c p" style={{ background: NO, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-poster-gothic), sans-serif', fontSize: '16px' }}>{EX.player_name}</div>
              <div className="c a" style={{ background: OK, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-poster-gothic), sans-serif', fontSize: '16px' }}>{EX.region}</div>
              <div className="c a" style={{ background: OK }}>
                {EX.flag_url && <img src={EX.flag_url} alt="" onError={hideImg} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '2px' }} />}
              </div>
              <div className="c a" style={{ background: OK }}>
                {EX.role_icon && <img src={EX.role_icon} alt="" onError={hideImg} style={{ width: '34px', height: '34px', objectFit: 'contain', filter: 'invert(1)' }} />}
              </div>
              <div className="c a" style={{ background: MID, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-poster-gothic), sans-serif', fontSize: '16px' }}>{EX.role_type}</div>
              <div className="c a" style={{ background: NO }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '6px', background: EX.team_color || '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {EX.logo_url && <img src={EX.logo_url} alt="" onError={hideImg} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />}
                </div>
              </div>
            </div>
            <div className="htp-lab">
              {[
                t('howto.col.player'),
                t('howto.col.region'),
                t('howto.col.nat'),
                t('howto.col.role'),
                t('howto.col.subRole'),
                t('howto.col.team'),
              ].map((l, i) => (
                <div key={i} className={i === 0 ? 'p' : 'a'} style={{ fontFamily: 'var(--font-ow-esports), sans-serif', fontSize: '9px', letterSpacing: '0.04em', color: muted, textTransform: 'uppercase' }}>{l}</div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-poster-gothic), sans-serif', fontSize: '13px', color: muted, lineHeight: 1.6, margin: '12px 0 0' }}>
              {t('howto.exampleExplain')}
            </p>
          </div>

          {/* Colours */}
          <div>
            <span style={eyebrow}>{t('howto.coloursTitle')}</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: t('howto.match'), bg: OK, fg: '#0b3b1e' },
                { label: t('howto.close'), bg: MID, fg: '#5a4a10' },
                { label: t('howto.miss'), bg: NO, fg: '#4a1414' },
              ].map(({ label, bg, fg }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: card, border: `1px solid ${divider}`, borderRadius: '6px', padding: '6px 11px 6px 7px' }}>
                  <span style={{ width: '15px', height: '15px', borderRadius: '4px', background: bg }} />
                  <span style={{ fontFamily: 'var(--font-ow-esports), sans-serif', fontSize: '11px', letterSpacing: '0.03em', color: fg === '#0b3b1e' ? OK : fg === '#5a4a10' ? MID : NO, filter: 'brightness(1.1)' }}>{label}</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-poster-gothic), sans-serif', fontSize: '12.5px', color: muted, lineHeight: 1.55, margin: '11px 0 0' }}>
              {t('howto.coloursExplain.pre')}<b style={{ color: text }}>{t('howto.coloursExplain.bold')}</b>{t('howto.coloursExplain.post')}
            </p>
          </div>

          {/* Teams */}
          <div>
            <span style={eyebrow}>{t('howto.teams')}</span>
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

          <div style={{ paddingBottom: '4px' }} />
        </div>
      </div>
    </>,
    document.body
  );
}
