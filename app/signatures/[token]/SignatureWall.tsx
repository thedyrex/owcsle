'use client';

interface SignatureRow {
  id: number;
  player_name: string;
  player_slug: string;
  url: string;
  created_at: string;
}

export function SignatureWall({ signatures }: { signatures: SignatureRow[] }) {
  const players = new Set(signatures.map((s) => s.player_slug)).size;

  return (
    <main className="sw-page">
      <style>{css}</style>

      <div className="sw-inner">
        <header className="sw-head">
          <span className="sw-spine" aria-hidden="true" />
          <h1 className="sw-title">Signatures</h1>
          <p className="sw-count">
            {signatures.length === 0
              ? 'None collected yet'
              : `${signatures.length} collected across ${players} player${players === 1 ? '' : 's'}`}
          </p>
        </header>

        {signatures.length === 0 ? (
          <p className="sw-empty">Signatures appear here as players sign.</p>
        ) : (
          <ul className="sw-grid">
            {signatures.map((sig) => (
              <li key={sig.id} className="sw-item">
                {/* Ink is near-black and the file is transparent, so the tile
                    stays white in both themes — the same reason a signature
                    goes on a card, not on the table. */}
                <div className="sw-plate">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sig.url} alt={`Signature by ${sig.player_name}`} loading="lazy" />
                </div>
                <div className="sw-meta">
                  <span className="sw-name">{sig.player_name}</span>
                  <time dateTime={sig.created_at} className="sw-date">
                    {new Date(sig.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

const THEME_LIGHT = `
    --bg: transparent;
    --line: rgba(0,0,0,0.12);
    --line-soft: rgba(0,0,0,0.08);
    --name: #111114;
    --label: #83838c;
`;
const THEME_DARK = `
    --bg: transparent;
    --line: rgba(255,255,255,0.11);
    --line-soft: rgba(255,255,255,0.07);
    --name: #f4f4f5;
    --label: #75757c;
`;

const css = `
  .sw-page { ${THEME_LIGHT} }
  @media (prefers-color-scheme: dark) {
    .sw-page:not(.light *) { ${THEME_DARK} }
  }
  .dark .sw-page { ${THEME_DARK} }

  .sw-page {
    min-height: 100vh;
    min-height: 100dvh;
    padding: 48px 24px 80px;
    box-sizing: border-box;
  }
  .sw-inner { max-width: 1040px; margin: 0 auto; }

  .sw-head { position: relative; padding-left: 14px; margin-bottom: 32px; }
  .sw-spine {
    position: absolute; left: 0; top: 4px; bottom: 4px;
    width: 3px; background: #f97316;
  }
  .sw-title {
    margin: 0;
    font-family: var(--font-poster-gothic), sans-serif;
    font-size: clamp(34px, 8vw, 46px);
    line-height: 0.95;
    color: var(--name);
  }
  .sw-count {
    margin: 9px 0 0;
    font-family: var(--font-ow-esports), sans-serif;
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--label);
  }

  .sw-empty {
    margin: 0; padding: 48px 0;
    font-family: var(--font-geist-sans), sans-serif;
    font-size: 13px; color: var(--label);
  }

  .sw-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 18px;
    margin: 0; padding: 0; list-style: none;
  }
  .sw-plate {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 4px;
    aspect-ratio: 600 / 260;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .sw-plate img { width: 100%; height: 100%; object-fit: contain; }

  .sw-meta {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 10px; margin-top: 9px;
  }
  .sw-name {
    font-family: var(--font-ow-esports), sans-serif;
    font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--name);
    min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .sw-date {
    font-family: var(--font-geist-mono), monospace;
    font-size: 10.5px; color: var(--label); flex-shrink: 0;
  }

  @media (max-width: 480px) {
    .sw-page { padding: 32px 16px 60px; }
    .sw-grid { gap: 14px; }
  }
`;
