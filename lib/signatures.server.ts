import { supabaseAdmin } from './supabase';
import { slugifyPlayerName } from './signatures';

export interface SignaturePlayer {
  id: number;
  player_name: string;
  team_name: string;
  logo_url: string | null;
  team_color: string | null;
}

/**
 * Resolve a /player/<slug> segment to a roster row. Slugs aren't stored, so we
 * slugify the roster in memory — it's a few hundred rows, and it keeps the URL
 * derived from one source of truth. A name that appears on several teams
 * (roster moves leave both rows behind) resolves to the first match.
 */
export async function findPlayerBySlug(slug: string): Promise<SignaturePlayer | null> {
  const target = slugifyPlayerName(slug);
  if (!target) return null;

  const { data, error } = await supabaseAdmin
    .from('team_rosters')
    .select('id, player_name, team_name, logo_url, team_color')
    .order('id');

  if (error || !data) return null;
  return (data as SignaturePlayer[]).find((p) => slugifyPlayerName(p.player_name) === target) ?? null;
}
