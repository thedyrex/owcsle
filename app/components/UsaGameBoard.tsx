"use client";

import { useState, useEffect } from 'react';

export interface UsaPlayer {
  player_name: string;
  role: string;
  role_type?: string | null;
  prior_team?: string | null;
  prior_team_logo?: string | null;
  year_active?: string | null;
  logo_url?: string | null;
  team_color?: string | null;
  role_icon?: string | null;
}

export interface UsaFeedback {
  role: 'correct' | 'partial' | 'wrong';
  prior_team: 'correct' | 'partial' | 'wrong';
  year_active: 'correct' | 'partial' | 'wrong';
}

export interface UsaGuessResult {
  player: UsaPlayer;
  feedback: UsaFeedback;
  isCorrect: boolean;
}

interface UsaGameBoardProps {
  guesses: UsaGuessResult[];
  maxGuesses: number;
  targetPlayerName: string | null;
  colorblindMode?: string;
}

export function UsaGameBoard({ guesses, maxGuesses, targetPlayerName, colorblindMode }: UsaGameBoardProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none)').matches);
  }, []);

  const handleCellClick = (cellId: string, e: React.MouseEvent) => {
    if (!isTouchDevice) return;
    e.stopPropagation();
    setActiveTooltip(activeTooltip === cellId ? null : cellId);
  };

  const handleDismiss = () => setActiveTooltip(null);

  const getColorClass = (status: 'correct' | 'partial' | 'wrong') => {
    const cb = colorblindMode && colorblindMode !== 'none';
    if (status === 'correct') return cb ? 'bg-blue-500' : 'bg-green-400';
    if (status === 'partial') return cb ? 'bg-purple-500' : 'bg-yellow-400';
    return cb ? 'bg-orange-500' : 'bg-red-400';
  };

  const ROLE_LABELS: Record<string, string> = { C: 'Coach', HC: 'Head Coach', AC: 'Assistant Coach', AM: 'Analyst', M: 'Manager' };
  const roleLabel = (r: string) => ROLE_LABELS[r?.toUpperCase()] ?? r;
  const PLAYER_ROLE_KEYS = ['dps', 'tank', 'support', 'damage', 'flex'];
  const roleTypeSuffix = (role: string, roleType?: string | null) => {
    if (roleType) return ` - ${roleType.toUpperCase()}`;
    if (PLAYER_ROLE_KEYS.some(k => role?.toLowerCase().includes(k))) return ' - PLAYER';
    return '';
  };

  const getStatusText = (status: 'correct' | 'partial' | 'wrong') => {
    if (status === 'correct') return 'CORRECT';
    if (status === 'partial') return 'PARTIAL';
    return 'INCORRECT';
  };

  const tooltip = (rowIndex: number, key: string) =>
    activeTooltip === `${rowIndex}-${key}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100';

  return (
    <>
      {activeTooltip && isTouchDevice && (
        <div className="fixed inset-0 z-40" onClick={handleDismiss} />
      )}

      <div className="grid grid-rows-6 gap-1 sm:gap-1.5 relative z-50">
        {Array.from({ length: maxGuesses }).map((_, rowIndex) => {
          const guess = guesses[rowIndex];
          const isCorrectPlayer = guess?.player.player_name === targetPlayerName;

          return (
            <div
              key={rowIndex}
              className="flex gap-1 sm:gap-1.5"
              style={{ animation: `rowFadeIn 0.4s ease-out ${rowIndex * 0.08}s both` }}
            >
              {/* Player Name */}
              <div
                data-cell
                className={`relative group w-40 sm:w-40 md:w-48 h-14 sm:h-12 md:h-16 rounded shadow flex items-center justify-center px-2 text-sm sm:text-base md:text-lg font-bold transition-colors ${
                  guess
                    ? isCorrectPlayer
                      ? `${colorblindMode && colorblindMode !== 'none' ? 'bg-blue-500' : 'bg-green-400'} text-white`
                      : `${colorblindMode && colorblindMode !== 'none' ? 'bg-orange-500' : 'bg-red-400'} text-white`
                    : 'bg-white dark:bg-neutral-800'
                }`}
                onClick={(e) => guess && handleCellClick(`${rowIndex}-player`, e)}
              >
                {guess && (
                  <>
                    <span className="truncate font-[family-name:var(--font-poster-gothic)]">
                      {guess.player.player_name}
                    </span>
                    <div className={`absolute bottom-full left-0 mb-2 px-2 py-1 text-white text-xs rounded text-center max-w-36 sm:max-w-none sm:whitespace-nowrap transition-opacity pointer-events-none z-[150] font-[family-name:var(--font-poster-gothic)] shadow-lg ${tooltip(rowIndex, 'player')} ${isCorrectPlayer ? (colorblindMode && colorblindMode !== 'none' ? 'bg-blue-500' : 'bg-green-400') : (colorblindMode && colorblindMode !== 'none' ? 'bg-orange-500' : 'bg-red-400')}`}>
                      {isCorrectPlayer ? 'CORRECT' : 'INCORRECT'} PLAYER ({guess.player.player_name})
                    </div>
                  </>
                )}
              </div>

              {/* Role */}
              <div
                data-cell
                className={`relative group w-14 sm:w-12 md:w-16 h-14 sm:h-12 md:h-16 rounded shadow flex items-center justify-center transition-colors ${
                  guess ? getColorClass(guess.feedback.role) : 'bg-white dark:bg-neutral-800'
                }`}
                onClick={(e) => guess && handleCellClick(`${rowIndex}-role`, e)}
              >
                {guess && (
                  <>
                    {guess.player.role_icon && guess.player.role_type !== 'staff' ? (
                      <img
                        src={guess.player.role_icon}
                        alt={guess.player.role}
                        className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 object-contain${guess.player.role_icon.endsWith('flex.png') ? '' : ' invert'}`}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-white text-lg font-bold font-[family-name:var(--font-poster-gothic)]">
                        {guess.player.role?.toUpperCase()}
                      </span>
                    )}
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-white text-xs rounded text-center max-w-36 sm:max-w-none sm:whitespace-nowrap transition-opacity pointer-events-none z-[150] font-[family-name:var(--font-poster-gothic)] shadow-lg ${tooltip(rowIndex, 'role')} ${getColorClass(guess.feedback.role)}`}>
                      {getStatusText(guess.feedback.role)} ROLE ({roleLabel(guess.player.role)}{roleTypeSuffix(guess.player.role, guess.player.role_type)})
                    </div>
                  </>
                )}
              </div>

              {/* Prior Team */}
              <div
                data-cell
                className={`relative group w-14 sm:w-12 md:w-16 h-14 sm:h-12 md:h-16 rounded shadow flex items-center justify-center transition-colors ${
                  guess ? getColorClass(guess.feedback.prior_team) : 'bg-white dark:bg-neutral-800'
                }`}
                onClick={(e) => guess && handleCellClick(`${rowIndex}-team`, e)}
              >
                {guess && (
                  <>
                    {guess.player.prior_team_logo ? (() => {
                      const logos = guess.player.prior_team_logo.split(',').map(u => u.trim()).filter(Boolean);
                      if (logos.length === 1) {
                        return (
                          <img
                            src={logos[0]}
                            alt={guess.player.prior_team ?? ''}
                            className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 object-contain max-w-full max-h-full"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        );
                      }
                      return (
                        <div className="relative w-full h-full overflow-hidden">
                          <img
                            src={logos[0]}
                            alt=""
                            className="absolute top-0.5 left-0.5 object-contain"
                            style={{ width: '45%', height: '45%' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 44 44">
                            <line x1="36" y1="8" x2="8" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                          </svg>
                          <img
                            src={logos[1]}
                            alt=""
                            className="absolute bottom-0.5 right-0.5 object-contain"
                            style={{ width: '52%', height: '52%' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      );
                    })() : (
                      <span className="text-white text-xs font-bold font-[family-name:var(--font-poster-gothic)]">-</span>
                    )}
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-white text-xs rounded text-center max-w-40 sm:max-w-none sm:whitespace-nowrap transition-opacity pointer-events-none z-[150] font-[family-name:var(--font-poster-gothic)] shadow-lg ${tooltip(rowIndex, 'team')} ${getColorClass(guess.feedback.prior_team)}`}>
                      {getStatusText(guess.feedback.prior_team)} TEAM ({guess.player.prior_team ?? 'NO TEAM'})
                    </div>
                  </>
                )}
              </div>

              {/* Year(s) Active */}
              <div
                data-cell
                className={`relative group w-14 sm:w-12 md:w-16 h-14 sm:h-12 md:h-16 rounded shadow flex items-center justify-center transition-colors ${
                  guess
                    ? `${getColorClass(guess.feedback.year_active)} text-white`
                    : 'bg-white dark:bg-neutral-800'
                }`}
                onClick={(e) => guess && handleCellClick(`${rowIndex}-year`, e)}
              >
                {guess && (
                  <>
                    {(() => {
                      const yearStr = guess.player.year_active;
                      if (!yearStr) return <span className="text-white text-xs font-bold font-[family-name:var(--font-poster-gothic)]">-</span>;
                      const years = yearStr.split(',').map((y: string) => y.trim()).filter(Boolean);
                      const fmt = (y: string) => `'${y.slice(-2)}`;
                      if (years.length === 1) {
                        return <span className="text-white text-sm sm:text-lg font-bold font-[family-name:var(--font-poster-gothic)]">{fmt(years[0])}</span>;
                      }
                      if (years.length === 2) {
                        return (
                          <div className="relative w-full h-full">
                            <span className="absolute text-white font-bold font-[family-name:var(--font-poster-gothic)] leading-none text-[0.9rem] sm:text-[1.1rem]" style={{ top: '14%', left: '8%' }}>{fmt(years[0])}</span>
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 44 44">
                              <line x1="36" y1="8" x2="8" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                            </svg>
                            <span className="absolute text-white font-bold font-[family-name:var(--font-poster-gothic)] leading-none text-[0.9rem] sm:text-[1.1rem]" style={{ bottom: '14%', right: '8%' }}>{fmt(years[1])}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="relative w-full h-full">
                          {(() => { const s = [...years].sort(); return (<>
                          <span className="absolute text-white font-bold font-[family-name:var(--font-poster-gothic)] leading-none" style={{ fontSize: '0.8rem', top: '28%', left: '12%' }}>{fmt(s[0])}</span>
                          <span className="absolute text-white font-bold font-[family-name:var(--font-poster-gothic)] leading-none" style={{ fontSize: '0.8rem', top: '28%', right: '12%' }}>{fmt(s[1])}</span>
                          <span className="absolute text-white font-bold font-[family-name:var(--font-poster-gothic)] leading-none" style={{ fontSize: '0.8rem', bottom: '9%', left: '50%', transform: 'translateX(-50%)' }}>{fmt(s[2])}</span>
                          </>); })()}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 44 44">
                            <line x1="22" y1="5" x2="22" y2="22" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="1" />
                            <line x1="22" y1="22" x2="8" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="1" />
                            <line x1="22" y1="22" x2="36" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="1" />
                          </svg>
                        </div>
                      );
                    })()}
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-white text-xs rounded text-center max-w-36 sm:max-w-none sm:whitespace-nowrap transition-opacity pointer-events-none z-[150] font-[family-name:var(--font-poster-gothic)] shadow-lg ${tooltip(rowIndex, 'year')} ${getColorClass(guess.feedback.year_active)}`}>
                      {getStatusText(guess.feedback.year_active)} YEAR ({guess.player.year_active ?? 'N/A'})
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
