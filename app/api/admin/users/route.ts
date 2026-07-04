import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'curdtanner@gmail.com';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice(7);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (user?.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const q = request.nextUrl.searchParams.get('q')?.toLowerCase() || '';
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000, page: 1 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = data.users
    .filter(u => {
      const username = u.user_metadata?.username?.toLowerCase() || '';
      const email = u.email?.toLowerCase() || '';
      return username.includes(q) || email.includes(q);
    })
    .slice(0, 20)
    .map(u => ({
      id: u.id,
      email: u.email,
      username: u.user_metadata?.username || u.email?.split('@')[0] || u.id,
      arcade_xp: u.user_metadata?.arcade_xp ?? 0,
      verified: u.user_metadata?.verified ?? false,
      banned: u.banned_until != null && u.banned_until !== 'none',
      custom_titles: u.user_metadata?.custom_titles ?? [],
    }));

  return NextResponse.json({ users });
}
