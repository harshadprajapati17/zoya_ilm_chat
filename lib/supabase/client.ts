'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserSupabaseClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserSupabaseClient) return browserSupabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  browserSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserSupabaseClient;
}
