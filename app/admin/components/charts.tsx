"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ui, fontMono, fontLabel, fontDisplay } from "./AdminShell";

export const nf = (n: number) => n.toLocaleString("en-US");

/* Measure a container's pixel width so SVGs render 1:1 (no viewBox stretch). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(ref.current);
    setW(ref.current.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/* ------------------------------------------------------------------ *
 * AreaChart - multi-series time series with grid, crosshair + tooltip
 * ------------------------------------------------------------------ */
export interface Series {
  name: string;
  color: string;
  data: number[];
  /* render as a faint dashed reference line instead of an area */
  ghost?: boolean;
}

export function AreaChart({
  series,
  labels,
  height = 260,
  formatValue = (v: number) => nf(Math.round(v)),
  yTicks = 4,
  live,
  liveColor = "#fbbf24",
}: {
  series: Series[];
  labels: string[];
  height?: number;
  formatValue?: (v: number) => string;
  yTicks?: number;
  /** per-point overlay: phase label (e.g. "Stage 2") to mark, or null */
  live?: (string | null)[];
  liveColor?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padL = 46;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = Math.max(0, w - padL - padR);
  const plotH = height - padT - padB;
  const n = labels.length;

  const allVals = series.flatMap((s) => s.data);
  const rawMax = allVals.length ? Math.max(...allVals) : 1;
  const max = niceCeil(rawMax || 1);

  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH * (1 - v / max);
  const step = n > 1 ? plotW / (n - 1) : plotW;
  const liveIdx = live ? live.map((v, i) => (v ? i : -1)).filter((i) => i >= 0) : [];

  const linePath = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const areaPath = (data: number[]) =>
    `${linePath(data)} L ${x(n - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (max / yTicks) * i);

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    if (n === 0) return;
    // rel is already measured from the hit-area's left edge (which sits at padL),
    // so map it directly across the rect's own width - no second padL offset.
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = e.clientX - rect.left;
    const i = Math.round((rel / (rect.width || 1)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  const labelEvery = n > 12 ? Math.ceil(n / 7) : 1;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {w > 0 && (
        <svg width={w} height={height} style={{ display: "block" }}>
          {/* grid + y labels */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={padL}
                x2={w - padR}
                y1={y(t)}
                y2={y(t)}
                stroke={ui.line}
                strokeDasharray={i === 0 ? undefined : "2 4"}
              />
              <text x={padL - 10} y={y(t) + 3.5} textAnchor="end" fontSize={10} fontFamily={fontMono} fill={ui.faint}>
                {formatValue(t)}
              </text>
            </g>
          ))}

          {/* OWCS-live highlight bands + top markers */}
          {liveIdx.map((i) => {
            const left = Math.max(padL, x(i) - step / 2);
            const right = Math.min(w - padR, x(i) + step / 2);
            return (
              <g key={`live-${i}`}>
                <rect x={left} y={padT} width={Math.max(0, right - left)} height={plotH} fill={liveColor} opacity={hover === i ? 0.14 : 0.08} />
                <path d={`M ${x(i) - 4} ${padT} L ${x(i) + 4} ${padT} L ${x(i)} ${padT + 5} Z`} fill={liveColor} />
              </g>
            );
          })}

          {/* x labels */}
          {labels.map((lab, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={height - 9} textAnchor="middle" fontSize={9.5} fontFamily={fontMono} fill={ui.faint}>
                {lab}
              </text>
            ) : null
          )}

          {/* series */}
          {series.map((s, si) =>
            s.ghost ? (
              <path key={si} d={linePath(s.data)} fill="none" stroke={s.color} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.5} />
            ) : (
              <g key={si}>
                <path d={areaPath(s.data)} fill={s.color} fillOpacity={0.08} />
                <path d={linePath(s.data)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            )
          )}

          {/* crosshair */}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} stroke={ui.lineStrong} strokeDasharray="3 3" />
              {series.filter((s) => !s.ghost).map((s, si) => (
                <circle key={si} cx={x(hover)} cy={y(s.data[hover])} r={4} fill={ui.bg} stroke={s.color} strokeWidth={2} />
              ))}
            </g>
          )}

          {/* hit area */}
          <rect
            x={padL}
            y={padT}
            width={plotW}
            height={plotH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
      )}

      {/* tooltip */}
      {hover !== null && w > 0 && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: Math.min(Math.max(x(hover) + 12, 8), w - 168),
            pointerEvents: "none",
            background: "rgba(15,15,17,0.96)",
            border: `1px solid ${ui.lineStrong}`,
            borderRadius: 6,
            padding: "9px 11px",
            minWidth: 132,
            boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ fontFamily: fontMono, fontSize: 10.5, color: ui.dim, marginBottom: 7, letterSpacing: "0.04em" }}>
            {labels[hover]}
          </div>
          {live && live[hover] && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, paddingBottom: 7, borderBottom: `1px solid ${ui.line}` }}>
              <span style={{ width: 8, height: 8, background: liveColor, borderRadius: 1 }} />
              <span style={{ fontFamily: fontLabel, fontSize: 9.5, letterSpacing: "0.1em", color: liveColor, textTransform: "uppercase" }}>
                OWCS Live · {live[hover]}
              </span>
            </div>
          )}
          {series.map((s, si) => (
            <div key={si} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginTop: si ? 4 : 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                <span style={{ fontFamily: fontLabel, fontSize: 10, letterSpacing: "0.08em", color: ui.dim, textTransform: "uppercase" }}>
                  {s.name}
                </span>
              </span>
              <span style={{ fontFamily: fontMono, fontSize: 12, color: ui.text }}>{formatValue(s.data[hover])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * BarList - labeled horizontal bars
 * ------------------------------------------------------------------ */
export function BarList({ items, formatValue = nf }: { items: { label: string; value: number; color?: string }[]; formatValue?: (v: number) => string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      {items.map((it, i) => (
        <div key={it.label}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontFamily: fontLabel, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: ui.dim }}>
              {it.label}
            </span>
            <span style={{ fontFamily: fontMono, fontSize: 12.5, color: ui.text }}>{formatValue(it.value)}</span>
          </div>
          <div style={{ height: 7, background: ui.panel2, borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: mounted ? `${(it.value / max) * 100}%` : "0%",
                background: it.color ?? ui.cyan,
                borderRadius: 3,
                transition: `width 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Donut - single ratio
 * ------------------------------------------------------------------ */
export function Donut({ value, size = 132, stroke = 12, color = ui.orange, centerTop, centerSub }: { value: number; size?: number; stroke?: number; color?: string; centerTop?: ReactNode; centerSub?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ui.panel2} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={mounted ? c * (1 - pct) : c}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: fontDisplay, fontSize: 30, lineHeight: 1, color: ui.text }}>{centerTop}</span>
        {centerSub && <span style={{ fontFamily: fontLabel, fontSize: 9.5, letterSpacing: "0.16em", color: ui.dim, marginTop: 5, textTransform: "uppercase" }}>{centerSub}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sparkline - tiny inline trend
 * ------------------------------------------------------------------ */
export function Sparkline({ data, color = ui.cyan, width = 96, height = 30 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={2.4} fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * StatCard
 * ------------------------------------------------------------------ */
export function StatCard({
  label,
  value,
  sub,
  accent = ui.orange,
  spark,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
  spark?: number[];
  delay?: number;
}) {
  return (
    <div
      className="admin-card-rise"
      style={{
        position: "relative",
        background: ui.panel,
        border: `1px solid ${ui.line}`,
        borderRadius: 6,
        padding: "16px 16px 14px",
        overflow: "hidden",
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 28, height: 2, background: accent }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: fontLabel, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: ui.dim }}>
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
        <div>
          <div style={{ fontFamily: fontDisplay, fontSize: 30, lineHeight: 0.95, color: ui.text, letterSpacing: "0.01em" }}>
            {value}
          </div>
          {sub && <div style={{ fontFamily: fontMono, fontSize: 11, color: ui.dim, marginTop: 7 }}>{sub}</div>}
        </div>
        {spark && spark.length > 1 && <Sparkline data={spark} color={accent} />}
      </div>
    </div>
  );
}

/* round a max up to a clean axis value */
function niceCeil(v: number) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const base = v / pow;
  const step = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
  return step * pow;
}
