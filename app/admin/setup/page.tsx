"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, UserPlus, ShieldAlert } from "lucide-react";
import { ui, fontDisplay, fontLabel, fontMono, fontBody } from "../components/AdminShell";

export default function AdminSetup() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAdminExists();
  }, []);

  async function checkAdminExists() {
    try {
      const response = await fetch("/api/admin/check");
      const data = await response.json();
      if (data.exists) router.push("/admin/login");
      else setChecking(false);
    } catch {
      setError("Failed to check admin status");
      setChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (data.success) router.push("/admin/login");
      else setError(data.error || "Setup failed");
    } catch {
      setError("An error occurred during setup");
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

  if (checking) {
    return (
      <div style={shell}>
        <span style={{ fontFamily: fontMono, fontSize: 12, letterSpacing: "0.2em", color: ui.faint }} className="su-blink">
          CHECKING STATUS…
        </span>
      </div>
    );
  }

  return (
    <div style={shell}>
      <style>{css}</style>
      <div className="su-ghost">SETUP</div>

      <div className="su-card">
        <div className="su-accent" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div className="su-logo">O</div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: fontDisplay, fontSize: 21, letterSpacing: "0.02em" }}>
              <span style={{ color: ui.orange }}>OWCS</span>
              <span>LE</span>
            </div>
            <div style={{ fontFamily: fontLabel, fontSize: 8.5, letterSpacing: "0.3em", color: ui.faint, marginTop: 4 }}>CONTROL ROOM</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "20px 0 22px" }}>
          <UserPlus size={13} color={ui.faint} />
          <span style={{ fontFamily: fontLabel, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: ui.dim }}>
            First-Time Setup
          </span>
        </div>

        {error && (
          <div className="su-error">
            <ShieldAlert size={14} />
            <span style={{ fontFamily: fontMono, fontSize: 12 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Field label="Username" value={username} onChange={setUsername} type="text" autoFocus />
          <Field label="Password" value={password} onChange={setPassword} type="password" hint="Minimum 8 characters" />
          <Field label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} type="password" />

          <button type="submit" disabled={loading} className="su-submit">
            {loading ? (
              <span className="su-blink" style={{ fontFamily: fontMono, letterSpacing: "0.1em" }}>CREATING…</span>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={15} strokeWidth={2.4} />
              </>
            )}
          </button>
        </form>

        <div className="su-foot">
          <span>{"// INITIAL OPERATOR PROVISION"}</span>
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoFocus?: boolean;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 15 }}>
      <label className="su-label">{label}</label>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="su-input"
        required
        minLength={type === "password" ? 8 : 3}
      />
      {hint && <p style={{ fontFamily: fontMono, fontSize: 10, color: ui.faint, margin: "6px 0 0" }}>{hint}</p>}
    </div>
  );
}

const css = `
  .su-blink { animation: su-blink 1.1s steps(2) infinite; }
  @keyframes su-blink { 50% { opacity: 0.3; } }
  .su-ghost { position: absolute; font-family: ${fontDisplay}; font-size: 30vw; line-height: 1; color: rgba(255,255,255,0.018); user-select: none; pointer-events: none; white-space: nowrap; }
  .su-card { position: relative; width: 100%; max-width: 396px; background: linear-gradient(180deg, ${ui.panel}, #0d0d0e); border: 1px solid ${ui.line}; border-radius: 8px; padding: 30px; box-shadow: 0 40px 90px rgba(0,0,0,0.6); animation: su-rise 0.55s cubic-bezier(0.16,1,0.3,1) both; }
  @keyframes su-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .su-accent { position: absolute; top: -1px; left: 22px; width: 54px; height: 2px; background: ${ui.orange}; box-shadow: 0 0 12px ${ui.orange}; }
  .su-logo { width: 38px; height: 38px; border-radius: 7px; background: linear-gradient(135deg, ${ui.orange}, #c2410c); display: flex; align-items: center; justify-content: center; font-family: ${fontDisplay}; font-size: 19px; color: #0a0a0a; box-shadow: 0 6px 18px rgba(249,115,22,0.34); }
  .su-label { display: block; font-family: ${fontMono}; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: ${ui.faint}; margin-bottom: 7px; }
  .su-input { width: 100%; box-sizing: border-box; padding: 12px 13px; background: #0c0c0e; border: 1px solid ${ui.line}; border-radius: 5px; color: ${ui.text}; font-family: ${fontMono}; font-size: 13.5px; outline: none; caret-color: ${ui.orange}; transition: border-color 0.15s, box-shadow 0.15s; }
  .su-input:focus { border-color: ${ui.orange}; box-shadow: 0 0 0 3px rgba(249,115,22,0.12); }
  .su-submit { width: 100%; margin-top: 10px; padding: 13px; display: flex; align-items: center; justify-content: center; gap: 9px; background: ${ui.orange}; color: #0a0a0a; border: none; border-radius: 5px; font-family: ${fontLabel}; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: filter 0.15s, transform 0.05s; }
  .su-submit:hover { filter: brightness(1.08); }
  .su-submit:active { transform: translateY(1px); }
  .su-submit:disabled { opacity: 0.7; cursor: default; }
  .su-error { display: flex; align-items: center; gap: 9px; margin-bottom: 18px; padding: 11px 13px; border-radius: 5px; color: ${ui.rose}; background: rgba(251,113,133,0.08); border: 1px solid rgba(251,113,133,0.28); }
  .su-foot { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 14px; border-top: 1px solid ${ui.line}; font-family: ${fontMono}; font-size: 9.5px; letter-spacing: 0.08em; color: ${ui.faint}; }
`;
