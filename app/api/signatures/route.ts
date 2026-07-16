import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { supabaseAdmin } from '@/lib/supabase';
import { findPlayerBySlug } from '@/lib/signatures.server';
import { codeForSlug } from '@/lib/player-codes.server';
import { normalizeCode } from '@/lib/player-codes';
import {
  sanitizeStrokes,
  slugifyPlayerName,
  strokesToSvg,
  SIGNATURE_WIDTH,
  SIGNATURE_HEIGHT,
} from '@/lib/signatures';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/** Anyone with the link can sign, so cap how much one source can push through. */
const RATE_LIMIT_PER_HOUR = 15;
const MAX_BODY_BYTES = 512 * 1024;

function hashIp(request: NextRequest): string | null {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!ip) return null;
  // Hashed so the table holds no raw addresses; salted with a secret we already have.
  return createHash('sha256')
    .update(`${ip}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`)
    .digest('hex')
    .slice(0, 32);
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Signature is too large' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { playerSlug, strokes, code } = (body ?? {}) as {
      playerSlug?: unknown;
      strokes?: unknown;
      code?: unknown;
    };

    if (typeof playerSlug !== 'string' || !playerSlug.trim()) {
      return NextResponse.json({ error: 'Missing player' }, { status: 400 });
    }

    // The player name is taken from the roster, never from the request body, so
    // a crafted payload can't file a signature under a name that doesn't exist.
    const player = await findPlayerBySlug(playerSlug);
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Check the code before doing any work: a wrong code must never reach R2.
    const expected = await codeForSlug(slugifyPlayerName(player.player_name));
    if (!expected) {
      return NextResponse.json(
        { error: 'This player has no signing code yet.' },
        { status: 403 }
      );
    }
    if (typeof code !== 'string' || normalizeCode(code) !== expected) {
      // Deliberately vague: don't tell a guesser which half they got right.
      return NextResponse.json({ error: 'That code is not right.' }, { status: 403 });
    }

    const sanitized = sanitizeStrokes(strokes);
    if (!sanitized.ok) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }

    const ipHash = hashIp(request);
    if (ipHash) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from('signatures')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', since);
      if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
        return NextResponse.json(
          { error: 'Too many signatures. Try again later.' },
          { status: 429 }
        );
      }
    }

    const slug = slugifyPlayerName(player.player_name);
    const key = `signatures/${slug}/${randomUUID()}.svg`;
    const svg = strokesToSvg(sanitized.strokes, { playerName: player.player_name });

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: Buffer.from(svg, 'utf-8'),
        ContentType: 'image/svg+xml',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const url = `https://cdn.owcsle.xyz/${key}`;

    const { error: insertError } = await supabaseAdmin.from('signatures').insert([
      {
        player_id: player.id,
        player_slug: slug,
        player_name: player.player_name,
        r2_key: key,
        url,
        stroke_count: sanitized.strokes.length,
        width: SIGNATURE_WIDTH,
        height: SIGNATURE_HEIGHT,
        ip_hash: ipHash,
      },
    ]);

    if (insertError) {
      // The object is in R2 but unindexed; surface the failure rather than
      // reporting a success the admin board will never show.
      console.error('signatures insert failed', insertError);
      return NextResponse.json({ error: 'Could not save signature' }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error('signature upload failed', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
