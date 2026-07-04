export function getCSTDateString(): string {
  const now = new Date();
  const chicago = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const year = chicago.getFullYear();
  const month = String(chicago.getMonth() + 1).padStart(2, '0');
  const day = String(chicago.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // "YYYY-MM-DD"
}

export function getDayNumber(): number {
  const launchDate = new Date('2026-02-02T00:00:00-06:00'); // Feb 2, 2026 CST
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));

  // Set both dates to midnight for accurate day comparison
  const launchMidnight = new Date(launchDate.getFullYear(), launchDate.getMonth(), launchDate.getDate());
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffTime = todayMidnight.getTime() - launchMidnight.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays + 1; // Day 1 on launch date
}
