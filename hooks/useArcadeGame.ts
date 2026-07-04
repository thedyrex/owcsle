"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Player, GuessResult } from '@/lib/supabase';
import { calcXpGain } from '@/lib/xp';
import { createClient } from '@/lib/supabase/client';

const MAX_GUESSES = 6;
const ARCADE_STATS_KEY = 'owcsle_arcade_stats';
const ARCADE_XP_KEY = 'owcsle_arcade_xp';

export function useArcadeGame() {
  const [targetPlayer, setTargetPlayer] = useState<Player | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gameWon, setGameWon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalXp, setTotalXp] = useState(() => {
    try { return parseInt(localStorage.getItem(ARCADE_XP_KEY) || '0', 10) || 0; } catch { return 0; }
  });
  const [xpReady, setXpReady] = useState(false);
  const [lastXpGain, setLastXpGain] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [totalWinTimeMs, setTotalWinTimeMs] = useState(0);
  const [winCount, setWinCount] = useState(0);
  const sessionTokenRef = useRef<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load stats from localStorage, then reconcile with DB
  useEffect(() => {
    async function loadStats() {
      let localXp = 0;
      let localWinTime = 0;
      let localWinCount = 0;

      try {
        const saved = localStorage.getItem(ARCADE_STATS_KEY);
        if (saved) {
          const stats = JSON.parse(saved);
          setGamesPlayed(stats.gamesPlayed || 0);
          setGamesWon(stats.gamesWon || 0);
          setStreak(stats.streak || 0);
          setBestStreak(stats.bestStreak || 0);
        }
        const savedXp = localStorage.getItem(ARCADE_XP_KEY);
        if (savedXp) localXp = parseInt(savedXp, 10) || 0;
        const savedTime = localStorage.getItem('owcsle_arcade_win_time');
        if (savedTime) {
          const { total, count } = JSON.parse(savedTime);
          localWinTime = total || 0;
          localWinCount = count || 0;
        }
      } catch (err) {
        console.error('Error loading arcade stats:', err);
      }

      // Load from DB and take whichever XP is higher
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsLoggedIn(true);
          const res = await fetch('/api/arcade/sync-xp', {
            headers: { authorization: `Bearer ${data.session.access_token}` },
          });
          if (res.ok) {
            const db = await res.json();
            const dbXp = db.totalXp || 0;
            // Take whichever is higher - protects against reload before debounce sync fires
            localXp = Math.max(localXp, dbXp);
            localStorage.setItem(ARCADE_XP_KEY, String(localXp));
            if (db.avgTimeMs && localWinCount === 0) {
              localWinCount = 1;
              localWinTime = db.avgTimeMs;
            }
          }
        }
      } catch (err) {
        console.error('Error loading XP from DB:', err);
      }

      setTotalXp(localXp);
      setTotalWinTimeMs(localWinTime);
      setWinCount(localWinCount);
      setXpReady(true);
    }

    loadStats();
  }, []);

  // Cache session token + re-load XP on auth change
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      sessionTokenRef.current = session?.access_token ?? null;
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        setIsLoggedIn(true);
        setXpReady(false);
        fetch('/api/arcade/sync-xp', {
          headers: { authorization: `Bearer ${session.access_token}` },
        }).then(r => r.ok ? r.json() : null).then(d => {
          if (d?.totalXp != null) {
            const localXp = (() => { try { return parseInt(localStorage.getItem(ARCADE_XP_KEY) || '0', 10) || 0; } catch { return 0; } })();
            const best = Math.max(localXp, d.totalXp);
            setTotalXp(best);
            localStorage.setItem(ARCADE_XP_KEY, String(best));
          }
          setXpReady(true);
        }).catch(() => setXpReady(true));
      } else if (event === 'SIGNED_OUT') {
        sessionTokenRef.current = null;
        setIsLoggedIn(false);
        setTotalXp(0);
        setGamesPlayed(0);
        setGamesWon(0);
        setStreak(0);
        setBestStreak(0);
        setXpReady(true);
        try {
          localStorage.removeItem(ARCADE_XP_KEY);
          localStorage.removeItem(ARCADE_STATS_KEY);
        } catch {}
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Save stats to localStorage when they change
  useEffect(() => {
    if (gamesPlayed > 0) {
      try {
        localStorage.setItem(ARCADE_STATS_KEY, JSON.stringify({ gamesPlayed, gamesWon, streak, bestStreak }));
      } catch (err) {
        console.error('Error saving arcade stats:', err);
      }
    }
  }, [gamesPlayed, gamesWon, streak, bestStreak]);

  useEffect(() => {
    try {
      localStorage.setItem(ARCADE_XP_KEY, String(totalXp));
      localStorage.setItem('owcsle_arcade_win_time', JSON.stringify({ total: totalWinTimeMs, count: winCount }));
    } catch (err) {
      console.error('Error saving xp:', err);
    }
    if (totalXp > 0 && sessionTokenRef.current) {
      // Debounce: cancel any pending sync and wait 800ms before sending
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      const token = sessionTokenRef.current;
      const avgTimeMs = winCount > 0 ? Math.round(totalWinTimeMs / winCount) : null;
      const wonSnapshot = gamesWon;
      syncTimerRef.current = setTimeout(() => {
        fetch('/api/arcade/sync-xp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ totalXp, avgTimeMs, gamesWon: wonSnapshot }),
        }).catch(() => {});
      }, 800);
    }
  }, [totalXp, totalWinTimeMs, winCount]);

  const loadPlayers = useCallback(async () => {
    try {
      const response = await fetch('/api/players');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Could not load player list.');
        return false;
      }

      if (!data.players || data.players.length === 0) {
        setError('No players found in the database.');
        return false;
      }

      setAllPlayers(data.players);
      return true;
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return false;
      console.error('Error loading players:', err);
      setError('An unexpected error occurred.');
      return false;
    }
  }, []);

  const startNewGame = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setGuesses([]);
      setGameWon(false);
      setTargetPlayer(null);

      // Start a new arcade game (server picks random player)
      const response = await fetch('/api/arcade/start', { method: 'POST' });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Could not start game.');
        setIsLoading(false);
        return false;
      }

      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') { setIsLoading(false); return false; }
      console.error('Error starting game:', err);
      setError('An unexpected error occurred.');
      setIsLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    async function init() {
      const playersLoaded = await loadPlayers();
      if (playersLoaded) {
        await startNewGame();
      }
      setIsLoading(false);
    }
    init();
  }, [loadPlayers, startNewGame]);

  // Reveal answer when game is over
  useEffect(() => {
    if ((gameWon || guesses.length >= MAX_GUESSES) && !targetPlayer) {
      revealAnswer();
    }
  }, [gameWon, guesses.length, targetPlayer]);

  async function makeGuess(playerName: string, elapsedMs = 0): Promise<boolean> {
    if (gameWon || guesses.length >= MAX_GUESSES) return false;

    const guessedPlayer = allPlayers.find(
      (p) => p.player_name.toLowerCase() === playerName.toLowerCase()
    );

    if (!guessedPlayer) {
      return false;
    }

    // Check if already guessed
    if (guesses.some((g) => g.player.id === guessedPlayer.id)) {
      return false;
    }

    try {
      const response = await fetch('/api/arcade/validate-guess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guessedPlayerId: guessedPlayer.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Validation error:', data.error);
        return false;
      }

      const newGuess: GuessResult = {
        player: data.guessedPlayer,
        feedback: data.feedback,
      };

      const newGuesses = [...guesses, newGuess];
      setGuesses(newGuesses);

      if (data.isCorrect) {
        setGameWon(true);
        setGamesPlayed(prev => prev + 1);
        setGamesWon(prev => prev + 1);
        setStreak(prev => {
          const next = prev + 1;
          setBestStreak(best => Math.max(best, next));
          return next;
        });
        const xp = calcXpGain(newGuesses.length, elapsedMs, true);
        setLastXpGain(xp);
        setTotalXp(prev => prev + xp);
        if (elapsedMs > 0) {
          setTotalWinTimeMs(prev => prev + elapsedMs);
          setWinCount(prev => prev + 1);
        }
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGamesPlayed(prev => prev + 1);
        setStreak(0);
        const xp = calcXpGain(newGuesses.length, 0, false);
        setLastXpGain(xp);
        setTotalXp(prev => prev + xp);
      }

      return true;
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') console.error('Error validating guess:', err);
      return false;
    }
  }

  async function revealAnswer() {
    try {
      const response = await fetch('/api/arcade/reveal');
      const data = await response.json();

      if (response.ok && data.targetPlayer) {
        setTargetPlayer(data.targetPlayer);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') console.error('Error revealing answer:', err);
    }
  }

  async function playAgain() {
    await startNewGame();
  }

  const gameOver = gameWon || guesses.length >= MAX_GUESSES;

  return {
    targetPlayer,
    allPlayers,
    guesses,
    isLoading,
    gameWon,
    gameOver,
    error,
    makeGuess,
    playAgain,
    maxGuesses: MAX_GUESSES,
    gamesPlayed,
    gamesWon,
    streak,
    bestStreak,
    totalXp,
    xpReady,
    lastXpGain,
    isLoggedIn,
  };
}
