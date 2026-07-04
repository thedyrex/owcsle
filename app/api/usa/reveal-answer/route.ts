import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getCSTDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export async function GET() {
  try {
    const today = getCSTDate();

    const { data: pick, error: pickError } = await supabase
      .from('usa_daily_picks')
      .select('player_name')
      .eq('pick_date', today)
      .single();

    if (pickError || !pick)
      return NextResponse.json({ error: 'No USA daily pick for today' }, { status: 404 });

    const { data: player, error: playerError } = await supabase
      .from('usa_rosters')
      .select('*')
      .eq('player_name', pick.player_name)
      .single();

    if (playerError || !player)
      return NextResponse.json({ error: 'Target player not found' }, { status: 404 });

    return NextResponse.json({ targetPlayer: player });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
