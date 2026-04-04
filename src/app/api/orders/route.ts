import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getOrders, createOrder, getCurrentWeekCycle } from '@/lib/demo-store'
import { OrderItem } from '@/types/database.types'

interface OrderRequest {
  customer_name: string
  phone: string
  items: OrderItem[]
  total: number
}

export async function GET() {
  try {
    const supabase = getSupabase()

    if (!supabase) {
      // Return orders from demo store
      return NextResponse.json({ orders: getOrders() })
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderRequest = await request.json()

    // Validate required fields
    if (!body.customer_name || !body.phone || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate phone number - must have at least 8 digits
    const cleanPhone = body.phone.replace(/\D/g, '')
    if (cleanPhone.length < 8) {
      return NextResponse.json(
        { error: 'Invalid phone number - must have at least 8 digits' },
        { status: 400 }
      )
    }

    // Ensure all items have a type
    const processedItems: OrderItem[] = body.items.map(item => ({
      ...item,
      type: item.type || 'in_stock' // Default to in_stock if not provided
    }))

    const supabase = getSupabase()

    if (!supabase) {
      // Demo mode: Create order with week cycle
      const order = createOrder({
        customer_name: body.customer_name,
        phone: body.phone,
        items: processedItems,
        total: body.total,
        status: 'pending',
      })
      await sendTelegramNotification({ ...body, items: processedItems })
      return NextResponse.json({ success: true, order })
    }

    // Get or create current week cycle
    const weekCycleId = await getOrCreateCurrentWeekCycle(supabase)

    // Process each item - check stock and determine type
    for (const item of processedItems) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single()

      if (product) {
        const currentStock = (product as { stock: number }).stock
        // Determine type based on stock
        if (currentStock === 0) {
          item.type = 'pre_order'
        } else if (currentStock < item.quantity) {
          return NextResponse.json(
            { error: `No hay suficiente stock de ${item.name}. Disponible: ${currentStock}` },
            { status: 400 }
          )
        } else {
          item.type = 'in_stock'
        }
      }
    }

    // Insert order into database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: body.customer_name,
        phone: body.phone,
        items: processedItems,
        total: body.total,
        status: 'pending',
        week_cycle_id: weekCycleId,
      } as never)
      .select()
      .single()

    if (orderError) {
      console.error('Order insertion error:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Reserve stock for in_stock items only
    for (const item of processedItems) {
      if (item.type === 'in_stock') {
        const { data: productData } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single()

        if (productData) {
          const currentStock = (productData as { stock: number }).stock
          const newStock = Math.max(0, currentStock - item.quantity)

          await supabase
            .from('products')
            .update({ stock: newStock } as never)
            .eq('id', item.product_id)
        }
      }
    }

    // Send Telegram notification
    await sendTelegramNotification({ ...body, items: processedItems })

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Order processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to get or create current week cycle
async function getOrCreateCurrentWeekCycle(supabase: ReturnType<typeof getSupabase>): Promise<string> {
  if (!supabase) throw new Error('Supabase client not available')

  const now = new Date()

  // Calculate current week cycle (Saturday 00:00 to Friday 23:59)
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
    .select('id')
    .eq('status', 'open')
    .lte('start_date', now.toISOString())
    .gte('end_date', now.toISOString())
    .single()

  if (existingCycle) {
    return (existingCycle as { id: string }).id
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

  if (error || !newCycle) {
    throw new Error('Failed to create week cycle')
  }

  return (newCycle as { id: string }).id
}

async function sendTelegramNotification(order: OrderRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('Telegram credentials not configured')
    return
  }

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)

  // Separate items by type
  const inStockItems = order.items.filter(item => item.type === 'in_stock')
  const preOrderItems = order.items.filter(item => item.type === 'pre_order')

  const formatItems = (items: OrderItem[], typeLabel: string) =>
    items.map(item => `• ${item.name} x${item.quantity} (${typeLabel})`).join('\n')

  let itemsList = ''
  if (inStockItems.length > 0) {
    itemsList += formatItems(inStockItems, 'En Stock') + '\n'
  }
  if (preOrderItems.length > 0) {
    itemsList += formatItems(preOrderItems, '📦 Pre-order')
  }

  const message = `
🚨 *NEW ORDER RECEIVED!*

👤 *Customer:* ${order.customer_name}
📱 *Phone:* ${order.phone}

📦 *Items:*
${itemsList}

📊 *Total Items:* ${totalItems}
💰 *Total:* ₡${order.total.toFixed(2)} CRC

${preOrderItems.length > 0 ? '⚠️ *Note:* This order contains pre-order items (out of stock)' : ''}
⚡ *Action:* Contact customer to confirm.
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
    console.error('Telegram notification error:', error)
  }
}