import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getCSTDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function compareTeams(a: string | null, b: string | null): 'correct' | 'partial' | 'wrong' {
  const setA = new Set((a ?? '').split(',').map(s => s.trim()).filter(Boolean));
  const setB = new Set((b ?? '').split(',').map(s => s.trim()).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 'wrong';
  const equal = setA.size === setB.size && [...setA].every(t => setB.has(t));
  if (equal) return 'correct';
  const overlap = [...setA].some(t => setB.has(t));
  return overlap ? 'partial' : 'wrong';
}

function compareYears(a: string | null, b: string | null): 'correct' | 'partial' | 'wrong' {
  const setA = new Set((a ?? '').split(',').map(s => s.trim()).filter(Boolean));
  const setB = new Set((b ?? '').split(',').map(s => s.trim()).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 'wrong';
  const equal = setA.size === setB.size && [...setA].every(y => setB.has(y));
  if (equal) return 'correct';
  const overlap = [...setA].some(y => setB.has(y));
  return overlap ? 'partial' : 'wrong';
}

export async function POST(request: Request) {
  try {
    const { playerName } = await request.json();
    if (!playerName) return NextResponse.json({ error: 'Player name is required' }, { status: 400 });

    const today = getCSTDate();

    const [pickResult, guessResult] = await Promise.all([
      supabase.from('usa_daily_picks').select('player_name').eq('pick_date', today).single(),
      supabase.from('usa_rosters').select('*').eq('player_name', playerName).single(),
    ]);

    if (pickResult.error || !pickResult.data)
      return NextResponse.json({ error: 'No USA daily pick for today' }, { status: 404 });
    if (guessResult.error || !guessResult.data)
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const { data: target } = await supabase
      .from('usa_rosters')
      .select('*')
      .eq('player_name', pickResult.data.player_name)
      .single();

    if (!target) return NextResponse.json({ error: 'Target player not found' }, { status: 404 });

    const guessed = guessResult.data;
    const isCorrect = guessed.player_name === target.player_name;

    const staffKeywords = ['coach', 'manager', 'analyst', 'director', 'gm', 'head'];
    const isStaff = (role: string) => staffKeywords.some(k => role?.toLowerCase().includes(k));
    const playerRoles = ['dps', 'tank', 'support', 'damage', 'flex'];
    const isPlayer = (role: string) => playerRoles.some(k => role?.toLowerCase().includes(k));

    let roleResult: 'correct' | 'partial' | 'wrong';
    if (guessed.role === target.role) {
      roleResult = 'correct';
    } else if (isStaff(guessed.role) && isStaff(target.role)) {
      roleResult = 'partial';
    } else if (isPlayer(guessed.role) && isPlayer(target.role)) {
      roleResult = 'partial';
    } else {
      roleResult = 'wrong';
    }

    const feedback = {
      role:        roleResult,
      prior_team:  compareTeams(guessed.prior_team, target.prior_team),
      year_active: compareYears(guessed.year_active, target.year_active),
    };

    return NextResponse.json({ feedback, isCorrect, guessedPlayer: guessed });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
