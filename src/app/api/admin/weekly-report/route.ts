import { NextResponse } from 'next/server'
import { getCurrentCycle, getCycleOrders, generateWeeklyReport, sendWeeklyReportTelegram, closeCurrentCycleAndCreateNew } from '@/lib/weekly-report'

// GET endpoint to preview report without closing cycle
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

// POST endpoint to generate and send report, then close cycle
export async function POST() {
  try {
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