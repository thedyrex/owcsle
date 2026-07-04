import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('admin-token')?.value;

  if (!token) {
    return false;
  }

  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const isAuthenticated = await verifyAuth(request);

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all players
    const { data: players, error } = await supabaseAdmin
      .from('team_rosters')
      .select('id, player_name, team_name, role, role_type, region')
      .order('player_name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Find duplicates
    const nameCount: Record<string, typeof players> = {};
    for (const player of players || []) {
      if (!nameCount[player.player_name]) {
        nameCount[player.player_name] = [];
      }
      nameCount[player.player_name].push(player);
    }

    const duplicates = Object.entries(nameCount)
      .filter(([, entries]) => entries.length > 1)
      .map(([player_name, entries]) => ({
        player_name,
        players: entries.sort((a, b) => b.id - a.id),
      }));

    return NextResponse.json({ players, duplicates });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}
