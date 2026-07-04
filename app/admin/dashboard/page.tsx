"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Flag, Users, Shield, LineChart, ArrowUpRight, Crown, type LucideIcon } from "lucide-react";
import { AdminShell, Panel, SectionLabel, ui, fontDisplay, fontLabel, fontMono } from "../components/AdminShell";
import { AreaChart, BarList, Donut, StatCard, nf } from "../components/charts";
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

const ROLE_COLORS: Record<string, string> = { tank: ui.cyan, dps: ui.orange, support: ui.green };
const REGION_PALETTE = [ui.orange, ui.cyan, ui.violet, ui.green, ui.rose, "#fbbf24"];

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
    const winRateSeries = recent.map((d) => (d.totalGames ? (d.totalWins / d.totalGames) * 100 : 0));
    const avgGuessSeries = recent.map((d) => Number(d.avgGuesses) || 0);

    const teams = new Set(players.map((p) => p.team_name).filter(Boolean));
    const roleCounts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};
    for (const p of players) {
      const role = (p.role || "other").toLowerCase();
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      const reg = p.region || "-";
      regionCounts[reg] = (regionCounts[reg] || 0) + 1;
    }

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
      winRateSeries,
      avgGuessSeries,
      teamCount: teams.size,
      roles: Object.entries(roleCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value, color: ROLE_COLORS[label] || ui.violet })),
      regions: Object.entries(regionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value], i) => ({ label, value, color: REGION_PALETTE[i % REGION_PALETTE.length] })),
    };
  }, [analytics, players]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const player = pick?.player;

  return (
    <AdminShell title="Dashboard" subtitle={today.toUpperCase()}>
      <style>{css}</style>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(196px, 1fr))", gap: 14 }}>
        <StatCard
          label="Games Tracked"
          value={nf(m.totalGames)}
          sub={`${m.activeDays} active ${m.activeDays === 1 ? "day" : "days"}`}
          accent={ui.orange}
          spark={m.gamesSeries}
          delay={0}
        />
        <StatCard
          label="Win Rate"
          value={`${m.winRate.toFixed(1)}%`}
          sub={`${nf(m.totalWins)} solved`}
          accent={ui.green}
          spark={m.winRateSeries}
          delay={60}
        />
        <StatCard
          label="Avg Guesses"
          value={m.avgGuesses ? m.avgGuesses.toFixed(2) : "-"}
          sub="per solve"
          accent={ui.cyan}
          spark={m.avgGuessSeries}
          delay={120}
        />
        <StatCard
          label="Player Pool"
          value={nf(players.length)}
          sub={`${m.teamCount} teams`}
          accent={ui.violet}
          delay={180}
        />
      </div>

      {/* chart + donut */}
      <div className="dash-split" style={{ marginTop: 16 }}>
        <Panel pad={20} brackets style={{ minHeight: 320 }}>
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
              height={236}
            />
          ) : (
            <EmptyState />
          )}
        </Panel>

        <Panel pad={20} style={{ display: "flex", flexDirection: "column" }}>
          <SectionLabel accent={ui.green}>Overall Win Rate</SectionLabel>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 0" }}>
            <Donut value={m.winRate / 100} color={ui.green} centerTop={`${m.winRate.toFixed(0)}%`} centerSub="solved" />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${ui.line}` }}>
            <MiniStat label="Wins" value={nf(m.totalWins)} color={ui.green} />
            <MiniStat label="Losses" value={nf(m.totalGames - m.totalWins)} color={ui.rose} />
          </div>
        </Panel>
      </div>

      {/* distributions + today's pick */}
      <div className="dash-tri" style={{ marginTop: 16 }}>
        <Panel pad={20}>
          <SectionLabel accent={ui.cyan}>Roster · By Role</SectionLabel>
          <div style={{ marginTop: 16 }}>
            {m.roles.length ? <BarList items={m.roles} /> : <Muted>No players loaded</Muted>}
          </div>
        </Panel>

        <Panel pad={20}>
          <SectionLabel accent={ui.violet}>Roster · By Region</SectionLabel>
          <div style={{ marginTop: 16 }}>
            {m.regions.length ? <BarList items={m.regions} /> : <Muted>No players loaded</Muted>}
          </div>
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

      {/* quick nav */}
      <div style={{ marginTop: 26, marginBottom: 12 }}>
        <SectionLabel>Control Modules</SectionLabel>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(212px, 1fr))", gap: 14 }}>
        <NavCard icon={Target} title="Daily Pick" desc="Set the daily champion" path="/admin/daily-pick" accent={ui.orange} />
        <NavCard icon={Flag} title="USA Pick" desc="USA mode selection" path="/admin/usa-daily-pick" accent={ui.rose} />
        <NavCard icon={Users} title="Players" desc="Roster & duplicates" path="/admin/players" accent={ui.cyan} />
        <NavCard icon={Shield} title="Teams" desc="Logos & colors" path="/admin/teams" accent={ui.violet} />
        <NavCard icon={LineChart} title="Analytics" desc="Full statistics" path="/admin/analytics" accent="#fbbf24" />
      </div>
    </AdminShell>
  );
}

function NavCard({ icon: Icon, title, desc, path, accent }: { icon: LucideIcon; title: string; desc: string; path: string; accent: string }) {
  const router = useRouter();
  return (
    <button onClick={() => router.push(path)} className="dash-nav-card" style={{ "--accent": accent } as React.CSSProperties}>
      <div className="dash-nav-icon">
        <Icon size={17} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ fontFamily: fontLabel, fontSize: 13, letterSpacing: "0.06em", color: ui.text, textTransform: "uppercase" }}>{title}</div>
        <div style={{ fontFamily: fontMono, fontSize: 10.5, color: ui.faint, marginTop: 4 }}>{desc}</div>
      </div>
      <ArrowUpRight size={15} className="dash-nav-arrow" />
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

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontFamily: fontMono, fontSize: 10, letterSpacing: "0.1em", color: ui.faint, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: fontDisplay, fontSize: 19, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: fontMono, fontSize: 12, color: ui.faint }}>{children}</div>;
}

function EmptyState() {
  return (
    <div style={{ height: 236, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <LineChart size={24} color={ui.faint} />
      <span style={{ fontFamily: fontMono, fontSize: 12, color: ui.faint }}>No game data recorded yet</span>
    </div>
  );
}

const css = `
  .dash-split { display: grid; grid-template-columns: 1fr; gap: 16px; }
  .dash-tri { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 880px) {
    .dash-split { grid-template-columns: 2fr 1fr; }
    .dash-tri { grid-template-columns: 1fr 1fr 1fr; }
  }

  .dash-nav-card {
    display: flex; align-items: center; gap: 14px; text-align: left;
    padding: 16px; background: ${ui.panel}; border: 1px solid ${ui.line}; border-radius: 6px;
    cursor: pointer; transition: border-color 0.18s, transform 0.18s, background 0.18s;
  }
  .dash-nav-card:hover { border-color: var(--accent); transform: translateY(-2px); background: ${ui.panel2}; }
  .dash-nav-icon {
    width: 40px; height: 40px; border-radius: 7px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  }
  .dash-nav-arrow { color: ${ui.faint}; transition: color 0.18s, transform 0.18s; }
  .dash-nav-card:hover .dash-nav-arrow { color: var(--accent); transform: translate(2px,-2px); }

  .dash-pick-btn {
    margin-top: 14px; width: 100%; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 7px;
    background: ${ui.panel2}; border: 1px solid ${ui.line}; border-radius: 5px; color: ${ui.text};
    font-family: ${fontLabel}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .dash-pick-btn:hover { border-color: ${ui.orange}; color: ${ui.orange}; }
`;
