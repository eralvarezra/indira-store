import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { bulkUpdateDiscount } from '@/lib/demo-store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds, discountPercentage } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'No products selected' }, { status: 400 })
    }

    if (typeof discountPercentage !== 'number' || discountPercentage < 0 || discountPercentage > 100) {
      return NextResponse.json({ error: 'Invalid discount percentage (must be 0-100)' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (!supabase) {
      // Demo mode
      bulkUpdateDiscount(productIds, discountPercentage)
      return NextResponse.json({ success: true, updated: productIds.length })
    }

    // Update all products in Supabase
    const { error } = await supabase
      .from('products')
      .update({ discount_percentage: discountPercentage } as never)
      .in('id', productIds)

    if (error) {
      console.error('Bulk discount update error:', error)
      return NextResponse.json({ error: 'Failed to update discounts' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: productIds.length })
  } catch (error) {
    console.error('Discount update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}