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

  return {
    // Title only, for the tab. Everything an unfurler could build a preview
    // from is nulled rather than omitted: omitting inherits the root layout's
    // tags, which would just swap this embed for the OWCSLE one.
    title: `Sign for ${player.player_name} · OWCSLE`,
    description: null,
    openGraph: null,
    twitter: null,
    // A signing link carries a code and names a player. It should never hand
    // its URL onward, be indexed, or unfurl into whatever channel it was
    // pasted into.
    referrer: 'no-referrer',
    robots: { index: false, follow: false },
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
