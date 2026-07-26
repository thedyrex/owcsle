"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Flag, Users, Shield, LineChart, ArrowUpRight, Crown, type LucideIcon } from "lucide-react";
import { AdminShell, Panel, SectionLabel, ui, fontDisplay, fontLabel, fontMono } from "../components/AdminShell";
import { AreaChart, nf } from "../components/charts";
import { OWCS_LIVE_COLOR, liveFor } from "../components/owcsSchedule";

interface DayStat {
  date: string;
  totalGames: number;
  totalWins: number;
  totalGuesses: number;
  avgGuesses: number | string;
}
interface Player {
  id: number;
  player_name: string;
  team_name: string;
  role: string;
  region: string;
}
interface PickPlayer {
  player_name: string;
  team_name?: string;
  role?: string;
  region?: string;
}
interface DailyPick {
  player?: PickPlayer | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<DayStat[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pick, setPick] = useState<DailyPick | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics").then((r) => r.json()).then((d) => setAnalytics(d.analytics || [])).catch(() => {});
    fetch("/api/admin/players").then((r) => r.json()).then((d) => setPlayers(d.players || [])).catch(() => {});
    fetch("/api/admin/daily-pick").then((r) => r.json()).then((d) => setPick(d.dailyPick || null)).catch(() => {});
  }, []);

  const m = useMemo(() => {
    const days = [...analytics].sort((a, b) => a.date.localeCompare(b.date));
    const recent = days.slice(-21);
    const totalGames = days.reduce((s, d) => s + d.totalGames, 0);
    const totalWins = days.reduce((s, d) => s + d.totalWins, 0);
    const totalGuesses = days.reduce((s, d) => s + d.totalGuesses, 0);
    const winRate = totalGames ? (totalWins / totalGames) * 100 : 0;
    const avgGuesses = totalWins ? totalGuesses / totalWins : 0;

    const labels = recent.map((d) => d.date.slice(5));
    const gamesSeries = recent.map((d) => d.totalGames);
    const winsSeries = recent.map((d) => d.totalWins);

    const teams = new Set(players.map((p) => p.team_name).filter(Boolean));

    return {
      hasData: days.length > 0,
      totalGames,
      totalWins,
      winRate,
      avgGuesses,
      activeDays: days.length,
      labels,
      live: liveFor(recent.map((d) => d.date)),
      gamesSeries,
      winsSeries,
      teamCount: teams.size,
    };
  }, [analytics, players]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const player = pick?.player;

  return (
    <AdminShell title="Dashboard" subtitle={today.toUpperCase()}>
      <style>{css}</style>

      {/* Slim summary line — plain figures, no cards */}
      <div className="dash-stats">
        <Stat label="Games" value={nf(m.totalGames)} />
        <Stat label="Win Rate" value={`${m.winRate.toFixed(1)}%`} />
        <Stat label="Avg Guesses" value={m.avgGuesses ? m.avgGuesses.toFixed(2) : "-"} />
        <Stat label="Players" value={nf(players.length)} />
        <Stat label="Teams" value={nf(m.teamCount)} />
        <Stat label="Active Days" value={nf(m.activeDays)} />
      </div>

      {/* Activity + today's pick */}
      <div className="dash-split" style={{ marginTop: 20 }}>
        <Panel pad={20} style={{ minHeight: 300 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <SectionLabel accent={ui.orange}>Activity · Last {m.labels.length} days</SectionLabel>
            <Legend />
          </div>
          {m.hasData ? (
            <AreaChart
              labels={m.labels}
              series={[
                { name: "Games", color: ui.orange, data: m.gamesSeries },
                { name: "Wins", color: ui.cyan, data: m.winsSeries },
              ]}
              live={m.live}
              liveColor={OWCS_LIVE_COLOR}
              height={220}
            />
          ) : (
            <EmptyState />
          )}
        </Panel>

        <Panel pad={20} style={{ display: "flex", flexDirection: "column" }}>
          <SectionLabel accent={ui.orange}>Today&apos;s Pick</SectionLabel>
          {player ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "10px 0 6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Crown size={16} color={ui.orange} />
                <span style={{ fontFamily: fontLabel, fontSize: 10, letterSpacing: "0.16em", color: ui.dim, textTransform: "uppercase" }}>
                  Live Now
                </span>
              </div>
              <div style={{ fontFamily: fontDisplay, fontSize: 28, lineHeight: 1, color: ui.text }}>{player.player_name}</div>
              <div style={{ fontFamily: fontMono, fontSize: 12, color: ui.dim, marginTop: 9 }}>
                {[player.team_name, player.role?.toUpperCase(), player.region].filter(Boolean).join("  ·  ")}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
              <Muted>No pick set for today</Muted>
            </div>
          )}
          <button onClick={() => router.push("/admin/daily-pick")} className="dash-pick-btn">
            Manage pick <ArrowUpRight size={13} />
          </button>
        </Panel>
      </div>

      {/* Lean nav */}
      <div style={{ marginTop: 26, marginBottom: 12 }}>
        <SectionLabel>Manage</SectionLabel>
      </div>
      <div className="dash-nav-list">
        <NavRow icon={Target} title="Daily Pick" desc="Set the daily champion" path="/admin/daily-pick" />
        <NavRow icon={Flag} title="USA Pick" desc="USA mode selection" path="/admin/usa-daily-pick" />
        <NavRow icon={Users} title="Players" desc="Roster & duplicates" path="/admin/players" />
        <NavRow icon={Shield} title="Teams" desc="Logos, colors & new teams" path="/admin/teams" />
        <NavRow icon={LineChart} title="Analytics" desc="Full statistics & distributions" path="/admin/analytics" />
      </div>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash-stat">
      <span style={{ fontFamily: fontMono, fontSize: 10, letterSpacing: "0.14em", color: ui.faint, textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: fontDisplay, fontSize: 26, lineHeight: 1, color: ui.text }}>{value}</span>
    </div>
  );
}

function NavRow({ icon: Icon, title, desc, path }: { icon: LucideIcon; title: string; desc: string; path: string }) {
  const router = useRouter();
  return (
    <button onClick={() => router.push(path)} className="dash-nav-row">
      <Icon size={16} strokeWidth={2} className="dash-nav-ic" />
      <span style={{ fontFamily: fontLabel, fontSize: 13, letterSpacing: "0.05em", color: ui.text, textTransform: "uppercase" }}>{title}</span>
      <span style={{ fontFamily: fontMono, fontSize: 11, color: ui.faint, flex: 1 }}>{desc}</span>
      <ArrowUpRight size={14} className="dash-nav-arrow" />
    </button>
  );
}

function Legend() {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      {[
        { c: ui.orange, l: "Games" },
        { c: ui.cyan, l: "Wins" },
      ].map((x) => (
        <span key={x.l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 9, height: 3, background: x.c, borderRadius: 2 }} />
          <span style={{ fontFamily: fontMono, fontSize: 10.5, color: ui.dim }}>{x.l}</span>
        </span>
      ))}
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, background: OWCS_LIVE_COLOR, borderRadius: 1 }} />
        <span style={{ fontFamily: fontMono, fontSize: 10.5, color: ui.dim }}>OWCS</span>
      </span>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: fontMono, fontSize: 12, color: ui.faint }}>{children}</div>;
}

