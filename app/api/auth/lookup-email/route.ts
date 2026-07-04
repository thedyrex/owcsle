import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }

  const match = data.users.find(
    u => u.user_metadata?.username?.toLowerCase() === username.toLowerCase()
  );

  if (!match) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ email: match.email });
}
