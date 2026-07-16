import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidViewToken } from '@/lib/signature-view.server';
import { SignatureWall } from './SignatureWall';

// Signatures arrive continuously; never serve a cached wall.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Signatures · OWCSLE',
    // Unlisted means unlisted: nothing to index, nothing to unfurl, and no
    // referrer — the token is in this URL. Nulled, not omitted, or the root
    // layout's tags would unfurl in their place.
    description: null,
    openGraph: null,
    twitter: null,
    referrer: 'no-referrer',
    robots: { index: false, follow: false },
  };
}

interface SignatureRow {
  id: number;
  player_name: string;
  player_slug: string;
  url: string;
  created_at: string;
}

export default async function SignatureViewPage({ params }: PageProps) {
  const { token } = await params;

  // A wrong token gets the same 404 as a URL that was never real, so the page
  // gives away nothing about whether it exists.
  if (!isValidViewToken(decodeURIComponent(token))) notFound();

  const { data } = await supabaseAdmin
    .from('signatures')
    .select('id, player_name, player_slug, url, created_at')
    .order('created_at', { ascending: false });

  return <SignatureWall signatures={(data ?? []) as SignatureRow[]} />;
}
