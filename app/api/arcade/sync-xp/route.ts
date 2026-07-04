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
  return NextResponse.json({
    totalXp: user.user_metadata?.arcade_xp ?? 0,
    avgTimeMs: user.user_metadata?.avg_time_ms ?? null,
    totalWinTimeMs: user.user_metadata?.total_win_time_ms ?? null,
    winCount: user.user_metadata?.win_count ?? null,
  });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { totalXp, avgTimeMs, gamesWon } = await request.json();
  if (typeof totalXp !== 'number') return NextResponse.json({ error: 'Invalid xp' }, { status: 400 });

  const dbXp = user.user_metadata?.arcade_xp ?? 0;
  const dbGamesWon = user.user_metadata?.games_won ?? 0;
  const bestXp = Math.max(totalXp, dbXp);
  const bestGamesWon = typeof gamesWon === 'number' ? Math.max(gamesWon, dbGamesWon) : dbGamesWon;

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      arcade_xp: bestXp,
      avg_time_ms: avgTimeMs ?? null,
      games_won: bestGamesWon,
    },
  });

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
