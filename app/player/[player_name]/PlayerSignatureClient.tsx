'use client';

import { useEffect, useState } from 'react';
import { SignatureModal } from '@/app/components/SignatureModal';
import { readCodeFromLocation } from '@/lib/player-codes';

interface Props {
  playerName: string;
  playerSlug: string;
  teamName: string;
  logoUrl: string | null;
  teamColor: string | null;
}

export function PlayerSignatureClient({
  playerName,
  playerSlug,
  teamName,
  logoUrl,
  teamColor,
}: Props) {
  // The link exists to collect a signature, so the modal is the landing state
  // rather than something behind another click. The card below is what's left
  // once it's dismissed, and the button reopens it.
  const [open, setOpen] = useState(true);
  const [linkCode, setLinkCode] = useState<string | null>(null);

  /* Read on mount, not during render: the server has no location to read, and
   * reading one during render would hydrate to a mismatch. */
  useEffect(() => {
    const read = () => {
      const code = readCodeFromLocation(window.location.hash, window.location.search);
      if (!code) return;
      setLinkCode(code);
      // Take the code back out of the address bar. It stays in this tab's state,
      // but it won't survive into a screenshot, a copied URL, or the history
      // entry a shared device leaves behind.
      window.history.replaceState(null, '', window.location.pathname);
    };

    read();
    // A signing link clicked while this page is already open changes only the
    // fragment, which remounts nothing — without this the code is silently
    // ignored, which is the one thing the link is supposed to prevent.
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  // Every player page wears their team's colour; orange stays the app's action
  // colour so the button means the same thing here as everywhere else.
  const team = teamColor || '#f97316';

  // The tile shows the team's true colour, but the rule down the edge has to
  // stay visible against the plate, and the accent picked per theme does that.
  const accentDark = clampLightness(team, 46, 100);
  const accentLight = clampLightness(team, 0, 52);

  return (
    <main
      className="pl-page"
      style={
        {
          '--team': team,
          '--accent-dark': accentDark,
          '--accent-light': accentLight,
        } as React.CSSProperties
      }
    >
      <style>{css}</style>

      <article className="pl-card">
        <span className="pl-spine" aria-hidden="true" />

        <header className="pl-head">
          {logoUrl && (
            <span className="pl-crest">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="" />
            </span>
          )}
          <span className="pl-team">{teamName}</span>
        </header>

        <h1 className="pl-name">{playerName}</h1>

        <button className="pl-cta" onClick={() => setOpen(true)}>
          Sign for {playerName}
        </button>
      </article>

      <SignatureModal
        isOpen={open}
        onClose={() => setOpen(false)}
        playerName={playerName}
        playerSlug={playerSlug}
        initialCode={linkCode}
      />
    </main>
  );
}

/**
 * Pull a colour's lightness into a band, keeping its hue.
 *
 * Team colours sit at the extremes far more often than in the middle — a third
 * of the roster is literally #000000 and a quarter is #ffffff — so an accent
 * taken raw is invisible on one plate or the other. Clamping keeps a team's hue
 * where it has one; black and white teams have none to keep and resolve to
 * neutral grey, which is the honest answer rather than an invented colour.
 * Anything that isn't a plain hex is passed through untouched.
 */
export function clampLightness(color: string, min: number, max: number): string {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return color;

  const hex = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max0 = Math.max(r, g, b);
  const min0 = Math.min(r, g, b);
  const l = (max0 + min0) / 2;
  const delta = max0 - min0;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max0 === r) h = ((g - b) / delta) % 6;
    else if (max0 === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const clamped = Math.min(max, Math.max(min, l * 100));
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(clamped)}%)`;
}

/* Theme values live in variables so only this block differs between themes.
 * The three-layer shape (light default, system query, .dark class) mirrors how
 * globals.css already switches the page background. */
const THEME_LIGHT = `
    --plate: #ffffff;
    --line: rgba(0,0,0,0.12);
    --line-soft: rgba(0,0,0,0.08);
    --name: #111114;
    --label: #83838c;
    --accent: var(--accent-light);
`;
const THEME_DARK = `
    --plate: #131316;
    --line: rgba(255,255,255,0.11);
    --line-soft: rgba(255,255,255,0.07);
    --name: #f4f4f5;
    --label: #75757c;
    --accent: var(--accent-dark);
`;

const css = `
  .pl-page { ${THEME_LIGHT} }
  @media (prefers-color-scheme: dark) {
    .pl-page:not(.light *) { ${THEME_DARK} }
  }
  .dark .pl-page { ${THEME_DARK} }

  .pl-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
  }

  .pl-card {
    position: relative;
    overflow: hidden;
    width: min(420px, 100%);
    padding: 24px 24px 22px 27px;
    box-sizing: border-box;
    background: var(--plate);
    border: 1px solid var(--line);
    border-radius: 4px;
  }
  /* The team's colour as printed ink down the edge, the way the admin panel
   * already marks a note — not as light thrown behind the card. */
  .pl-spine {
    position: absolute;
    top: 0; bottom: 0; left: 0;
    width: 3px;
    background: var(--accent);
  }

  .pl-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
  }
  .pl-crest {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px; height: 34px;
    flex-shrink: 0;
    border-radius: 3px;
    /* The true team colour, like the game board's team cell — a team picks a
     * colour its logo reads on. The hairline is what keeps a #000 tile visible
     * on a dark plate, and a #fff one on a light plate. */
    background: var(--team);
    box-shadow: inset 0 0 0 1px var(--line-soft);
  }
  .pl-crest img { width: 22px; height: 22px; object-fit: contain; }
  .pl-team {
    font-family: var(--font-ow-esports), sans-serif;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--label);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pl-name {
    margin: 0 0 22px;
    font-family: var(--font-poster-gothic), sans-serif;
    font-size: clamp(40px, 11vw, 54px);
    line-height: 0.92;
    color: var(--name);
    overflow-wrap: anywhere;
  }

  .pl-cta {
    display: block;
    width: 100%;
    padding: 13px;
    border: none;
    border-radius: 4px;
    background: #f97316;
    color: #fff;
    font-family: var(--font-ow-esports), sans-serif;
    font-size: 12px;
    letter-spacing: 0.05em;
    cursor: pointer;
  }
  .pl-cta:hover { background: #e8650e; }
  .pl-cta:active { background: #d75c0a; }
  .pl-cta:focus-visible { outline: 2px solid #f97316; outline-offset: 2px; }

  @media (max-width: 420px) {
    .pl-card { padding: 20px 18px 20px 21px; }
  }
`;
