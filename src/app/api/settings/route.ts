import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'

interface SettingRow {
  key: string
  value: string
}

// Default settings
const DEFAULT_SETTINGS = {
  site_title: 'Indira Store',
  site_description: 'Explora nuestro catálogo de productos de skincare y realiza tu pedido de forma fácil y rápida.'
}

export async function GET() {
  try {
    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['site_title', 'site_description'])

    if (error) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS }
    ;(settings as SettingRow[])?.forEach((setting) => {
      settingsMap[setting.key] = setting.value
    })

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error('Public settings fetch error:', error)
    return NextResponse.json({ settings: DEFAULT_SETTINGS })
  }
}