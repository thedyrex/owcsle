"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Trash2, Download, PenLine, Link2, Check } from "lucide-react";
import {
  AdminShell,
  Panel,
  SectionLabel,
  ui,
  fontDisplay,
  fontMono,
} from "../components/AdminShell";

interface Signature {
  id: number;
  player_slug: string;
  player_name: string;
  url: string;
  r2_key: string;
  stroke_count: number;
  created_at: string;
}

export default function SignaturesPage() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const fetchSignatures = async () => {
    try {
      const res = await fetch("/api/admin/signatures");
      const data = await res.json();
      if (data.error) setError(data.error);
      else setSignatures(data.signatures || []);
    } catch {
      setError("Failed to fetch signatures");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignatures();
    fetch("/api/admin/signatures/share-link")
      .then((r) => r.json())
      .then((d) => setShareLink(d.url ?? null))
      .catch(() => setShareLink(null));
  }, []);

  const copyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1400);
    } catch {
      prompt("Copy this view link:", shareLink);
    }
  };

  const deleteSignature = async (id: number) => {
    if (!confirm("Delete this signature? This removes it from R2 too.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/signatures?id=${id}`, { method: "DELETE" });
      if (res.ok) setSignatures((prev) => prev.filter((s) => s.id !== id));
      else {
        const data = await res.json();
        alert(data.error || "Failed to delete signature");
      }
    } catch {
      alert("Failed to delete signature");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return signatures;
    return signatures.filter((s) => s.player_name.toLowerCase().includes(q));
  }, [signatures, query]);

  const playerCount = useMemo(
    () => new Set(signatures.map((s) => s.player_slug)).size,
    [signatures]
  );

  return (
    <AdminShell
      title="Signatures"
      subtitle={`${signatures.length} collected across ${playerCount} player${playerCount === 1 ? "" : "s"}`}
      actions={
        shareLink ? (
          <button onClick={copyShareLink} className="admin-btn" title={shareLink}>
            {shareCopied ? <Check size={13} /> : <Link2 size={13} />}
            {shareCopied ? "Copied" : "Copy view link"}
          </button>
        ) : undefined
      }
    >
      <style>{`
        .sig-grid {
          display: grid; gap: 14px;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }
        .sig-tile {
          background: #fff; border-radius: 4px; border: 1px solid ${ui.line};
          aspect-ratio: 600 / 260; display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .sig-tile img { width: 100%; height: 100%; object-fit: contain; }
        .sig-action {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 4px; cursor: pointer;
          background: ${ui.panel2}; border: 1px solid ${ui.line}; color: ${ui.dim};
          transition: all 0.15s ease;
        }
        .sig-action:hover { color: ${ui.text}; border-color: ${ui.lineStrong}; }
        .sig-action--danger:hover { color: ${ui.rose}; border-color: rgba(251,113,133,0.35); }
        .sig-action:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <SectionLabel accent={ui.orange}>Collected marks</SectionLabel>

        <div style={{ position: "relative" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: ui.faint,
            }}
          />
          <input
            className="admin-input"
            placeholder="Search by player…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>

        {error && <div className="admin-alert admin-alert--err">{error}</div>}

        {loading ? (
          <Panel>
            <span style={{ fontFamily: fontMono, fontSize: 12, color: ui.faint }}>
              LOADING SIGNATURES…
            </span>
          </Panel>
        ) : filtered.length === 0 ? (
          <Panel style={{ textAlign: "center", padding: "48px 18px" }}>
            <PenLine size={22} style={{ color: ui.faint, marginBottom: 12 }} />
            <p style={{ fontFamily: fontDisplay, fontSize: 17, margin: 0, color: ui.text }}>
              {signatures.length === 0 ? "No signatures yet" : "No matches"}
            </p>
            <p style={{ fontFamily: fontMono, fontSize: 12, color: ui.dim, margin: "8px 0 0" }}>
              {signatures.length === 0
                ? "Share /player/<name> and signatures land here."
                : "Try a different search."}
            </p>
          </Panel>
        ) : (
          <div className="sig-grid">
            {filtered.map((sig) => (
              <Panel key={sig.id} pad={12} className="admin-card-rise">
                <div className="sig-tile">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sig.url} alt={`Signature for ${sig.player_name}`} loading="lazy" />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: fontDisplay,
                        fontSize: 15,
                        color: ui.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {sig.player_name}
                    </div>
                    <div
                      style={{ fontFamily: fontMono, fontSize: 11, color: ui.faint, marginTop: 5 }}
                    >
                      {new Date(sig.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <a
                      className="sig-action"
                      href={sig.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      title="Download SVG"
                    >
                      <Download size={13} />
                    </a>
                    <button
                      className="sig-action sig-action--danger"
                      onClick={() => deleteSignature(sig.id)}
                      disabled={deleting === sig.id}
                      title="Delete signature"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
