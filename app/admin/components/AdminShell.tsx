"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Target,
  Flag,
  Users,
  Shield,
  LogOut,
  ChevronLeft,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Design tokens - "broadcast ops terminal".  Dark-only by intent:
 * a back-office tool reads best as one cohesive, high-contrast theme.
 * ------------------------------------------------------------------ */
export const ui = {
  bg: "#0a0a0a",
  panel: "#111112",
  panel2: "#17171a",
  raised: "#1d1d21",
  line: "rgba(255,255,255,0.08)",
  lineSoft: "rgba(255,255,255,0.05)",
  lineStrong: "rgba(255,255,255,0.16)",
  text: "#ededed",
  dim: "#8b8b90",
  faint: "#5a5a60",
  orange: "#f97316",
  orangeBright: "#ff8a3d",
  cyan: "#22d3ee",
  green: "#4ade80",
  rose: "#fb7185",
  violet: "#a78bfa",
} as const;

export const fontDisplay = "var(--font-poster-gothic), sans-serif";
export const fontLabel = "var(--font-ow-esports), sans-serif";
export const fontMono = "var(--font-geist-mono), monospace";
export const fontBody = "var(--font-geist-sans), sans-serif";

const NAV = [
  { key: "dashboard", label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { key: "analytics", label: "Analytics", path: "/admin/analytics", icon: LineChart },
  { key: "daily-pick", label: "Daily Pick", path: "/admin/daily-pick", icon: Target },
  { key: "usa-daily-pick", label: "USA Pick", path: "/admin/usa-daily-pick", icon: Flag },
  { key: "players", label: "Players", path: "/admin/players", icon: Users },
  { key: "teams", label: "Teams", path: "/admin/teams", icon: Shield },
];

/* ---------------------------------- *
 * Shared layout primitives
 * ---------------------------------- */
export function SectionLabel({ children, accent = ui.dim }: { children: ReactNode; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <span style={{ width: 14, height: 2, background: accent, borderRadius: 1 }} />
      <span
        style={{
          fontFamily: fontLabel,
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: ui.dim,
        }}
      >
        {children}
      </span>
    </div>
  );
}

export function Panel({
  children,
  style,
  pad = 18,
  className,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
  pad?: number;
  /** accepted for call-site compatibility; no longer rendered */
  brackets?: boolean;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        background: ui.panel,
        border: `1px solid ${ui.line}`,
        borderRadius: 6,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* Buttons reused across admin pages */
export function btnStyle(variant: "primary" | "ghost" | "danger" = "ghost"): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: fontLabel,
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: "9px 16px",
    borderRadius: 4,
    cursor: "pointer",
    transition: "all 0.15s ease",
    border: "1px solid transparent",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    lineHeight: 1,
  };
  if (variant === "primary")
    return { ...base, background: ui.orange, color: "#0a0a0a", borderColor: ui.orange, fontWeight: 600 };
  if (variant === "danger")
    return { ...base, background: "transparent", color: ui.rose, borderColor: "rgba(251,113,133,0.35)" };
  return { ...base, background: ui.panel2, color: ui.text, borderColor: ui.line };
}

/* ---------------------------------- *
 * The shell
 * ---------------------------------- */
export function AdminShell({
  title,
  subtitle,
  actions,
  children,
  maxWidth = 1180,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [clock, setClock] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/verify")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.authenticated) setAuthed(true);
        else router.push("/admin/login");
      })
      .catch(() => router.push("/admin/login"));
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {}
    router.push("/admin/login");
  }

  if (authed === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: ui.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: ui.faint,
          fontFamily: fontMono,
          fontSize: 12,
          letterSpacing: "0.2em",
        }}
      >
        <span className="admin-blink">AUTHENTICATING…</span>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: ui.bg,
        color: ui.text,
        fontFamily: fontBody,
      }}
    >
      <style>{globalCss}</style>

      {/* Sidebar (desktop) */}
      <aside className="admin-sidebar">
        <div style={{ padding: "20px 18px 16px" }}>
          <BrandMark />
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "4px 10px", flex: 1 }}>
          <div style={{ padding: "8px 10px 6px" }}>
            <span style={{ fontFamily: fontLabel, fontSize: 9.5, letterSpacing: "0.2em", color: ui.faint }}>
              CONTROL
            </span>
          </div>
          {NAV.map((item) => {
            const active = pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => router.push(item.path)}
                className="admin-nav-item"
                data-active={active}
              >
                <span className="admin-nav-bar" />
                <Icon size={16} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div style={{ padding: 10, borderTop: `1px solid ${ui.line}` }}>
          <button onClick={logout} className="admin-nav-item admin-logout">
            <span className="admin-nav-bar" />
            <LogOut size={16} strokeWidth={2} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <button onClick={() => router.push("/admin/dashboard")} className="admin-back" aria-label="Dashboard">
              <ChevronLeft size={16} />
            </button>
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontFamily: fontDisplay,
                  fontSize: 22,
                  lineHeight: 1,
                  margin: 0,
                  color: ui.text,
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <p style={{ margin: "5px 0 0", fontSize: 12, color: ui.dim, fontFamily: fontMono }}>{subtitle}</p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {actions}
            <div className="admin-clock">
              <span className="admin-dot" />
              <span style={{ fontFamily: fontMono, fontSize: 12, color: ui.dim, letterSpacing: "0.06em" }}>
                {clock}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile nav strip */}
        <div className="admin-mobile-nav">
          {NAV.map((item) => {
            const active = pathname === item.path;
            return (
              <button
                key={item.key}
                onClick={() => router.push(item.path)}
                style={{
                  fontFamily: fontLabel,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "8px 12px",
                  whiteSpace: "nowrap",
                  background: active ? ui.orange : ui.panel2,
                  color: active ? "#0a0a0a" : ui.dim,
                  border: `1px solid ${active ? ui.orange : ui.line}`,
                  borderRadius: 4,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <main style={{ maxWidth, margin: "0 auto", width: "100%", padding: "26px 26px 80px", boxSizing: "border-box" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 4,
          background: ui.orange,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fontDisplay,
          fontSize: 15,
          color: "#0a0a0a",
        }}
      >
        O
      </div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: fontDisplay, fontSize: 17, letterSpacing: "0.02em" }}>
          <span style={{ color: ui.orange }}>OWCS</span>
          <span style={{ color: ui.text }}>LE</span>
        </div>
        <div style={{ fontFamily: fontLabel, fontSize: 8.5, letterSpacing: "0.28em", color: ui.faint, marginTop: 3 }}>
          CONTROL ROOM
        </div>
      </div>
    </div>
  );
}

const globalCss = `
  .admin-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; width: 222px; z-index: 40;
    display: flex; flex-direction: column;
    background: ${ui.panel};
    border-right: 1px solid ${ui.line};
  }
  .admin-main { margin-left: 222px; min-height: 100vh; display: flex; flex-direction: column; }
  .admin-topbar {
    position: sticky; top: 0; z-index: 30;
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 26px;
    background: rgba(10,10,10,0.82);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid ${ui.line};
  }
  .admin-mobile-nav { display: none; }

  .admin-nav-item {
    position: relative; display: flex; align-items: center; gap: 11px;
    width: 100%; text-align: left; background: transparent; border: none;
    padding: 9px 12px; border-radius: 5px; cursor: pointer;
    color: ${ui.dim}; font-family: ${fontLabel}; font-size: 12px; letter-spacing: 0.04em;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .admin-nav-item .admin-nav-bar {
    position: absolute; left: -10px; top: 50%; transform: translateY(-50%) scaleY(0);
    width: 3px; height: 18px; background: ${ui.orange}; border-radius: 2px;
    transition: transform 0.18s cubic-bezier(0.16,1,0.3,1);
  }
  .admin-nav-item:hover { color: ${ui.text}; background: ${ui.panel2}; }
  .admin-nav-item[data-active="true"] { color: ${ui.text}; background: ${ui.panel2}; }
  .admin-nav-item[data-active="true"] .admin-nav-bar { transform: translateY(-50%) scaleY(1); }
  .admin-logout:hover { color: ${ui.rose}; }
  .admin-logout:hover .admin-nav-bar { background: ${ui.rose}; transform: translateY(-50%) scaleY(1); }

  .admin-back {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 5px; flex-shrink: 0;
    background: ${ui.panel2}; border: 1px solid ${ui.line}; color: ${ui.dim};
    cursor: pointer; transition: all 0.15s ease;
  }
  .admin-back:hover { color: ${ui.text}; border-color: ${ui.lineStrong}; }

  .admin-clock { display: flex; align-items: center; gap: 8px; padding: 7px 12px; background: ${ui.panel}; border: 1px solid ${ui.line}; border-radius: 5px; }
  .admin-dot { width: 6px; height: 6px; border-radius: 50%; background: ${ui.green}; }
  .admin-blink { animation: admin-blink 1.1s steps(2) infinite; }
  @keyframes admin-blink { 50% { opacity: 0.3; } }

  .admin-card-rise { animation: admin-rise 0.5s cubic-bezier(0.16,1,0.3,1) both; }
  @keyframes admin-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* shared form / control skin for management pages */
  .admin-h2 { font-family: ${fontDisplay}; font-size: 20px; color: ${ui.text}; margin: 0; letter-spacing: 0.01em; }
  .admin-label { display: block; font-family: ${fontLabel}; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: ${ui.faint}; margin-bottom: 8px; }
  .admin-input, .admin-select, .admin-textarea {
    width: 100%; box-sizing: border-box; padding: 11px 12px; background: #0c0c0e;
    border: 1px solid ${ui.line}; border-radius: 5px; color: ${ui.text};
    font-family: ${fontMono}; font-size: 13px; outline: none; color-scheme: dark;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .admin-textarea { font-family: ${fontBody}; line-height: 1.5; resize: vertical; }
  .admin-input:focus, .admin-select:focus, .admin-textarea:focus { border-color: ${ui.orange}; }
  .admin-select option { background: #141416; color: ${ui.text}; }

  .admin-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 11px 18px; border-radius: 5px; cursor: pointer; border: 1px solid ${ui.line};
    background: ${ui.panel2}; color: ${ui.text};
    font-family: ${fontLabel}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    transition: all 0.15s ease; line-height: 1;
  }
  .admin-btn:hover { border-color: ${ui.lineStrong}; }
  .admin-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .admin-btn--primary { background: ${ui.orange}; color: #0a0a0a; border-color: ${ui.orange}; font-weight: 600; }
  .admin-btn--primary:hover:not(:disabled) { filter: brightness(1.08); border-color: ${ui.orange}; }
  .admin-btn--accent { background: ${ui.violet}; color: #0a0a0a; border-color: ${ui.violet}; font-weight: 600; }
  .admin-btn--accent:hover:not(:disabled) { filter: brightness(1.08); }
  .admin-btn--danger { background: transparent; color: ${ui.rose}; border-color: rgba(251,113,133,0.35); }
  .admin-btn--danger:hover:not(:disabled) { background: rgba(251,113,133,0.1); }

  .admin-alert { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-radius: 5px; font-family: ${fontMono}; font-size: 12.5px; }
  .admin-alert--ok { color: ${ui.green}; background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.26); }
  .admin-alert--err { color: ${ui.rose}; background: rgba(251,113,133,0.08); border: 1px solid rgba(251,113,133,0.26); }
  .admin-note { padding: 12px 14px; border-radius: 5px; font-family: ${fontBody}; font-size: 12.5px; line-height: 1.55; color: ${ui.dim}; background: ${ui.panel2}; border: 1px solid ${ui.line}; border-left: 2px solid ${ui.orange}; }
  .admin-note strong { color: ${ui.text}; }

  @media (max-width: 820px) {
    .admin-sidebar { display: none; }
    .admin-main { margin-left: 0; }
    .admin-mobile-nav {
      display: flex; gap: 7px; overflow-x: auto; padding: 12px 16px;
      border-bottom: 1px solid ${ui.line}; -ms-overflow-style: none; scrollbar-width: none;
    }
    .admin-mobile-nav::-webkit-scrollbar { display: none; }
    .admin-topbar { padding: 14px 16px; }
  }
`;
