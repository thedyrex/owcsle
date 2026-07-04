import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { levelFromXp, levelTitle } from '@/lib/xp';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = data.users
    .map(u => ({
      id: u.id,
      username: u.user_metadata?.username || u.email?.split('@')[0] || 'Unknown',
      avatar_url: u.user_metadata?.avatar_url || null,
      banner_url: u.user_metadata?.banner_url || null,
      team_tag: u.user_metadata?.team_tag || null,
      player_title: u.user_metadata?.player_title || null,
      arcade_xp: u.user_metadata?.arcade_xp || 0,
      avg_time_ms: u.user_metadata?.avg_time_ms ?? null,
      games_won: u.user_metadata?.games_won || 0,
      level: levelFromXp(u.user_metadata?.arcade_xp || 0),
      title: levelTitle(levelFromXp(u.user_metadata?.arcade_xp || 0)),
      verified: u.user_metadata?.verified ?? false,
      banned: u.user_metadata?.banned ?? false,
    }))
    .filter(e => e.arcade_xp > 0 && !e.banned)
    .sort((a, b) => b.arcade_xp - a.arcade_xp)
    .slice(0, 100);

  return NextResponse.json({ entries });
}
