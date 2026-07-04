import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for admin operations (server-side only)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export interface Player {
  id: number;
  team_name: string;
  region: string;
  player_name: string;
  nationality: string;
  role: string;
  role_type?: string | null;
  logo_url: string;
  flag_url: string;
  role_icon: string;
  team_color: string;
}

export interface DailyPlayerPick {
  id: number;
  player_id: number;
  pick_date: string;
  created_at: string;
}

export interface GuessResult {
  player: Player;
  feedback: {
    team: 'correct' | 'wrong';
    region: 'correct' | 'wrong';
    nationality: 'correct' | 'wrong';
    role: 'correct' | 'wrong';
    role_type: 'correct' | 'partial' | 'wrong';
  };
}
