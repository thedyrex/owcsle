import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { supabaseAdmin } from '@/lib/supabase';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

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

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const playerSlug = request.nextUrl.searchParams.get('player');
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 200, 500);

  let query = supabaseAdmin
    .from('signatures')
    .select('id, player_slug, player_name, url, r2_key, stroke_count, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (playerSlug) query = query.eq('player_slug', playerSlug);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch signatures' }, { status: 500 });
  }

  return NextResponse.json({ signatures: data ?? [] });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from('signatures')
    .select('r2_key')
    .eq('id', id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
  }

  // Drop the index row first: an orphaned R2 object is invisible, but an index
  // row pointing at a deleted object renders as a broken image on the board.
  const { error: deleteError } = await supabaseAdmin.from('signatures').delete().eq('id', id);
  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete signature' }, { status: 500 });
  }

  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: row.r2_key })
    );
  } catch (err) {
    console.error('R2 delete failed for', row.r2_key, err);
  }

  return NextResponse.json({ success: true });
}
