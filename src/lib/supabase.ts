import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const serverKey = supabaseServiceKey && supabaseServiceKey.length > 10 ? supabaseServiceKey : supabaseAnonKey

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, serverKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : (null as unknown as ReturnType<typeof createClient>)

export const supabaseAnon = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>)

export default supabase