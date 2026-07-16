'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { PenLine, Undo2, Eraser } from 'lucide-react';
import {
  SIGNATURE_WIDTH,
  SIGNATURE_HEIGHT,
  MIN_BRUSH_WIDTH,
  MAX_BRUSH_WIDTH,
  DEFAULT_BRUSH_WIDTH,
  MIN_POINT_DISTANCE,
  MAX_STROKES,
  MAX_POINTS_PER_STROKE,
  smoothSample,
  strokeToPath,
  type Point,
  type Stroke,
} from '@/lib/signatures';
import { formatCode, isCodeShaped, normalizeCode } from '@/lib/player-codes';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  playerSlug: string;
  /** Code lifted out of the signing link, if this visitor arrived with one. */
  initialCode?: string | null;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function SignatureModal({ isOpen, onClose, playerName, playerSlug, initialCode }: SignatureModalProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  // null while the visitor hasn't typed, so the link's code shows through.
  // Once they type, their input wins — including clearing it back to empty.
  const [typedCode, setTypedCode] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  // Mirrors strokesRef.current.length; strokes live in a ref so pointermove
  // never re-renders the tree, but the buttons still need to react to them.
  const [strokeCount, setStrokeCount] = useState(0);
  const [brushWidth, setBrushWidth] = useState(DEFAULT_BRUSH_WIDTH);

  const code = typedCode ?? initialCode ?? '';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  /* Repaint every stroke from scratch. Cheap at this canvas size, and using the
   * same path builder as the SVG means the preview can't drift from the file. */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = dark ? '#ededed' : '#0a0a0a';
    for (const stroke of strokesRef.current) {
      ctx.lineWidth = stroke.width;
      ctx.stroke(new Path2D(strokeToPath(stroke.points)));
    }
  }, [dark]);

  /**
   * Repaint at most once a frame. A move event can fire many times per frame and
   * each repaint walks every stroke, so redrawing inline made long signatures
   * slower to draw the longer they got — and dropped input reads as ragged ink.
   */
  const scheduleRedraw = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      redraw();
    });
  }, [redraw]);

  /* Match the backing store to the pixels actually on screen so the preview is
   * never resampled, then map logical units onto it — stroke coordinates stay
   * in the SVG's viewBox space no matter how wide the pad is rendered. */
  useEffect(() => {
    if (!isOpen || !mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      // setTransform, not scale: this runs again on every resize, and scale
      // would compound onto the transform already there.
      ctx?.setTransform(canvas.width / SIGNATURE_WIDTH, 0, 0, canvas.height / SIGNATURE_HEIGHT, 0, 0);
      redraw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [isOpen, mounted, redraw]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      strokesRef.current = [];
      setStrokeCount(0);
      setTypedCode(null);
      setStatus('idle');
      setErrorMsg('');
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    // A pointer released outside the pad (or lost to a system gesture) still has
    // to end the stroke, or the next one would join onto it.
    const endStroke = () => {
      drawingRef.current = false;
    };
    window.addEventListener('pointerup', endStroke);
    window.addEventListener('pointercancel', endStroke);
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('pointerup', endStroke);
      window.removeEventListener('pointercancel', endStroke);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [isOpen, handleClose]);

  function pointFrom(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SIGNATURE_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * SIGNATURE_HEIGHT;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (status === 'submitting' || status === 'success') return;
    if (strokesRef.current.length >= MAX_STROKES) return;
    // Capture keeps a stroke alive when the pointer wanders off the pad, but
    // it throws if the pointer is already gone — that shouldn't lose the stroke.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    drawingRef.current = true;
    // Width is captured when the stroke starts, so moving the slider later
    // never rewrites ink that's already down.
    strokesRef.current = [...strokesRef.current, { width: brushWidth, points: [pointFrom(e)] }];
    setStrokeCount(strokesRef.current.length);
    redraw();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    // If the button came up somewhere we never saw it (released outside the
    // window, a system gesture), the pen would otherwise stick and trail ink
    // across the pad on hover. The button state on the move is the truth.
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      drawingRef.current = false;
      return;
    }
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    if (!stroke || stroke.points.length >= MAX_POINTS_PER_STROKE) return;

    // Coalesced events recover the points the browser dropped between frames,
    // which is what keeps fast strokes from going polygonal.
    const events = typeof e.nativeEvent.getCoalescedEvents === 'function'
      ? e.nativeEvent.getCoalescedEvents()
      : [e.nativeEvent];

    const rect = e.currentTarget.getBoundingClientRect();
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const x = ((ev.clientX - rect.left) / rect.width) * SIGNATURE_WIDTH;
      const y = ((ev.clientY - rect.top) / rect.height) * SIGNATURE_HEIGHT;
      const last = stroke.points[stroke.points.length - 1];
      const raw: Point = [x, y];
      const next = last ? smoothSample(last, raw) : raw;
      const point: Point = [Math.round(next[0] * 100) / 100, Math.round(next[1] * 100) / 100];
      // Keep anything the eye could resolve; drop only true duplicates. Measured
      // as real distance, so diagonal detail survives that a per-axis test lost.
      if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < MIN_POINT_DISTANCE) continue;
      if (stroke.points.length >= MAX_POINTS_PER_STROKE) break;
      stroke.points.push(point);
    }
    scheduleRedraw();
  }

  function onPointerUp() {
    drawingRef.current = false;
  }

  function undo() {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    redraw();
  }

  function clear() {
    strokesRef.current = [];
    setStrokeCount(0);
    redraw();
  }

  async function submit() {
    if (strokesRef.current.length === 0 || status === 'submitting') return;
    if (!isCodeShaped(normalizeCode(code))) return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerSlug,
          playerName,
          code: normalizeCode(code),
          strokes: strokesRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(typeof data.error === 'string' ? data.error : 'Something went wrong. Try again.');
        return;
      }
      setStatus('success');
      setTimeout(() => handleClose(), 1600);
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Try again.');
    }
  }

  if (!isOpen || !mounted) return null;

  const bg = dark ? '#111' : '#e8e8e8';
  const headerBg = dark ? '#0d0d0d' : '#dcdcdc';
  const padBg = dark ? '#1c1c1c' : '#fbfbfb';
  const inputBg = dark ? '#1c1c1c' : '#f0f0f0';
  const text = dark ? '#f0f0f0' : '#111';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  // The slider track needs more presence than a panel edge to read as a control.
  const border2 = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.25)';
  const font = 'var(--font-ow-esports), sans-serif';
  const busy = status === 'submitting' || status === 'success';
  // Both halves are required: a drawing without a code can't be attributed, and
  // a code without a drawing has nothing to attribute.
  const ready = strokeCount > 0 && isCodeShaped(normalizeCode(code));

  return createPortal(
    <>
      <style>{`
        @keyframes sgBackdropIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes sgBackdropOut { from { opacity:1; } to { opacity:0; } }
        @keyframes sgPanelIn  { from { opacity:0; transform:translate(-50%,calc(-50% + 20px)); } to { opacity:1; transform:translate(-50%,-50%); } }
        @keyframes sgPanelOut { from { opacity:1; transform:translate(-50%,-50%); } to { opacity:0; transform:translate(-50%,calc(-50% + 12px)); } }
        .sg-tool {
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer; padding: 4px 6px;
          font-family: ${font}; font-size: 10px; letter-spacing: 0.05em;
          color: ${text}; opacity: 0.5; transition: opacity 0.15s;
        }
        .sg-tool:hover:not(:disabled) { opacity: 0.9; }
        .sg-tool:disabled { opacity: 0.2; cursor: default; }
        .sg-code { outline: none; border: 1px solid ${border}; transition: border-color 0.15s; text-transform: uppercase; }
        .sg-code:focus { border-color: #f97316; }
        .sg-code::placeholder { letter-spacing: 0.04em; text-transform: none; }

        /* Terms are prose, so they get the body face rather than the display
           one the rest of the modal wears — these are read, not scanned. */
        .sg-terms-line {
          margin: 0; text-align: center;
          font-family: var(--font-geist-sans), sans-serif;
          font-size: 11px; line-height: 1.5; color: ${text}; opacity: 0.5;
        }
        .sg-terms-toggle {
          padding: 0; background: none; border: none; cursor: pointer;
          font: inherit; color: #f97316; text-decoration: underline;
          text-underline-offset: 2px;
        }
        .sg-terms-toggle:hover { filter: brightness(1.15); }
        .sg-terms-toggle:focus-visible { outline: 2px solid #f97316; outline-offset: 2px; border-radius: 2px; }
        .sg-terms {
          padding: 12px 14px; border-radius: 4px;
          background: ${inputBg}; border: 1px solid ${border};
        }
        .sg-terms p {
          margin: 0; font-family: var(--font-geist-sans), sans-serif;
          font-size: 11.5px; line-height: 1.55; color: ${text}; opacity: 0.75;
        }
        .sg-terms p + p { margin-top: 9px; }
        .sg-range {
          -webkit-appearance: none; appearance: none;
          width: 96px; height: 14px; background: transparent; cursor: pointer;
        }
        .sg-range:disabled { cursor: default; opacity: 0.4; }
        .sg-range::-webkit-slider-runnable-track {
          height: 2px; border-radius: 1px; background: ${border2};
        }
        .sg-range::-moz-range-track {
          height: 2px; border-radius: 1px; background: ${border2};
        }
        .sg-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 11px; height: 11px; margin-top: -4.5px;
          border-radius: 50%; background: #f97316; border: none;
        }
        .sg-range::-moz-range-thumb {
          width: 11px; height: 11px;
          border-radius: 50%; background: #f97316; border: none;
        }
        .sg-range:focus-visible { outline: none; }
        .sg-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px rgba(249,115,22,0.35); }
        .sg-range:focus-visible::-moz-range-thumb { box-shadow: 0 0 0 3px rgba(249,115,22,0.35); }
      `}</style>

      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 300,
          animation: closing ? 'sgBackdropOut 0.2s ease-out forwards' : 'sgBackdropIn 0.2s ease-out both',
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Sign for ${playerName}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          zIndex: 301,
          width: 'min(560px, calc(100vw - 24px))',
          // Short viewports (landscape phones) can't fit the pad plus controls,
          // and body scroll is locked — so the panel scrolls its own body.
          maxHeight: 'calc(100dvh - 24px)',
          background: bg,
          borderRadius: '4px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column',
          animation: closing ? 'sgPanelOut 0.2s ease-out forwards' : 'sgPanelIn 0.32s cubic-bezier(0.16,1,0.3,1) both',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px 14px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '2px solid #f97316',
          background: headerBg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <PenLine style={{ width: '14px', height: '14px', color: '#f97316', flexShrink: 0 }} />
            <span style={{
              fontFamily: font, fontSize: '13px', color: '#f97316', letterSpacing: '0.05em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              SIGN FOR {playerName.toUpperCase()}
            </span>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: text,
              opacity: 0.35, fontSize: '18px', lineHeight: 1, padding: '2px 4px',
              transition: 'opacity 0.15s', flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.35')}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px',
          overflowY: 'auto', minHeight: 0,
        }}>
          {/* Drawing board */}
          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                display: 'block',
                width: '100%',
                aspectRatio: `${SIGNATURE_WIDTH} / ${SIGNATURE_HEIGHT}`,
                background: padBg,
                border: `1px solid ${border}`,
                borderRadius: '4px',
                touchAction: 'none',
                cursor: busy ? 'default' : 'crosshair',
                opacity: busy ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            />
            {/* Signing line — sits under the ink as a place to aim for. */}
            <div style={{
              position: 'absolute', left: '8%', right: '8%', bottom: '22%',
              height: 1, background: border, pointerEvents: 'none',
            }} />
            {strokeCount === 0 && !busy && (
              <span style={{
                position: 'absolute', left: 0, right: 0, bottom: '11%',
                textAlign: 'center', pointerEvents: 'none',
                fontFamily: font, fontSize: '10px', letterSpacing: '0.12em',
                color: text, opacity: 0.25,
              }}>
                SIGN HERE
              </span>
            )}
          </div>

          {/* Tools */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', marginTop: '-4px', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button className="sg-tool" onClick={undo} disabled={strokeCount === 0 || busy}>
                <Undo2 style={{ width: 12, height: 12 }} /> UNDO
              </button>
              <button className="sg-tool" onClick={clear} disabled={strokeCount === 0 || busy}>
                <Eraser style={{ width: 12, height: 12 }} /> CLEAR
              </button>
            </div>

            {/* Brush size. Applies to the next stroke, so a signature can mix
                weights — the flourish can be heavier than the name. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <label
                htmlFor="sg-brush"
                style={{
                  fontFamily: font, fontSize: '10px', letterSpacing: '0.05em',
                  color: text, opacity: 0.5,
                }}
              >
                SIZE
              </label>
              <input
                id="sg-brush"
                className="sg-range"
                type="range"
                min={MIN_BRUSH_WIDTH}
                max={MAX_BRUSH_WIDTH}
                step={0.2}
                value={brushWidth}
                disabled={busy}
                onChange={(e) => setBrushWidth(Number(e.target.value))}
                aria-label="Brush size"
              />
              {/* Swatch renders at the brush's true on-pad size. */}
              <span
                aria-hidden="true"
                style={{
                  width: MAX_BRUSH_WIDTH, height: MAX_BRUSH_WIDTH,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{
                  width: brushWidth, height: brushWidth, borderRadius: '50%',
                  background: text, opacity: busy ? 0.3 : 0.85,
                  transition: 'width 0.1s, height 0.1s',
                }} />
              </span>
            </div>
          </div>

          <input
            type="text"
            value={formatCode(normalizeCode(code))}
            onChange={(e) => setTypedCode(e.target.value)}
            placeholder="Authentication code"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
            aria-label="Authentication code"
            className="sg-code"
            style={{
              width: '100%', padding: '10px 14px', background: inputBg,
              color: text, borderRadius: '4px', fontSize: '13px',
              fontFamily: font, letterSpacing: '0.12em', boxSizing: 'border-box',
            }}
          />

          {status === 'error' && (
            <span style={{ fontFamily: font, fontSize: '10px', color: '#ef4444' }}>
              {errorMsg.toUpperCase()}
            </span>
          )}
          {status === 'success' && (
            <span style={{ fontFamily: font, fontSize: '10px', color: '#22c55e' }}>
              SIGNATURE SUBMITTED. THANK YOU!
            </span>
          )}

          <button
            onClick={submit}
            disabled={!ready || busy}
            style={{
              width: '100%', padding: '12px', background: '#f97316',
              border: 'none', borderRadius: '4px',
              cursor: !ready || busy ? 'default' : 'pointer',
              fontFamily: font, fontSize: '12px', color: '#fff', letterSpacing: '0.05em',
              opacity: !ready || busy ? 0.45 : 1,
              transition: 'opacity 0.15s, filter 0.15s',
            }}
            onMouseEnter={(e) => { if (ready && !busy) e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
          >
            {status === 'submitting' ? 'SUBMITTING...' : status === 'success' ? 'SUBMITTED' : 'SUBMIT SIGNATURE'}
          </button>

          {/* Terms sit with the action, not on some page nobody opens — but
              collapsed, because the job here is to sign. */}
          <p className="sg-terms-line">
            By submitting, you agree to the{' '}
            <button
              type="button"
              className="sg-terms-toggle"
              onClick={() => setShowTerms((v) => !v)}
              aria-expanded={showTerms}
              aria-controls="sg-terms"
            >
              terms and usage
            </button>
            .
          </p>

          {showTerms && (
            <div id="sg-terms" className="sg-terms">
              <p>This signature is used for the trading card mechanic in OWCSLE.</p>
              <p>
                Usage of signatures and player cards can be revoked at any time by either
                party, no questions asked.
              </p>
            </div>
          )}

          <div style={{ paddingBottom: '4px' }} />
        </div>
      </div>
    </>,
    document.body
  );
}
