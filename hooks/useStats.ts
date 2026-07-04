import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  guessDistribution: number[];
}

const STATS_KEY = 'owcsle_stats';

function getInitialStats(): GameStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0],
  };
}

function readLocalStats(): GameStats {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) return { ...getInitialStats(), ...JSON.parse(saved) };
  } catch {}
  return getInitialStats();
}

async function getToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function fetchRemoteStats(): Promise<GameStats | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/stats', { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function pushStats(stats: GameStats) {
  const token = await getToken();
  if (!token) return;
  try {
    await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(stats),
    });
  } catch {}
}

export function useStats() {
  // Initialize immediately from localStorage - no blank flash, no race condition
  const [stats, setStats] = useState<GameStats>(readLocalStats);

  // On mount: try to sync with DB, prefer whichever has more games played
  useEffect(() => {
    async function load() {
      const local = readLocalStats();
      const remote = await fetchRemoteStats();
      if (remote && remote.gamesPlayed >= local.gamesPlayed) {
        setStats(remote);
        try { localStorage.setItem(STATS_KEY, JSON.stringify(remote)); } catch {}
      }
    }
    load();
  }, []);

  // Re-sync on login
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        const remote = await fetchRemoteStats();
        if (remote) {
          setStats(prev => {
            // DB wins if it has more games, otherwise keep local (no overwrite)
            if (remote.gamesPlayed >= prev.gamesPlayed) {
              try { localStorage.setItem(STATS_KEY, JSON.stringify(remote)); } catch {}
              return remote;
            }
            return prev;
          });
        }
      } else if (event === 'SIGNED_OUT') {
        const local = readLocalStats();
        setStats(local);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Save to localStorage + push to DB on every change
  useEffect(() => {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
    pushStats(stats);
  }, [stats]);

  const recordGame = useCallback((won: boolean, guessCount?: number) => {
    setStats(prev => {
      const next = { ...prev };
      next.gamesPlayed += 1;
      if (won && guessCount) {
        next.gamesWon += 1;
        next.currentStreak += 1;
        if (next.currentStreak > next.bestStreak) next.bestStreak = next.currentStreak;
        if (guessCount >= 1 && guessCount <= 6) {
          const dist = [...next.guessDistribution];
          dist[guessCount - 1] += 1;
          next.guessDistribution = dist;
        }
      } else {
        next.currentStreak = 0;
      }
      return next;
    });
  }, []);

  const resetStats = useCallback(() => setStats(getInitialStats()), []);

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  return { stats, winRate, recordGame, resetStats };
}
