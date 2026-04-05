import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'

export async function GET() {
  try {
    const supabase = getSupabase()

    if (!supabase) {
      // Return default payment methods if no database connection
      return NextResponse.json({
        paymentMethods: [
          { id: 'default-sinpe', name: 'Sinpe Móvil', description: 'Pago rápido mediante Sinpe Móvil', instructions: 'Envía el monto exacto al número:', account_info: '8888-8888', is_active: true, sort_order: 1 },
          { id: 'default-transfer', name: 'Transferencia Bancaria', description: 'Transferencia a cuenta bancaria', instructions: 'Realiza la transferencia a:', account_info: 'Banco Nacional - Cuenta: 1234-5678-90', is_active: true, sort_order: 2 }
        ]
      })
    }

    const { data: paymentMethods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching payment methods:', error)
      return NextResponse.json({ paymentMethods: [] })
    }

    return NextResponse.json({ paymentMethods })
  } catch (error) {
    console.error('Payment methods fetch error:', error)
    return NextResponse.json({ paymentMethods: [] })
  }
}