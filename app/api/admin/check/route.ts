import { NextResponse } from 'next/server';
import { checkIfAdminExists } from '@/lib/admin-auth';

export async function GET() {
  const exists = await checkIfAdminExists();
  return NextResponse.json({ exists });
}
