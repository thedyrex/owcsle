import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get today's date in CST (matches game timezone)
    const now = new Date();
    const cstDate = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Chicago" })
    );
    const today = cstDate.toISOString().split("T")[0];

    // Fetch all game_results from before today
    const { data: results, error: fetchError } = await supabase
      .from("game_results")
      .select("*")
      .lt("game_date", today);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!results || results.length === 0) {
      return NextResponse.json({ message: "No results to compress" });
    }

    // Aggregate by date
    const statsByDate: Record<
      string,
      { total_games: number; total_wins: number; total_guesses: number }
    > = {};

    for (const result of results) {
      const date = result.game_date;
      if (!statsByDate[date]) {
        statsByDate[date] = { total_games: 0, total_wins: 0, total_guesses: 0 };
      }
      statsByDate[date].total_games += 1;
      if (result.won) {
        statsByDate[date].total_wins += 1;
        statsByDate[date].total_guesses += result.guess_count;
      }
    }

    // Upsert into daily_stats
    const upsertRows = Object.entries(statsByDate).map(([date, stats]) => ({
      game_date: date,
      ...stats,
    }));

    const { error: upsertError } = await supabase
      .from("daily_stats")
      .upsert(upsertRows, { onConflict: "game_date" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Delete compressed rows from game_results
    const { error: deleteError } = await supabase
      .from("game_results")
      .delete()
      .lt("game_date", today);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Compression complete",
      daysCompressed: Object.keys(statsByDate).length,
      rowsDeleted: results.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
