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

  const { data: { user: admin } } = await supabaseAdmin.auth.getUser(token);
  if (admin?.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { userId, action } = body;
  if (!userId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const { data: { user: target } } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const meta = target.user_metadata ?? {};

  switch (action) {
    case 'xp': {
      const xp = Number(body.xp);
      if (isNaN(xp) || xp < 0) return NextResponse.json({ error: 'Invalid xp' }, { status: 400 });
      await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: { ...meta, arcade_xp: xp } });
      return NextResponse.json({ msg: `SET ${target.user_metadata?.username ?? userId} → ${xp} XP`, updated: { arcade_xp: xp } });
    }

    case 'verify': {
      const verified = Boolean(body.verified);
      await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: { ...meta, verified } });
      return NextResponse.json({ msg: verified ? 'VERIFIED' : 'UNVERIFIED', updated: { verified } });
    }

    case 'add-title': {
      const title = String(body.title ?? '').trim();
      if (!title) return NextResponse.json({ error: 'Empty title' }, { status: 400 });
      const existing: string[] = meta.custom_titles ?? [];
      if (existing.includes(title)) return NextResponse.json({ error: 'Already exists' }, { status: 400 });
      const custom_titles = [...existing, title];
      await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: { ...meta, custom_titles } });
      return NextResponse.json({ msg: `ADDED "${title}"`, updated: { custom_titles } });
    }

    case 'remove-title': {
      const title = String(body.title ?? '').trim();
      const custom_titles = (meta.custom_titles ?? []).filter((t: string) => t !== title);
      await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: { ...meta, custom_titles } });
      return NextResponse.json({ msg: `REMOVED "${title}"`, updated: { custom_titles } });
    }

    case 'ban': {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '876000h',
        user_metadata: { ...meta, banned: true },
      });
      return NextResponse.json({ msg: `BANNED ${target.user_metadata?.username ?? userId}`, updated: { banned: true } });
    }

    case 'unban': {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
        user_metadata: { ...meta, banned: false },
      });
      return NextResponse.json({ msg: `UNBANNED ${target.user_metadata?.username ?? userId}`, updated: { banned: false } });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
