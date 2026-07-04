"use client";

import { useEffect, useState } from "react";
import { Crown, Save, Shuffle, AlertTriangle } from "lucide-react";
import { AdminShell, Panel, SectionLabel, ui, fontDisplay, fontLabel, fontMono } from "../components/AdminShell";

interface UsaPlayer {
  id?: number;
  player_name: string;
  role: string;
  role_type?: string;
  year_active?: string;
  prior_team?: string;
  logo_url?: string;
  team_color?: string;
}

interface UsaDailyPickData {
  id: number;
  player_name: string;
  pick_date: string;
  player: UsaPlayer;
}

const USA_RED = "#ef4444";

export default function UsaDailyPickPage() {
  const [loading, setLoading] = useState(true);
  const [currentPick, setCurrentPick] = useState<UsaDailyPickData | null>(null);
  const [allPlayers, setAllPlayers] = useState<UsaPlayer[]>([]);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [bulkStartDate, setBulkStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [bulkDays, setBulkDays] = useState<number>(30);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  async function loadData() {
    try {
      const [playersRes, pickRes] = await Promise.all([fetch("/api/usa/players"), fetch("/api/admin/usa-daily-pick")]);
      const playersData = await playersRes.json();
      const pickData = await pickRes.json();
      setAllPlayers(playersData.players ?? []);
      if (pickData.dailyPick) {
        setCurrentPick(pickData.dailyPick);
        setSelectedPlayerName(pickData.dailyPick.player_name);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load data" });
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard on-mount data fetch
    loadData().finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!selectedPlayerName) {
      setMessage({ type: "error", text: "Please select a player" });
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      const response = await fetch("/api/admin/usa-daily-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: selectedPlayerName, date: selectedDate }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Failed to save daily pick" });
        setSaving(false);
        return;
      }
      setMessage({ type: "success", text: "USA daily pick saved successfully" });
      setSaving(false);
      await loadData();
    } catch {
      setMessage({ type: "error", text: "Failed to save daily pick" });
      setSaving(false);
    }
  }

  async function handleBulkGenerate() {
    if (!bulkDays || bulkDays < 1) {
      setMessage({ type: "error", text: "Please enter a valid number of days" });
      return;
    }
    const confirmed = window.confirm(
      `This will generate ${bulkDays} random USA daily picks starting from ${bulkStartDate}. Any existing picks in this range will be replaced. Continue?`
    );
    if (!confirmed) return;
    try {
      setBulkGenerating(true);
      setMessage(null);
      const response = await fetch("/api/admin/usa-bulk-generate-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: bulkStartDate, days: bulkDays }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Failed to generate picks" });
        setBulkGenerating(false);
        return;
      }
      setMessage({ type: "success", text: data.message || "Picks generated successfully" });
      setBulkGenerating(false);
      await loadData();
    } catch {
      setMessage({ type: "error", text: "Failed to generate bulk picks" });
      setBulkGenerating(false);
    }
  }

  const selectedPlayer = allPlayers.find((p) => p.player_name === selectedPlayerName);

  return (
    <AdminShell title="USA Pick" subtitle="USA MODE SELECTION" maxWidth={860}>
      {message && (
        <div className={`admin-alert ${message.type === "success" ? "admin-alert--ok" : "admin-alert--err"}`} style={{ marginBottom: 16 }}>
          {message.type === "success" ? <Save size={14} /> : <AlertTriangle size={14} />}
          {message.text}
        </div>
      )}

      <Panel pad={22} brackets>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 className="admin-h2">Manage USA Pick</h2>
          <SectionLabel accent={USA_RED}>Single Day</SectionLabel>
        </div>

        {loading ? (
          <div style={{ fontFamily: fontMono, fontSize: 12, color: ui.faint, padding: "20px 0" }}>Loading roster…</div>
        ) : (
          <>
            {currentPick && (
              <div style={{ marginBottom: 18, padding: 16, background: ui.panel2, border: `1px solid ${ui.line}`, borderRadius: 6, borderLeft: `2px solid ${USA_RED}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Crown size={13} color={USA_RED} />
                  <span style={{ fontFamily: fontLabel, fontSize: 10, letterSpacing: "0.16em", color: ui.dim, textTransform: "uppercase" }}>Live Today</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {currentPick.player?.logo_url && (
                    <div style={{ width: 42, height: 42, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: currentPick.player.team_color || "#B22234" }}>
                      <img src={currentPick.player.logo_url} alt="USA" style={{ width: 32, height: 32, objectFit: "contain" }} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontFamily: fontDisplay, fontSize: 22, color: ui.text, lineHeight: 1 }}>{currentPick.player_name}</div>
                    <div style={{ fontFamily: fontMono, fontSize: 12, color: ui.dim, marginTop: 6 }}>
                      {currentPick.player?.role}
                      {currentPick.player?.role_type ? ` (${currentPick.player.role_type})` : ""} · {currentPick.player?.year_active}
                      {currentPick.player?.prior_team ? ` | ${currentPick.player.prior_team}` : ""}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              <div>
                <label className="admin-label">Date</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="admin-input" />
              </div>
              <div>
                <label className="admin-label">Select Player</label>
                <select value={selectedPlayerName} onChange={(e) => setSelectedPlayerName(e.target.value)} className="admin-select">
                  <option value="">- Select a USA player -</option>
                  {allPlayers.map((player, i) => (
                    <option key={i} value={player.player_name}>
                      {player.player_name} ({player.role}
                      {player.role_type ? ` - ${player.role_type}` : ""}
                      {player.year_active ? ` · ${player.year_active}` : ""})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlayer && (
                <div style={{ padding: 16, background: ui.panel2, border: `1px solid ${ui.line}`, borderRadius: 6 }}>
                  <SectionLabel accent={ui.cyan}>Preview</SectionLabel>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
                    {selectedPlayer.logo_url && (
                      <div style={{ width: 48, height: 48, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: selectedPlayer.team_color || "#B22234" }}>
                        <img src={selectedPlayer.logo_url} alt="USA" style={{ width: 38, height: 38, objectFit: "contain" }} />
                      </div>
                    )}
                    <div style={{ fontFamily: fontMono, fontSize: 12.5, color: ui.dim, lineHeight: 1.7 }}>
                      <div style={{ fontFamily: fontDisplay, fontSize: 20, color: ui.text, marginBottom: 4 }}>{selectedPlayer.player_name}</div>
                      <div>Role: <span style={{ color: ui.text }}>{selectedPlayer.role}{selectedPlayer.role_type ? ` (${selectedPlayer.role_type})` : ""}</span></div>
                      {selectedPlayer.prior_team && <div>Prior: <span style={{ color: ui.text }}>{selectedPlayer.prior_team}</span></div>}
                      {selectedPlayer.year_active && <div>Active: <span style={{ color: ui.text }}>{selectedPlayer.year_active}</span></div>}
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleSave} disabled={saving || !selectedPlayerName} className="admin-btn admin-btn--primary">
                <Save size={14} />
                {saving ? "Saving…" : "Save USA Daily Pick"}
              </button>
            </div>
          </>
        )}
      </Panel>

      <Panel pad={22} style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 className="admin-h2">Bulk Generate</h2>
          <SectionLabel accent={USA_RED}>Randomized</SectionLabel>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div>
            <label className="admin-label">Start Date</label>
            <input type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} className="admin-input" />
          </div>
          <div>
            <label className="admin-label">Number of Days</label>
            <input type="number" min="1" max="730" value={bulkDays} onChange={(e) => setBulkDays(Number(e.target.value))} className="admin-input" />
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 16, background: ui.panel2, border: `1px solid ${ui.line}`, borderRadius: 6, fontFamily: fontMono, fontSize: 12.5, color: ui.dim, lineHeight: 1.8 }}>
          Will generate <strong style={{ color: ui.text }}>{bulkDays}</strong> picks from <strong style={{ color: ui.text }}>{bulkStartDate}</strong>
          <br />
          Players available: <strong style={{ color: ui.text }}>{allPlayers.length}</strong>
          {bulkDays > allPlayers.length && <div style={{ color: ui.orange, marginTop: 4 }}>Players will be reshuffled (no consecutive duplicates)</div>}
        </div>

        <button onClick={handleBulkGenerate} disabled={bulkGenerating || !bulkDays || bulkDays < 1} className="admin-btn" style={{ marginTop: 16, width: "100%", background: USA_RED, color: "#0a0a0a", borderColor: USA_RED, fontWeight: 600 }}>
          <Shuffle size={14} />
          {bulkGenerating ? "Generating…" : `Generate ${bulkDays} Random USA Picks`}
        </button>
      </Panel>
    </AdminShell>
  );
}
