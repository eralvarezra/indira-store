import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'

// Stock movement types
type MovementType = 'hold' | 'release' | 'confirm' | 'adjustment'

interface StockMovement {
  product_id?: string
  variant_id?: string
  order_id?: string
  movement_type: MovementType
  quantity: number
  notes?: string
}

// Helper to get effective stock (available = stock - stock_hold)
export function getAvailableStock(stock: number, stockHold: number): number {
  return Math.max(0, stock - stockHold)
}

// Reserve stock for an order
export async function holdStock(
  supabase: ReturnType<typeof getSupabase>,
  items: Array<{ product_id: string; variant_id?: string; quantity: number }>,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: true }

  for (const item of items) {
    if (item.variant_id) {
      // Hold variant stock
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('stock, stock_hold')
        .eq('id', item.variant_id)
        .single()

      if (variantError || !variant) {
        console.error('Error fetching variant:', variantError)
        continue
      }

      const variantData = variant as { stock: number; stock_hold?: number }
      const newHold = (variantData.stock_hold || 0) + item.quantity

      if (newHold > variantData.stock) {
        // Not enough stock - but allow pre-order (stock can be less than hold)
      }

      await supabase
        .from('product_variants')
        .update({ stock_hold: newHold } as never)
        .eq('id', item.variant_id)

      // Record movement
      await supabase
        .from('stock_movements')
        .insert({
          variant_id: item.variant_id,
          order_id: orderId,
          movement_type: 'hold',
          quantity: item.quantity,
          previous_stock: variantData.stock,
          previous_hold: variantData.stock_hold || 0,
          new_stock: variantData.stock,
          new_hold: newHold,
        } as never)
    } else {
      // Hold product stock
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock, stock_hold')
        .eq('id', item.product_id)
        .single()

      if (productError || !product) {
        console.error('Error fetching product:', productError)
        continue
      }

      const productData = product as { stock: number; stock_hold?: number }
      const newHold = (productData.stock_hold || 0) + item.quantity

      await supabase
        .from('products')
        .update({ stock_hold: newHold } as never)
        .eq('id', item.product_id)

      // Record movement
      await supabase
        .from('stock_movements')
        .insert({
          product_id: item.product_id,
          order_id: orderId,
          movement_type: 'hold',
          quantity: item.quantity,
          previous_stock: productData.stock,
          previous_hold: productData.stock_hold || 0,
          new_stock: productData.stock,
          new_hold: newHold,
        } as never)
    }
  }

  return { success: true }
}

// Release stock (when order is cancelled)
export async function releaseStock(
  supabase: ReturnType<typeof getSupabase>,
  items: Array<{ product_id: string; variant_id?: string; quantity: number }>,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: true }

  for (const item of items) {
    if (item.variant_id) {
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('stock, stock_hold')
        .eq('id', item.variant_id)
        .single()

      if (variantError || !variant) continue

      const variantData = variant as { stock: number; stock_hold?: number }
      const newHold = Math.max(0, (variantData.stock_hold || 0) - item.quantity)

      await supabase
        .from('product_variants')
        .update({ stock_hold: newHold } as never)
        .eq('id', item.variant_id)

      await supabase
        .from('stock_movements')
        .insert({
          variant_id: item.variant_id,
          order_id: orderId,
          movement_type: 'release',
          quantity: item.quantity,
          previous_stock: variantData.stock,
          previous_hold: variantData.stock_hold || 0,
          new_stock: variantData.stock,
          new_hold: newHold,
          notes: 'Order cancelled',
        } as never)
    } else {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock, stock_hold')
        .eq('id', item.product_id)
        .single()

      if (productError || !product) continue

      const productData = product as { stock: number; stock_hold?: number }
      const newHold = Math.max(0, (productData.stock_hold || 0) - item.quantity)

      await supabase
        .from('products')
        .update({ stock_hold: newHold } as never)
        .eq('id', item.product_id)

      await supabase
        .from('stock_movements')
        .insert({
          product_id: item.product_id,
          order_id: orderId,
          movement_type: 'release',
          quantity: item.quantity,
          previous_stock: productData.stock,
          previous_hold: productData.stock_hold || 0,
          new_stock: productData.stock,
          new_hold: newHold,
          notes: 'Order cancelled',
        } as never)
    }
  }

  return { success: true }
}

