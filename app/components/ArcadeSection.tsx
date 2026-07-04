"use client";

import { GameBoard } from "./GameBoard";
import { User, CheckCircle2, XCircle, RotateCcw, Trophy, Flame, Timer } from "lucide-react";
import { useArcadeGame } from "@/hooks/useArcadeGame";
import { Player } from "@/lib/supabase";
import { useState, useRef, useEffect } from "react";
import { xpProgress } from "@/lib/xp";
import { useSettings } from "@/hooks/useSettings";
export function ArcadeSection({ isLoggedIn: isLoggedInProp, onLoginClick }: { isLoggedIn?: boolean; onLoginClick?: () => void }) {
  const { settings } = useSettings();
  const { guesses, maxGuesses, gameWon, gameOver, isLoading, error, makeGuess, allPlayers, targetPlayer, playAgain, gamesPlayed, gamesWon, streak, totalXp, xpReady, isLoggedIn: isLoggedInHook } = useArcadeGame();
  const isLoggedIn = isLoggedInProp ?? isLoggedInHook;

  const [inputValue, setInputValue] = useState("");
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const [xpVisible, setXpVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (guesses.length === 1 && !gameOver) {
      startTimeRef.current = Date.now() - elapsed;
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current!);
      }, 50);
    }
    if (gameOver && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [guesses.length, gameOver]);

  // Reset timer on new game
  useEffect(() => {
    if (!isLoading && guesses.length === 0) {
      setElapsed(0);
      startTimeRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isLoading, guesses.length]);

  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => { setContentVisible(true); setXpVisible(true); }, 30);
      return () => clearTimeout(t);
    }
  }, [isLoading]);


  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return `${m > 0 ? `${m}:` : ''}${m > 0 ? s.toString().padStart(2, '0') : s}.${cs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (inputValue.trim().length > 0) {
      const filtered = allPlayers
        .filter((p) => p.player_name.toLowerCase().includes(inputValue.toLowerCase()))
        .sort((a, b) => a.player_name.localeCompare(b.player_name));
      setFilteredPlayers(filtered);
    } else {
      setFilteredPlayers([...allPlayers].sort((a, b) => a.player_name.localeCompare(b.player_name)));
    }
  }, [inputValue, allPlayers]);

  const closeSuggestions = (animate = false) => {
    if (animate && showSuggestions) {
      setIsClosing(true);
      setTimeout(() => { setShowSuggestions(false); setIsClosing(false); }, 100);
    } else {
      setShowSuggestions(false);
      setIsClosing(false);
    }
  };

  const handleGuess = async () => {
    if (inputValue.trim() && !gameWon && guesses.length < maxGuesses) {
      const success = await makeGuess(inputValue.trim(), elapsed);
      if (success) { setInputValue(""); closeSuggestions(); setSelectedIndex(-1); }
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < filteredPlayers.length) {
        const playerName = filteredPlayers[selectedIndex].player_name;
        if (!gameWon && guesses.length < maxGuesses) {
          const success = await makeGuess(playerName, elapsed);
          if (success) { setInputValue(""); closeSuggestions(); setSelectedIndex(-1); }
        }
      } else if (inputValue.trim() && filteredPlayers.length > 0) {
        const playerName = filteredPlayers[0].player_name;
        if (!gameWon && guesses.length < maxGuesses) {
          const success = await makeGuess(playerName, elapsed);
          if (success) { setInputValue(""); closeSuggestions(); setSelectedIndex(-1); }
        }
      } else {
        handleGuess();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => prev < filteredPlayers.length - 1 ? prev + 1 : prev);
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

  const handlePlayAgain = async () => {
    setInputValue("");
    setSelectedIndex(-1);
    closeSuggestions();
    await playAgain();
  };

  const xp = xpProgress(totalXp);

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <>
      {!isLoading && (
        <div className="flex flex-col items-center gap-6" style={{ opacity: contentVisible ? 1 : 0, transition: 'opacity 1s ease' }}>

          {/* XP level bar */}
          {isLoggedIn && <div className="w-full max-w-[312px] flex flex-col gap-1 relative" style={{ opacity: xpVisible ? 1 : 0, transition: 'opacity 1.2s ease' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-[family-name:var(--font-ow-esports)] text-purple-400">
                LVL {xp.level}
              </span>
              <span className="text-xs font-[family-name:var(--font-ow-esports)] text-neutral-500 dark:text-neutral-400">
                {xp.current}/{xp.required} XP
              </span>
            </div>
            <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-700"
                style={{ width: contentVisible ? `${xp.percent * 100}%` : '0%' }}
              />
            </div>

          </div>}

          {/* Stats bar */}
          <div className="flex bg-white dark:bg-neutral-800 rounded-lg shadow-md font-[family-name:var(--font-poster-gothic)]">
            <div className="flex flex-col items-center gap-0.5 w-24 py-2">
              <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <Flame className="w-3.5 h-3.5 text-neutral-700 dark:text-white" />
                <span>STREAK</span>
              </div>
              <span className="text-lg font-bold">{streak}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 w-24 py-2 border-x border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <Timer className="w-3.5 h-3.5 text-neutral-700 dark:text-white" />
                <span>TIME</span>
              </div>
              <span className="text-lg font-bold tabular-nums">{formatTime(elapsed)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 w-24 py-2">
              <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <Trophy className="w-3.5 h-3.5 text-neutral-700 dark:text-white" />
                <span>WINS</span>
              </div>
              <span className="text-lg font-bold">{gamesWon}/{gamesPlayed}</span>
            </div>
          </div>

          <div className="relative z-50">
            <GameBoard guesses={guesses} maxGuesses={maxGuesses} targetPlayerId={targetPlayer?.id || null} colorblindMode={settings.colorblindMode} />
          </div>

          {gameWon ? (
            <div className="flex flex-col gap-2">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-6 py-3 rounded-lg flex flex-col items-center gap-1 font-bold font-[family-name:var(--font-ow-esports)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>You won in {guesses.length} guesses!</span>
                </div>
              </div>
              <button
                onClick={handlePlayAgain}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors font-[family-name:var(--font-ow-esports)]"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN
              </button>
            </div>
          ) : guesses.length >= maxGuesses ? (
            <div className="flex flex-col gap-2">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-6 py-3 rounded-lg flex flex-col items-center gap-1 font-bold font-[family-name:var(--font-ow-esports)]">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span>Game Over!</span>
                </div>
                {targetPlayer && (
                  <span className="text-sm font-normal">The answer was {targetPlayer.player_name}</span>
                )}
              </div>
              <button
                onClick={handlePlayAgain}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors font-[family-name:var(--font-ow-esports)]"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN
              </button>
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
                      placeholder="TYPE OR SELECT PLAYER..."
                      value={inputValue}
                      onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); setIsClosing(false); }}
                      onKeyDown={handleKeyDown}
                      onClick={() => { setShowSuggestions(true); setIsClosing(false); }}
                      onFocus={() => { setShowSuggestions(true); setIsClosing(false); }}
                      onBlur={() => setTimeout(() => closeSuggestions(true), 150)}
                      autoComplete="off"
                      disabled={gameWon || guesses.length >= maxGuesses}
                      className="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-base text-neutral-900 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 font-[family-name:var(--font-poster-gothic)] disabled:opacity-50 select-text"
                    />
                  </div>

                  {showSuggestions && (
                    <div className={`absolute top-full left-0 right-0 mt-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg shadow-lg max-h-32 overflow-y-auto z-10 ${isClosing ? 'animate-slideUp' : 'animate-slideDown'}`}>
                      {filteredPlayers.length > 0 ? (
                        filteredPlayers.map((player, index) => (
                          <div
                            key={player.id}
                            onClick={() => selectSuggestion(player)}
                            className={`px-3 py-2 cursor-pointer text-sm transition-colors font-[family-name:var(--font-poster-gothic)] border-b border-neutral-200 dark:border-neutral-700 last:border-b-0 ${
                              index === selectedIndex
                                ? "bg-purple-500 text-white"
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
                  className="px-3 py-2 sm:px-5 sm:py-2.5 bg-purple-500 hover:bg-purple-600 text-white text-sm sm:text-base font-bold rounded-lg transition-colors font-[family-name:var(--font-poster-gothic)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  GUESS
                </button>
              </div>
              {!isLoggedIn && (
                <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 font-[family-name:var(--font-ow-esports)]">
                  <button onClick={onLoginClick} className="underline hover:text-neutral-300 transition-colors cursor-pointer">
                    SIGN UP TO SAVE STATS
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
