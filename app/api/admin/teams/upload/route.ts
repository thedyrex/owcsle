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
    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await jwtVerify(token, SECRET);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const teamId = formData.get("teamId") as string;

    if (!file || !teamId) {
      return NextResponse.json(
        { error: "File and team ID are required" },
        { status: 400 }
      );
    }

    // Get the team from teams table
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("team_name")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const teamName = team.team_name;

    // Upload file to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${teamName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.${fileExt}`;
    const filePath = `team-logos/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("owcsle-assets")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("owcsle-assets")
      .getPublicUrl(filePath);

    const logoUrl = urlData.publicUrl;

    // Update team in teams table
    const { error: updateTeamError } = await supabase
      .from("teams")
      .update({ team_logo: logoUrl })
      .eq("id", teamId);

    if (updateTeamError) {
      return NextResponse.json(
        { error: `Failed to update team: ${updateTeamError.message}` },
        { status: 500 }
      );
    }

    // Update all players in this team with the new logo URL
    const { error: updateError, count } = await supabase
      .from("team_rosters")
      .update({ logo_url: logoUrl })
      .eq("team_name", teamName);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update players: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      logoUrl,
      playersUpdated: count || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
