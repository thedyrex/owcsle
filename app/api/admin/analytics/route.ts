import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export async function GET() {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await jwtVerify(token, SECRET);

    // Fetch pre-aggregated stats from daily_stats
    const { data: dailyStats, error: dailyError } = await supabase
      .from("daily_stats")
      .select("*")
      .order("game_date", { ascending: false });

    if (dailyError) {
      return NextResponse.json({ error: dailyError.message }, { status: 500 });
    }

    // Fetch any remaining raw results (current day / not yet compressed)
    const { data: results, error } = await supabase
      .from("game_results")
      .select("*")
      .order("game_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch historical per-country rollups (persist past compression). If the
    // table doesn't exist yet (migration not run), degrade to no country data
    // rather than failing the whole analytics page.
    const { data: countryStats } = await supabase
      .from("country_stats")
      .select("*");

    // Build stats map from compressed daily_stats
    const statsByDate: Record<string, any> = {};

    for (const row of dailyStats || []) {
      statsByDate[row.game_date] = {
        date: row.game_date,
        totalGames: row.total_games,
        totalWins: row.total_wins,
        totalGuesses: row.total_guesses,
        avgGuesses: row.total_wins > 0
          ? (row.total_guesses / row.total_wins).toFixed(2)
          : 0,
      };
    }

    // Merge in any remaining raw game_results (current day)
    for (const result of results || []) {
      const date = result.game_date;
      if (!statsByDate[date]) {
        statsByDate[date] = {
          date,
          totalGames: 0,
          totalWins: 0,
          totalGuesses: 0,
          avgGuesses: 0,
        };
      }
      statsByDate[date].totalGames += 1;
      if (result.won) {
        statsByDate[date].totalWins += 1;
        statsByDate[date].totalGuesses += result.guess_count;
      }
    }

    // Recalculate avgGuesses for any dates that had raw results merged in
    for (const date of Object.keys(statsByDate)) {
      const stats = statsByDate[date];
      if (stats.totalWins > 0) {
        stats.avgGuesses = (stats.totalGuesses / stats.totalWins).toFixed(2);
      }
    }

    // Convert to array sorted by date descending
    const analyticsArray = Object.values(statsByDate)
      .sort((a: any, b: any) => b.date.localeCompare(a.date));

    // Aggregate country totals: historical rollups + current-day raw rows.
    const countryTotals: Record<string, number> = {};
    for (const row of countryStats || []) {
      if (!row.country) continue;
      countryTotals[row.country] =
        (countryTotals[row.country] || 0) + (row.game_count || 0);
    }
    for (const result of results || []) {
      if (!result.country) continue;
      countryTotals[result.country] =
        (countryTotals[result.country] || 0) + 1;
    }

    const countries = Object.entries(countryTotals)
      .map(([country, games]) => ({ country, games }))
      .sort((a, b) => b.games - a.games);

    return NextResponse.json({ analytics: analyticsArray, countries });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
