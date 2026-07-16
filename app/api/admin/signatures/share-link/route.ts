import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { signatureViewLink } from '@/lib/signature-view.server';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

/** The unlisted wall link, for the admin to copy. Never public. */
export async function GET() {
  const token = (await cookies()).get('admin-token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await jwtVerify(token, SECRET);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || '';
  const url = signatureViewLink(origin);
  if (!url) {
    return NextResponse.json(
      {
        error:
          'No view link yet: set SIGNATURES_VIEW_TOKEN in your environment to a long random string.',
        setupRequired: true,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ url });
}
