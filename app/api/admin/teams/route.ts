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

    // Get all teams from teams table
    const { data: teams, error } = await supabase
      .from("teams")
      .select("*")
      .order("team_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get player counts for each team
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const { count } = await supabase
          .from("team_rosters")
          .select("*", { count: "exact", head: true })
          .eq("team_name", team.team_name);

        return {
          ...team,
          player_count: count || 0,
        };
      })
    );

    return NextResponse.json({ teams: teamsWithCounts });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
