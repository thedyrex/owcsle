import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'curdtanner@gmail.com';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice(7);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (user?.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, xp } = await request.json();
  if (!userId || typeof xp !== 'number' || xp < 0) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const { data: target } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (!target.user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { ...target.user.user_metadata, arcade_xp: xp },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
