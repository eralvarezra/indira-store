import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getOrders, updateOrder, updateProductStock, getProduct } from '@/lib/demo-store'

interface OrderItem {
  product_id: string
  name: string
  price: number
  quantity: number
}

interface OrderData {
  id: string
  items: OrderItem[]
  status: string
  customer_name: string
  phone: string
  total: number
  created_at: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    if (!supabase) {
      const orders = getOrders()
      const order = orders.find(o => o.id === id)
      if (order) {
        return NextResponse.json({ order })
      }
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Order fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['pending', 'confirmed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (!supabase) {
      // Demo mode
      const orders = getOrders()
      const existingOrder = orders.find(o => o.id === id)
      if (!existingOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const order = updateOrder(id, { status })
      if (order) {
        await handleStockChange(order.items as OrderItem[], status)
      }

      return NextResponse.json({ success: true, order })
    }

    // Get current order
    const { data: currentOrderData, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentOrderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const currentOrder = currentOrderData as OrderData

    // Update order status
    const { data: order, error } = await supabase
      .from('orders')
      .update({ status } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    // Handle stock based on status change
    await handleStockChangeSupabase(supabase, currentOrder.items, status)

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Order update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle stock changes in demo mode
async function handleStockChange(
  items: OrderItem[],
  newStatus: string
) {
  for (const item of items) {
    const product = getProduct(item.product_id)
    if (!product) continue

    let newStock = product.stock

    if (newStatus === 'confirmed') {
      // Reduce stock permanently (already reserved, keep the reduction)
      // Stock was already reduced when order was created
    } else if (newStatus === 'cancelled') {
      // Return stock (add back)
      newStock = product.stock + item.quantity
      updateProductStock(item.product_id, newStock)
    }
  }
}

// Handle stock changes with Supabase
async function handleStockChangeSupabase(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  items: OrderItem[],
  newStatus: string
) {
  for (const item of items) {
    // Get current product stock
    const { data: productData } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single()

    if (!productData) continue

    const currentStock = (productData as { stock: number }).stock
    let newStock = currentStock

    if (newStatus === 'confirmed') {
      // Stock was already reserved, keep the reduction
      // No need to change anything
    } else if (newStatus === 'cancelled') {
      // Return stock (add back)
      newStock = currentStock + item.quantity

      await supabase
        .from('products')
        .update({ stock: newStock } as never)
        .eq('id', item.product_id)
    }
  }
}