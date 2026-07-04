import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { convertPlayerToLocalImages } from '@/lib/localImages.server';

export async function POST(request: Request) {
  try {
    const { guessedPlayerId } = await request.json();

    if (!guessedPlayerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Get today's date in CST timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const today = formatter.format(now);

    // Fetch daily pick and guessed player in parallel
    const [dailyPickResult, guessedPlayerResult] = await Promise.all([
      supabase
        .from('daily_player_picks')
        .select('player_name')
        .eq('pick_date', today)
        .single(),
      supabase
        .from('team_rosters')
        .select('*')
        .eq('id', guessedPlayerId)
        .single()
    ]);

    if (dailyPickResult.error || !dailyPickResult.data) {
      return NextResponse.json(
        { error: 'No daily pick found for today' },
        { status: 404 }
      );
    }

    if (guessedPlayerResult.error || !guessedPlayerResult.data) {
      return NextResponse.json(
        { error: 'Guessed player not found' },
        { status: 404 }
      );
    }

    const guessedPlayer = guessedPlayerResult.data;

    // Fetch target player by name
    const { data: targetPlayer, error: targetError } = await supabase
      .from('team_rosters')
      .select('*')
      .eq('player_name', dailyPickResult.data.player_name)
      .single();

    if (targetError || !targetPlayer) {
      return NextResponse.json(
        { error: 'Target player not found' },
        { status: 404 }
      );
    }

    if (!targetPlayer || !guessedPlayer) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Calculate feedback
    const roleMatches = guessedPlayer.role === targetPlayer.role;
    const roleTypeMatches = guessedPlayer.role_type === targetPlayer.role_type;

    const feedback = {
      team: guessedPlayer.team_name === targetPlayer.team_name ? 'correct' : 'wrong',
      region: guessedPlayer.region === targetPlayer.region ? 'correct' : 'wrong',
      nationality: guessedPlayer.nationality === targetPlayer.nationality ? 'correct' : 'wrong',
      role: roleMatches ? 'correct' : 'wrong',
      role_type: roleTypeMatches ? 'correct' : (roleMatches ? 'partial' : 'wrong'),
    };

    const isCorrect = guessedPlayer.player_name === targetPlayer.player_name;

    return NextResponse.json({
      feedback,
      isCorrect,
      guessedPlayer: convertPlayerToLocalImages(guessedPlayer),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
