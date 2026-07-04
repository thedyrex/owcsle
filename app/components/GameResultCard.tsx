"use client";

import { GuessResult } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';

interface GameResultCardProps {
  guesses: GuessResult[];
  maxGuesses: number;
  won: boolean;
  targetPlayerName: string;
  wordleNumber: number;
  userAvatar?: string;
}

export function GameResultCard({
  guesses,
  maxGuesses,
  won,
  targetPlayerName,
  wordleNumber,
  userAvatar
}: GameResultCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);


  useEffect(() => {
    generateImage();
  }, [guesses]);


  const getColorForStatus = (status: 'correct' | 'partial' | 'wrong'): string => {
    if (status === 'correct') return '#4ade80'; // green-400
    if (status === 'partial') return '#facc15'; // yellow-400
    return '#525252'; // neutral-600
  };

  const generateImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const width = 300;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#171717'; // neutral-900
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#f5f5f5';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`OWCSLE #${wordleNumber}`, width / 2, 40);

    // Result text
    ctx.font = '16px sans-serif';
    ctx.fillStyle = won ? '#4ade80' : '#ef4444';
    ctx.fillText(won ? `${guesses.length}/${maxGuesses}` : 'X/6', width / 2, 70);

    // Draw grid
    const gridStartY = 100;
    const cellSize = 35;
    const gap = 6;
    const gridWidth = 6 * cellSize + 5 * gap;
    const gridStartX = (width - gridWidth) / 2;

    for (let row = 0; row < maxGuesses; row++) {
      const guess = guesses[row];

      for (let col = 0; col < 6; col++) {
        const x = gridStartX + col * (cellSize + gap);
        const y = gridStartY + row * (cellSize + gap);

        if (!guess) {
          // Empty cell
          ctx.fillStyle = '#262626'; // neutral-800
          ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          // Filled cell with color
          let color = '#262626';

          switch (col) {
            case 0: // Player name
              color = guess.player.player_name === targetPlayerName ? getColorForStatus('correct') : getColorForStatus('wrong');
              break;
            case 1: // Region
              color = getColorForStatus(guess.feedback.region);
              break;
            case 2: // Nationality
              color = getColorForStatus(guess.feedback.nationality);
              break;
            case 3: // Role
              color = getColorForStatus(guess.feedback.role);
              break;
            case 4: // Role Type
              color = getColorForStatus(guess.feedback.role_type);
              break;
            case 5: // Team
              color = getColorForStatus(guess.feedback.team);
              break;
          }

          ctx.fillStyle = color;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Target player name at bottom
    ctx.fillStyle = '#a3a3a3';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(targetPlayerName, width / 2, height - 30);

    // owcsle.xyz watermark
    ctx.fillStyle = '#737373';
    ctx.font = '12px sans-serif';
    ctx.fillText('owcsle.xyz', width / 2, height - 10);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `owcsle-${wordleNumber}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const shareImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `owcsle-${wordleNumber}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `OWCSLE #${wordleNumber}`,
            text: `I ${won ? 'got' : 'missed'} OWCSLE #${wordleNumber}! ${won ? `${guesses.length}/${maxGuesses}` : 'X/6'}`
          });
        } catch (err) {
          downloadImage();
        }
      } else {
        downloadImage();
      }
    });
  };

  const generateEmojiGrid = (): string => {
    let grid = '';

    // Only show rows that were actually guessed
    for (let row = 0; row < guesses.length; row++) {
      const guess = guesses[row];

      // Generate emoji for each column
      for (let col = 0; col < 6; col++) {
        let emoji = '🟥'; // Red for wrong

        switch (col) {
          case 0: // Player name
            emoji = guess.player.player_name === targetPlayerName ? '🟩' : '🟥';
            break;
          case 1: // Region
            emoji = guess.feedback.region === 'correct' ? '🟩' : '🟥';
            break;
          case 2: // Nationality
            emoji = guess.feedback.nationality === 'correct' ? '🟩' : '🟥';
            break;
          case 3: // Role
            emoji = guess.feedback.role === 'correct' ? '🟩' : '🟥';
            break;
          case 4: // Role Type (only field that can be partial)
            emoji = guess.feedback.role_type === 'correct' ? '🟩' : guess.feedback.role_type === 'partial' ? '🟨' : '🟥';
            break;
          case 5: // Team
            emoji = guess.feedback.team === 'correct' ? '🟩' : '🟥';
            break;
        }

        grid += emoji;
      }
      grid += '\n';
    }

    return grid;
  };

  const shareToDiscord = () => {
    const emojiGrid = generateEmojiGrid();
    const text = `OWCSLE #${wordleNumber} ${won ? `${guesses.length}/${maxGuesses}` : 'X/6'}\n\n${emojiGrid}\nowcsle.xyz`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const postToX = () => {
    const emojiGrid = generateEmojiGrid();
    const text = `OWCSLE #${wordleNumber} ${won ? `${guesses.length}/${maxGuesses}` : 'X/6'}\n\n${emojiGrid}\nowcsle.xyz`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={shareToDiscord}
          className="w-full max-w-sm px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors text-base flex items-center justify-center gap-2 font-[family-name:var(--font-ow-esports)]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {copied ? 'COPIED!' : 'COPY RESULTS'}
        </button>
        <button
          onClick={postToX}
          className="w-full max-w-sm px-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-lg font-bold transition-colors text-base flex items-center justify-center gap-2 font-[family-name:var(--font-ow-esports)] "
        >
          <img src="/images/xlogo.png" alt="X" className="w-4 h-4 invert" />
          POST TO X
        </button>
      </div>
    </>
  );
}
