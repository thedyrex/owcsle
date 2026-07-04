import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { convertPlayerToLocalImages } from '@/lib/localImages.server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const targetId = cookieStore.get('arcade_target')?.value;

    if (!targetId) {
      return NextResponse.json(
        { error: 'No arcade game in progress' },
        { status: 400 }
      );
    }

    const { data: targetPlayer, error } = await supabase
      .from('team_rosters')
      .select('*')
      .eq('id', parseInt(targetId))
      .single();

    if (error || !targetPlayer) {
      return NextResponse.json(
        { error: 'Target player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ targetPlayer: convertPlayerToLocalImages(targetPlayer) });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
