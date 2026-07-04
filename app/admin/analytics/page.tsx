"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { AdminShell, Panel, SectionLabel, ui, fontLabel, fontMono } from "../components/AdminShell";
import { AreaChart, StatCard, nf } from "../components/charts";
import { OWCS_LIVE_COLOR, liveFor } from "../components/owcsSchedule";

interface DayStat {
  date: string;
  totalGames: number;
  totalWins: number;
  totalGuesses: number;
  avgGuesses: number | string;
}

type MetricKey = "games" | "wins" | "winrate" | "avg";
const METRICS: Record<MetricKey, { label: string; color: string; fmt: (v: number) => string; get: (d: DayStat) => number }> = {
  games: { label: "Games", color: ui.orange, fmt: (v) => nf(Math.round(v)), get: (d) => d.totalGames },
  wins: { label: "Wins", color: ui.green, fmt: (v) => nf(Math.round(v)), get: (d) => d.totalWins },
  winrate: { label: "Win Rate", color: ui.cyan, fmt: (v) => `${v.toFixed(0)}%`, get: (d) => (d.totalGames ? (d.totalWins / d.totalGames) * 100 : 0) },
  avg: { label: "Avg Guesses", color: ui.violet, fmt: (v) => v.toFixed(2), get: (d) => Number(d.avgGuesses) || 0 },
};

type SortKey = "date" | "games" | "wins" | "winrate" | "avg";

export default function Analytics() {
  const [rows, setRows] = useState<DayStat[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [metric, setMetric] = useState<MetricKey>("games");
  const [range, setRange] = useState<number>(30);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => setRows(d.analytics || []))
      .catch(() => setRows([]))
      .finally(() => setLoaded(true));
  }, []);

  const asc = useMemo(() => [...rows].sort((a, b) => a.date.localeCompare(b.date)), [rows]);

  const summary = useMemo(() => {
    const games = rows.reduce((s, d) => s + d.totalGames, 0);
    const wins = rows.reduce((s, d) => s + d.totalWins, 0);
    const guesses = rows.reduce((s, d) => s + d.totalGuesses, 0);
    const peak = rows.reduce<DayStat | null>((best, d) => (!best || d.totalGames > best.totalGames ? d : best), null);
    return {
      games,
      wins,
      winRate: games ? (wins / games) * 100 : 0,
      avg: wins ? guesses / wins : 0,
      peak,
      gamesSpark: asc.slice(-14).map((d) => d.totalGames),
      winSpark: asc.slice(-14).map((d) => (d.totalGames ? (d.totalWins / d.totalGames) * 100 : 0)),
      avgSpark: asc.slice(-14).map((d) => Number(d.avgGuesses) || 0),
    };
  }, [rows, asc]);

  const chartDays = useMemo(() => (range > 0 ? asc.slice(-range) : asc), [asc, range]);
  const cfg = METRICS[metric];

  const sorted = useMemo(() => {
    const get: Record<SortKey, (d: DayStat) => number | string> = {
      date: (d) => d.date,
      games: (d) => d.totalGames,
      wins: (d) => d.totalWins,
      winrate: (d) => (d.totalGames ? d.totalWins / d.totalGames : 0),
      avg: (d) => Number(d.avgGuesses) || 0,
    };
    const f = get[sort.key];
    return [...rows].sort((a, b) => {
      const av = f(a);
      const bv = f(b);
      const cmp = typeof av === "string" ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "date" ? "desc" : "desc" }));
  }

  return (
    <AdminShell title="Analytics" subtitle={`${rows.length} DAYS RECORDED`}>
      <style>{css}</style>

      {/* summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(196px, 1fr))", gap: 14 }}>
        <StatCard label="Total Games" value={nf(summary.games)} sub={`${rows.length} days`} accent={ui.orange} spark={summary.gamesSpark} />
        <StatCard label="Win Rate" value={`${summary.winRate.toFixed(1)}%`} sub={`${nf(summary.wins)} solved`} accent={ui.green} spark={summary.winSpark} delay={60} />
        <StatCard label="Avg Guesses" value={summary.avg ? summary.avg.toFixed(2) : "-"} sub="per solve" accent={ui.violet} spark={summary.avgSpark} delay={120} />
        <StatCard
          label="Peak Day"
          value={summary.peak ? nf(summary.peak.totalGames) : "-"}
          sub={summary.peak ? summary.peak.date : "no data"}
          accent={ui.cyan}
          delay={180}
        />
      </div>

      {/* interactive chart */}
      <Panel pad={20} brackets style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <SectionLabel accent={cfg.color}>{cfg.label} over time</SectionLabel>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, background: OWCS_LIVE_COLOR, transform: "rotate(45deg)", boxShadow: `0 0 6px ${OWCS_LIVE_COLOR}` }} />
              <span style={{ fontFamily: fontLabel, fontSize: 10, letterSpacing: "0.1em", color: ui.dim, textTransform: "uppercase" }}>OWCS Live</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Segmented
              value={metric}
              onChange={(v) => setMetric(v as MetricKey)}
              options={(Object.keys(METRICS) as MetricKey[]).map((k) => ({ value: k, label: METRICS[k].label }))}
            />
            <Segmented
              value={String(range)}
              onChange={(v) => setRange(Number(v))}
              options={[
                { value: "14", label: "14D" },
                { value: "30", label: "30D" },
                { value: "0", label: "ALL" },
              ]}
            />
          </div>
        </div>
        {chartDays.length > 0 ? (
          <AreaChart
            labels={chartDays.map((d) => d.date.slice(5))}
            series={[{ name: cfg.label, color: cfg.color, data: chartDays.map((d) => cfg.get(d)) }]}
            formatValue={cfg.fmt}
            live={liveFor(chartDays.map((d) => d.date))}
            liveColor={OWCS_LIVE_COLOR}
            height={250}
          />
        ) : (
          <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontMono, fontSize: 12, color: ui.faint }}>
            {loaded ? "No game data recorded yet" : "Loading…"}
          </div>
        )}
      </Panel>

      {/* table */}
      <Panel pad={0} style={{ marginTop: 16, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${ui.line}` }}>
          <SectionLabel>Daily Breakdown</SectionLabel>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="an-table">
            <thead>
              <tr>
                <Th label="Date" k="date" sort={sort} onSort={toggleSort} align="left" />
                <Th label="Games" k="games" sort={sort} onSort={toggleSort} />
                <Th label="Wins" k="wins" sort={sort} onSort={toggleSort} />
                <Th label="Win Rate" k="winrate" sort={sort} onSort={toggleSort} />
                <Th label="Avg Guesses" k="avg" sort={sort} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.length ? (
                sorted.map((d) => {
                  const wr = d.totalGames ? (d.totalWins / d.totalGames) * 100 : 0;
                  return (
                    <tr key={d.date}>
                      <td style={{ textAlign: "left", color: ui.text }}>{d.date}</td>
                      <td>{nf(d.totalGames)}</td>
                      <td style={{ color: ui.green }}>{nf(d.totalWins)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 9 }}>
                          <div style={{ width: 54, height: 5, background: ui.panel2, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${wr}%`, height: "100%", background: ui.cyan, borderRadius: 3 }} />
                          </div>
                          <span style={{ minWidth: 42, textAlign: "right" }}>{wr.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>{d.totalWins > 0 ? Number(d.avgGuesses).toFixed(2) : <span style={{ color: ui.faint }}>-</span>}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: ui.faint, padding: "34px 0" }}>
                    {loaded ? "No game results yet" : "Loading…"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminShell>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="an-seg">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} data-active={value === o.value} className="an-seg-btn">
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Th({
  label,
  k,
  sort,
  onSort,
  align = "right",
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === k;
  return (
    <th style={{ textAlign: align }}>
      <button className="an-th-btn" onClick={() => onSort(k)} style={{ justifyContent: align === "left" ? "flex-start" : "flex-end" }}>
        <span style={{ color: active ? ui.text : ui.dim }}>{label}</span>
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp size={11} color={ui.orange} />
          ) : (
            <ArrowDown size={11} color={ui.orange} />
          )
        ) : (
          <ChevronsUpDown size={11} color={ui.faint} />
        )}
      </button>
    </th>
  );
}

