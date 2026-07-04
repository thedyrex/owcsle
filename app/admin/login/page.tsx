"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, ShieldAlert } from "lucide-react";
import { ui, fontDisplay, fontLabel, fontMono, fontBody } from "../components/AdminShell";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    checkAdminExists();
  }, []);

  async function checkAdminExists() {
    try {
      const response = await fetch("/api/admin/check");
      const data = await response.json();
      if (!data.exists) {
        router.push("/admin/setup");
      } else {
        setCheckingSetup(false);
      }
    } catch {
      setError("Failed to check admin status");
      setCheckingSetup(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (data.success) {
        router.push("/admin/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("An error occurred during login");
    } finally {
      setLoading(false);
    }
  }

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background: ui.bg,
    color: ui.text,
    fontFamily: fontBody,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
    backgroundImage: `
      linear-gradient(${ui.lineSoft} 1px, transparent 1px),
      linear-gradient(90deg, ${ui.lineSoft} 1px, transparent 1px),
      radial-gradient(circle at 70% 25%, rgba(249,115,22,0.12), transparent 50%),
      radial-gradient(circle at 20% 90%, rgba(34,211,238,0.07), transparent 45%)
    `,
    backgroundSize: "46px 46px, 46px 46px, 100% 100%, 100% 100%",
  };

  if (checkingSetup) {
    return (
      <div style={shell}>
        <span style={{ fontFamily: fontMono, fontSize: 12, letterSpacing: "0.2em", color: ui.faint }} className="lg-blink">
          INITIALIZING…
        </span>
      </div>
    );
  }

  return (
    <div style={shell}>
      <style>{css}</style>

      {/* giant ghost wordmark */}
      <div className="lg-ghost">OWCSLE</div>

      <div className="lg-card">
        {/* corner brackets */}
        <Bracket pos="tl" />
        <Bracket pos="tr" />
        <Bracket pos="bl" />
        <Bracket pos="br" />
        <div className="lg-accent" />

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="lg-logo">O</div>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontFamily: fontDisplay, fontSize: 21, letterSpacing: "0.02em" }}>
                <span style={{ color: ui.orange }}>OWCS</span>
                <span>LE</span>
              </div>
              <div style={{ fontFamily: fontLabel, fontSize: 8.5, letterSpacing: "0.3em", color: ui.faint, marginTop: 4 }}>
                CONTROL ROOM
              </div>
            </div>
          </div>
          <div className="lg-status">
            <span className="lg-dot" />
            <span style={{ fontFamily: fontMono, fontSize: 9.5, letterSpacing: "0.14em", color: ui.dim }}>SECURE</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22 }}>
          <Lock size={13} color={ui.faint} />
          <span style={{ fontFamily: fontLabel, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: ui.dim }}>
            Operator Sign-in
          </span>
        </div>

        {error && (
          <div className="lg-error">
            <ShieldAlert size={14} />
            <span style={{ fontFamily: fontMono, fontSize: 12 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Field label="Username" value={username} onChange={setUsername} type="text" autoFocus />
          <Field label="Password" value={password} onChange={setPassword} type="password" />

          <button type="submit" disabled={loading} className="lg-submit">
            {loading ? (
              <span style={{ fontFamily: fontMono, letterSpacing: "0.1em" }} className="lg-blink">
                VERIFYING…
              </span>
            ) : (
              <>
                <span>Authenticate</span>
                <ArrowRight size={15} strokeWidth={2.4} />
              </>
            )}
          </button>
        </form>

        <div className="lg-foot">
          <span>{"// AUTHORIZED PERSONNEL ONLY"}</span>
          <span>v2.0 · OWCSLE</span>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoFocus?: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="lg-label">{label}</label>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="lg-input"
        required
        autoComplete={type === "password" ? "current-password" : "username"}
      />
    </div>
  );
}

function Bracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const c = ui.lineStrong;
  const base: React.CSSProperties = { position: "absolute", width: 13, height: 13, pointerEvents: "none" };
  const map: Record<string, React.CSSProperties> = {
    tl: { top: -1, left: -1, borderTop: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` },
    tr: { top: -1, right: -1, borderTop: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` },
    bl: { bottom: -1, left: -1, borderBottom: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` },
    br: { bottom: -1, right: -1, borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` },
  };
  return <span style={{ ...base, ...map[pos] }} />;
}

const css = `
  .lg-blink { animation: lg-blink 1.1s steps(2) infinite; }
  @keyframes lg-blink { 50% { opacity: 0.3; } }

  .lg-ghost {
    position: absolute; font-family: ${fontDisplay}; font-size: 28vw; line-height: 1;
    color: rgba(255,255,255,0.018); user-select: none; pointer-events: none;
    letter-spacing: 0.02em; white-space: nowrap;
  }

  .lg-card {
    position: relative; width: 100%; max-width: 396px;
    background: linear-gradient(180deg, ${ui.panel}, #0d0d0e);
    border: 1px solid ${ui.line}; border-radius: 8px;
    padding: 30px 30px 18px;
    box-shadow: 0 40px 90px rgba(0,0,0,0.6);
    animation: lg-rise 0.55s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes lg-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .lg-accent { position: absolute; top: -1px; left: 22px; width: 54px; height: 2px; background: ${ui.orange}; box-shadow: 0 0 12px ${ui.orange}; }

  .lg-logo {
    width: 38px; height: 38px; border-radius: 7px;
    background: linear-gradient(135deg, ${ui.orange}, #c2410c);
    display: flex; align-items: center; justify-content: center;
    font-family: ${fontDisplay}; font-size: 19px; color: #0a0a0a;
    box-shadow: 0 6px 18px rgba(249,115,22,0.34);
  }

  .lg-status { display: flex; align-items: center; gap: 7px; padding: 5px 9px; background: ${ui.panel2}; border: 1px solid ${ui.line}; border-radius: 4px; }
  .lg-dot { width: 6px; height: 6px; border-radius: 50%; background: ${ui.green}; box-shadow: 0 0 8px ${ui.green}; animation: lg-pulse 2s ease-in-out infinite; }
  @keyframes lg-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

  .lg-label {
    display: block; font-family: ${fontMono}; font-size: 10px; letter-spacing: 0.14em;
    text-transform: uppercase; color: ${ui.faint}; margin-bottom: 7px;
  }
  .lg-input {
    width: 100%; box-sizing: border-box; padding: 12px 13px;
    background: #0c0c0e; border: 1px solid ${ui.line}; border-radius: 5px;
    color: ${ui.text}; font-family: ${fontMono}; font-size: 13.5px; letter-spacing: 0.02em;
    outline: none; caret-color: ${ui.orange}; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .lg-input:focus { border-color: ${ui.orange}; box-shadow: 0 0 0 3px rgba(249,115,22,0.12); }

  .lg-submit {
    width: 100%; margin-top: 8px; padding: 13px;
    display: flex; align-items: center; justify-content: center; gap: 9px;
    background: ${ui.orange}; color: #0a0a0a; border: none; border-radius: 5px;
    font-family: ${fontLabel}; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase;
    cursor: pointer; transition: filter 0.15s, transform 0.05s;
  }
  .lg-submit:hover { filter: brightness(1.08); }
  .lg-submit:active { transform: translateY(1px); }
  .lg-submit:disabled { opacity: 0.7; cursor: default; }

  .lg-error {
    display: flex; align-items: center; gap: 9px; margin-bottom: 18px;
    padding: 11px 13px; border-radius: 5px; color: ${ui.rose};
    background: rgba(251,113,133,0.08); border: 1px solid rgba(251,113,133,0.28);
  }

  .lg-foot {
    display: flex; justify-content: space-between; margin-top: 20px; padding-top: 14px;
    border-top: 1px solid ${ui.line};
    font-family: ${fontMono}; font-size: 9.5px; letter-spacing: 0.08em; color: ${ui.faint};
  }
`;
