import { useEffect } from 'react';
import type { GuessResult } from '@/lib/supabase';
import { getCSTDateString } from '@/app/utils/getCSTDateString';

interface GameStorageProps {
  guesses: GuessResult[];
  gameWon: boolean;
  gameOver: boolean;
  gameRecorded: boolean;
  onRestore: (restored: {
    guesses: GuessResult[];
    gameWon: boolean;
    gameOver: boolean;
    gameRecorded: boolean;
  }) => void;
  todayKey: string;
  todayGameStateKey: string;
}

/**
 * Schedules localStorage clearing at next CST midnight and reloads page.
 */
function scheduleStorageReset(todayKeys: string[], onReset: () => void) {
  const now = new Date();
  const nowCST = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const midnightCST = new Date(nowCST);
  midnightCST.setHours(24, 0, 0, 0); // next CST midnight
  const msTillMidnight = midnightCST.getTime() - nowCST.getTime();
  setTimeout(() => {
    todayKeys.forEach((key) => localStorage.removeItem(key));
    onReset();
  }, msTillMidnight + 1000); // +1s buffer
}

/**
 * Custom hook for saving and restoring game state from localStorage,
 * automatically resetting at midnight CST.
 */
export default function useLocalGameStorage({
  guesses,
  gameWon,
  gameOver,
  gameRecorded,
  onRestore,
  todayKey,
  todayGameStateKey,
}: GameStorageProps) {
  // Restore from localStorage on mount
  useEffect(() => {
    const savedGuesses = localStorage.getItem(todayKey);
    const savedGameState = localStorage.getItem(todayGameStateKey);

    if (savedGuesses && savedGameState) {
      try {
        const parsedGuesses = JSON.parse(savedGuesses) as GuessResult[];
        const parsedGameState = JSON.parse(savedGameState) as { gameWon: boolean; gameOver: boolean; gameRecorded: boolean };

        if (Array.isArray(parsedGuesses)) {
          onRestore({
            guesses: parsedGuesses,
            gameWon: parsedGameState.gameWon,
            gameOver: parsedGameState.gameOver,
            gameRecorded: parsedGameState.gameRecorded || false,
          });
        }
      } catch {
        // Ignore invalid data
      }
    }

    scheduleStorageReset([todayKey, todayGameStateKey], () => window.location.reload());
    // intentionally run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist data in localStorage whenever guesses/gameState change
  useEffect(() => {
    localStorage.setItem(todayKey, JSON.stringify(guesses));
    localStorage.setItem(todayGameStateKey, JSON.stringify({ gameWon, gameOver, gameRecorded }));
  }, [guesses, gameWon, gameOver, gameRecorded, todayKey, todayGameStateKey]);
}

/**
 * Utility to get storage keys for today's game.
 */
export function getGameKeys() {
  const today = getCSTDateString();
  return {
    todayKey: `owcsle_guesses_${today}`,
    todayGameStateKey: `owcsle_game_state_${today}`,
  };
}
