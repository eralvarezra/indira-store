import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'

// Default instructions for each shipping method
const DEFAULT_INSTRUCTIONS: Record<string, string> = {
  pickup: 'Nuestro horario de atención es de Lunes a Viernes de 9:00 AM a 6:00 PM y Sábados de 9:00 AM a 3:00 PM.',
  gam: 'El paquete será entregado en la dirección indicada en 2-3 días hábiles.',
  outside_gam: 'El paquete será entregado en la dirección indicada en 3-5 días hábiles.'
}

export async function GET() {
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
    settings?.forEach(setting => {
      const key = setting.key.replace('shipping_instructions_', '')
      instructions[key] = setting.value || DEFAULT_INSTRUCTIONS[key] || ''
    })

    return NextResponse.json({ instructions })
  } catch (error) {
    console.error('Shipping instructions fetch error:', error)
    return NextResponse.json({ instructions: DEFAULT_INSTRUCTIONS })
  }
}