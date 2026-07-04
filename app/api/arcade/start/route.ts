import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Fetch all players
    const { data: players, error } = await supabase
      .from('team_rosters')
      .select('id, player_name');

    if (error || !players || players.length === 0) {
      return NextResponse.json(
        { error: 'Could not load players' },
        { status: 500 }
      );
    }

    // Pick a random player
    const randomIndex = Math.floor(Math.random() * players.length);
    const targetPlayer = players[randomIndex];

    // Store target player ID in a cookie (httpOnly for security)
    const cookieStore = await cookies();
    cookieStore.set('arcade_target', String(targetPlayer.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
