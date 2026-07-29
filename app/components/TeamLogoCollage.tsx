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

  // Light logos that vanish on the white background — invert only in light mode.
  const INVERT_LIGHT_MATCH = ["logo-3635e20b", "lunex-gaming", "ZAN_Esports_darkmode"];
  const invertInLight = (url: string) => INVERT_LIGHT_MATCH.some((m) => url.includes(m));

  // Dark logos that vanish on the dark background — invert only in dark mode.
  const INVERT_DARK_MATCH = ["logo-b20d251b"]; // ZETA DIVISION
  const invertInDark = (url: string) => INVERT_DARK_MATCH.some((m) => url.includes(m));

  if (logos.length === 0) return null;

  // Repeat the logo set enough times to comfortably fill large viewports,
  // shuffling the order per pass so repeats aren't obviously adjacent.
  const PASSES = 8;
  const tiles: string[] = [];
  for (let p = 0; p < PASSES; p++) {
    const order = logos
      .map((url, i) => ({ url, k: seeded(i + p * 97) }))
      .sort((a, b) => a.k - b.k)
      .map((o) => o.url);
    tiles.push(...order);
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Collage layer */}
      <div className="absolute inset-0 opacity-[0.16] dark:opacity-[0.14]">
        <div className="columns-[92px] sm:columns-[120px] gap-3 sm:gap-4 px-2 [column-fill:balance]">
          {tiles.map((url, i) => {
            const rot = (seeded(i * 3.1) - 0.5) * 16; // -8deg..8deg
            const op = 0.65 + seeded(i * 7.7) * 0.35; // 0.65..1
            return (
              <div
                key={i}
                className="mb-3 sm:mb-4 break-inside-avoid flex items-center justify-center"
                style={{ transform: `rotate(${rot.toFixed(2)}deg)`, opacity: op }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className={`w-full h-auto max-h-24 object-contain drop-shadow-sm${
                    invertInLight(url) ? " invert dark:invert-0" : ""
                  }${invertInDark(url) ? " invert-0 dark:invert" : ""}`}
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