function EmptyState() {
  return (
    <div style={{ height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <LineChart size={24} color={ui.faint} />
      <span style={{ fontFamily: fontMono, fontSize: 12, color: ui.faint }}>No game data recorded yet</span>
    </div>
  );
}

const css = `
  .dash-stats {
    display: flex; flex-wrap: wrap; gap: 12px 40px;
    padding: 18px 22px; background: ${ui.panel}; border: 1px solid ${ui.line}; border-radius: 6px;
  }
  .dash-stat { display: flex; flex-direction: column; gap: 8px; }

  .dash-split { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 880px) { .dash-split { grid-template-columns: 2fr 1fr; } }

  .dash-nav-list { display: flex; flex-direction: column; border: 1px solid ${ui.line}; border-radius: 6px; overflow: hidden; }
  .dash-nav-row {
    display: flex; align-items: center; gap: 14px; text-align: left; width: 100%;
    padding: 15px 18px; background: ${ui.panel}; border: none; border-bottom: 1px solid ${ui.lineSoft};
    cursor: pointer; transition: background 0.15s;
  }
  .dash-nav-list .dash-nav-row:last-child { border-bottom: none; }
  .dash-nav-row:hover { background: ${ui.panel2}; }
  .dash-nav-ic { color: ${ui.dim}; flex-shrink: 0; }
  .dash-nav-row:hover .dash-nav-ic { color: ${ui.orange}; }
  .dash-nav-arrow { color: ${ui.faint}; transition: color 0.15s, transform 0.15s; flex-shrink: 0; }
  .dash-nav-row:hover .dash-nav-arrow { color: ${ui.orange}; transform: translate(2px,-2px); }

  .dash-pick-btn {
    margin-top: 14px; width: 100%; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 7px;
    background: ${ui.panel2}; border: 1px solid ${ui.line}; border-radius: 5px; color: ${ui.text};
    font-family: ${fontLabel}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .dash-pick-btn:hover { border-color: ${ui.orange}; color: ${ui.orange}; }
`;
