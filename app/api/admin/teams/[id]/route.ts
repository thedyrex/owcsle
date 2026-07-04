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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await jwtVerify(token, SECRET);

    const { id } = await params;
    const { team_name, team_color } = await request.json();

    if (!team_name) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    // Get the team from teams table
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("team_name")
      .eq("id", id)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const oldTeamName = team.team_name;

    // Update team in teams table
    const updateData: { team_name: string; team_color?: string } = { team_name };
    if (team_color !== undefined) {
      updateData.team_color = team_color;
    }

    const { error: updateTeamError } = await supabase
      .from("teams")
      .update(updateData)
      .eq("id", id);

    if (updateTeamError) {
      return NextResponse.json(
        { error: updateTeamError.message },
        { status: 500 }
      );
    }

    // Update all players with this team name
    const { error: updateError } = await supabase
      .from("team_rosters")
      .update({ team_name })
      .eq("team_name", oldTeamName);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
