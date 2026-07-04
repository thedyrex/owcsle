import { NextResponse } from 'next/server';

/**
 * Live status for the official OWCS broadcast on Twitch.
 *
 * Uses the Twitch Helix API with app-only (client-credentials) auth, so no user
 * login is involved. Requires two env vars - create a free app at
 * https://dev.twitch.tv/console/apps to get them:
 *   TWITCH_CLIENT_ID
 *   TWITCH_CLIENT_SECRET
 *
 * If they're missing the route reports offline so the badge simply stays hidden.
 */

// Official OWCS broadcast channels. The badge shows if any is live and links to
// whichever live stream has the most viewers (i.e. the current main event).
// `label` drives the badge text ("<label> IS LIVE").
const TWITCH_CHANNELS = [
  { login: 'ow_esports', label: 'OWCS' },
  { login: 'ow_esports_jp', label: 'OWCS JP' },
];

// App access tokens last ~60 days; cache in module scope so warm invocations
// reuse the same token instead of minting a new one every request.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(clientId: string, clientSecret: string): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }).toString(),
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const json = await res.json();
  if (!json.access_token) return null;

  cachedToken = {
    value: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

export async function GET() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  // Hit Twitch at most ~once/min regardless of traffic; the CDN absorbs the rest.
  const headers = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' };

  if (!clientId || !clientSecret) {
    return NextResponse.json({ live: false, configured: false }, { headers });
  }

  try {
    const token = await getAppToken(clientId, clientSecret);
    if (!token) {
      return NextResponse.json({ live: false, configured: true }, { headers });
    }

    const query = TWITCH_CHANNELS.map((c) => `user_login=${c.login}`).join('&');
    const res = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
      headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    // Token rejected - drop it so the next poll re-mints a fresh one.
    if (res.status === 401) cachedToken = null;
    if (!res.ok) {
      return NextResponse.json({ live: false, configured: true }, { headers });
    }

    const json = await res.json();
    const streams = Array.isArray(json.data)
      ? json.data.filter((s: any) => s.type === 'live')
      : [];

    if (streams.length === 0) {
      return NextResponse.json({ live: false, configured: true }, { headers });
    }

    // Link to the biggest live stream so the badge points at the main broadcast.
    const top = streams.reduce((a: any, b: any) =>
      (b.viewer_count ?? 0) > (a.viewer_count ?? 0) ? b : a
    );
    const cfg = TWITCH_CHANNELS.find(
      (c) => c.login.toLowerCase() === String(top.user_login).toLowerCase()
    );

    return NextResponse.json(
      {
        live: true,
        configured: true,
        channel: top.user_login,
        label: cfg?.label ?? 'OWCS',
        url: `https://www.twitch.tv/${top.user_login}`,
        title: top.title ?? '',
        viewers: top.viewer_count ?? 0,
        gameName: top.game_name ?? '',
        startedAt: top.started_at ?? '',
      },
      { headers }
    );
  } catch {
    return NextResponse.json({ live: false, configured: true }, { headers });
  }
}
