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

// Helper function to shuffle array (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function POST(request: NextRequest) {
  const isAuthenticated = await verifyAuth(request);

  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { startDate, days } = await request.json();

    if (!startDate || !days) {
      return NextResponse.json(
        { error: 'Start date and number of days are required' },
        { status: 400 }
      );
    }

    if (days < 1 || days > 730) {
      return NextResponse.json(
        { error: 'Number of days must be between 1 and 730 (2 years)' },
        { status: 400 }
      );
    }

    // Fetch all players
    const { data: allPlayers, error: playersError } = await supabaseAdmin
      .from('team_rosters')
      .select('player_name');

    if (playersError || !allPlayers || allPlayers.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      );
    }

    const playerNames = allPlayers.map(p => p.player_name);

    // Generate picks for the specified number of days
    const picks: { player_name: string; pick_date: string }[] = [];
    const start = new Date(startDate);

    // If we need more picks than available players, we'll need to cycle through
    let shuffledPlayers = shuffleArray(playerNames);
    let playerIndex = 0;

    for (let i = 0; i < days; i++) {
      // If we've used all players, reshuffle and start over
      if (playerIndex >= shuffledPlayers.length) {
        // Ensure the first player in the new shuffle isn't the same as the last player from previous shuffle
        const lastPlayer = shuffledPlayers[shuffledPlayers.length - 1];
        let newShuffle = shuffleArray(playerNames);

        // Keep reshuffling until the first player is different from the last one
        while (newShuffle[0] === lastPlayer && playerNames.length > 1) {
          newShuffle = shuffleArray(playerNames);
        }

        shuffledPlayers = newShuffle;
        playerIndex = 0;
      }

      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      picks.push({
        player_name: shuffledPlayers[playerIndex],
        pick_date: dateStr,
      });

      playerIndex++;
    }

    const endDate = new Date(start);
    endDate.setDate(start.getDate() + days - 1);
    const endDateStr = endDate.toISOString().split('T')[0];

    // Process picks one by one to handle conflicts properly
    let successCount = 0;
    for (const pick of picks) {
      // Check if pick exists for this date
      const { data: existing } = await supabaseAdmin
        .from('daily_player_picks')
        .select('id')
        .eq('pick_date', pick.pick_date)
        .single();

      if (existing) {
        // Update existing
        const { error: updateError } = await supabaseAdmin
          .from('daily_player_picks')
          .update({ player_name: pick.player_name })
          .eq('pick_date', pick.pick_date);

        if (updateError) {
          continue;
        }
      } else {
        // Insert new
        const { error: insertError } = await supabaseAdmin
          .from('daily_player_picks')
          .insert(pick);

        if (insertError) {
          continue;
        }
      }
      successCount++;
    }

    return NextResponse.json({
      success: true,
      generated: successCount,
      message: `Successfully generated ${successCount} random picks from ${startDate} to ${endDateStr}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to generate bulk picks' },
      { status: 500 }
    );
  }
}
