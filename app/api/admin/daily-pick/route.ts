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

// GET current daily pick
export async function GET(request: NextRequest) {
  const isAuthenticated = await verifyAuth(request);

  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: dailyPick, error } = await supabaseAdmin
      .from('daily_player_picks')
      .select('*')
      .eq('pick_date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // If we have a pick, fetch the player details by name
    let playerData = null;
    if (dailyPick?.player_name) {
      const { data: player } = await supabaseAdmin
        .from('team_rosters')
        .select('*')
        .eq('player_name', dailyPick.player_name)
        .single();

      if (player) {
        playerData = player;
      } else {
        // Player not found - pick a random one
        const { data: allPlayers } = await supabaseAdmin
          .from('team_rosters')
          .select('*');

        if (allPlayers && allPlayers.length > 0) {
          playerData = allPlayers[Math.floor(Math.random() * allPlayers.length)];
        }
      }
    }

    return NextResponse.json({
      dailyPick: dailyPick ? { ...dailyPick, player: playerData } : null
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch daily pick' },
      { status: 500 }
    );
  }
}

// POST/PUT - Set or update daily pick
export async function POST(request: NextRequest) {
  const isAuthenticated = await verifyAuth(request);

  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { playerName, date } = await request.json();

    if (!playerName) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    const pickDate = date || new Date().toISOString().split('T')[0];

    // Check if player exists
    const { data: player, error: playerError } = await supabaseAdmin
      .from('team_rosters')
      .select('player_name')
      .eq('player_name', playerName)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Check if a pick already exists for this date
    const { data: existingPick } = await supabaseAdmin
      .from('daily_player_picks')
      .select('id')
      .eq('pick_date', pickDate)
      .single();

    if (existingPick) {
      // Update existing pick
      const { error: updateError } = await supabaseAdmin
        .from('daily_player_picks')
        .update({ player_name: playerName })
        .eq('pick_date', pickDate);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // Create new pick
      const { error: insertError } = await supabaseAdmin
        .from('daily_player_picks')
        .insert([{ player_name: playerName, pick_date: pickDate }]);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to set daily pick' },
      { status: 500 }
    );
  }
}
