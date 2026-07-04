"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { RefreshCw, X, Pencil, Upload, ImagePlus, Check, Info } from "lucide-react";
import { AdminShell, Panel, SectionLabel, ui, fontDisplay, fontLabel, fontMono } from "../components/AdminShell";

interface Team {
  id: number;
  team_name: string;
  team_logo: string | null;
  team_color: string | null;
  player_count?: number;
}

export default function ManageTeams() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [message, setMessage] = useState("");
  const [uploadingTeamId, setUploadingTeamId] = useState<number | null>(null);
  const [syncingColors, setSyncingColors] = useState(false);
  const [pickerTeamId, setPickerTeamId] = useState<number | null>(null);
  const [existingLogos, setExistingLogos] = useState<string[]>([]);
  const [erroredLogos, setErroredLogos] = useState<Set<number>>(new Set());

  async function loadTeams() {
    try {
      const response = await fetch("/api/admin/teams");
      const data = await response.json();
      setTeams(data.teams || []);
    } catch {
      setTeams([]);
    }
  }

  useEffect(() => {
    loadTeams().finally(() => setLoading(false));
  }, []);

  async function handleUpdateTeam() {
    if (!editingTeam) return;
    try {
      const response = await fetch(`/api/admin/teams/${editingTeam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_name: editingTeam.team_name, team_color: editingTeam.team_color }),
      });
      if (response.ok) {
        setMessage("Team updated successfully");
        setEditingTeam(null);
        await loadTeams();
      } else setMessage("Failed to update team");
    } catch {
      setMessage("Failed to update team");
    }
  }

  async function handleImageUpload(teamId: number, file: File) {
    setUploadingTeamId(teamId);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("teamId", teamId.toString());
      const response = await fetch("/api/admin/teams/upload", { method: "POST", body: formData });
      if (response.ok) {
        const data = await response.json();
        setMessage(`Team logo updated. ${data.playersUpdated} players updated.`);
        await loadTeams();
      } else {
        const errorData = await response.json();
        setMessage(`Failed to upload image: ${errorData.error}`);
      }
    } catch {
      setMessage("Failed to upload image");
    } finally {
      setUploadingTeamId(null);
    }
  }

  async function openLogoPicker(teamId: number) {
    setPickerTeamId(teamId);
    if (existingLogos.length === 0) {
      const res = await fetch("/api/admin/teams/logos");
      const data = await res.json();
      setExistingLogos(data.logos || []);
    }
  }

  async function handleAssignLogo(teamId: number, logoPath: string) {
    setMessage("");
    try {
      const response = await fetch("/api/admin/teams/assign-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, logoPath }),
      });
      if (response.ok) {
        const data = await response.json();
        setMessage(`Logo assigned. ${data.playersUpdated} players updated.`);
        await loadTeams();
      } else {
        const errorData = await response.json();
        setMessage(`Failed to assign logo: ${errorData.error}`);
      }
    } catch {
      setMessage("Failed to assign logo");
    } finally {
      setPickerTeamId(null);
    }
  }

  async function handleSyncTeamColors() {
    setSyncingColors(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/teams/sync-colors", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        setMessage(`Colors & logos synced. ${data.playersUpdated} players across ${data.teamsUpdated} teams.`);
        await loadTeams();
      } else {
        const errorData = await response.json();
        setMessage(`Failed to sync colors: ${errorData.error}`);
      }
    } catch {
      setMessage("Failed to sync team colors");
    } finally {
      setSyncingColors(false);
    }
  }

  const logoCell = (team: Team) =>
    team.team_logo && !erroredLogos.has(team.id) ? (
      <Image
        src={team.team_logo}
        alt={team.team_name}
        width={40}
        height={40}
        style={{ width: 40, height: 40, objectFit: "contain" }}
        onError={() => setErroredLogos((prev) => new Set(prev).add(team.id))}
      />
    ) : (
      <div style={{ width: 40, height: 40, borderRadius: 5, background: ui.panel2, border: `1px solid ${ui.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontMono, fontSize: 8, color: ui.faint }}>
        N/A
      </div>
    );

  return (
    <AdminShell
      title="Teams"
      subtitle={`${teams.length} TEAMS`}
      actions={
        <button onClick={handleSyncTeamColors} disabled={syncingColors} className="admin-btn admin-btn--primary" title="Sync colors & logos to rosters">
          <RefreshCw size={13} className={syncingColors ? "tm-spin" : ""} /> Sync
        </button>
      }
    >
      <style>{css}</style>

      {message && (
        <div className="admin-alert" style={{ marginBottom: 16, color: ui.cyan, background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.25)" }}>
          <Info size={14} /> {message}
        </div>
      )}

      {loading ? (
        <div style={{ fontFamily: fontMono, fontSize: 12, color: ui.faint, padding: "30px 0" }}>Loading teams…</div>
      ) : (
        <Panel pad={0} style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${ui.line}` }}>
            <SectionLabel accent={ui.violet}>All Teams · {teams.length}</SectionLabel>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="tm-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Logo</th>
                  <th style={{ textAlign: "left" }}>Team</th>
                  <th style={{ textAlign: "left" }}>Color</th>
                  <th style={{ textAlign: "right" }}>Players</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) =>
                  editingTeam?.id === team.id ? (
                    <tr key={team.id}>
                      <td>{logoCell(team)}</td>
                      <td>
                        <input
                          type="text"
                          value={editingTeam.team_name}
                          onChange={(e) => setEditingTeam({ ...editingTeam, team_name: e.target.value })}
                          className="admin-input"
                          style={{ padding: "7px 10px", maxWidth: 200 }}
                        />
                      </td>
                      <td>
                        <input
                          type="color"
                          value={editingTeam.team_color || "#000000"}
                          onChange={(e) => setEditingTeam({ ...editingTeam, team_color: e.target.value })}
                          className="tm-color"
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>{team.player_count || 0}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={handleUpdateTeam} className="tm-btn tm-btn--ok"><Check size={12} /> Save</button>
                          <button onClick={() => setEditingTeam(null)} className="tm-btn">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={team.id}>
                      <td>{logoCell(team)}</td>
                      <td style={{ color: ui.text, fontFamily: fontLabel, letterSpacing: "0.02em" }}>{team.team_name}</td>
                      <td>
                        {team.team_color ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 26, height: 18, borderRadius: 4, background: team.team_color, border: `1px solid ${ui.line}` }} />
                            <span style={{ fontFamily: fontMono, fontSize: 10.5, color: ui.faint }}>{team.team_color}</span>
                          </div>
                        ) : (
                          <span style={{ color: ui.faint }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>{team.player_count || 0}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={() => setEditingTeam(team)} className="tm-btn"><Pencil size={12} /> Edit</button>
                          <label className="tm-btn tm-btn--ok" style={{ cursor: "pointer" }}>
                            <Upload size={12} /> {uploadingTeamId === team.id ? "Uploading…" : "Upload"}
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              disabled={uploadingTeamId === team.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(team.id, file);
                              }}
                            />
                          </label>
                          <button onClick={() => openLogoPicker(team.id)} className="tm-btn tm-btn--alt"><ImagePlus size={12} /> Existing</button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Logo picker modal */}
      {pickerTeamId !== null && (
        <div className="tm-overlay" onClick={() => setPickerTeamId(null)}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 18, color: ui.text, margin: 0 }}>Select Existing Logo</h3>
              <button onClick={() => setPickerTeamId(null)} className="tm-close"><X size={16} /></button>
            </div>
            <div style={{ overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {existingLogos.map((logo) => (
                <button key={logo} onClick={() => handleAssignLogo(pickerTeamId, logo)} className="tm-logo-opt">
                  <Image src={logo} alt={logo} width={56} height={56} style={{ width: 56, height: 56, objectFit: "contain" }} />
                  <span style={{ fontFamily: fontMono, fontSize: 9, color: ui.faint, width: "100%", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {logo.split("/").pop()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

const css = `
  .tm-spin { animation: tm-spin 1s linear infinite; }
  @keyframes tm-spin { to { transform: rotate(360deg); } }

  .tm-table { width: 100%; border-collapse: collapse; }
  .tm-table th { padding: 11px 18px; background: ${ui.panel2}; font-family: ${fontLabel}; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: ${ui.dim}; }
  .tm-table td { padding: 12px 18px; font-family: ${fontMono}; font-size: 12px; color: ${ui.dim}; border-bottom: 1px solid ${ui.lineSoft}; vertical-align: middle; }
  .tm-table tbody tr:hover { background: ${ui.panel2}; }

  .tm-color { width: 42px; height: 28px; padding: 0; background: transparent; border: 1px solid ${ui.line}; border-radius: 4px; cursor: pointer; }

  .tm-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; font-family: ${fontLabel}; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: ${ui.text}; background: ${ui.raised}; border: 1px solid ${ui.line}; border-radius: 4px; cursor: pointer; transition: all 0.14s; white-space: nowrap; }
  .tm-btn:hover { border-color: ${ui.lineStrong}; }
  .tm-btn--ok { color: ${ui.green}; border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.08); }
  .tm-btn--alt { color: ${ui.violet}; border-color: rgba(167,139,250,0.3); background: rgba(167,139,250,0.08); }

  .tm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; animation: tm-fade 0.2s ease both; }
  @keyframes tm-fade { from { opacity: 0; } to { opacity: 1; } }
  .tm-modal { background: ${ui.panel}; border: 1px solid ${ui.lineStrong}; border-radius: 8px; padding: 22px; width: 100%; max-width: 620px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 40px 90px rgba(0,0,0,0.6); animation: tm-rise 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  @keyframes tm-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .tm-close { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 5px; background: ${ui.panel2}; border: 1px solid ${ui.line}; color: ${ui.dim}; cursor: pointer; transition: color 0.14s; }
  .tm-close:hover { color: ${ui.text}; }
  .tm-logo-opt { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; background: ${ui.panel2}; border: 1px solid ${ui.line}; border-radius: 6px; cursor: pointer; transition: all 0.14s; }
  .tm-logo-opt:hover { border-color: ${ui.violet}; background: rgba(167,139,250,0.08); }
`;
