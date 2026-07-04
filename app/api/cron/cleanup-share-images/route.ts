import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // List all files in the share-images bucket
    const { data: files, error: listError } = await supabase.storage
      .from('share-images')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (listError) {
      return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ deleted: 0, message: 'No files to clean up' });
    }

    // Filter files older than 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const oldFiles = files.filter((file) => {
      const createdAt = new Date(file.created_at).getTime();
      return createdAt < oneDayAgo;
    });

    if (oldFiles.length === 0) {
      return NextResponse.json({ deleted: 0, message: 'No old files found' });
    }

    // Delete old files
    const filePaths = oldFiles.map((file) => file.name);
    const { data: deleteData, error: deleteError } = await supabase.storage
      .from('share-images')
      .remove(filePaths);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 });
    }

    return NextResponse.json({
      deleted: oldFiles.length,
      message: `Cleaned up ${oldFiles.length} old share images`,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