const css = `
  .an-seg { display: inline-flex; background: ${ui.panel2}; border: 1px solid ${ui.line}; border-radius: 5px; padding: 3px; gap: 2px; }
  .an-seg-btn {
    padding: 6px 12px; border: none; background: transparent; border-radius: 3px; cursor: pointer;
    font-family: ${fontLabel}; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: ${ui.dim};
    transition: all 0.14s ease;
  }
  .an-seg-btn:hover { color: ${ui.text}; }
  .an-seg-btn[data-active="true"] { background: ${ui.raised}; color: ${ui.text}; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }

  .an-table { width: 100%; border-collapse: collapse; }
  .an-table th { padding: 11px 20px; background: ${ui.panel2}; position: sticky; top: 0; }
  .an-th-btn {
    display: flex; align-items: center; gap: 6px; width: 100%; background: none; border: none; cursor: pointer;
    font-family: ${fontLabel}; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
  }
  .an-table td {
    padding: 12px 20px; text-align: right; font-family: ${fontMono}; font-size: 12.5px; color: ${ui.dim};
    border-bottom: 1px solid ${ui.lineSoft}; white-space: nowrap;
  }
  .an-table tbody tr { transition: background 0.12s ease; }
  .an-table tbody tr:hover { background: ${ui.panel2}; }
  .an-table tbody tr:hover td:first-child { box-shadow: inset 2px 0 0 ${ui.orange}; }
`;
