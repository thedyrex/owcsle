import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase';

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createAdminUser(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const passwordHash = await hashPassword(password);

    const { error } = await supabaseAdmin
      .from('admin_users')
      .insert([{ username, password_hash: passwordHash }]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to create admin user' };
  }
}

export async function authenticateAdmin(username: string, password: string): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return { success: false, error: 'Invalid credentials' };
    }

    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    return { success: true, user };
  } catch (err) {
    return { success: false, error: 'Authentication failed' };
  }
}

export async function checkIfAdminExists(): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error checking for admin users:', error);
      return false;
    }

    return (data && data.length > 0);
  } catch (err) {
    console.error('Error checking for admin users:', err);
    return false;
  }
}
