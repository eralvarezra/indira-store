import { getSupabase } from '@/lib/supabase/api'
import { getWeekCycles, getOrders, getCurrentWeekCycle } from '@/lib/demo-store'

interface OrderItem {
  product_id: string
  name: string
  price: number
  quantity: number
  type: 'in_stock' | 'pre_order'
}

interface Order {
  id: string
  order_number: string | null
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

export interface WeeklyReport {
  cycleId: string
  startDate: string
  endDate: string
  startDateFormatted: string
  endDateFormatted: string
  totalOrders: number
  preOrdersOnly: number
  preOrderDetails: {
    orderNumber: string
    customerName: string
    products: string[]
    orderDate: string
  }[]
}

export async function getCurrentCycle(): Promise<WeekCycle | null> {
  const supabase = getSupabase()

  if (!supabase) {
    // Demo mode
    return getCurrentWeekCycle()
  }

  const { data: cycle } = await supabase
    .from('week_cycles')
    .select('*')
    .eq('status', 'open')
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  return cycle as WeekCycle | null
}

export async function getCycleOrders(cycleId: string): Promise<Order[]> {
  const supabase = getSupabase()

  if (!supabase) {
    // Demo mode
    return getOrders() as Order[]
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('week_cycle_id', cycleId)

  return (orders || []) as Order[]
}

export function generateWeeklyReport(cycle: WeekCycle, orders: Order[]): WeeklyReport {
  // Filter orders that have pre-order items
  const preOrders = orders.filter(o =>
    o.items.some((item: OrderItem) => item.type === 'pre_order')
  )

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

  // Build pre-order details
  const preOrderDetails = preOrders.map(order => {
    const orderNumber = order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`
    const orderDate = new Date(order.created_at).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Get only pre-order items
    const preOrderItems = order.items
      .filter((item: OrderItem) => item.type === 'pre_order')
      .map((item: OrderItem) => `${item.name} x${item.quantity}`)

    return {
      orderNumber,
      customerName: order.customer_name,
      products: preOrderItems,
      orderDate
    }
  })

  return {
    cycleId: cycle.id,
    startDate: cycle.start_date,
    endDate: cycle.end_date,
    startDateFormatted: startDate,
    endDateFormatted: endDate,
    totalOrders: orders.length,
    preOrdersOnly: preOrders.length,
    preOrderDetails
  }
}

export async function sendWeeklyReportTelegram(report: WeeklyReport): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('Telegram credentials not configured')
    return
  }

  // Telegram has a 4096 character limit per message
  const MAX_MESSAGE_LENGTH = 4000 // Leave some buffer

  // Build header
  const header = `📦 *PRE-PEDIDOS DE LA SEMANA*\n\n📅 ${report.startDateFormatted} - ${report.endDateFormatted}\n━━━━━━━━━━━━━━━━━━━━━━\n\n`

  if (report.preOrderDetails.length === 0) {
    // Send single message if no pre-orders
    const message = header + `✅ No hay pre-pedidos esta semana.`
    await sendTelegramMessage(botToken, chatId, message)
    return
  }

  // Build summary
  const summary = `📋 *Total pre-pedidos:* ${report.preOrdersOnly}\n\n`

  // Build order entries
  const orderEntries = report.preOrderDetails.map(order => {
    const entry = `*${order.orderNumber}*\n`
      + `👤 ${order.customerName}\n`
      + `📦 ${order.products.join(', ')}\n`
      + `📅 ${order.orderDate}\n\n`
    return entry
  })

  // Split into multiple messages if needed
  const messages: string[] = []
  let currentMessage = header + summary

  for (const entry of orderEntries) {
    if (currentMessage.length + entry.length > MAX_MESSAGE_LENGTH) {
      // Save current message and start a new one
      messages.push(currentMessage.trim())
      currentMessage = `📦 *PRE-PEDIDOS (continuación)*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`
    }
    currentMessage += entry
  }

  // Add last message
  if (currentMessage.trim().length > 0) {
    messages.push(currentMessage.trim())
  }

  // Send all messages
  for (const message of messages) {
    await sendTelegramMessage(botToken, chatId, message)
    // Small delay between messages to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

async function sendTelegramMessage(botToken: string, chatId: string, message: string): Promise<void> {
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
    console.error('Telegram send error:', error)
  }
}

export async function closeCurrentCycleAndCreateNew(cycleId: string): Promise<void> {
  const supabase = getSupabase()

  // Get current cycle to calculate next dates
  const cycles = await getCycles()
  const currentCycle = cycles.find(c => c.id === cycleId)

  if (!currentCycle) return

  if (supabase) {
    await supabase
      .from('week_cycles')
      .update({ status: 'closed', report_sent: true } as never)
      .eq('id', cycleId)

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
  }
}

export async function getCycles(): Promise<WeekCycle[]> {
  const supabase = getSupabase()

  if (!supabase) {
    return getWeekCycles()
  }

  const { data: cycles } = await supabase
    .from('week_cycles')
    .select('*')
    .order('start_date', { ascending: false })

  return (cycles || []) as WeekCycle[]
}