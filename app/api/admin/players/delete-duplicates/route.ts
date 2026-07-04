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

export async function POST(request: NextRequest) {
  const isAuthenticated = await verifyAuth(request);

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all players
    const { data: players, error: fetchError } = await supabaseAdmin
      .from('team_rosters')
      .select('id, player_name')
      .order('id', { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Find duplicates and get IDs to delete (keep first, delete rest)
    const seen: Record<string, number> = {};
    const idsToDelete: number[] = [];

    for (const player of players || []) {
      if (seen[player.player_name]) {
        idsToDelete.push(player.id);
      } else {
        seen[player.player_name] = player.id;
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ message: 'No duplicates found', deleted: 0 });
    }

    // Delete duplicates
    const { error: deleteError } = await supabaseAdmin
      .from('team_rosters')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: idsToDelete.length });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete duplicates' }, { status: 500 });
  }
}
