import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { won, guessCount, gameDate } = await request.json();

    // Coarse geolocation from Vercel's edge (ISO alpha-2, e.g. "US"). We store
    // only the country code — never the IP. Absent in local dev / non-Vercel.
    const country =
      request.headers.get("x-vercel-ip-country")?.toUpperCase() || null;

    // Insert game result into database
    const base = {
      won,
      guess_count: guessCount,
      game_date: gameDate,
      created_at: new Date().toISOString(),
    };
    let { error } = await supabase
      .from("game_results")
      .insert({ ...base, country });

    // If the country column hasn't been added yet (migration not run), retry
    // without it so core game recording never breaks on deploy order.
    if (error && /country/i.test(error.message)) {
      ({ error } = await supabase.from("game_results").insert(base));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
