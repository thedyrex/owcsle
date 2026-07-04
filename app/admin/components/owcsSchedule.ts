/**
 * Days the official OWCS broadcast (twitch.tv/ow_esports) was live with matches.
 * Dates are the published match-calendar days for the NA/EMEA + international
 * broadcast. Sourced from Liquipedia + the official OWCS viewer guides (2026 season).
 *
 * Note: these are broadcast-calendar dates; the analytics graph buckets games by
 * CST day, so a marker may sit ±1 day from a late-night broadcast. Asia regional
 * (Pacific/Japan/Korea) streams are not included - add them here if you want them.
 *
 * Map: 'YYYY-MM-DD' -> phase label shown in the chart tooltip.
 */
export const OWCS_LIVE_DATES: Record<string, string> = {
  // Stage 1 - Regular Season
  "2026-03-21": "Stage 1",
  "2026-03-22": "Stage 1",
  "2026-03-28": "Stage 1",
  "2026-03-29": "Stage 1",
  "2026-04-04": "Stage 1",
  "2026-04-05": "Stage 1",
  // Stage 1 - Playoffs
  "2026-04-10": "Stage 1 Playoffs",
  "2026-04-11": "Stage 1 Playoffs",
  "2026-04-12": "Stage 1 Playoffs",
  // Champions Clash - Tokyo
  "2026-05-22": "Champions Clash",
  "2026-05-23": "Champions Clash",
  "2026-05-24": "Champions Clash",
  // Stage 2 - Regular Season
  "2026-06-13": "Stage 2",
  "2026-06-14": "Stage 2",
  "2026-06-20": "Stage 2",
  "2026-06-21": "Stage 2",
  "2026-06-27": "Stage 2",
  "2026-06-28": "Stage 2",
  // Stage 2 - Playoffs
  "2026-07-03": "Stage 2 Playoffs",
  "2026-07-04": "Stage 2 Playoffs",
  "2026-07-05": "Stage 2 Playoffs",
};

export const OWCS_LIVE_COLOR = "#fbbf24";

/** Build a per-point array aligned to chart rows: phase label or null. */
export function liveFor(dates: string[]): (string | null)[] {
  return dates.map((d) => OWCS_LIVE_DATES[d] ?? null);
}
