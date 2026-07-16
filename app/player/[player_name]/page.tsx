import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findPlayerBySlug } from '@/lib/signatures.server';
import { slugifyPlayerName } from '@/lib/signatures';
import { PlayerSignatureClient } from './PlayerSignatureClient';

// The roster changes from the admin panel, so resolve on each request.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ player_name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { player_name } = await params;
  const player = await findPlayerBySlug(decodeURIComponent(player_name));
  if (!player) return { title: 'Player not found · OWCSLE' };

  const title = `Sign for ${player.player_name} · OWCSLE`;
  const description = `Leave your signature for ${player.player_name} of ${player.team_name}.`;
  return {
    title,
    description,
    // This page can carry a code in its URL, so it must never hand its own URL
    // to anywhere else. Signing links shouldn't be indexed either.
    referrer: 'no-referrer',
    robots: { index: false, follow: false },
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PlayerPage({ params }: PageProps) {
  const { player_name } = await params;
  const player = await findPlayerBySlug(decodeURIComponent(player_name));
  if (!player) notFound();

  return (
    <PlayerSignatureClient
      playerName={player.player_name}
      playerSlug={slugifyPlayerName(player.player_name)}
      teamName={player.team_name}
      logoUrl={player.logo_url}
      teamColor={player.team_color}
    />
  );
}
