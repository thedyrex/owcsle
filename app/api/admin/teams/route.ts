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

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await jwtVerify(token, SECRET);

    const body = await request.json();
    const team_name = (body.team_name || "").trim();
    const team_color = body.team_color || null;

    if (!team_name) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    // Reject duplicates (case-insensitive)
    const { data: existing } = await supabase
      .from("teams")
      .select("id")
      .ilike("team_name", team_name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "A team with that name already exists" }, { status: 409 });
    }

    const { data: team, error } = await supabase
      .from("teams")
      .insert({ team_name, team_color })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, team });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
