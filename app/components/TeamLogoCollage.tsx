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
  const [dims, setDims] = useState({ w: 0, h: 0 });
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

  // Track viewport so the grid can be laid out with a known column count.
  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
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

  if (logos.length === 0 || dims.w === 0) return null;

  // Uniform grid sized to fill the viewport. A known column count lets us
  // place each tile so it never repeats its left or top neighbour.
  const cell = dims.w < 640 ? 60 : 120;
  const cols = Math.max(1, Math.floor(dims.w / cell));
  const rows = Math.ceil(dims.h / cell) + 2;

  const grid: string[] = [];
  for (let idx = 0; idx < cols * rows; idx++) {
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    const left = c > 0 ? grid[idx - 1] : null;
    const top = r > 0 ? grid[idx - cols] : null;
    const candidates = logos.filter((l) => l !== left && l !== top);
    const pick = candidates[Math.floor(seeded(idx * 1.7 + 3.3) * candidates.length)];
    grid.push(pick ?? logos[idx % logos.length]);
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 900ms ease-out" }}
    >
      {/* Collage layer */}
      <div className="absolute inset-0 opacity-[0.16] dark:opacity-[0.14]">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            width: "100%",
          }}
        >
          {grid.map((url, i) => {
            const rot = (seeded(i * 3.1) - 0.5) * 16; // -8deg..8deg
            const op = 0.65 + seeded(i * 7.7) * 0.35; // 0.65..1
            return (
              <div
                key={i}
                className="flex items-center justify-center"
                style={{
                  aspectRatio: "1 / 1",
                  padding: dims.w < 640 ? 6 : 12,
                  transform: `rotate(${rot.toFixed(2)}deg)`,
                  opacity: op,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className={`max-w-full max-h-full object-contain drop-shadow-sm${
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
