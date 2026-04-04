import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null

function isValidSupabaseConfig(): boolean {
  if (!supabaseUrl || !supabaseServiceKey) {
    return false
  }

  // Check for placeholder values
  if (supabaseUrl.includes('your_') || supabaseUrl === 'placeholder') {
    return false
  }

  // Check for valid Supabase URL format
  if (!supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('supabase.net')) {
    return false
  }

  return true
}

export function getSupabase() {
  if (!isValidSupabaseConfig()) {
    console.warn('Supabase credentials not configured - running in demo mode')
    return null
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl!, supabaseServiceKey!)
  }

  return supabaseInstance
}

// Export a simpler type alias
export type SupabaseClient = NonNullable<ReturnType<typeof getSupabase>>