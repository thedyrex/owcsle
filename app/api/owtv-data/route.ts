import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('owtv_cache')
    .select('data, updated_at')
    .eq('key', 'latest')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'No data available' }, { status: 404 });
  }

  return NextResponse.json(data.data, {
    // Data only changes once/day (scrape cron). Let the CDN absorb traffic so
    // the function is invoked at most a few times per hour regardless of load.
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
    },
  });
}
