import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await jwtVerify(token, SECRET);

    const { teamId, logoPath } = await request.json();

    if (!teamId || !logoPath) {
      return NextResponse.json(
        { error: "teamId and logoPath are required" },
        { status: 400 }
      );
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("team_name")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const { error: updateTeamError } = await supabase
      .from("teams")
      .update({ team_logo: logoPath })
      .eq("id", teamId);

    if (updateTeamError) {
      return NextResponse.json(
        { error: `Failed to update team: ${updateTeamError.message}` },
        { status: 500 }
      );
    }

    const { error: updatePlayersError, count } = await supabase
      .from("team_rosters")
      .update({ logo_url: logoPath })
      .eq("team_name", team.team_name);

    if (updatePlayersError) {
      return NextResponse.json(
        { error: `Failed to update players: ${updatePlayersError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, logoPath, playersUpdated: count || 0 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
