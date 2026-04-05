import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getSupabase } from '@/lib/supabase/api'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Default instructions for each shipping method
const DEFAULT_INSTRUCTIONS: Record<string, string> = {
  pickup: 'Nuestro horario de atención es de Lunes a Viernes de 9:00 AM a 6:00 PM y Sábados de 9:00 AM a 3:00 PM.',
  gam: 'El paquete será entregado en la dirección indicada en 2-3 días hábiles.',
  outside_gam: 'El paquete será entregado en la dirección indicada en 3-5 días hábiles.'
}

interface SettingRow {
  key: string
  value: string
}

interface SettingIdRow {
  id: string
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
      // Return default instructions in demo mode
      return NextResponse.json({ instructions: DEFAULT_INSTRUCTIONS })
    }

    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value')
      .like('key', 'shipping_instructions_%')

    if (error) {
      console.error('Error fetching shipping instructions:', error)
      return NextResponse.json({ instructions: DEFAULT_INSTRUCTIONS })
    }

    // Build instructions object
    const instructions: Record<string, string> = { ...DEFAULT_INSTRUCTIONS }
    ;(settings as SettingRow[] | null)?.forEach(setting => {
      const key = setting.key.replace('shipping_instructions_', '')
      instructions[key] = setting.value || DEFAULT_INSTRUCTIONS[key] || ''
    })

    return NextResponse.json({ instructions })
  } catch (error) {
    console.error('Shipping instructions fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { instructions } = body as { instructions: Record<string, string> }

    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ success: true })
    }

    // Update each instruction in settings
    for (const [key, value] of Object.entries(instructions)) {
      const settingKey = `shipping_instructions_${key}`

      // Check if setting exists
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', settingKey)
        .single()

      const existingSetting = existing as SettingIdRow | null
      if (existingSetting?.id) {
        // Update existing
        await supabase
          .from('settings')
          .update({ value } as never)
          .eq('id', existingSetting.id)
      } else {
        // Insert new
        await supabase
          .from('settings')
          .insert({ key: settingKey, value } as never)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Shipping instructions update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}