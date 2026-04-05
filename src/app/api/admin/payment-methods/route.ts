import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getSupabase } from '@/lib/supabase/api'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface PaymentMethod {
  id: string
  name: string
  description: string | null
  instructions: string | null
  account_info: string | null
  is_active: boolean
  sort_order: number
}

function verifyAuth(request: NextRequest): boolean {
  const token = request.cookies.get('admin_token')?.value
  if (!token) return false

  try {
    jwt.verify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ paymentMethods: [] })
    }

    const { data: paymentMethods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching payment methods:', error)
      return NextResponse.json({ paymentMethods: [] })
    }

    return NextResponse.json({ paymentMethods })
  } catch (error) {
    console.error('Payment methods fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, paymentMethod } = body

    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ success: true })
    }

    if (action === 'create') {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          name: paymentMethod.name,
          description: paymentMethod.description || null,
          instructions: paymentMethod.instructions || null,
          account_info: paymentMethod.account_info || null,
          is_active: paymentMethod.is_active ?? true,
          sort_order: paymentMethod.sort_order || 0,
        } as never)
        .select()
        .single()

      if (error) {
        console.error('Error creating payment method:', error)
        return NextResponse.json({ error: 'Failed to create payment method' }, { status: 500 })
      }

      return NextResponse.json({ success: true, paymentMethod: data })
    }

    if (action === 'update') {
      const { data, error } = await supabase
        .from('payment_methods')
        .update({
          name: paymentMethod.name,
          description: paymentMethod.description || null,
          instructions: paymentMethod.instructions || null,
          account_info: paymentMethod.account_info || null,
          is_active: paymentMethod.is_active,
          sort_order: paymentMethod.sort_order,
        } as never)
        .eq('id', paymentMethod.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating payment method:', error)
        return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 })
      }

      return NextResponse.json({ success: true, paymentMethod: data })
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentMethod.id)

      if (error) {
        console.error('Error deleting payment method:', error)
        return NextResponse.json({ error: 'Failed to delete payment method' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Payment methods update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}