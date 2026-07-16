import { timingSafeEqual } from 'crypto';

/**
 * The unlisted signatures view: one shared secret in the environment, no
 * account needed. Anyone holding the link can look; nobody else can find it.
 *
 * Unlike a player's signing code this token sits in the path, not the
 * fragment, because the server has to read it to decide what to render. That
 * means it reaches access logs — the same trade every "anyone with the link"
 * URL makes. Rotate by changing the variable; the old link dies at once.
 */
export function isValidViewToken(token: string): boolean {
  const expected = process.env.SIGNATURES_VIEW_TOKEN;
  // No token configured means no unlisted view — never an open one.
  if (!expected) return false;

  const given = Buffer.from(token);
  const want = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, and length isn't a secret.
  if (given.length !== want.length) return false;
  return timingSafeEqual(given, want);
}

/** The full link to hand out, or null when no token is configured. */
export function signatureViewLink(origin: string): string | null {
  const token = process.env.SIGNATURES_VIEW_TOKEN;
  if (!token) return null;
  return `${origin.replace(/\/$/, '')}/signatures/${token}`;
}
