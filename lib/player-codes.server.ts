import { randomInt } from 'crypto';
import { supabaseAdmin } from './supabase';
import { slugifyPlayerName } from './signatures';
import { CODE_ALPHABET, CODE_LENGTH } from './player-codes';

export interface PlayerCode {
  player_slug: string;
  player_name: string;
  code: string;
}

/** Raised when player_codes hasn't been created yet, so callers can say so. */
export class CodesTableMissingError extends Error {
  constructor() {
    super('The player_codes table does not exist yet');
    this.name = 'CodesTableMissingError';
  }
}

/** PostgREST's code for "that table isn't in the schema". */
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST205';
}

/**
 * A fresh code. randomInt draws from the same CSPRNG as randomBytes but without
 * the modulo bias you get from mapping raw bytes onto a 32-character alphabet.
 */
export function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Every roster player, with their code, minting one for anyone who lacks it.
 *
 * Called on each admin roster load, so it has to be idempotent and cheap: it
 * inserts only the players that are missing, and leaves existing codes alone —
 * a code that changed on its own would strand whoever already has it.
 */
export async function listCodesEnsuringAll(): Promise<PlayerCode[]> {
  const [{ data: players }, { data: existing, error: readError }] = await Promise.all([
    supabaseAdmin.from('team_rosters').select('id, player_name').order('player_name'),
    supabaseAdmin.from('player_codes').select('player_slug, player_name, code'),
  ]);

  if (readError) {
    if (isMissingTable(readError)) throw new CodesTableMissingError();
    throw new Error(`Could not read codes: ${readError.message}`);
  }

  const byslug = new Map((existing ?? []).map((row) => [row.player_slug, row as PlayerCode]));

  const missing: { player_id: number; player_slug: string; player_name: string; code: string }[] = [];
  const taken = new Set((existing ?? []).map((row) => row.code));

  for (const player of players ?? []) {
    const slug = slugifyPlayerName(player.player_name);
    if (!slug || byslug.has(slug) || missing.some((m) => m.player_slug === slug)) continue;

    // The column is unique; retry rather than fail a whole roster load on a
    // collision that's astronomically unlikely but not impossible.
    let code = generateCode();
    while (taken.has(code)) code = generateCode();
    taken.add(code);

    missing.push({ player_id: player.id, player_slug: slug, player_name: player.player_name, code });
  }

  if (missing.length > 0) {
    const { error } = await supabaseAdmin.from('player_codes').insert(missing);
    if (error) {
      if (isMissingTable(error)) throw new CodesTableMissingError();
      throw new Error(`Could not create codes: ${error.message}`);
    }
    for (const row of missing) {
      byslug.set(row.player_slug, {
        player_slug: row.player_slug,
        player_name: row.player_name,
        code: row.code,
      });
    }
  }

  return [...byslug.values()];
}

/** The stored code for a player, or null if they have none yet. */
export async function codeForSlug(slug: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('player_codes')
    .select('code')
    .eq('player_slug', slug)
    .maybeSingle();
  return data?.code ?? null;
}
