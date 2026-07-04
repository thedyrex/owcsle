"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Trash2, AlertTriangle, Users } from "lucide-react";
import { AdminShell, Panel, SectionLabel, ui, fontDisplay, fontLabel, fontMono } from "../components/AdminShell";

const SUB_ROLES: Record<string, string[]> = {
  dps: ["HS", "FDPS"],
  support: ["FS", "MS"],
  tank: ["FT", "MT"],
};
interface Player {
  id: number;
  player_name: string;
  team_name: string;
  role: string;
  role_type: string | null;
  region: string;
}
interface DuplicateGroup {
  player_name: string;
  players: Player[];
}

const ROLE_FILTERS = ["all", "tank", "dps", "support"];

export default function PlayersPage() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [updatingRole, setUpdatingRole] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchPlayers = async () => {
    try {
      const response = await fetch("/api/admin/players");
      const data = await response.json();
      if (data.error) setError(data.error);
      else {
        setAllPlayers(data.players || []);
        setDuplicates(data.duplicates || []);
      }
    } catch {
      setError("Failed to fetch players");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const deletePlayer = async (playerId: number) => {
    if (!confirm("Are you sure you want to delete this player?")) return;
    setDeleting(playerId);
    try {
      const response = await fetch(`/api/admin/players/${playerId}`, { method: "DELETE" });
      if (response.ok) await fetchPlayers();
      else {
        const data = await response.json();
        alert(data.error || "Failed to delete player");
      }
    } catch {
      alert("Failed to delete player");
    } finally {
      setDeleting(null);
    }
  };

  const updateRole = async (playerId: number, role_type: string) => {
    setUpdatingRole(playerId);
    try {
      const res = await fetch(`/api/admin/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_type }),
      });
      if (res.ok) setAllPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, role_type } : p)));
      else {
        const d = await res.json();
        alert(d.error || "Failed to update role");
      }
    } catch {
      alert("Failed to update role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const deleteAllDuplicates = async () => {
    if (!confirm("This will keep the most recently scraped entry for each duplicate and delete the rest. Continue?")) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/players/delete-duplicates", { method: "POST" });
      if (response.ok) await fetchPlayers();
      else {
        const data = await response.json();
        alert(data.error || "Failed to delete duplicates");
      }
    } catch {
      alert("Failed to delete duplicates");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPlayers.filter((p) => {
      if (roleFilter !== "all" && (p.role || "").toLowerCase() !== roleFilter) return false;
      if (!q) return true;
      return [p.player_name, p.team_name, p.region, p.role].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [allPlayers, query, roleFilter]);

  return (
    <AdminShell
      title="Players"
      subtitle={`${allPlayers.length} IN ROSTER`}
      actions={
        duplicates.length > 0 ? (
          <button onClick={deleteAllDuplicates} className="admin-btn admin-btn--danger">
            <Trash2 size={13} /> Purge {duplicates.length} Dupes
          </button>
        ) : undefined
      }
    >
      <style>{css}</style>

      {error && (
        <div className="admin-alert admin-alert--err" style={{ marginBottom: 16 }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ fontFamily: fontMono, fontSize: 12, color: ui.faint, padding: "30px 0" }}>Loading roster…</div>
      ) : (
        <>
          {/* duplicates */}
          {duplicates.length > 0 && (
            <Panel pad={20} style={{ marginBottom: 16, borderColor: "rgba(251,113,133,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <SectionLabel accent={ui.rose}>Duplicate Players · {duplicates.length} groups</SectionLabel>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {duplicates.map((group) => (
                  <div key={group.player_name} style={{ border: `1px solid ${ui.line}`, borderRadius: 6, padding: 14 }}>
                    <div style={{ fontFamily: fontDisplay, fontSize: 16, color: ui.text, marginBottom: 10 }}>
                      {group.player_name} <span style={{ fontFamily: fontMono, fontSize: 11, color: ui.faint }}>· {group.players.length} entries</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {group.players.map((player, index) => (
                        <div
                          key={player.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 11px",
                            borderRadius: 5,
                            background: index === 0 ? "rgba(74,222,128,0.07)" : "rgba(251,113,133,0.06)",
                            border: `1px solid ${index === 0 ? "rgba(74,222,128,0.25)" : "rgba(251,113,133,0.22)"}`,
                          }}
                        >
                          <div style={{ fontFamily: fontMono, fontSize: 11.5, color: ui.dim }}>
                            <span style={{ color: ui.faint }}>#{player.id}</span> · <span style={{ color: ui.text }}>{player.team_name}</span> · {player.role} · {player.region}
                            {index === 0 && <span style={{ color: ui.green, marginLeft: 8 }}>keep</span>}
                          </div>
                          <button onClick={() => deletePlayer(player.id)} disabled={deleting === player.id} className="pl-del">
                            {deleting === player.id ? "…" : "Delete"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* controls */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
              <Search size={14} color={ui.faint} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, team, region…"
                className="admin-input"
                style={{ paddingLeft: 34 }}
              />
            </div>
            <div className="pl-seg">
              {ROLE_FILTERS.map((r) => (
                <button key={r} onClick={() => setRoleFilter(r)} data-active={roleFilter === r} className="pl-seg-btn">
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* table */}
          <Panel pad={0} style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${ui.line}`, display: "flex", alignItems: "center", gap: 10 }}>
              <Users size={14} color={ui.cyan} />
              <SectionLabel accent={ui.cyan}>Roster · {filtered.length} shown</SectionLabel>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="pl-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>ID</th>
                    <th style={{ textAlign: "left" }}>Name</th>
                    <th style={{ textAlign: "left" }}>Team</th>
                    <th style={{ textAlign: "left" }}>Role</th>
                    <th style={{ textAlign: "left" }}>Sub-Role</th>
                    <th style={{ textAlign: "left" }}>Region</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((player) => (
                    <tr key={player.id}>
                      <td style={{ color: ui.faint }}>{player.id}</td>
                      <td style={{ color: ui.text, fontFamily: fontLabel, letterSpacing: "0.02em" }}>{player.player_name}</td>
                      <td>{player.team_name}</td>
                      <td>
                        <span className="pl-role" data-role={(player.role || "").toLowerCase()}>{player.role}</span>
                      </td>
                      <td>
                        <select
                          value={player.role_type || ""}
                          disabled={updatingRole === player.id}
                          onChange={(e) => updateRole(player.id, e.target.value)}
                          className="pl-subrole"
                        >
                          <option value="" disabled>-</option>
                          {(SUB_ROLES[player.role] ?? []).map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td>{player.region}</td>
                      <td style={{ textAlign: "right" }}>
                        <button onClick={() => deletePlayer(player.id)} disabled={deleting === player.id} className="pl-del">
                          {deleting === player.id ? "…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: ui.faint, padding: "30px 0" }}>No players match</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </AdminShell>
  );
}

const css = `
  .pl-seg { display: inline-flex; background: ${ui.panel2}; border: 1px solid ${ui.line}; border-radius: 5px; padding: 3px; gap: 2px; }
  .pl-seg-btn { padding: 8px 14px; border: none; background: transparent; border-radius: 3px; cursor: pointer; font-family: ${fontLabel}; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: ${ui.dim}; transition: all 0.14s; }
  .pl-seg-btn:hover { color: ${ui.text}; }
  .pl-seg-btn[data-active="true"] { background: ${ui.raised}; color: ${ui.text}; }

  .pl-table { width: 100%; border-collapse: collapse; }
  .pl-table th { padding: 11px 16px; background: ${ui.panel2}; font-family: ${fontLabel}; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: ${ui.dim}; position: sticky; top: 0; }
  .pl-table td { padding: 10px 16px; font-family: ${fontMono}; font-size: 12px; color: ${ui.dim}; border-bottom: 1px solid ${ui.lineSoft}; white-space: nowrap; }
  .pl-table tbody tr { transition: background 0.12s; }
  .pl-table tbody tr:hover { background: ${ui.panel2}; }

  .pl-role { font-family: ${fontLabel}; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 8px; border-radius: 3px; background: ${ui.raised}; color: ${ui.dim}; }
  .pl-role[data-role="tank"] { color: ${ui.cyan}; background: rgba(34,211,238,0.1); }
  .pl-role[data-role="dps"] { color: ${ui.orange}; background: rgba(249,115,22,0.1); }
  .pl-role[data-role="support"] { color: ${ui.green}; background: rgba(74,222,128,0.1); }

  .pl-subrole { background: #0c0c0e; border: 1px solid ${ui.line}; border-radius: 4px; padding: 3px 6px; color: ${ui.text}; font-family: ${fontMono}; font-size: 11px; color-scheme: dark; outline: none; }
  .pl-subrole:focus { border-color: ${ui.orange}; }
  .pl-subrole:disabled { opacity: 0.5; }

  .pl-del { padding: 5px 11px; font-family: ${fontLabel}; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: ${ui.rose}; background: transparent; border: 1px solid rgba(251,113,133,0.3); border-radius: 4px; cursor: pointer; transition: background 0.14s; }
  .pl-del:hover:not(:disabled) { background: rgba(251,113,133,0.12); }
  .pl-del:disabled { opacity: 0.4; cursor: not-allowed; }
`;
