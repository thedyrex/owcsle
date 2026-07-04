"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { UsaGameBoard, UsaGuessResult, UsaPlayer } from "../components/UsaGameBoard";
import { IconButton } from "../components/IconButton";
import { ThemeToggle } from "../components/ThemeToggle";
import { User, Home as HomeIcon, HelpCircle, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { UsaHowToPlayModal } from "../components/UsaHowToPlayModal";
import { SettingsModal } from "../components/SettingsModal";
import { useSettings } from "@/hooks/useSettings";

const MAX_GUESSES = 6;
const STORAGE_KEY = "owcsle_usa_guesses";
const STORAGE_DATE_KEY = "owcsle_usa_date";
const STRIPE_COUNT = 7;
const STRIPE_H = 5;
const SWEEP_IN = 250;
const PAUSE_MS = 1800;
const SWEEP_OUT = 250;
const STRIPE_DURATION = SWEEP_IN + PAUSE_MS + SWEEP_OUT;
const PAUSE_START_PCT = Math.round((SWEEP_IN / STRIPE_DURATION) * 100);
const PAUSE_END_PCT = Math.round(((SWEEP_IN + PAUSE_MS) / STRIPE_DURATION) * 100);
const STRIPE_STAGGER = 35;
const STRIPE_LINE_STAGGER = 60;
const STRIPES_EXPAND_DURATION = (STRIPE_COUNT - 1) * STRIPE_LINE_STAGGER + 200;
const INTRO_TOTAL = STRIPE_COUNT * STRIPE_STAGGER + STRIPE_DURATION + 100;

function UsaContent() {
  const [players, setPlayers] = useState<UsaPlayer[]>([]);
  const [guesses, setGuesses] = useState<UsaGuessResult[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<UsaPlayer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownClosing, setDropdownClosing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<UsaPlayer | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState("");
  const [introComplete, setIntroComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    if (!introComplete) return;
    if (!localStorage.getItem('owcsle_usa_seen_htp')) {
      setShowHowToPlay(true);
      localStorage.setItem('owcsle_usa_seen_htp', '1');
    }
  }, [introComplete]);
  const [showSettings, setShowSettings] = useState(false);
  const { settings, update: updateSettings } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const cst = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      const midnight = new Date(cst);
      midnight.setHours(24, 0, 0, 0);
      const ms = midnight.getTime() - cst.getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeUntilReset(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setIntroComplete(true), INTRO_TOTAL);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetch('/api/usa/players')
      .then(r => r.json())
      .then(d => {
        setPlayers(d.players || []);
      })
      .catch(() => {});

    const today = new Date().toISOString().split('T')[0];
    const savedDate = localStorage.getItem(STORAGE_DATE_KEY);

    if (savedDate === today) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: UsaGuessResult[] = JSON.parse(saved);
          setGuesses(parsed);
          if (parsed.some(g => g.isCorrect)) { setGameWon(true); setGameOver(true); fetchAnswer(); }
          else if (parsed.length >= MAX_GUESSES) { setGameOver(true); fetchAnswer(); }
        }
      } catch {}
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_DATE_KEY, today);
    }
  }, []);

  async function fetchAnswer() {
    try {
      const r = await fetch('/api/usa/reveal-answer');
      if (r.ok) { const d = await r.json(); setTargetPlayer(d.targetPlayer); }
    } catch {}
  }

  useEffect(() => {
    const q = input.trim().toLowerCase();
    setSuggestions(
      (q ? players.filter(p => p.player_name.toLowerCase().includes(q)) : players)
        .sort((a, b) => a.player_name.localeCompare(b.player_name))
    );
  }, [input, players]);

  const submitGuess = async (playerName: string) => {
    if (gameOver || !playerName.trim() || loading) return;
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    setInput("");
    setSelectedIndex(-1);

    try {
      const r = await fetch('/api/usa/validate-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Failed to validate guess'); setLoading(false); return; }

      const newGuess: UsaGuessResult = { player: d.guessedPlayer, feedback: d.feedback, isCorrect: d.isCorrect };
      const next = [...guesses, newGuess];
      setGuesses(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

      if (d.isCorrect) { setGameWon(true); setGameOver(true); fetchAnswer(); }
      else if (next.length >= MAX_GUESSES) { setGameOver(true); fetchAnswer(); }
    } catch {
      setError('Failed to submit guess');
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Escape') { setShowSuggestions(false); setSelectedIndex(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) submitGuess(suggestions[selectedIndex].player_name);
      else if (suggestions.length > 0) submitGuess(suggestions[0].player_name);
      else if (input.trim()) submitGuess(input.trim());
    }
  };

  const copyScore = () => {
    const statusEmoji = (s: 'correct' | 'partial' | 'wrong') =>
      s === 'correct' ? '🟩' : s === 'partial' ? '🟨' : '🟥';
    const rows = guesses.map(g =>
      `${g.player.player_name === targetPlayer?.player_name ? '🟩' : '🟥'}${statusEmoji(g.feedback.role)}${statusEmoji(g.feedback.prior_team)}${statusEmoji(g.feedback.year_active)}`
    );
    const start = new Date('2026-05-26T00:00:00-05:00');
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    const dayNum = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
    const result = `OWCSLE USA OWWC ${dayNum}\n${gameWon ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`}\n\n${rows.join('\n')}\n\nusa.owcsle.xyz`;
    navigator.clipboard.writeText(result).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const guessedNames = new Set(guesses.map(g => g.player.player_name));

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col items-center justify-start gap-6 bg-gray-100 dark:bg-neutral-950 text-neutral-800 dark:text-white pt-16 pb-8 px-2 animate-fadeIn select-none">
      <div className="usa-bg-image fixed inset-0 pointer-events-none" style={{ zIndex: 1, opacity: 0, animation: `bgFadeIn 1200ms ease-out forwards 0ms` }} />
      <style>{`
        @font-face {
          font-family: 'MarvinVisions';
          src: url('/fonts/MarvinVisions-Bold.otf') format('opentype');
          font-weight: bold;
        }
        @keyframes bgFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .usa-bg-image {
          background-image: url('/images/450x900_LIGHTMODE.png');
          background-size: cover;
          background-position: center top;
          background-attachment: fixed;
        }
        html.dark .usa-bg-image {
          background-image: url('/images/450x900_DARKMODE.png');
        }
        @media (min-width: 640px) {
          .usa-bg-image {
            background-image: url('/images/1920x1080_LIGHTMODE.png');
          }
          html.dark .usa-bg-image {
            background-image: url('/images/1920x1080_DARKMODE.png');
          }
        }
        .usa-intro-title { line-height: 1.3; }
        @media (min-width: 640px) { .usa-intro-title { line-height: 1.2; } }
        @keyframes animateGrain {
          0%,100%{transform:translate(0,0)}
          10%{transform:translate(-5%,-10%)}
          20%{transform:translate(-15%,-20%)}
          30%{transform:translate(-5%,-10%)}
          40%{transform:translate(-15%,-20%)}
          50%{transform:translate(-5%,-10%)}
          60%{transform:translate(-15%,-20%)}
          70%{transform:translate(-5%,-10%)}
          80%{transform:translate(-15%,-20%)}
          90%{transform:translate(-5%,-10%)}
        }
        @keyframes triangleIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scaleY(0.95); }
          to   { opacity: 1; transform: translateY(0) scaleY(1); }
        }
        @keyframes dropdownOut {
          from { opacity: 1; transform: translateY(0) scaleY(1); }
          to   { opacity: 0; transform: translateY(-4px) scaleY(0.96); }
        }
        @media (max-width: 640px) {
          .tri-black { top: 20% !important; left: -40vw !important; width: 80vw !important; }
          .tri-blue  { top: 15% !important;  !important; right: -40vw !important; width: 125vw !important; }
          .tri-red   { top: 18.5%  !important; !important; right: -55vw !important; width: 100vw !important; }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        <div style={{
          backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/7/76/1k_Dissolve_Noise_Texture.png")',
          height: '300%',
          width: '300%',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0.06,
          animation: 'animateGrain 20s steps(10) infinite',
        }} />
      </div>
      {!introComplete && (
        <>
          <style>{`
            @keyframes stripeSweep {
              0%                  { transform: translateX(-100vw); }
              ${PAUSE_START_PCT}% { transform: translateX(0); }
              ${PAUSE_END_PCT}%   { transform: translateX(0); }
              100%                { transform: translateX(100vw); }
            }
            @keyframes introTextOut {
              from { opacity: 1; }
              to   { opacity: 0; }
            }
            @keyframes typewriter {
              from { max-width: 0; }
              to   { max-width: 2000px; }
            }
            @keyframes cursorBlink {
              0%, 100% { border-color: #4556e6; }
              50%      { border-color: transparent; }
            }
            @keyframes stripeLineIn {
              from { transform: scaleX(0); }
              to   { transform: scaleX(1); }
            }
            @keyframes usaLogoIn {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
            {/* inline-block so width = text width exactly */}
            <div style={{
              display: 'inline-block',
              position: 'relative',
              animation: `introTextOut 200ms ease-in forwards ${SWEEP_IN + PAUSE_MS - 100}ms`,
            }}>
              {/* Ghost text: invisible but provides correct width to parent */}
              <span style={{
                fontFamily: 'MarvinVisions, sans-serif',
                fontSize: 'clamp(2rem, 11vw, 5rem)',
                fontWeight: 'bold',
                letterSpacing: '0.03em',
                display: 'block',
                whiteSpace: 'nowrap',
                visibility: 'hidden',
              }} className="usa-intro-title">
                USA OWWC 2026
              </span>
              {/* Real text typewriter - absolutely over ghost, starts after stripes */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                maxWidth: 0,
                animation: `typewriter 800ms linear forwards 0ms`,
              }}>
                <span style={{
                  fontFamily: 'MarvinVisions, sans-serif',
                  fontSize: 'clamp(2rem, 11vw, 5rem)',
                  fontWeight: 'bold',
                  color: '#4556e6',
                  letterSpacing: '0.03em',
                  display: 'block',
                  whiteSpace: 'nowrap',
                }} className="usa-intro-title">
                  USA OWWC 2026
                </span>
              </div>
              {/* Stripes: each line sweeps in left-to-right with stagger */}
              <div style={{ marginTop: 'clamp(-10px, -2vw, -25px)' }}>
                {Array.from({ length: STRIPE_COUNT }).map((_, i) => (
                  <div key={i} style={{
                    height: i % 2 === 0 ? `${STRIPE_H}px` : '4px',
                    backgroundColor: i % 2 === 0 ? '#ff2f44' : 'transparent',
                    transformOrigin: 'left center',
                    transform: 'scaleX(0)',
                    animation: `stripeLineIn 200ms ease-out forwards ${i * STRIPE_LINE_STAGGER}ms`,
                  }} />
                ))}
              </div>
              <div style={{
                marginTop: 'clamp(8px, 1.5vw, 12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(1px, 0.4vw, 5px)',
                opacity: 0,
                animation: `usaLogoIn 500ms ease-out forwards ${STRIPES_EXPAND_DURATION}ms`,
              }}>
                <img
                  src="/usa.png"
                  alt="USA"
                  style={{ height: 'clamp(64px, 15vw, 80px)' }}
                />
                <span style={{
                  fontFamily: 'MarvinVisions, sans-serif',
                  fontSize: 'clamp(1.8rem, 7vw, 2.5rem)',
                  fontWeight: 'bold',
                  color: '#4556e6',
                  lineHeight: 1,
                }}>×</span>
                <span style={{ width: 'clamp(10px, 1vw, 8px)', flexShrink: 0 }} />
                <span style={{
                  fontSize: 'clamp(1.8rem, 7vw, 2.5rem)',
                  fontWeight: 'bold',
                  lineHeight: 1,
                }} className="font-[family-name:var(--font-poster-gothic)]">
                  <span style={{ color: '#4556e6' }}>OWCS</span>
                  <span className="text-neutral-900 dark:text-white">LE</span>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="flex flex-col items-center gap-6 w-full relative z-[2]" style={{ opacity: introComplete ? 1 : 0, transition: introComplete ? 'opacity 500ms ease-in' : 'none' }}>
      <div className="flex flex-col items-center animate-titleFadeIn">
        <h1 className="text-4xl font-bold" style={{ fontFamily: 'MarvinVisions, sans-serif', letterSpacing: '0.04em' }}>
          <span style={{ color: '#4556e6' }}>OWCS</span><span className="text-neutral-900 dark:text-white">LE</span>
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 font-[family-name:var(--font-poster-gothic)] -mt-1">
          USA OWWC EDITION
        </p>
      </div>
      {/* Mobile icon row */}
      <div className="flex sm:hidden items-center gap-1 animate-buttonFadeIn -my-3 z-[200]">
        <IconButton icon={HomeIcon} label="Home" onClick={() => router.push('/')} />
        <IconButton icon={HelpCircle} label="How to play" onClick={() => setShowHowToPlay(true)} />
        <ThemeToggle />
        <IconButton icon={Settings} label="Settings" onClick={() => setShowSettings(true)} />
      </div>

      <div className="w-4/5 sm:w-full max-w-lg h-px bg-neutral-300 dark:bg-neutral-700 animate-expandOut" />
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-[family-name:var(--font-poster-gothic)]">
          {error}
        </div>
      )}

      <div className="relative z-[110] flex flex-col items-center w-full sm:w-fit sm:min-w-[420px]">
        {/* Desktop left icons */}
        <div className="hidden sm:flex absolute -top-20 left-0 items-center gap-2 animate-buttonFadeIn z-[100]">
          <IconButton icon={HomeIcon} label="Home" onClick={() => router.push('/')} />
          <IconButton icon={HelpCircle} label="How to play" onClick={() => setShowHowToPlay(true)} />
        </div>
        {/* Desktop right icons */}
        <div className="hidden sm:flex absolute -top-20 right-0 items-center gap-2 animate-buttonFadeIn z-[100]">
          <ThemeToggle />
          <IconButton icon={Settings} label="Settings" onClick={() => setShowSettings(true)} />
        </div>
        <UsaGameBoard
          guesses={guesses}
          maxGuesses={MAX_GUESSES}
          targetPlayerName={targetPlayer?.player_name ?? null}
          colorblindMode={settings.colorblindMode}
        />
      </div>

      {!gameOver && (
        <div className="relative w-fit sm:w-full sm:max-w-md z-50 mx-auto">
          <div className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-800 rounded-xl p-2.5">
            <div className="relative flex-1 overflow-visible">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-neutral-700 rounded-lg px-2 py-2 sm:px-4 sm:py-2.5 shadow-sm">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500 dark:text-neutral-400" />
                <input
                  ref={inputRef}
                  type="text"
                  autoComplete="off"
                  value={input}
                  onChange={e => { setInput(e.target.value); setShowSuggestions(true); setSelectedIndex(-1); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setDropdownClosing(true);
                    setTimeout(() => { setShowSuggestions(false); setDropdownClosing(false); }, 250);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="TYPE OR SELECT PLAYER..."
                  disabled={loading}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 font-[family-name:var(--font-poster-gothic)] disabled:opacity-50 select-text"
                />
              </div>
              {(showSuggestions || dropdownClosing) && suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 rounded-lg shadow-lg max-h-48 overflow-y-auto z-[200]" style={{ animation: dropdownClosing ? 'dropdownOut 200ms ease-in both' : 'dropdownIn 150ms ease-out both', transformOrigin: 'top center' }}>
                  {suggestions.map((p, i) => (
                    <li
                      key={p.player_name}
                      className={`px-4 py-2 cursor-pointer text-sm font-[family-name:var(--font-poster-gothic)] flex items-center gap-2 text-neutral-900 dark:text-white ${
                        i === selectedIndex ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      } ${guessedNames.has(p.player_name) ? 'opacity-40 pointer-events-none' : ''}`}
                      onMouseDown={e => { e.preventDefault(); setInput(p.player_name); setShowSuggestions(false); setSelectedIndex(-1); }}
                    >
                      {p.player_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => {
                if (selectedIndex >= 0 && suggestions[selectedIndex]) submitGuess(suggestions[selectedIndex].player_name);
                else if (suggestions.length > 0) submitGuess(suggestions[0].player_name);
                else if (input.trim()) submitGuess(input.trim());
              }}
              disabled={loading || !input.trim()}
              className="px-4 py-2 text-white rounded-lg font-bold font-[family-name:var(--font-poster-gothic)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed" style={{ backgroundColor: '#ff2f44' }}
            >
              {loading ? '...' : 'GUESS'}
            </button>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="flex flex-col items-center gap-3 animate-fadeIn">
          {gameWon ? (
            <p className="text-lg font-bold text-green-500 font-[family-name:var(--font-poster-gothic)]">
              CORRECT! {guesses.length}/{MAX_GUESSES}
            </p>
          ) : (
            <p className="text-lg font-bold text-red-500 font-[family-name:var(--font-poster-gothic)]">
              GAME OVER
            </p>
          )}
          {targetPlayer && (
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-800 rounded-lg shadow">
<div>
                <p className="font-bold font-[family-name:var(--font-poster-gothic)]">{targetPlayer.player_name}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-[family-name:var(--font-poster-gothic)]">
                  {targetPlayer.role}{targetPlayer.prior_team ? ` · ${targetPlayer.prior_team}` : ''}{targetPlayer.year_active ? ` · ${targetPlayer.year_active}` : ''}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={copyScore}
            className="px-4 py-2 text-white rounded-lg font-bold font-[family-name:var(--font-poster-gothic)] transition-colors text-sm"
            style={{ backgroundColor: copied ? '#22c55e' : '#ff2f44' }}
          >
            {copied ? 'COPIED!' : 'COPY SCORE'}
          </button>
          <p className="text-xs text-neutral-400 font-[family-name:var(--font-poster-gothic)]">
            NEXT PLAYER IN {timeUntilReset}
          </p>
        </div>
      )}
      </div>
      <UsaHowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} colorblindMode={settings.colorblindMode} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} colorblindMode={settings.colorblindMode} onColorblindChange={mode => updateSettings({ colorblindMode: mode })} reduceMotion={settings.reduceMotion} onReduceMotionChange={val => updateSettings({ reduceMotion: val })} />
      {settings.reduceMotion && (
        <style>{`*, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }`}</style>
      )}
    </div>
  );
}

export default function UsaPage() {
  return (
    <Suspense>
      <UsaContent />
    </Suspense>
  );
}