// Confirm stock deduction (when order is delivered)
export async function confirmStock(
  supabase: ReturnType<typeof getSupabase>,
  items: Array<{ product_id: string; variant_id?: string; quantity: number }>,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: true }

  for (const item of items) {
    if (item.variant_id) {
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('stock, stock_hold')
        .eq('id', item.variant_id)
        .single()

      if (variantError || !variant) continue

      const variantData = variant as { stock: number; stock_hold?: number }
      const newStock = Math.max(0, variantData.stock - item.quantity)
      const newHold = Math.max(0, (variantData.stock_hold || 0) - item.quantity)

      await supabase
        .from('product_variants')
        .update({ stock: newStock, stock_hold: newHold } as never)
        .eq('id', item.variant_id)

      await supabase
        .from('stock_movements')
        .insert({
          variant_id: item.variant_id,
          order_id: orderId,
          movement_type: 'confirm',
          quantity: item.quantity,
          previous_stock: variantData.stock,
          previous_hold: variantData.stock_hold || 0,
          new_stock: newStock,
          new_hold: newHold,
          notes: 'Order delivered',
        } as never)
    } else {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock, stock_hold')
        .eq('id', item.product_id)
        .single()

      if (productError || !product) continue

      const productData = product as { stock: number; stock_hold?: number }
      const newStock = Math.max(0, productData.stock - item.quantity)
      const newHold = Math.max(0, (productData.stock_hold || 0) - item.quantity)

      await supabase
        .from('products')
        .update({ stock: newStock, stock_hold: newHold } as never)
        .eq('id', item.product_id)

      await supabase
        .from('stock_movements')
        .insert({
          product_id: item.product_id,
          order_id: orderId,
          movement_type: 'confirm',
          quantity: item.quantity,
          previous_stock: productData.stock,
          previous_hold: productData.stock_hold || 0,
          new_stock: newStock,
          new_hold: newHold,
          notes: 'Order delivered',
        } as never)
    }
  }

  return { success: true }
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('product_id')
  const variantId = searchParams.get('variant_id')

  try {
    let query = supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (productId) {
      query = query.eq('product_id', productId)
    }
    if (variantId) {
      query = query.eq('variant_id', variantId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stock movements' }, { status: 500 })
    }

    return NextResponse.json({ movements: data })
  } catch (error) {
    console.error('Stock movements fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Manual stock adjustment endpoint
export async function POST(request: NextRequest) {
  const supabase = getSupabase()

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { product_id, variant_id, adjustment, notes } = body

    if (!product_id && !variant_id) {
      return NextResponse.json({ error: 'product_id or variant_id required' }, { status: 400 })
    }

    const table = variant_id ? 'product_variants' : 'products'
    const id = variant_id || product_id
    const idField = variant_id ? 'variant_id' : 'product_id'

    // Get current stock
    const { data: current, error: fetchError } = await supabase
      .from(table)
      .select('stock, stock_hold')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const currentData = current as { stock: number; stock_hold?: number }
    const newStock = Math.max(0, currentData.stock + adjustment)

    // Update stock
    const { error: updateError } = await supabase
      .from(table)
      .update({ stock: newStock } as never)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 })
    }

    // Record movement
    await supabase
      .from('stock_movements')
      .insert({
        [idField]: id,
        movement_type: 'adjustment',
        quantity: adjustment,
        previous_stock: currentData.stock,
        previous_hold: currentData.stock_hold || 0,
        new_stock: newStock,
        new_hold: currentData.stock_hold || 0,
        notes: notes || 'Manual adjustment',
      } as never)

    return NextResponse.json({ success: true, newStock })
  } catch (error) {
    console.error('Stock adjustment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}