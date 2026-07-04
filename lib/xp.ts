// XP needed to go from level N to level N+1
export function xpForLevel(level: number): number {
  return Math.round(120 * Math.pow(level, 1.65));
}

// Total XP needed to reach a given level from 0
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

// Derive level from total XP
export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= totalXpForLevel(level + 1)) level++;
  return level;
}

// XP progress within current level (0..xpForLevel(level))
export function xpProgress(xp: number): { level: number; current: number; required: number; percent: number } {
  const level = levelFromXp(xp);
  const base = totalXpForLevel(level);
  const required = xpForLevel(level);
  const current = xp - base;
  return { level, current, required, percent: Math.min(current / required, 1) };
}

// Time bonus tiers: [maxSeconds, bonus]
// sub-4s = max (200), 45s+ = min (20)
const TIME_TIERS: [number, number][] = [
  [4,  200],
  [8,  175],
  [12, 155],
  [16, 135],
  [20, 115],
  [25, 95],
  [30, 75],
  [37, 55],
  [45, 35],
];
const MIN_TIME_BONUS = 20;

// Calculate XP earned for a win
export function calcXpGain(guesses: number, elapsedMs: number, won: boolean): number {
  if (!won) return 15;
  const guessBase = Math.max(500 - (guesses - 1) * 70, 80);
  const secs = elapsedMs / 1000;
  let timeBonus = MIN_TIME_BONUS;
  for (const [maxSec, bonus] of TIME_TIERS) {
    if (secs < maxSec) { timeBonus = bonus; break; }
  }
  return guessBase + timeBonus;
}

// Level title milestones
const TITLES: [number, string][] = [
  [1,  'ROOKIE'],
  [5,  'AMATEUR'],
  [10, 'PLAYER'],
  [20, 'VETERAN'],
  [35, 'EXPERT'],
  [50, 'ELITE'],
  [75, 'MASTER'],
  [100,'CHAMPION'],
];

export function levelTitle(level: number): string {
  let title = TITLES[0][1];
  for (const [threshold, name] of TITLES) {
    if (level >= threshold) title = name;
  }
  return title;
}
