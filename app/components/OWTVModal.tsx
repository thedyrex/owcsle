'use client';
import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import type { OWTVData } from '@/app/api/cron/scrape-owtv/route';

const LINKS = [
  { label: 'MATCHES',     path: 'matches' },
  { label: 'TOURNAMENTS', path: 'tournaments' },
  { label: 'NEWS',        path: 'news' },
  { label: 'WATCH',       path: 'watch' },
  { label: 'FANTASY',     path: 'fantasy' },
];

interface OWTVModalProps {
  open: boolean;
  onClose: () => void;
}

function formatDate(raw: string): string {
  if (!raw) return '';
  try {
    return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return raw;
  }
}

export function OWTVModal({ open, onClose }: OWTVModalProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [owtvData, setOwtvData] = useState<OWTVData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDataLoading(true);
    fetch('/api/owtv-data')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d) setOwtvData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  function handleClose() {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }

  if (!open || !mounted) return null;

  const bg      = dark ? '#111' : '#e8e8e8';
  const card    = dark ? '#1c1c1c' : '#f0f0f0';
  const text    = dark ? '#f0f0f0' : '#111';

  const divider = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const headerBg = dark ? '#0d0d0d' : '#dcdcdc';
  const accent  = '#00C8FF';

  const hasLiveData = !!owtvData;

  return createPortal(
    <>
      <style>{`
        @keyframes owtvBackdropIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes owtvBackdropOut { from { opacity:1; } to { opacity:0; } }
        @keyframes owtvPanelIn  { from { opacity:0; transform:translate(-50%,calc(-50% + 20px)); } to { opacity:1; transform:translate(-50%,-50%); } }
        @keyframes owtvPanelOut { from { opacity:1; transform:translate(-50%,-50%); } to { opacity:0; transform:translate(-50%,calc(-50% + 12px)); } }
        .owtv-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .owtv-scroll::-webkit-scrollbar-track { background: transparent; }
        .owtv-scroll::-webkit-scrollbar-thumb { background: ${accent}44; border-radius: 4px; }
        .owtv-link:hover { opacity: 0.75; }
        .owtv-nav-link:hover { opacity: 0.7; }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 300,
        animation: closing ? 'owtvBackdropOut 0.2s ease-out forwards' : 'owtvBackdropIn 0.2s ease-out both',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301,
        width: 'min(480px, calc(100vw - 24px))',
        maxHeight: 'min(680px, calc(100vh - 32px))',
        background: bg,
        borderRadius: '4px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
        animation: closing ? 'owtvPanelOut 0.2s ease-out forwards' : 'owtvPanelIn 0.32s cubic-bezier(0.16,1,0.3,1) both',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '14px 20px 12px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `2px solid ${accent}`,
          background: headerBg,
        }}>
          <a href="https://owtv.gg" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', opacity: 1, transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <img src={dark ? '/LOGO_NAME_WHITE_BLUE.png' : '/OWTV_LOGO_darkblue.png'} alt="OWTV" style={{ height: '18px', objectFit: 'contain' }} />
          </a>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: text, opacity: 0.35, fontSize: '18px', lineHeight: 1,
            padding: '2px 4px', transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div className="owtv-scroll" style={{ overflowY: 'auto', flex: 1 }}>

          {/* Featured Article */}
          {hasLiveData && owtvData.featuredArticle && (
            <a
              href={owtvData.featuredArticle.url}
              target="_blank"
              rel="noopener noreferrer"
              className="owtv-link"
              style={{ display: 'block', textDecoration: 'none', transition: 'opacity 0.15s' }}
            >
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/7', overflow: 'hidden', background: '#0a0a0a' }}>
                {owtvData.featuredArticle.imageUrl && (
                  <img
                    src={owtvData.featuredArticle.imageUrl}
                    alt={owtvData.featuredArticle.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
                }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px' }}>
                  <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '13px', color: '#fff', lineHeight: 1.35, margin: '0 0 5px' }}>
                    {owtvData.featuredArticle.title}
                  </p>
                  {(owtvData.featuredArticle.date || owtvData.featuredArticle.readTime) && (
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {owtvData.featuredArticle.date && <span>{formatDate(owtvData.featuredArticle.date)}</span>}
                      {owtvData.featuredArticle.date && owtvData.featuredArticle.readTime && (
                        <span style={{ opacity: 0.5 }}>•</span>
                      )}
                      {owtvData.featuredArticle.readTime && <span>{owtvData.featuredArticle.readTime}</span>}
                    </p>
                  )}
                </div>
              </div>
            </a>
          )}

          {/* Loading skeleton for featured */}
          {dataLoading && !owtvData && (
            <div style={{ width: '100%', aspectRatio: '16/7', background: card, animation: 'pulse 1.5s ease-in-out infinite' }} />
          )}

          {/* Recent Videos */}
          {hasLiveData && owtvData.recentVideos.length > 0 && (
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: text, letterSpacing: '0.07em' }}>
                  RECENT VIDEOS
                </span>
                <a href="https://owtv.gg/watch" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '11px', color: accent, textDecoration: 'none' }}
                  className="owtv-link"
                ><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>See more <ExternalLink size={11} /></span></a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                {owtvData.recentVideos.slice(0, 4).map((v, i) => (
                  <a
                    key={i}
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="owtv-link"
                    style={{ textDecoration: 'none', display: 'block', transition: 'opacity 0.15s' }}
                  >
                    <div style={{ background: card, borderRadius: '4px', overflow: 'hidden', border: `1px solid ${divider}` }}>
                      <div style={{ width: '100%', aspectRatio: '16/9', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
                        {v.thumbnailUrl ? (
                          <img src={v.thumbnailUrl} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '20px', opacity: 0.3 }}>▶</span>
                          </div>
                        )}
                        <div style={{
                          position: 'absolute', bottom: '6px', left: '6px',
                          background: accent, borderRadius: '2px',
                          padding: '1px 5px',
                          fontFamily: "var(--font-ow-esports), sans-serif",
                          fontSize: '9px', color: '#000', letterSpacing: '0.04em',
                        }}>
                          {v.category}
                        </div>
                      </div>
                      <div style={{ padding: '7px 8px' }}>
                        <p style={{
                          fontFamily: "var(--font-ow-esports), sans-serif",
                          fontSize: '10px', color: text, margin: 0, lineHeight: 1.35,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {v.title}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}


          {/* Nav links - always shown */}
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '4px',
            borderTop: hasLiveData ? `1px solid ${divider}` : 'none',
            paddingTop: hasLiveData ? '14px' : '12px',
          }}>
            {LINKS.map(({ label, path }) => (
              <a
                key={path}
                href={`https://owtv.gg/${path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="owtv-nav-link"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: card, borderRadius: '4px',
                  textDecoration: 'none', border: `1px solid ${divider}`,
                  transition: 'opacity 0.15s',
                }}
              >
                <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: text, letterSpacing: '0.05em' }}>{label}</span>
                <ExternalLink size={12} style={{ color: accent, flexShrink: 0 }} />
              </a>
            ))}
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}
