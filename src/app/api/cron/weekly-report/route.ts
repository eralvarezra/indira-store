import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getWeekCycles, getOrdersByWeekCycle, closeWeekCycle, getCurrentWeekCycle, createWeekCycle, getOrders } from '@/lib/demo-store'

interface OrderItem {
  product_id: string
  name: string
  price: number
  quantity: number
  type: 'in_stock' | 'pre_order'
}

interface Order {
  id: string
  customer_name: string
  phone: string
  items: OrderItem[]
  total: number
  status: string
  week_cycle_id: string | null
  created_at: string
}

interface WeekCycle {
  id: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  report_sent: boolean
  created_at: string
  updated_at: string
}

// This endpoint should be called by a cron job every Friday at 23:59
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (simple token check for cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabase()

    let currentCycle: WeekCycle | null = null
    let orders: Order[] = []

    if (!supabase) {
      // Demo mode
      currentCycle = getCurrentWeekCycle()
      orders = getOrders() as Order[]
    } else {
      // Get current open cycle
      const { data: cycle } = await supabase
        .from('week_cycles')
        .select('*')
        .eq('status', 'open')
        .order('start_date', { ascending: false })
        .limit(1)
        .single()

      if (!cycle) {
        return NextResponse.json({ error: 'No open week cycle found' }, { status: 400 })
      }

      currentCycle = cycle as WeekCycle

      // Get orders for this cycle
      const { data: cycleOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('week_cycle_id', currentCycle.id)

      orders = (cycleOrders || []) as Order[]
    }

    if (!currentCycle) {
      return NextResponse.json({ error: 'No current week cycle' }, { status: 400 })
    }

    // Calculate report data
    const report = generateWeeklyReport(currentCycle, orders)

    // Send Telegram notification
    await sendWeeklyReportTelegram(report)

    // Close current cycle and create new one
    if (supabase) {
      await supabase
        .from('week_cycles')
        .update({ status: 'closed', report_sent: true } as never)
        .eq('id', currentCycle.id)

      // Create new cycle for next week
      const nextStartDate = new Date(currentCycle.end_date)
      nextStartDate.setDate(nextStartDate.getDate() + 1)
      nextStartDate.setHours(0, 0, 0, 0)

      const nextEndDate = new Date(nextStartDate)
      nextEndDate.setDate(nextStartDate.getDate() + 6)
      nextEndDate.setHours(23, 59, 59, 999)

      await supabase
        .from('week_cycles')
        .insert({
          start_date: nextStartDate.toISOString(),
          end_date: nextEndDate.toISOString(),
          status: 'open',
          report_sent: false,
        } as never)
    } else {
      // Demo mode
      closeWeekCycle(currentCycle.id)
      const nextStartDate = new Date(currentCycle.end_date)
      nextStartDate.setDate(nextStartDate.getDate() + 1)
      nextStartDate.setHours(0, 0, 0, 0)

      const nextEndDate = new Date(nextStartDate)
      nextEndDate.setDate(nextStartDate.getDate() + 6)
      nextEndDate.setHours(23, 59, 59, 999)

      createWeekCycle(nextStartDate, nextEndDate)
    }

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('Weekly report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateWeeklyReport(cycle: WeekCycle, orders: Order[]) {
  const totalOrders = orders.length

  // Separate orders by type
  const inStockOrders = orders.filter(o =>
    o.items.some((item: OrderItem) => item.type === 'in_stock')
  )
  const preOrderItems = orders.flatMap(o =>
    o.items.filter((item: OrderItem) => item.type === 'pre_order')
  )
  const inStockItems = orders.flatMap(o =>
    o.items.filter((item: OrderItem) => item.type === 'in_stock')
  )

  // Count products
  const productCounts: Record<string, number> = {}
  orders.forEach(order => {
    order.items.forEach((item: OrderItem) => {
      if (!productCounts[item.name]) {
        productCounts[item.name] = 0
      }
      productCounts[item.name] += item.quantity
    })
  })

  // Format dates
  const startDate = new Date(cycle.start_date).toLocaleDateString('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const endDate = new Date(cycle.end_date).toLocaleDateString('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return {
    cycleId: cycle.id,
    startDate: cycle.start_date,
    endDate: cycle.end_date,
    startDateFormatted: startDate,
    endDateFormatted: endDate,
    totalOrders,
    inStockOrders: inStockOrders.length,
    preOrderCount: preOrderItems.length,
    inStockCount: inStockItems.length,
    productCounts,
    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0)
  }
}

async function sendWeeklyReportTelegram(report: ReturnType<typeof generateWeeklyReport>) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('Telegram credentials not configured')
    return
  }

  // Sort products by quantity
  const sortedProducts = Object.entries(report.productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // Top 10 products

  const productList = sortedProducts
    .map(([name, count]) => `• ${name} → ${count} unidades`)
    .join('\n')

  const message = `
📊 *WEEKLY ORDER REPORT*

📅 *Week:* ${report.startDateFormatted} - ${report.endDateFormatted}

📦 *Total Orders:* ${report.totalOrders}

✅ *In-Stock Items:* ${report.inStockCount}
📦 *Pre-Order Items:* ${report.preOrderCount}

🏆 *Top Products:*
${productList || 'No products this week'}

💰 *Total Revenue:* ₡${report.totalRevenue.toFixed(2)} CRC

${report.preOrderCount > 0 ? '⚠️ *Action Required:* Review and place supplier orders for pre-order items.' : '✅ All orders ready for fulfillment.'}
  `.trim()

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Telegram API error:', errorData)
    }
  } catch (error) {
    console.error('Weekly report Telegram error:', error)
  }
}

// GET endpoint to preview report without sending
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()

    let currentCycle: WeekCycle | null = null
    let orders: Order[] = []

    if (!supabase) {
      currentCycle = getCurrentWeekCycle()
      orders = getOrders() as Order[]
    } else {
      const { data: cycle } = await supabase
        .from('week_cycles')
        .select('*')
        .eq('status', 'open')
        .order('start_date', { ascending: false })
        .limit(1)
        .single()

      if (!cycle) {
        return NextResponse.json({ error: 'No open week cycle found' }, { status: 400 })
      }

      currentCycle = cycle as WeekCycle

      const { data: cycleOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('week_cycle_id', currentCycle.id)

      orders = (cycleOrders || []) as Order[]
    }

    if (!currentCycle) {
      return NextResponse.json({ error: 'No current week cycle' }, { status: 400 })
    }

    const report = generateWeeklyReport(currentCycle, orders)

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Report preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}