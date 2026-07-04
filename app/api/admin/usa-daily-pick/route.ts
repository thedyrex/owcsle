import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('admin-token')?.value;
  if (!token) return false;
  try { await jwtVerify(token, SECRET); return true; } catch { return false; }
}

export async function GET(request: NextRequest) {
  if (!await verifyAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];
  const { data: dailyPick, error } = await supabaseAdmin
    .from('usa_daily_picks')
    .select('*')
    .eq('pick_date', today)
    .single();

  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 });

  let playerData = null;
  if (dailyPick?.player_name) {
    const { data: player } = await supabaseAdmin
      .from('usa_rosters')
      .select('*')
      .eq('player_name', dailyPick.player_name)
      .single();
    playerData = player;
  }

  return NextResponse.json({ dailyPick: dailyPick ? { ...dailyPick, player: playerData } : null });
}

export async function POST(request: NextRequest) {
  if (!await verifyAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { playerName, date } = await request.json();
  if (!playerName) return NextResponse.json({ error: 'Player name is required' }, { status: 400 });

  const pickDate = date || new Date().toISOString().split('T')[0];

  const { data: player, error: playerError } = await supabaseAdmin
    .from('usa_rosters')
    .select('player_name')
    .eq('player_name', playerName)
    .single();

  if (playerError || !player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const { data: existing } = await supabaseAdmin
    .from('usa_daily_picks')
    .select('id')
    .eq('pick_date', pickDate)
    .single();

  if (existing) {
    const { error } = await supabaseAdmin.from('usa_daily_picks').update({ player_name: playerName }).eq('pick_date', pickDate);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin.from('usa_daily_picks').insert([{ player_name: playerName, pick_date: pickDate }]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
