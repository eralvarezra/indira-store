import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getOrders, createOrder } from '@/lib/demo-store'
import { OrderItem, SHIPPING_METHODS, ShippingMethodKey } from '@/types/database.types'

interface OrderRequest {
  customer_name: string
  phone: string
  email?: string | null
  items: OrderItem[]
  total: number
  // Shipping fields
  province?: string | null
  canton?: string | null
  district?: string | null
  exact_address?: string | null
  shipping_method: ShippingMethodKey
  shipping_cost: number
  // Payment fields
  payment_method?: string | null
  // Billing fields
  billing_same_as_shipping: boolean
  billing_name?: string | null
  billing_province?: string | null
  billing_canton?: string | null
  billing_district?: string | null
  billing_exact_address?: string | null
}

// Generate sequential order number
async function generateOrderNumber(supabase: ReturnType<typeof getSupabase>): Promise<string> {
  if (!supabase) {
    // Demo mode: generate random number
    return `ORD${Date.now().toString().slice(-6)}`
  }

  // Get the max order number from database
  const { data, error } = await supabase
    .from('orders')
    .select('order_number')
    .order('order_number', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    // First order
    return 'ORD000001'
  }

  const lastNumber = (data as { order_number: string }).order_number
  const numericPart = parseInt(lastNumber.replace('ORD', ''), 10)
  const nextNumber = numericPart + 1

  return `ORD${nextNumber.toString().padStart(6, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('search')

    if (!supabase) {
      // Return orders from demo store
      return NextResponse.json({ orders: getOrders() })
    }

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by order number search
    if (searchTerm) {
      query = query.or(`order_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
    }

    const { data: orders, error } = await query

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

    // Validate shipping address if not pickup
    if (body.shipping_method !== 'pickup') {
      if (!body.province || !body.canton || !body.district || !body.exact_address) {
        return NextResponse.json(
          { error: 'Shipping address is required for delivery' },
          { status: 400 }
        )
      }
    }

    // Validate payment method
    if (!body.payment_method) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      )
    }

    // Ensure all items have a type
    const processedItems: OrderItem[] = body.items.map(item => ({
      ...item,
      type: item.type || 'in_stock' // Default to in_stock if not provided
    }))

    const supabase = getSupabase()

    // Calculate totals
    const totalWithShipping = body.total + body.shipping_cost

    // Check if this is a pre-order (contains any pre-order items)
    const hasPreOrderItems = processedItems.some(item => item.type === 'pre_order')

    // Calculate advance payment: 50% for pre-orders, 100% for regular orders
    const advancePayment = hasPreOrderItems ? Math.ceil(totalWithShipping * 0.5) : totalWithShipping

    // Generate order number
    const orderNumber = await generateOrderNumber(supabase)

    if (!supabase) {
      // Demo mode: Create order with week cycle
      const order = createOrder({
        customer_name: body.customer_name,
        phone: body.phone,
        items: processedItems,
        total: totalWithShipping,
        status: 'pending',
        order_number: orderNumber,
      })
      await sendTelegramNotification({ ...body, items: processedItems, orderNumber, totalWithShipping, isPreOrder: hasPreOrderItems })
      return NextResponse.json({ success: true, order, orderNumber, isPreOrder: hasPreOrderItems, advancePayment })
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

    // Build order object with all fields
    const orderData = {
      order_number: orderNumber,
      customer_name: body.customer_name,
      phone: body.phone,
      email: body.email,
      items: processedItems,
      total: body.total,
      total_with_shipping: totalWithShipping,
      amount_paid: 0,
      advance_payment: advancePayment,
      status: 'pending',
      week_cycle_id: weekCycleId,
      // Shipping
      province: body.shipping_method !== 'pickup' ? body.province : null,
      canton: body.shipping_method !== 'pickup' ? body.canton : null,
      district: body.shipping_method !== 'pickup' ? body.district : null,
      exact_address: body.shipping_method !== 'pickup' ? body.exact_address : null,
      shipping_method: body.shipping_method,
      shipping_cost: body.shipping_cost,
      // Payment
      payment_method: body.payment_method,
      // Billing
      billing_same_as_shipping: body.billing_same_as_shipping,
      billing_name: body.billing_same_as_shipping ? null : body.billing_name,
      billing_province: body.billing_same_as_shipping ? null : body.billing_province,
      billing_canton: body.billing_same_as_shipping ? null : body.billing_canton,
      billing_district: body.billing_same_as_shipping ? null : body.billing_district,
      billing_exact_address: body.billing_same_as_shipping ? null : body.billing_exact_address,
    }

    // Insert order into database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData as never)
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
    await sendTelegramNotification({ ...body, items: processedItems, orderNumber, totalWithShipping, isPreOrder: hasPreOrderItems })

    return NextResponse.json({
      success: true,
      order,
      orderNumber,
      isPreOrder: hasPreOrderItems,
      advancePayment,
      totalWithShipping
    })
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

interface TelegramNotification extends OrderRequest {
  orderNumber: string
  totalWithShipping: number
  isPreOrder: boolean
}

async function sendTelegramNotification(order: TelegramNotification) {
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
    itemsList += formatItems(inStockItems, '✅ En Stock') + '\n'
  }
  if (preOrderItems.length > 0) {
    itemsList += formatItems(preOrderItems, '📦 Pre-pedido') + '\n'
  }

  // Get shipping method info
  const shippingMethod = SHIPPING_METHODS[order.shipping_method]
  const shippingInfo = order.shipping_method === 'pickup'
    ? '📦 Recoger en tienda'
    : `🚚 ${shippingMethod.name} - ${order.province}, ${order.canton}, ${order.district}`

  // Payment status for pre-orders
  const paymentInfo = order.isPreOrder
    ? `\n\n⚠️ *PRE-PEDIDO DETECTADO*\n💰 *Adelanto requerido (50%):* ₡${order.advancePayment?.toFixed(2) || (order.totalWithShipping * 0.5).toFixed(2)}\n💵 *Restante:* ₡${((order.totalWithShipping * 0.5)).toFixed(2)}`
    : ''

  // Build notification message
  const message = `
🚨 *NUEVO PEDIDO RECIBIDO!*

🏷️ *Orden:* \`${order.orderNumber}\`

👤 *Cliente:* ${order.customer_name}
📱 *Teléfono:* ${order.phone}
${order.email ? `📧 *Email:* ${order.email}` : ''}

📦 *Productos:*
${itemsList}
📊 *Cantidad:* ${totalItems} artículos
💰 *Subtotal:* ₡${order.total.toFixed(2)}

🚚 *Envío:* ${shippingInfo}
💵 *Costo envío:* ${order.shipping_cost === 0 ? 'Gratis' : `₡${order.shipping_cost.toFixed(2)}`}

💰 *TOTAL:* ₡${order.totalWithShipping.toFixed(2)}

💳 *Método de pago:* ${order.payment_method || 'No especificado'}
${order.isPreOrder ? `\n💸 *Adelanto requerido:* ₡${order.advancePayment?.toFixed(2) || (order.totalWithShipping * 0.5).toFixed(2)} (50%)` : ''}

${order.shipping_method !== 'pickup' ? `
📍 *Dirección de entrega:*
${order.exact_address}
${order.district}, ${order.canton}, ${order.province}
` : ''}

${!order.billing_same_as_shipping ? `
📄 *Dirección de facturación:*
${order.billing_name}
${order.billing_exact_address}
${order.billing_district}, ${order.billing_canton}, ${order.billing_province}
` : ''}
${paymentInfo}
⚡ *Acción:* Contactar cliente para confirmar${order.isPreOrder ? ' y recibir adelanto.' : '.'}
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