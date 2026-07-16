import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabase';
import { CodesTableMissingError, generateCode, listCodesEnsuringAll } from '@/lib/player-codes.server';
import { slugifyPlayerName } from '@/lib/signatures';

/** The one setup step this feature needs, worded so it can be acted on. */
const SETUP_REQUIRED =
  'Signing codes need one setup step: run scripts/player-codes.sql in the Supabase SQL editor.';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

async function requireAdmin(): Promise<boolean> {
  const token = (await cookies()).get('admin-token')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

/** Every player's code, minting any that don't exist yet. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const codes = await listCodesEnsuringAll();
    return NextResponse.json({ codes });
  } catch (err) {
    // A missing table is a setup step, not a fault — 503 and say which step.
    if (err instanceof CodesTableMissingError) {
      return NextResponse.json({ error: SETUP_REQUIRED, setupRequired: true }, { status: 503 });
    }
    console.error('player-codes list failed', err);
    return NextResponse.json({ error: 'Failed to load codes' }, { status: 500 });
  }
}

/** Replace one player's code — the move when a code has leaked. */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const playerName = (body as { playerName?: unknown }).playerName;
  if (typeof playerName !== 'string' || !playerName.trim()) {
    return NextResponse.json({ error: 'Missing player' }, { status: 400 });
  }

  const slug = slugifyPlayerName(playerName);
  if (!slug) return NextResponse.json({ error: 'Invalid player' }, { status: 400 });

  const code = generateCode();
  const { data, error } = await supabaseAdmin
    .from('player_codes')
    .update({ code, updated_at: new Date().toISOString() })
    .eq('player_slug', slug)
    .select('player_slug, player_name, code')
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST205') {
      return NextResponse.json({ error: SETUP_REQUIRED, setupRequired: true }, { status: 503 });
    }
    console.error('player-codes regenerate failed', error);
    return NextResponse.json({ error: 'Failed to regenerate code' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Player has no code yet' }, { status: 404 });
  }

  return NextResponse.json({ code: data });
}
