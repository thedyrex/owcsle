import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { convertPlayerToLocalImages } from '@/lib/localImages.server';

export async function GET() {
  try {
    const { data: players, error } = await supabase
      .from('team_rosters')
      .select('*')
      .order('player_name');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      );
    }

    return NextResponse.json({ players: players?.map(convertPlayerToLocalImages) });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
