"use client";

import { ThemeToggle } from "./components/ThemeToggle";
import { GameBoard } from "./components/GameBoard";
import { StatsModal } from "./components/StatsModal";
import { FeedbackModal } from "./components/FeedbackModal";
import { HowToPlayModal } from "./components/HowToPlayModal";
import { GameResultCard } from "./components/GameResultCard";
import { IconButton } from "./components/IconButton";
import { ImageIconButton } from "./components/ImageIconButton";
import { ArcadeSection } from "./components/ArcadeSection";
import { AuthModal } from "./components/AuthModal";
import { UserMenu } from "./components/UserMenu";
import { LeaderboardModal } from "./components/LeaderboardModal";
import { SettingsModal } from "./components/SettingsModal";
import { OWTVModal } from "./components/OWTVModal";
import { LiveBadge } from "./components/LiveBadge";
import { MessageCircle, User, CheckCircle2, XCircle, BarChart3, HelpCircle, Infinity as InfinityIcon, Home as HomeIcon, Crown, Settings } from "lucide-react";
import { useAuth } from "./components/AuthProvider";
import { useGame } from "@/hooks/useGame";
import { useSettings } from "@/hooks/useSettings";
import useLocalGameStorage, { getGameKeys } from "@/hooks/useLocalGameStorage";
import { useStats } from "@/hooks/useStats";
import { Player } from "@/lib/supabase";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { getDayNumber } from "@/app/utils/getCSTDateString";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const FACEIT_SIGNUP_URL = "https://www.faceit.com/en/subscriptions/ow2/faceit-league/free?affiliateCode=OWCSLE";

