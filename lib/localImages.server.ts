import { createHash } from 'crypto';
import { toLocalUrl } from './localImages';

function getFileHash(url: string): string {
  return createHash('md5').update(url).digest('hex').substring(0, 8);
}

function getExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const lastDot = pathname.lastIndexOf('.');
    if (lastDot !== -1) return pathname.substring(lastDot);
    return '.png';
  } catch {
    return '.png';
  }
}

/** Server-side: convert any external URL to local path using hash-based naming */
function toLocalUrlServer(url: string | null | undefined, type: 'logo' | 'flag' | 'role'): string {
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('https://cdn.owcsle.xyz')) return url;

  // Try static map first
  const mapped = toLocalUrl(url);
  if (mapped !== url) return mapped;

  // Fall back to hash-based CDN path
  const ext = getExtension(url);
  const hash = getFileHash(url);
  const folder = type === 'logo' ? 'team-logos' : type === 'flag' ? 'flags' : 'role-icons';
  const prefix = type === 'logo' ? 'logo' : type === 'flag' ? 'flag' : 'role';
  return `https://cdn.owcsle.xyz/images/${folder}/${prefix}-${hash}${ext}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertPlayerToLocalImages(player: any) {
  return {
    ...player,
    logo_url: toLocalUrlServer(player.logo_url, 'logo'),
    flag_url: toLocalUrlServer(player.flag_url, 'flag'),
    role_icon: toLocalUrlServer(player.role_icon, 'role'),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertTeamToLocalImages(team: any) {
  return {
    ...team,
    team_logo: toLocalUrlServer(team.team_logo, 'logo'),
  };
}
