import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
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

    // Get target player ID from cookie
    const cookieStore = await cookies();
    const targetId = cookieStore.get('arcade_target')?.value;

    if (!targetId) {
      return NextResponse.json(
        { error: 'No arcade game in progress. Start a new game.' },
        { status: 400 }
      );
    }

    // Fetch target and guessed player in parallel
    const [targetResult, guessedResult] = await Promise.all([
      supabase
        .from('team_rosters')
        .select('*')
        .eq('id', parseInt(targetId))
        .single(),
      supabase
        .from('team_rosters')
        .select('*')
        .eq('id', guessedPlayerId)
        .single()
    ]);

    if (targetResult.error || !targetResult.data) {
      return NextResponse.json(
        { error: 'Target player not found' },
        { status: 404 }
      );
    }

    if (guessedResult.error || !guessedResult.data) {
      return NextResponse.json(
        { error: 'Guessed player not found' },
        { status: 404 }
      );
    }

    const targetPlayer = targetResult.data;
    const guessedPlayer = guessedResult.data;

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

    const isCorrect = guessedPlayer.id === targetPlayer.id;

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
