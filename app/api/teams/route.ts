import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { convertTeamToLocalImages } from "@/lib/localImages.server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: teams, error } = await supabase
      .from("teams")
      .select("id, team_name, team_logo, region, team_color")
      .order("region", { ascending: true })
      .order("team_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ teams: teams?.map(convertTeamToLocalImages) });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
