import { NextRequest, NextResponse } from 'next/server'
import { getCurrentCycle, getCycleOrders, generateWeeklyReport, sendWeeklyReportTelegram, closeCurrentCycleAndCreateNew } from '@/lib/weekly-report'

// This endpoint should be called by a cron job every Friday at 23:59
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (simple token check for cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentCycle = await getCurrentCycle()

    if (!currentCycle) {
      return NextResponse.json({ error: 'No open week cycle found' }, { status: 400 })
    }

    const orders = await getCycleOrders(currentCycle.id)
    const report = generateWeeklyReport(currentCycle, orders)

    // Send Telegram notification
    await sendWeeklyReportTelegram(report)

    // Close current cycle and create new one
    await closeCurrentCycleAndCreateNew(currentCycle.id)

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('Weekly report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint to preview report without sending
export async function GET() {
  try {
    const currentCycle = await getCurrentCycle()

    if (!currentCycle) {
      return NextResponse.json({ error: 'No open week cycle found' }, { status: 400 })
    }

    const orders = await getCycleOrders(currentCycle.id)
    const report = generateWeeklyReport(currentCycle, orders)

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Report preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}