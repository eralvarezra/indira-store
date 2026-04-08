import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getSupabase } from '@/lib/supabase/api'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface SettingRow {
  key: string
  value: string
}

// Default settings
const DEFAULT_SETTINGS = {
  telegram_bot_token: '',
  telegram_chat_id: '',
  site_title: 'Indira Store',
  site_description: 'Explora nuestro catálogo de productos de skincare y realiza tu pedido de forma fácil y rápida.'
}

function verifyAuth(request: NextRequest): boolean {
  const token = request.cookies.get('admin_token')?.value
  if (!token) return false

  try {
    jwt.verify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['telegram_bot_token', 'telegram_chat_id', 'site_title', 'site_description'])

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS }
    ;(settings as SettingRow[])?.forEach((setting) => {
      settingsMap[setting.key] = setting.value
    })

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ success: true })
    }

    // Upsert settings one by one
    for (const [key, value] of Object.entries(body)) {
      // First try to update, then insert if not exists
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', key)
        .single()

      if (existing) {
        await supabase
          .from('settings')
          .update({ value: String(value) } as never)
          .eq('key', key)
      } else {
        await supabase
          .from('settings')
          .insert({ key, value: String(value) } as never)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}