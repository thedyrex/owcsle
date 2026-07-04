/**
 * Required Supabase table (run once in SQL editor):
 *
 * CREATE TABLE IF NOT EXISTS owtv_cache (
 *   key TEXT PRIMARY KEY,
 *   data JSONB NOT NULL,
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface FeaturedArticle {
  title: string;
  date: string;
  readTime: string;
  imageUrl: string;
  url: string;
}

export interface VideoCard {
  title: string;
  thumbnailUrl: string;
  category: string;
  url: string;
}

export interface MatchEntry {
  date: string;
  time: string;
  tournament: string;
  team1: string;
  team2: string;
}

export interface OWTVData {
  featuredArticle: FeaturedArticle | null;
  recentVideos: VideoCard[];
  upcomingMatches: MatchEntry[];
  scrapedAt: string;
}

const BASE = 'https://owtv.gg';

function decodeHtml(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/--/g, ': ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

// Extract alt text from an HTML chunk
function extractAlt(chunk: string): string {
  const m = chunk.match(/alt="([^"]{4,})"/);
  return m ? decodeHtml(m[1]) : '';
}

// Find the inner content of the anchor element starting at position pos
function anchorInner(html: string, pos: number): string {
  const tagEnd = html.indexOf('>', pos);
  if (tagEnd === -1) return '';
  const closeA = html.indexOf('</a>', tagEnd);
  if (closeA === -1) return html.slice(tagEnd, tagEnd + 800);
  return html.slice(tagEnd + 1, closeA);
}

function parseFeaturedArticle(html: string): FeaturedArticle | null {
  // Image: first ghost.owtv.gg image from preload links in <head>
  const ghostImgMatch = html.match(/https:\/\/ghost\.owtv\.gg\/content\/images\/[^"&\s]+\.(?:png|jpg|webp|jpeg)/);
  const imageUrl = ghostImgMatch?.[0] ?? '';

  // First /news/ link
  const newsLinkMatch = html.match(/href="(\/news\/([a-z0-9-]+))"/);
  if (!newsLinkMatch) return null;

  const [, href, slug] = newsLinkMatch;
  const pos = newsLinkMatch.index ?? 0;

  // Real title from heading text inside anchor; alt text as fallback
  const inner = anchorInner(html, pos);
  const innerText = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const headingM = inner.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  const headingText = headingM ? decodeHtml(headingM[1].replace(/<[^>]+>/g, '').trim()) : '';
  const altTitle = extractAlt(inner);
  const title = headingText
    || (altTitle ? altTitle.split('.')[0].split('Photo')[0].trim() : '')
    || slugToTitle(slug);

  // Date and read time from the stripped anchor text (e.g. "24 May 2026 • 6 min read")
  const dateM = innerText.match(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i);
  const readM = innerText.match(/(\d+\s*min\s*read)/i);

  return {
    title,
    date: dateM?.[1] ?? '',
    readTime: readM?.[1] ?? '',
    imageUrl,
    url: `${BASE}${href}`,
  };
}

function parseVideos(html: string): VideoCard[] {
  const videos: VideoCard[] = [];
  const seen = new Set<string>();

  for (const m of html.matchAll(/href="(\/watch\/([a-z0-9-]+))"/g)) {
    const [, href, slug] = m;
    if (seen.has(slug)) continue;
    seen.add(slug);

    const pos = m.index ?? 0;
    const inner = anchorInner(html, pos);
    // Also look a bit before for category tag that may precede the anchor
    const before = html.slice(Math.max(0, pos - 150), pos);

    // Thumbnail: YouTube img src inside the anchor
    const ytMatch = inner.match(/src="(https:\/\/img\.youtube\.com\/vi\/([^"\/]+)\/[^"]+)"/);
    const thumbnailUrl = ytMatch
      ? `https://img.youtube.com/vi/${ytMatch[2]}/hqdefault.jpg`
      : '';

    // Title from alt attribute
    const altTitle = extractAlt(inner);
    const title = altTitle || slugToTitle(slug);

    // Category: slug is most reliable - alt text bleeds across cards
    let category = 'VIDEO';
    if (/highlights?/i.test(slug)) {
      category = 'HIGHLIGHTS';
    } else if (/interview/i.test(slug) || /--team-/.test(slug)) {
      category = 'INTERVIEW';
    } else {
      // Fall back to text inside the anchor only (not before, to avoid bleed)
      const catM = inner.match(/>\s*(Extended Highlights?|Highlights?|Interviews?|VOD|Recap)\s*</i);
      if (catM) {
        const raw = catM[1].toUpperCase();
        category = raw.includes('EXTENDED') ? 'HIGHLIGHTS' : raw.replace(/S$/, '');
      }
    }

    videos.push({ title, thumbnailUrl, category, url: `${BASE}${href}` });
    if (videos.length >= 4) break;
  }

  return videos;
}

function parseMatches(html: string): MatchEntry[] {
  const DATE_RE = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,\s*\d{1,2}:\d{2})/i;

  // Use FIRST occurrence - the sidebar anchor wraps the date inside it
  const seen = new Set<string>();
  const matches: MatchEntry[] = [];

  for (const m of html.matchAll(/href="(\/matches\/([a-z0-9-]+))"/g)) {
    const [, href, slug] = m;
    if (seen.has(slug)) continue;
    seen.add(slug);

    // Teams from slug: split on -vs-
    const vsIdx = slug.indexOf('-vs-');
    if (vsIdx === -1) continue;

    const leftParts = slug.slice(0, vsIdx).split('-');
    const team1 = leftParts[leftParts.length - 1].toUpperCase();
    const team2 = slug.slice(vsIdx + 4).toUpperCase();

    // Tournament: strip team1, then strip detail suffix
    const tournSlug = leftParts.slice(0, -1).join('-')
      .replace(/-regular-season.*/, '')
      .replace(/-swiss-stage.*/, '')
      .replace(/-online-qualifier.*/, '')
      .replace(/-(?:playoff|qualifier|final|group)s?.*/, '');

    const tournament = tournSlug
      .replace(/\bowcs\b/gi, 'OWCS')
      .replace(/\bowwc\b/gi, 'OWWC')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();

    // Date: look inside the anchor element (date is rendered within the <a> in the sidebar)
    const pos = m.index ?? 0;
    const inner = anchorInner(html, pos);
    // Also check up to 800 chars after the href in case anchor is large
    const searchZone = inner || html.slice(pos, pos + 800);
    const dateM = searchZone.match(DATE_RE);
    const lastDate = dateM?.[1] ?? '';
    const timePart = lastDate.match(/\d{1,2}:\d{2}/)?.[0] ?? '';
    const datePart = lastDate.replace(/,?\s*\d{1,2}:\d{2}/, '').trim();

    matches.push({ date: datePart, time: timePart, tournament, team1, team2 });
    if (matches.length >= 8) break;
  }

  return matches.filter(m => m.team1 && m.team2);
}

async function scrapeOWTV(): Promise<OWTVData> {
  const res = await fetch(BASE, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`owtv.gg returned ${res.status}`);
  const html = await res.text();

  return {
    featuredArticle: parseFeaturedArticle(html),
    recentVideos: parseVideos(html),
    upcomingMatches: parseMatches(html),
    scrapedAt: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await scrapeOWTV();

    const { error } = await supabase
      .from('owtv_cache')
      .upsert({ key: 'latest', data, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      scrapedAt: data.scrapedAt,
      articleTitle: data.featuredArticle?.title ?? null,
      videoCount: data.recentVideos.length,
      matchCount: data.upcomingMatches.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Scrape failed' }, { status: 500 });
  }
}
