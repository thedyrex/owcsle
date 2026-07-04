const CDN = 'https://cdn.owcsle.xyz';

const logoUrlMap: Record<string, string> = {
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/dallas-fuel-1769708361457.png": `${CDN}/images/team-logos/logo-9d66d8f0.png`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/disguised-1769708405341.png": `${CDN}/images/team-logos/logo-3635e20b.png`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/team-liquid-1769708425920.png": `${CDN}/images/team-logos/logo-ee2310a9.png`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/team-peps-1769708430672.png": `${CDN}/images/team-logos/logo-3e93d609.png`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/twisted-minds-1769708471308.png": `${CDN}/images/team-logos/logo-51738999.png`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/virtus.pro-1769708436448.png": `${CDN}/images/team-logos/logo-39d2efb0.png`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/crazy-raccoon-1769708283610.png": `${CDN}/images/team-logos/logo-459c60c8.png`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/t1-1769708418008.png": `${CDN}/images/team-logos/logo-459ec13b.png`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/team-falcons-1769708421919.png": `${CDN}/images/team-logos/logo-cb4108cd.png`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/varrel-1770530347205.png": `${CDN}/images/team-logos/logo-a67e7a37.png`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/zeta-division-1769708443165.png": `${CDN}/images/team-logos/logo-b20d251b.png`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/all-gamers-global-1770530230383.webp": `${CDN}/images/team-logos/logo-9e0ef04e.webp`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/jd-gaming-1770530287658.avif": `${CDN}/images/team-logos/logo-fcfac86a.avif`,
  "https://dmssaukxppdmfsgrajlp.supabase.co/storage/v1/object/public/owcsle-assets/team-logos/weibo-gaming-1770530320553.png": `${CDN}/images/team-logos/logo-e564d7da.png`,
  "https://owcsle.vercel.app/ssg.png": `${CDN}/images/team-logos/logo-92fc6221.png`,
};

const flagUrlMap: Record<string, string> = {};
const roleIconMap: Record<string, string> = {
  "https://upload.wikimedia.org/wikipedia/commons/f/ff/Support_icon.svg": `${CDN}/images/role-icons/support.svg`,
  "https://upload.wikimedia.org/wikipedia/commons/a/af/Damage_icon.svg": `${CDN}/images/role-icons/dps.svg`,
  "https://upload.wikimedia.org/wikipedia/commons/d/d0/Tank_icon.svg": `${CDN}/images/role-icons/tank.svg`,
};

/** Convert any external image URL to a CDN URL. Returns the original if no mapping exists. */
export function toLocalUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('https://cdn.owcsle.xyz')) return url;
  return logoUrlMap[url] || flagUrlMap[url] || roleIconMap[url] || url;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertPlayerToLocalImages(player: any) {
  return {
    ...player,
    logo_url: toLocalUrl(player.logo_url),
    flag_url: toLocalUrl(player.flag_url),
    role_icon: toLocalUrl(player.role_icon),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertTeamToLocalImages(team: any) {
  return {
    ...team,
    team_logo: toLocalUrl(team.team_logo),
  };
}
