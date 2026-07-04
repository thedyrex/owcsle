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

export async function POST() {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await jwtVerify(token, SECRET);

    // Get all teams from teams table with their colors and logos
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("team_name, team_color, team_logo");

    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 });
    }

    let totalPlayersUpdated = 0;
    let teamsUpdated = 0;

    // Update team_rosters for each team (both color and logo)
    for (const team of teams) {
      const updateData: { team_color?: string; logo_url?: string } = {};

      if (team.team_color) {
        updateData.team_color = team.team_color;
      }
      if (team.team_logo) {
        updateData.logo_url = team.team_logo;
      }

      if (Object.keys(updateData).length > 0) {
        const { data: updatedRows, error: updateError } = await supabase
          .from("team_rosters")
          .update(updateData)
          .eq("team_name", team.team_name)
          .select("id");

        if (updateError) {
        } else {
          const count = updatedRows?.length || 0;
          totalPlayersUpdated += count;
          if (count > 0) {
            teamsUpdated++;
          }
        }
      }
    }

    return NextResponse.json({
      playersUpdated: totalPlayersUpdated,
      teamsUpdated: teamsUpdated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
