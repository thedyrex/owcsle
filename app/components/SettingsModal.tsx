"use client";

import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { ColorblindMode } from '@/hooks/useSettings';

interface Props {
  open: boolean;
  onClose: () => void;
  colorblindMode: ColorblindMode;
  onColorblindChange: (mode: ColorblindMode) => void;
  reduceMotion: boolean;
  onReduceMotionChange: (val: boolean) => void;
}


export function SettingsModal({ open, onClose, colorblindMode, onColorblindChange, reduceMotion, onReduceMotionChange }: Props) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
              SETTINGS
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

          {/* Toggle row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: rowBg, borderRadius: '4px',
            border: `1px solid ${divider}`,
          }}>
            <div>
              <div style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: text }}>COLORBLIND MODE</div>
              <div style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext, marginTop: '3px' }}>
                {colorblindMode !== 'none' ? 'ENABLED' : 'DISABLED'}
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
              <div style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: text }}>REDUCE MOTION</div>
              <div style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext, marginTop: '3px' }}>
                {reduceMotion ? 'ANIMATIONS DISABLED' : 'ANIMATIONS ENABLED'}
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
