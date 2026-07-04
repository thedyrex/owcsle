"use client";

import { useState, useEffect } from 'react';
import { Player, GuessResult } from '@/lib/supabase';

export function useGame() {
  const [targetPlayer, setTargetPlayer] = useState<Player | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gameWon, setGameWon] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGame();
  }, []);

  // Reveal answer when game is over
  useEffect(() => {
    if ((gameWon || guesses.length >= 6) && !targetPlayer) {
      revealAnswer();
    }
  }, [gameWon, guesses.length, targetPlayer]);

  async function loadGame() {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all players from API (public data for autocomplete)
      const response = await fetch('/api/players');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Could not load player list.');
        setIsLoading(false);
        return;
      }

      if (!data.players || data.players.length === 0) {
        setError('No players found in the database.');
        setIsLoading(false);
        return;
      }

      setAllPlayers(data.players);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading game:', err);
      setError('An unexpected error occurred.');
      setIsLoading(false);
    }
  }

  async function makeGuess(playerName: string): Promise<boolean> {
    if (gameWon) return false;

    const guessedPlayer = allPlayers.find(
      (p) => p.player_name.toLowerCase() === playerName.toLowerCase()
    );

    if (!guessedPlayer) {
      return false; // Invalid guess
    }

    // Check if already guessed
    if (guesses.some((g) => g.player.id === guessedPlayer.id)) {
      return false; // Already guessed
    }

    try {
      // Validate guess server-side
      const response = await fetch('/api/validate-guess', {
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

      setGuesses([...guesses, newGuess]);

      // Check if won
      if (data.isCorrect) {
        setGameWon(true);
      }

      return true;
    } catch (err) {
      console.error('Error validating guess:', err);
      return false;
    }
  }

  async function revealAnswer() {
    try {
      const response = await fetch('/api/reveal-answer');
      const data = await response.json();

      if (response.ok && data.targetPlayer) {
        setTargetPlayer(data.targetPlayer);
      }
    } catch (err) {
      console.error('Error revealing answer:', err);
    }
  }

  function restoreGameState(restoredGuesses: GuessResult[], restoredGameWon: boolean) {
    setGuesses(restoredGuesses);
    setGameWon(restoredGameWon);

    // If game is already over from restored state, reveal answer
    if (restoredGameWon || restoredGuesses.length >= 6) {
      revealAnswer();
    }
  }

  const gameOver = gameWon || guesses.length >= 6;

  return {
    targetPlayer,
    allPlayers,
    guesses,
    isLoading,
    gameWon,
    gameOver,
    error,
    makeGuess,
    restoreGameState,
    maxGuesses: 6,
  };
}
