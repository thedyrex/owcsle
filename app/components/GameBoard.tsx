"use client";

import { GuessResult } from '@/lib/supabase';
import { useState, useEffect } from 'react';

interface GameBoardProps {
  guesses: GuessResult[];
  maxGuesses: number;
  targetPlayerId: number | null;
  colorblindMode?: string;
}

export function GameBoard({ guesses, maxGuesses, targetPlayerId, colorblindMode }: GameBoardProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    // Detect touch device
    setIsTouchDevice(window.matchMedia('(hover: none)').matches);
  }, []);

  const handleCellClick = (cellId: string, e: React.MouseEvent) => {
    if (!isTouchDevice) return;
    e.stopPropagation();
    setActiveTooltip(activeTooltip === cellId ? null : cellId);
  };

  const handleDismiss = () => {
    setActiveTooltip(null);
  };

  const getColorClass = (status: 'correct' | 'partial' | 'wrong') => {
    const cb = colorblindMode && colorblindMode !== 'none';
    if (status === 'correct') return cb ? 'bg-blue-500' : 'bg-green-400';
    if (status === 'partial') return cb ? 'bg-purple-500' : 'bg-yellow-400';
    return cb ? 'bg-orange-500' : 'bg-red-400';
  };

  const getStatusText = (status: 'correct' | 'partial' | 'wrong') => {
    if (status === 'correct') return 'CORRECT';
    if (status === 'partial') return 'PARTIAL';
    return 'INCORRECT';
  };

  const getFullRoleType = (roleType: string | null | undefined) => {
    if (!roleType) return '';
    const mapping: Record<string, string> = {
      'MT': 'MAIN TANK',
      'FT': 'FLEX TANK',
      'FDPS': 'FLEX DPS',
      'HS': 'HITSCAN',
      'MS': 'MAIN SUPPORT',
      'FS': 'FLEX SUPPORT'
    };
    return mapping[roleType.toUpperCase()] || roleType;
  };

  return (
    <>
      {/* Invisible overlay to dismiss tooltips */}
      {activeTooltip && isTouchDevice && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleDismiss}
        />
      )}
      <div className="grid grid-rows-6 gap-1 sm:gap-1.5 relative z-50">
        {Array.from({ length: maxGuesses }).map((_, rowIndex) => {
          const guess = guesses[rowIndex];

          return (
            <div
              key={rowIndex}
              className="flex gap-1 sm:gap-1.5"
              style={{
                animation: `rowFadeIn 0.4s ease-out ${rowIndex * 0.08}s both`
              }}
            >
              {/* Player Name Cell */}
              <div
                data-cell
                className={`relative group w-30 sm:w-40 md:w-48 h-11 sm:h-12 md:h-16 rounded shadow flex items-center justify-center px-2 text-sm sm:text-base md:text-lg font-bold transition-colors ${
                  guess
                    ? guess.player.id === targetPlayerId
                      ? `${colorblindMode && colorblindMode !== 'none' ? 'bg-blue-500' : 'bg-green-400'} text-white`
                      : `${colorblindMode && colorblindMode !== 'none' ? 'bg-orange-500' : 'bg-red-400'} text-white`
                    : 'bg-white dark:bg-neutral-800'
                }`}
                onClick={(e) => guess && handleCellClick(`${rowIndex}-player`, e)}
              >
                {guess ? (
                  <>
                    <span className="truncate font-[family-name:var(--font-poster-gothic)]">
                      {guess.player.player_name}
                    </span>
                    <div className={`absolute bottom-full left-0 mb-2 px-2 py-1 text-white text-xs rounded text-center max-w-36 sm:max-w-none sm:whitespace-nowrap transition-opacity pointer-events-none z-[60] font-[family-name:var(--font-poster-gothic)] shadow-lg ${
                      activeTooltip === `${rowIndex}-player` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    } ${guess.player.id === targetPlayerId ? (colorblindMode && colorblindMode !== 'none' ? 'bg-blue-500' : 'bg-green-400') : (colorblindMode && colorblindMode !== 'none' ? 'bg-orange-500' : 'bg-red-400')}`}>
                      {guess.player.id === targetPlayerId ? 'CORRECT' : 'INCORRECT'} PLAYER ({guess.player.player_name})
                    </div>
                  </>
                ) : null}
              </div>

              {/* Region Cell */}
              <div
                data-cell
                className={`relative group w-10 sm:w-12 md:w-16 h-11 sm:h-12 md:h-16 rounded shadow flex items-center justify-center text-sm sm:text-base md:text-lg font-bold transition-colors ${
                  guess
                    ? `${getColorClass(guess.feedback.region)} text-white`
                    : 'bg-white dark:bg-neutral-800'
                }`}
                onClick={(e) => guess && handleCellClick(`${rowIndex}-region`, e)}
              >
                {guess ? (
                  <>
                    <span className="font-[family-name:var(--font-poster-gothic)]">
                      {guess.player.region}
                    </span>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-white text-xs rounded text-center max-w-36 sm:max-w-none sm:whitespace-nowrap transition-opacity pointer-events-none z-[60] font-[family-name:var(--font-poster-gothic)] shadow-lg ${
                      activeTooltip === `${rowIndex}-region` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    } ${getColorClass(guess.feedback.region)}`}>
                      {getStatusText(guess.feedback.region)} REGION ({guess.player.region})
                    </div>
                  </>
                ) : null}
              </div>

              {/* Nationality Cell */}
              <div
                data-cell
                className={`relative group w-10 sm:w-12 md:w-16 h-11 sm:h-12 md:h-16 rounded shadow flex items-center justify-center transition-colors ${
                  guess
                    ? getColorClass(guess.feedback.nationality)
                    : 'bg-white dark:bg-neutral-800'
                }`}
                onClick={(e) => guess && handleCellClick(`${rowIndex}-nationality`, e)}
              >
                {guess && guess.player.flag_url ? (
                  <>
                    <img
                      src={guess.player.flag_url}
                      alt={guess.player.nationality}
                      className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain rounded-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-white text-xs rounded text-center max-w-36 sm:max-w-none sm:whitespace-nowrap transition-opacity pointer-events-none z-[60] font-[family-name:var(--font-poster-gothic)] shadow-lg ${
                      activeTooltip === `${rowIndex}-nationality` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    } ${getColorClass(guess.feedback.nationality)}`}>
                      {getStatusText(guess.feedback.nationality)} NATIONALITY ({guess.player.nationality})
                    </div>
                  </>
                ) : null}
              </div>

              {/* Role Cell */}
              <div
                data-cell
                className={`relative group w-10 sm:w-12 md:w-16 h-11 sm:h-12 md:h-16 rounded shadow flex items-center justify-center transition-colors ${
                  guess
                    ? getColorClass(guess.feedback.role)
                    : 'bg-white dark:bg-neutral-800'
                }`}
                onClick={(e) => guess && handleCellClick(`${rowIndex}-role`, e)}
              >
                {guess && guess.player.role_icon ? (
                  <>
                    <img
                      src={guess.player.role_icon}
                      alt={guess.player.role}
                      className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 object-contain${guess.player.role_icon.endsWith('flex.png') ? '' : ' invert'}`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-white text-xs rounded text-center max-w-36 sm:max-w-none sm:whitespace-nowrap transition-opacity pointer-events-none z-[60] font-[family-name:var(--font-poster-gothic)] shadow-lg ${
                      activeTooltip === `${rowIndex}-role` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    } ${getColorClass(guess.feedback.role)}`}>
                      {getStatusText(guess.feedback.role)} ROLE ({guess.player.role})
                    </div>
                  </>
                ) : null}
              </div>

              {/* Role Type Cell */}
              <div
                data-cell
                className={`relative group w-10 sm:w-12 md:w-16 h-11 sm:h-12 md:h-16 rounded shadow flex items-center justify-center text-sm sm:text-base md:text-lg font-bold transition-colors ${
                  guess
                    ? `${getColorClass(guess.feedback.role_type)} text-white`
                    : 'bg-white dark:bg-neutral-800'
                }`}
                onClick={(e) => guess && handleCellClick(`${rowIndex}-roletype`, e)}
              >
                {guess && guess.player.role_type ? (
                  <>
                    <span className="font-[family-name:var(--font-poster-gothic)]">
                      {guess.player.role_type}
                    </span>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-white text-xs rounded text-center max-w-36 sm:max-w-none sm:whitespace-nowrap transition-opacity pointer-events-none z-[60] font-[family-name:var(--font-poster-gothic)] shadow-lg ${
                      activeTooltip === `${rowIndex}-roletype` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    } ${getColorClass(guess.feedback.role_type)}`}>
                      {getStatusText(guess.feedback.role_type)} SUB ROLE ({getFullRoleType(guess.player.role_type)})
                    </div>
                  </>
                ) : null}
              </div>

              {/* Team Cell */}
              <div
                data-cell
                className={`relative group w-10 sm:w-12 md:w-16 h-11 sm:h-12 md:h-16 rounded shadow flex items-center justify-center transition-colors ${
                  guess
                    ? getColorClass(guess.feedback.team)
                    : 'bg-white dark:bg-neutral-800'
                }`}
                onClick={(e) => guess && handleCellClick(`${rowIndex}-team`, e)}
              >
                {guess && guess.player.logo_url ? (
                  <>
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded flex items-center justify-center"
                      style={{
                        backgroundColor: guess.player.team_color
                      }}
                    >
                      <img
                        src={guess.player.logo_url}
                        alt={guess.player.team_name}
                        className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className={`absolute bottom-full right-0 mb-2 px-2 py-1 text-white text-xs rounded text-center max-w-36 sm:max-w-none sm:whitespace-nowrap transition-opacity pointer-events-none z-[60] font-[family-name:var(--font-poster-gothic)] shadow-lg ${
                      activeTooltip === `${rowIndex}-team` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    } ${getColorClass(guess.feedback.team)}`}>
                      {getStatusText(guess.feedback.team)} TEAM ({guess.player.team_name})
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
