"use client";

import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Monitor } from 'lucide-react';
import { ColorblindMode } from '@/hooks/useSettings';
import { useT, useLang } from './LanguageProvider';
import { LANGS } from '@/app/i18n/translations';

interface Props {
  open: boolean;
  onClose: () => void;
  colorblindMode: ColorblindMode;
  onColorblindChange: (mode: ColorblindMode) => void;
  reduceMotion: boolean;
  onReduceMotionChange: (val: boolean) => void;
}


export function SettingsModal({ open, onClose, colorblindMode, onColorblindChange, reduceMotion, onReduceMotionChange }: Props) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = useT();
  const { lang, setLang } = useLang();
  const dark = resolvedTheme === 'dark';
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Switch instantly (no view-transition wipe): the modal's backdrop blur has
  // nothing to blur against the transition snapshot, so the wipe would make the
  // blur visibly drop out for its duration.
  function switchTheme(next: string) {
    setTheme(next);
  }

  function handleClose() {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }

  if (!open || !mounted) return null;

  const bg = dark ? '#111' : '#e8e8e8';
  const text = dark ? '#f0f0f0' : '#111';
  const subtext = dark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)';
  const divider = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const rowBg = dark ? '#1c1c1c' : '#f0f0f0';

  return createPortal(
    <>
      <style>{`
        @keyframes stBackdropIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes stBackdropOut { from { opacity:1; } to { opacity:0; } }
        @keyframes stPanelIn  { from { opacity:0; transform:translate(-50%,calc(-50% + 20px)); } to { opacity:1; transform:translate(-50%,-50%); } }
        @keyframes stPanelOut { from { opacity:1; transform:translate(-50%,-50%); } to { opacity:0; transform:translate(-50%,calc(-50% + 12px)); } }
        .st-theme-row { display: flex; }
        @media (min-width: 640px) { .st-theme-row { display: none; } }
      `}</style>

      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 300,
        animation: closing ? 'stBackdropOut 0.2s ease-out forwards' : 'stBackdropIn 0.2s ease-out both',
      }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301,
        width: 'min(420px, calc(100vw - 16px))',
        background: bg,
        borderRadius: '6px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
        animation: closing ? 'stPanelOut 0.2s ease-out forwards' : 'stPanelIn 0.32s cubic-bezier(0.16,1,0.3,1) both',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 24px 14px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `2px solid #f97316`,
          background: dark ? '#0d0d0d' : '#dcdcdc',
          borderRadius: '6px 6px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings style={{ width: '14px', height: '14px', color: '#f97316' }} />
            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '13px', color: '#f97316', letterSpacing: '0.05em' }}>
              {t('settings.title')}
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

        {/* Body */}
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '5px' }}>

          {/* Theme row — mobile only (desktop uses the top-bar ThemeToggle) */}
          <div className="st-theme-row" style={{
            alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: rowBg, borderRadius: '4px',
            border: `1px solid ${divider}`,
          }}>
            <div style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: text }}>{t('settings.theme')}</div>
            <div style={{ display: 'flex', gap: '4px', background: dark ? '#0d0d0d' : '#dcdcdc', padding: '3px', borderRadius: '6px' }}>
              {[
                { key: 'light', Icon: Sun },
                { key: 'dark', Icon: Moon },
                { key: 'system', Icon: Monitor },
              ].map(({ key, Icon }) => (
                <button
                  key={key}
                  aria-label={t(`settings.theme.${key}`)}
                  onClick={() => switchTheme(key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '30px', height: '26px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                    background: theme === key ? '#f97316' : 'transparent',
                    color: theme === key ? '#fff' : subtext,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  <Icon style={{ width: '15px', height: '15px' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Language row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: rowBg, borderRadius: '4px',
            border: `1px solid ${divider}`,
          }}>
            <div style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: text }}>{t('settings.language')}</div>
            <div style={{ display: 'flex', gap: '4px', background: dark ? '#0d0d0d' : '#dcdcdc', padding: '3px', borderRadius: '6px' }}>
              {LANGS.map(({ code, label }) => (
                <button
                  key={code}
                  aria-label={label}
                  onClick={() => setLang(code)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: '40px', height: '26px', padding: '0 10px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                    fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px',
                    background: lang === code ? '#f97316' : 'transparent',
                    color: lang === code ? '#fff' : subtext,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: rowBg, borderRadius: '4px',
            border: `1px solid ${divider}`,
          }}>
            <div>
              <div style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: text }}>{t('settings.colorblind')}</div>
              <div style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext, marginTop: '3px' }}>
                {colorblindMode !== 'none' ? t('settings.enabled') : t('settings.disabled')}
              </div>
            </div>
            <button
              onClick={() => onColorblindChange(colorblindMode === 'none' ? 'deuteranopia' : 'none')}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: colorblindMode !== 'none' ? '#f97316' : (dark ? '#333' : '#ccc'),
                position: 'relative', flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: '3px',
                left: colorblindMode !== 'none' ? '23px' : '3px',
                width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
          </div>

          {/* Reduce motion */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: rowBg, borderRadius: '4px',
            border: `1px solid ${divider}`,
          }}>
            <div>
              <div style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: text }}>{t('settings.reduceMotion')}</div>
              <div style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext, marginTop: '3px' }}>
                {reduceMotion ? t('settings.animOff') : t('settings.animOn')}
              </div>
            </div>
            <button
              onClick={() => onReduceMotionChange(!reduceMotion)}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: reduceMotion ? '#f97316' : (dark ? '#333' : '#ccc'),
                position: 'relative', flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: '3px',
                left: reduceMotion ? '23px' : '3px',
                width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}
