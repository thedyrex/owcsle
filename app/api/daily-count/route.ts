import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Chicago",
    });

    const [{ count: rawCount }, { data: dailyRow }] = await Promise.all([
      supabase
        .from("game_results")
        .select("*", { count: "exact", head: true })
        .eq("game_date", today),
      supabase
        .from("daily_stats")
        .select("total_games")
        .eq("game_date", today)
        .single(),
    ]);

    const total = (rawCount ?? 0) + (dailyRow?.total_games ?? 0);

    return NextResponse.json({ count: total });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
