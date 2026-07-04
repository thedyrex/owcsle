import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { convertPlayerToLocalImages } from '@/lib/localImages.server';

export async function GET() {
  try {
    // Get today's date in CST timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const today = formatter.format(now);

    // Fetch target player name for today
    const { data: dailyPick, error: pickError } = await supabase
      .from('daily_player_picks')
      .select('player_name')
      .eq('pick_date', today)
      .single();

    if (pickError || !dailyPick) {
      return NextResponse.json(
        { error: 'No daily pick found for today' },
        { status: 404 }
      );
    }

    // Fetch the target player details by name
    const { data: targetPlayer, error: playerError } = await supabase
      .from('team_rosters')
      .select('*')
      .eq('player_name', dailyPick.player_name)
      .single();

    if (playerError || !targetPlayer) {
      return NextResponse.json(
        { error: 'Target player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      targetPlayer: convertPlayerToLocalImages(targetPlayer),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
