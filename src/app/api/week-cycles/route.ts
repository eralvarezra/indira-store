import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getWeekCycles, getCurrentWeekCycle } from '@/lib/demo-store'

// GET - List all week cycles
export async function GET() {
  try {
    const supabase = getSupabase()

    if (!supabase) {
      // Return from demo store
      return NextResponse.json({ cycles: getWeekCycles() })
    }

    const { data: cycles, error } = await supabase
      .from('week_cycles')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch week cycles' }, { status: 500 })
    }

    return NextResponse.json({ cycles })
  } catch (error) {
    console.error('Week cycles fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Get or create current week cycle
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()

    if (!supabase) {
      // Return from demo store
      const cycle = getCurrentWeekCycle()
      return NextResponse.json({ cycle })
    }

    // Calculate current week cycle (Saturday 00:00 to Friday 23:59)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysSinceSaturday = (dayOfWeek + 1) % 7 // Saturday = 0, Sunday = 1, etc.

    const startDate = new Date(now)
    startDate.setDate(now.getDate() - daysSinceSaturday)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    endDate.setHours(23, 59, 59, 999)

    // Check for existing open cycle
    const { data: existingCycle } = await supabase
      .from('week_cycles')
      .select('*')
      .eq('status', 'open')
      .lte('start_date', now.toISOString())
      .gte('end_date', now.toISOString())
      .single()

    if (existingCycle) {
      return NextResponse.json({ cycle: existingCycle })
    }

    // Create new cycle
    const { data: newCycle, error } = await supabase
      .from('week_cycles')
      .insert({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'open',
        report_sent: false,
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Week cycle creation error:', error)
      return NextResponse.json({ error: 'Failed to create week cycle' }, { status: 500 })
    }

    return NextResponse.json({ cycle: newCycle })
  } catch (error) {
    console.error('Week cycle error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}