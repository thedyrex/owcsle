import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return error || !user ? null : user;
}

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const m = user.user_metadata;
  return NextResponse.json({
    gamesPlayed: m?.daily_games_played ?? 0,
    gamesWon: m?.daily_games_won ?? 0,
    currentStreak: m?.daily_streak ?? 0,
    bestStreak: m?.daily_best_streak ?? 0,
    guessDistribution: m?.daily_guess_dist ?? [0, 0, 0, 0, 0, 0],
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gamesPlayed, gamesWon, currentStreak, bestStreak, guessDistribution } = await request.json();

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      daily_games_played: gamesPlayed,
      daily_games_won: gamesWon,
      daily_streak: currentStreak,
      daily_best_streak: bestStreak,
      daily_guess_dist: guessDistribution,
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
