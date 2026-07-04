import { NextRequest, NextResponse } from 'next/server';
import { checkIfAdminExists, createAdminUser } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    // Check if admin already exists
    const adminExists = await checkIfAdminExists();
    if (adminExists) {
      return NextResponse.json(
        { success: false, error: 'Admin user already exists' },
        { status: 403 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const result = await createAdminUser(username, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
