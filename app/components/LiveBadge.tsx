"use client";

import { useEffect, useState } from "react";

const FALLBACK_URL = "https://www.twitch.tv/ow_esports";

interface LiveState {
  live: boolean;
  viewers?: number;
  url?: string;
  label?: string;
}

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function BadgeInner({ viewers, label = "OWCS" }: { viewers?: number; label?: string }) {
  return (
    <>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>
      <span className="font-[family-name:var(--font-ow-esports)] text-[12px] font-bold text-white whitespace-nowrap" style={{ letterSpacing: '0.05em' }}>
        {label} IS LIVE
      </span>
      {typeof viewers === "number" && viewers > 0 && (
        <span className="font-[family-name:var(--font-ow-esports)] text-[12px] font-bold text-white/75 whitespace-nowrap">
          {formatViewers(viewers)}
        </span>
      )}
    </>
  );
}

export function LiveBadge({ isArcade = false }: { isArcade?: boolean }) {
  const [state, setState] = useState<LiveState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/twitch-live");
        const data = await res.json();
        if (!cancelled) setState({ live: !!data.live, viewers: data.viewers, url: data.url, label: data.label });
      } catch {
        if (!cancelled) setState({ live: false });
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!state?.live) return null;

  const pill =
    "items-center gap-2 px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 transition-colors cursor-pointer";
  const shadow = { boxShadow: "0 2px 12px rgba(0,0,0,0.15)" };
  const title = "OWCS is live on Twitch - click to watch";
  const url = state.url || FALLBACK_URL;

  return (
    <>
      {/* Desktop: top-right corner, mirroring the partner banner on the left.
          Sits a few px below the partner's top edge so the all-caps text reads
          optically level with the OWTV logo. */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className={`absolute hidden sm:flex ${pill} ${isArcade ? "-top-1" : "top-1"}`}
        style={{ right: "-15px", marginTop: "2px", ...shadow }}
      >
        <BadgeInner viewers={state.viewers} label={state.label} />
      </a>

      {/* Mobile: inline below the title */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className={`flex sm:hidden ${pill} ${isArcade ? "mt-0.5" : "mt-1.5"}`}
        style={shadow}
      >
        <BadgeInner viewers={state.viewers} label={state.label} />
      </a>
    </>
  );
}
