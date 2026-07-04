import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: return count of sessions active in the last 5 minutes
export async function GET() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { count, error } = await supabaseAdmin
    .from('online_sessions')
    .select('*', { count: 'exact', head: true })
    .gte('last_seen', cutoff);

  if (error) {
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count ?? 0 });
}

// POST: upsert a heartbeat for a session
export async function POST(request: NextRequest) {
  const { session_id } = await request.json();

  if (!session_id || typeof session_id !== 'string') {
    return NextResponse.json({ error: 'Invalid session_id' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('online_sessions')
    .upsert({ session_id, last_seen: new Date().toISOString() }, { onConflict: 'session_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
