import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function isValidConfig(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false
  if (supabaseUrl.includes('your_') || supabaseUrl === 'placeholder') return false
  if (!supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('supabase.net')) return false
  return true
}

export function createClient() {
  // Return a mock client if not configured
  if (!isValidConfig()) {
    console.log('Supabase not configured - using demo mode')
    return createBrowserClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
}