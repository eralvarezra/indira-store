import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getOrders, createOrder } from '@/lib/demo-store'

interface OrderItem {
  product_id: string
  name: string
  price: number
  quantity: number
}

interface OrderRequest {
  customer_name: string
  phone: string
  items: OrderItem[]
  total: number
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

    const supabase = getSupabase()

    if (!supabase) {
      // Create order in demo store (stock is automatically reserved in createOrder)
      const order = createOrder({
        customer_name: body.customer_name,
        phone: body.phone,
        items: body.items,
        total: body.total,
        status: 'pending',
      })
      await sendTelegramNotification(body)
      return NextResponse.json({ success: true, order })
    }

    // Check stock availability before creating order
    for (const item of body.items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single()

      if (product) {
        const currentStock = (product as { stock: number }).stock
        if (currentStock < item.quantity) {
          return NextResponse.json(
            { error: `No hay suficiente stock de ${item.name}. Disponible: ${currentStock}` },
            { status: 400 }
          )
        }
      }
    }

    // Insert order into database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: body.customer_name,
        phone: body.phone,
        items: body.items,
        total: body.total,
        status: 'pending',
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

    // Reserve stock for pending order (reduce stock)
    for (const item of body.items) {
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

    // Send Telegram notification
    await sendTelegramNotification(body)

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Order processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
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

async function sendTelegramNotification(order: OrderRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('Telegram credentials not configured')
    return
  }

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)

  const itemsList = order.items
    .map((item) => `• ${item.name} x${item.quantity}`)
    .join('\n')

  const message = `
🚨 *New Order Received!*

👤 *Customer:* ${order.customer_name}
📱 *Phone:* ${order.phone}

📦 *Items:*
${itemsList}

📊 *Total Items:* ${totalItems}
💰 *Total:* ₡${order.total.toFixed(2)} CRC

⚡ *Action:* Contact this customer ASAP.
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