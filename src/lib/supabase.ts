import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Determine which key to use for server operations
// If service role key is available and valid, use it (bypasses RLS)
// Otherwise fall back to anon key
const serverKey = supabaseServiceKey && supabaseServiceKey.length > 10 ? supabaseServiceKey : supabaseAnonKey

// Server-side client (bypasses RLS if service role key is valid)
export const supabase = createClient(supabaseUrl, serverKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Client-side safe client (respects RLS)
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

export default supabase