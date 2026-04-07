import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getOrders, updateOrder, updateProductStock, getProduct, deleteOrder } from '@/lib/demo-store'
import { releaseStock, confirmStock } from '@/app/api/stock/route'

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
    const { status, amount_paid } = body

    // Validate that at least one field is provided
    if (status === undefined && amount_paid === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Validate status if provided
    if (status !== undefined && !['pending', 'confirmed', 'cancelled'].includes(status)) {
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

      const updateData: Record<string, unknown> = {}
      if (status) updateData.status = status
      if (amount_paid !== undefined) updateData.amount_paid = amount_paid

      const order = updateOrder(id, updateData)
      if (order && status) {
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

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (amount_paid !== undefined) updateData.amount_paid = amount_paid

    // Update order
    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    // Handle stock based on status change
    if (status) {
      await handleStockChangeSupabase(supabase, id, currentOrder.items, status)
    }

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

// Handle stock changes with Supabase using hold system
async function handleStockChangeSupabase(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  orderId: string,
  items: OrderItem[],
  newStatus: string
) {
  // Convert items to stock items format
  const stockItems = items.map(item => ({
    product_id: item.product_id,
    variant_id: ((item as { variant_id?: string | null }).variant_id) || undefined,
    quantity: item.quantity
  }))

  if (newStatus === 'confirmed') {
    // Order delivered - reduce stock permanently and release hold
    await confirmStock(supabase, stockItems, orderId)
  } else if (newStatus === 'cancelled') {
    // Order cancelled - release hold and return stock
    await releaseStock(supabase, stockItems, orderId)
  }
}

// PUT - Edit order (customer_name, phone, items)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { customer_name, phone, items, total } = body

    if (!customer_name || !phone || !items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (!supabase) {
      // Demo mode
      const order = updateOrder(id, { customer_name, phone, items, total })
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, order })
    }

    // Update in Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .update({ customer_name, phone, items, total } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Order edit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    if (!supabase) {
      // Demo mode
      const deleted = deleteOrder(id)
      if (!deleted) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }

    // Delete in Supabase
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}