export function HomeContent({ showOWTVBanner = false }: { showOWTVBanner?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isArcade = pathname === '/unlimited';
  const toggleArcade = () => {
    const next = isArcade ? '/' : '/unlimited';
    if ((document as any).startViewTransition) {
      document.documentElement.dataset.style = "angled";
      (document as any).startViewTransition(() => {
        router.push(next, { scroll: false });
      });
    } else {
      router.push(next, { scroll: false });
    }
  };

  const { settings, update: updateSettings } = useSettings();
  const { guesses, maxGuesses, gameWon, gameOver, isLoading, error, makeGuess, allPlayers, targetPlayer, restoreGameState } = useGame();
  const { todayKey, todayGameStateKey } = getGameKeys();
  const { stats, winRate, recordGame } = useStats();
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(false);
  const [showGiveawayModal, setShowGiveawayModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(() => searchParams.get('auth') === 'login');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';
  const [showOWTVModal, setShowOWTVModal] = useState(false);
  const { user, ready: authReady } = useAuth();
  const [dailyCount, setDailyCount] = useState<number | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState("");

  useEffect(() => {
    fetch('/api/daily-count').then(r => r.json()).then(d => setDailyCount(d.count)).catch(() => {});
  }, []);

  useLocalGameStorage({
    guesses,
    gameWon,
    gameOver,
    gameRecorded,
    onRestore: ({ guesses: restoredGuesses, gameWon: restoredGameWon, gameRecorded: restoredGameRecorded }) => {
      if (restoredGuesses.length > 0) {
        restoreGameState(restoredGuesses, restoredGameWon);
      }
      if (restoredGameRecorded) {
        setGameRecorded(true);
      }
    },
    todayKey,
    todayGameStateKey,
  });
  const [inputValue, setInputValue] = useState("");
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputValue.trim().length > 0) {
      const filtered = allPlayers
        .filter((p) =>
          p.player_name.toLowerCase().includes(inputValue.toLowerCase())
        )
        .sort((a, b) => a.player_name.localeCompare(b.player_name));
      setFilteredPlayers(filtered);
    } else {
      // Show all players sorted alphabetically when input is empty
      setFilteredPlayers([...allPlayers].sort((a, b) => a.player_name.localeCompare(b.player_name)));
    }
  }, [inputValue, allPlayers]);

  // Record game stats when game ends
  useEffect(() => {
    if (gameOver && !gameRecorded) {
      recordGame(gameWon, guesses.length);
      setGameRecorded(true);

      // Save game result to database
      const saveGameResult = async () => {
        try {
          const { todayKey } = getGameKeys();
          const gameDate = todayKey.replace('owcsle_guesses_', '');

          await fetch('/api/game-result', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              won: gameWon,
              guessCount: guesses.length,
              gameDate,
            }),
          });
        } catch (error) {
        }
      };

      saveGameResult();
    }
  }, [gameOver, gameWon, guesses.length, gameRecorded, recordGame]);

  // Auto-open help modal on first visit of the day
  useEffect(() => {
    const now = new Date();
    const cstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    const todayStr = cstDate.toISOString().split('T')[0];
    const helpModalKey = `owcsle_help_shown_${todayStr}`;

    if (!localStorage.getItem(helpModalKey)) {
      setShowHowToPlayModal(true);
      localStorage.setItem(helpModalKey, 'true');
    }
  }, []);

  // Update countdown timer every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nowCST = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      const midnightCST = new Date(nowCST);
      midnightCST.setHours(24, 0, 0, 0);

      const msRemaining = midnightCST.getTime() - nowCST.getTime();
      const hours = Math.floor(msRemaining / (1000 * 60 * 60));
      const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((msRemaining % (1000 * 60)) / 1000);

      setTimeUntilReset(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const closeSuggestions = (animate = false) => {
    if (animate && showSuggestions) {
      setIsClosing(true);
      setTimeout(() => {
        setShowSuggestions(false);
        setIsClosing(false);
      }, 100);
    } else {
      setShowSuggestions(false);
      setIsClosing(false);
    }
  };

  const handleGuess = async () => {
    if (inputValue.trim() && !gameWon && guesses.length < maxGuesses) {
      const success = await makeGuess(inputValue.trim());
      if (success) {
        setInputValue("");
        closeSuggestions();
        setSelectedIndex(-1);
      }
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < filteredPlayers.length) {
        // Use keyboard-selected player
        const playerName = filteredPlayers[selectedIndex].player_name;
        if (!gameWon && guesses.length < maxGuesses) {
          const success = await makeGuess(playerName);
          if (success) {
            setInputValue("");
            closeSuggestions();
            setSelectedIndex(-1);
          }
        }
      } else if (inputValue.trim() && filteredPlayers.length > 0) {
        // Auto-select the top result and submit
        const playerName = filteredPlayers[0].player_name;
        if (!gameWon && guesses.length < maxGuesses) {
          const success = await makeGuess(playerName);
          if (success) {
            setInputValue("");
            closeSuggestions();
            setSelectedIndex(-1);
          }
        }
      } else {
        handleGuess();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredPlayers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      closeSuggestions();
      setSelectedIndex(-1);
    }
  };

  const selectSuggestion = (player: Player) => {
    setInputValue(player.player_name);
    setSelectedIndex(-1);
    closeSuggestions();
  };


  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col items-center justify-start gap-6 bg-gray-100 dark:bg-neutral-950 text-neutral-800 dark:text-white pt-16 pb-8 px-2 animate-fadeIn select-none" style={{ transition: 'opacity 300ms ease-out', opacity: fadingOut ? 0 : 1 }}>
      <div className="relative flex flex-col items-center animate-titleFadeIn w-full max-w-lg">
        {showOWTVBanner && (
          <button onClick={() => setShowOWTVModal(true)} className={`absolute hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer ${isArcade ? '-top-1' : 'top-1'}`} style={{ background: dark ? '#1c1c1c' : '#fff', left: '-15px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
            <span className="font-[family-name:var(--font-ow-esports)] text-[10px] font-bold whitespace-nowrap" style={{ letterSpacing: '0.05em', color: dark ? '#a0aec0' : '#151C23' }}>PARTNERED WITH</span>
            <img src={dark ? '/LOGO_NAME_WHITE_BLUE.png' : '/OWTV_LOGO_darkblue.png'} alt="Partner logo" className="h-4 object-contain" />
          </button>
        )}
        <div>
          <h1 className="text-4xl sm:text-3xl md:text-4xl lg:text-4xl font-bold font-[family-name:var(--font-poster-gothic)]">
            <span className="text-orange-500">OWCS</span>LE
          </h1>
        </div>
        <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 font-[family-name:var(--font-poster-gothic)] -mt-1">
          {isArcade ? 'UNLIMITED' : 'STAGE 2'}
        </p>
        {dailyCount !== null && !isArcade && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-[family-name:var(--font-poster-gothic)] mt-0.5">
            {dailyCount} GAMES PLAYED TODAY
          </p>
        )}
        <LiveBadge isArcade={isArcade} />
        {showOWTVBanner && (
          <button onClick={() => setShowOWTVModal(true)} className={`flex sm:hidden items-center gap-2 px-3 py-1.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer ${isArcade ? 'mt-0.5' : 'mt-1.5'}`} style={{ background: dark ? '#1c1c1c' : '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
            <span className="font-[family-name:var(--font-ow-esports)] text-[10px] font-bold whitespace-nowrap" style={{ letterSpacing: '0.05em', color: dark ? '#a0aec0' : '#151C23' }}>PARTNERED WITH</span>
            <img src={dark ? '/LOGO_NAME_WHITE_BLUE.png' : '/OWTV_LOGO_darkblue.png'} alt="Partner logo" className="h-4 object-contain" />
          </button>
        )}
      </div>

      {/* Mobile icon row */}
      <div className="flex sm:hidden items-center gap-1 animate-buttonFadeIn -my-3 z-[100]">
        <IconButton icon={HelpCircle} label="How to play" onClick={() => setShowHowToPlayModal(true)} />
        {!isArcade && <IconButton icon={BarChart3} label="Statistics" onClick={() => setShowStatsModal(true)} />}
        <IconButton icon={isArcade ? HomeIcon : InfinityIcon} label={isArcade ? 'Daily' : 'Unlimited'} onClick={toggleArcade} />
        {isArcade && <IconButton icon={Crown} label="Leaderboard" onClick={() => setShowLeaderboard(true)} />}
        <ImageIconButton src="https://cdn.owcsle.xyz/images/usa_logo.png" label="USA OWWC" imgClassName="dark:invert" onClick={() => { setFadingOut(true); setTimeout(() => router.push('/usa'), 300); }} />
        <IconButton icon={MessageCircle} label="Feedback" onClick={() => setShowFeedbackModal(true)} />
        <ThemeToggle />
        <IconButton icon={Settings} label="Settings" onClick={() => setShowSettings(true)} />
        <UserMenu user={user} onLoginClick={() => setShowAuthModal(true)} />
      </div>

      <div className="w-4/5 sm:w-full max-w-lg h-px bg-neutral-300 dark:bg-neutral-700 animate-expandOut"></div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="relative z-50 sm:min-w-[520px]">
        <div className="hidden sm:flex absolute -top-20 left-0 items-center gap-2 animate-buttonFadeIn z-[100]">
          <IconButton icon={HelpCircle} label="How to play" onClick={() => setShowHowToPlayModal(true)} />
          {!isArcade && <IconButton icon={BarChart3} label="Statistics" onClick={() => setShowStatsModal(true)} />}
          {isArcade && <IconButton icon={Crown} label="Leaderboard" onClick={() => setShowLeaderboard(true)} />}
          <IconButton icon={isArcade ? HomeIcon : InfinityIcon} label={isArcade ? 'Daily' : 'Unlimited'} onClick={toggleArcade} />
          <ImageIconButton src="https://cdn.owcsle.xyz/images/usa_logo.png" label="USA OWWC" imgClassName="dark:invert" onClick={() => { setFadingOut(true); setTimeout(() => router.push('/usa'), 300); }} />
        </div>
        <div className="hidden sm:flex absolute -top-20 right-0 items-center gap-2 animate-buttonFadeIn z-[100]">
          <IconButton icon={MessageCircle} label="Feedback" onClick={() => setShowFeedbackModal(true)} />
          <ThemeToggle />
          <IconButton icon={Settings} label="Settings" onClick={() => setShowSettings(true)} />
          <UserMenu user={user} onLoginClick={() => setShowAuthModal(true)} />
        </div>

        {isArcade && <ArcadeSection isLoggedIn={authReady ? !!user : undefined} onLoginClick={() => setShowAuthModal(true)} />}

        {!isArcade && !isLoading && (
          <div className="flex flex-col items-center gap-6">
            <GameBoard guesses={guesses} maxGuesses={maxGuesses} targetPlayerId={targetPlayer?.id || null} colorblindMode={settings.colorblindMode} />

          {gameWon ? (
            <div className="flex flex-col gap-4">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-6 py-3 rounded-lg flex flex-col items-center gap-1 font-bold font-[family-name:var(--font-ow-esports)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Congratulations! You won in {guesses.length} guesses!</span>
                </div>
                <span className="text-sm font-normal">OWCSLE resets in {timeUntilReset}</span>
              </div>

              <GameResultCard
                guesses={guesses}
                maxGuesses={maxGuesses}
                won={true}
                targetPlayerName={targetPlayer?.player_name || ''}
                wordleNumber={getDayNumber()}
              />
            </div>
          ) : guesses.length >= maxGuesses ? (
            <div className="flex flex-col gap-4">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-6 py-3 rounded-lg flex flex-col items-center gap-1 font-bold font-[family-name:var(--font-ow-esports)]">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span>You lost! The answer was {targetPlayer?.player_name}</span>
                </div>
                <span className="text-sm font-normal">OWCSLE resets in {timeUntilReset}</span>
              </div>

              <GameResultCard
                guesses={guesses}
                maxGuesses={maxGuesses}
                won={false}
                targetPlayerName={targetPlayer?.player_name || ''}
                wordleNumber={getDayNumber()}
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-2 sm:p-3 shadow-lg relative overflow-visible animate-inputFadeIn w-[calc(100vw-24px)] max-w-md sm:w-auto z-10">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative flex-1 overflow-visible">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg px-2 py-2 sm:px-4 sm:py-2.5">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500 dark:text-neutral-400" />
                    <input
                      ref={inputRef}
                      type="text"
                      autoComplete="off"
                      placeholder="TYPE OR SELECT PLAYER..."
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                        setIsClosing(false);
                      }}
                      onKeyDown={handleKeyDown}
                      onClick={() => {
                        setShowSuggestions(true);
                        setIsClosing(false);
                      }}
                      onFocus={() => {
                        setShowSuggestions(true);
                        setIsClosing(false);
                      }}
                      onBlur={() => setTimeout(() => closeSuggestions(true), 150)}
                      disabled={gameWon || guesses.length >= maxGuesses}
                      className="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-base text-neutral-900 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 font-[family-name:var(--font-poster-gothic)] disabled:opacity-50 select-text"
                    />
                  </div>

                  {showSuggestions && (
                    <div className={`absolute top-full left-0 right-0 mt-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg shadow-lg max-h-32 overflow-y-auto z-50 ${isClosing ? 'animate-slideUp' : 'animate-slideDown'}`}>
                      {filteredPlayers.length > 0 ? (
                        filteredPlayers.map((player, index) => (
                          <div
                            key={player.id}
                            onClick={() => selectSuggestion(player)}
                            className={`px-3 py-2 cursor-pointer text-sm transition-colors font-[family-name:var(--font-poster-gothic)] border-b border-neutral-200 dark:border-neutral-700 last:border-b-0 ${
                              index === selectedIndex
                                ? "bg-blue-500 text-white"
                                : "text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            }`}
                          >
                            {player.player_name}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-1.5 text-sm text-neutral-500 dark:text-neutral-400 italic select-none">
                          No players found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleGuess}
                  disabled={!inputValue.trim() || gameWon || guesses.length >= maxGuesses}
                  className="px-3 py-2 sm:px-5 sm:py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm sm:text-base font-bold rounded-lg transition-colors font-[family-name:var(--font-poster-gothic)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  GUESS
                </button>
              </div>
            </div>
          )}

          </div>
      )}
      </div>

      {/* FACEIT promo banner */}
      <button
        onClick={() => window.open(FACEIT_SIGNUP_URL, '_blank', 'noopener,noreferrer')}
        onContextMenu={(e) => e.preventDefault()}
        className="hidden sm:block animate-creditFadeIn w-full max-w-lg rounded-lg shadow-lg overflow-hidden cursor-pointer"
      >
        <video
          src="https://cdn.owcsle.xyz/faceitpromo.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="block w-full brightness-100 hover:brightness-75 transition-[filter] duration-200"
        />
      </button>


      {/* Credit */}
      <div className="flex flex-col items-center gap-3 relative z-0 animate-creditFadeIn">
        <p className="text-base text-neutral-500 dark:text-neutral-400 font-[family-name:var(--font-poster-gothic)] flex items-center gap-1">
          MADE BY <a href="https://x.com/dyrexreal" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 transition-colors">DYREX</a> <img src="/mewo.png" alt="mewo" className="w-6 h-6 dark:invert" />
        </p>
        <a href="https://ko-fi.com/tannerlol" target="_blank" rel="noopener noreferrer" className="-mt-2 text-[15px] uppercase underline underline-offset-2 text-neutral-400 dark:text-neutral-500 hover:text-orange-500 dark:hover:text-orange-500 transition-colors font-[family-name:var(--font-ow-esports)]">
          Support me on Ko-fi
        </a>
      </div>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      {showOWTVBanner && <OWTVModal open={showOWTVModal} onClose={() => setShowOWTVModal(false)} />}
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} colorblindMode={settings.colorblindMode} onColorblindChange={mode => updateSettings({ colorblindMode: mode })} reduceMotion={settings.reduceMotion} onReduceMotionChange={val => updateSettings({ reduceMotion: val })} />
      {settings.reduceMotion && (
        <style>{`*, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }`}</style>
      )}
      <LeaderboardModal open={showLeaderboard} onClose={() => setShowLeaderboard(false)} currentUserId={user?.id} />

      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        stats={stats}
        winRate={winRate}
      />

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      <HowToPlayModal
        isOpen={showHowToPlayModal}
        onClose={() => setShowHowToPlayModal(false)}
      />

      {showGiveawayModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70" onClick={() => setShowGiveawayModal(false)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowGiveawayModal(false)} className="absolute -top-3 -right-3 w-8 h-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full flex items-center justify-center transition-colors z-10">✕</button>
            <img src="/owcsle_giveaway_graphic.png" alt="Giveaway" className="w-full rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent showOWTVBanner={true} />
    </Suspense>
  );
}
