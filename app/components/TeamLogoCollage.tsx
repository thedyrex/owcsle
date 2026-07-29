"use client";

import { useEffect, useState } from "react";

type Team = { id: string | number; team_name: string; team_logo: string };

// Deterministic pseudo-random so the layout is stable between renders.
function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function TeamLogoCollage() {
  const [logos, setLogos] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const urls = (j.teams as Team[] | undefined)
          ?.map((t) => t.team_logo)
          .filter(Boolean) ?? [];
        setLogos(urls);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Fade the collage in last — after the page's own intro animations settle.
  useEffect(() => {
    if (logos.length === 0) return;
    const t = setTimeout(() => setVisible(true), 1400);
    return () => clearTimeout(t);
  }, [logos]);

  // Light logos that vanish on the white background — invert only in light mode.
  const INVERT_LIGHT_MATCH = ["logo-3635e20b", "lunex-gaming", "ZAN_Esports_darkmode"];
  const invertInLight = (url: string) => INVERT_LIGHT_MATCH.some((m) => url.includes(m));

  // Dark logos that vanish on the dark background — invert only in dark mode.
  const INVERT_DARK_MATCH = ["logo-b20d251b"]; // ZETA DIVISION
  const invertInDark = (url: string) => INVERT_DARK_MATCH.some((m) => url.includes(m));

  if (logos.length === 0) return null;

  // Column sizing is handled by CSS (auto-fill + a media-query breakpoint) so it
  // always matches the real device — no JS viewport measurement, which lies on
  // mobile. To keep identical logos from ever touching we build one long
  // sequence where no logo repeats within WINDOW tiles: the grid flows
  // row-major, so horizontal neighbours are 1 apart and vertical neighbours are
  // `columns` apart — both guaranteed distinct for any column count <= WINDOW.
  const WINDOW = Math.min(20, logos.length - 1);
  const COUNT = 320; // enough tiles to fill any realistic viewport; overflow is clipped
  const tiles: string[] = [];
  for (let i = 0; i < COUNT; i++) {
    const recent = new Set(tiles.slice(Math.max(0, i - WINDOW)));
    const candidates = logos.filter((l) => !recent.has(l));
    const pick = candidates[Math.floor(seeded(i * 1.7 + 3.3) * candidates.length)];
    tiles.push(pick ?? logos[i % logos.length]);
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 900ms ease-out" }}
    >
      {/* Collage layer */}
      <div className="absolute inset-0 opacity-[0.16] dark:opacity-[0.14]">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(58px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(112px,1fr))]">
          {tiles.map((url, i) => {
            const rot = (seeded(i * 3.1) - 0.5) * 16; // -8deg..8deg
            const op = 0.65 + seeded(i * 7.7) * 0.35; // 0.65..1
            return (
              <div
                key={i}
                className="p-1.5 sm:p-3"
                style={{
                  transform: `rotate(${rot.toFixed(2)}deg)`,
                  opacity: op,
                }}
              >
                {/* The image is the square: aspect-ratio + width:100% derives its
                    height from its own (definite) grid-track width, and
                    object-contain letterboxes the logo inside. This never relies
                    on a parent height resolving — which iOS WebKit (Safari AND
                    iOS Chrome) fails to propagate from an aspect-ratio cell,
                    falling back to the logo's intrinsic size and blowing tall
                    logos up huge. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className={`block w-full object-contain drop-shadow-sm${
                    invertInLight(url) ? " invert dark:invert-0" : ""
                  }${invertInDark(url) ? " invert-0 dark:invert" : ""}`}
                  style={{ aspectRatio: "1 / 1" }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Readability overlay: fade toward the centre where the game board sits,
          and keep page-background continuity at the very edges. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 42%, var(--collage-fade-strong) 0%, var(--collage-fade-strong) 24%, var(--collage-fade-soft) 55%, transparent 100%)",
        }}
      />
    </div>
  );
}
