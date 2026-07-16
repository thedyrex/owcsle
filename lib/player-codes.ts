/**
 * Player authentication codes, shared between the admin roster, the signing
 * modal, and the upload route.
 *
 * This module stays free of node imports because the modal bundles it; code
 * generation needs a real random source and lives in player-codes.server.
 */

/**
 * Crockford base32: the digits and letters left after removing I, L, O and U.
 * The first three are the ones people mistake for 1 and 0 when copying a code
 * off a screen, and U is dropped so a random code can't spell something unkind.
 */
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 8;

/** Display form: "K7M29XQP" -> "K7M2-9XQP". Stored codes are never formatted. */
export function formatCode(code: string): string {
  if (code.length !== CODE_LENGTH) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Fold whatever someone typed into the stored form: case, the dash, stray
 * spaces, and the letters the alphabet deliberately omits — a person reading
 * a code aloud says "oh" for 0 and "eye" for 1, so accept both spellings
 * rather than rejecting a correct code for being typed the obvious way.
 */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
    .slice(0, CODE_LENGTH);
}

/** Whether a normalized code is even the right shape to be worth checking. */
export function isCodeShaped(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  return [...code].every((c) => CODE_ALPHABET.includes(c));
}

/**
 * A link that signs the player in without them typing anything.
 *
 * The code rides in the fragment rather than the query string on purpose: a
 * fragment is never sent to the server, so the code stays out of access logs
 * and out of the Referer header of anything the page later requests. The page
 * strips it from the address bar as soon as it's read.
 */
export function signingLink(origin: string, playerSlug: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/player/${playerSlug}#code=${formatCode(code)}`;
}

/**
 * Pull a code out of a location, accepting the fragment we generate and the
 * query string we don't — link handlers in the wild do rewrite fragments away,
 * and a code that arrives the other way should still work rather than leave
 * someone staring at a field they were told they wouldn't have to fill in.
 */
export function readCodeFromLocation(hash: string, search: string): string | null {
  const fromHash = new URLSearchParams(hash.replace(/^#/, '')).get('code');
  const fromQuery = new URLSearchParams(search).get('code');
  const raw = fromHash ?? fromQuery;
  if (!raw) return null;
  const code = normalizeCode(raw);
  return isCodeShaped(code) ? code : null;
}
