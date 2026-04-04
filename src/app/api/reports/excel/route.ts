import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getSupabase } from '@/lib/supabase/api'
import { getOrders, getWeekCycles } from '@/lib/demo-store'

interface OrderItem {
  product_id: string
  name: string
  price: number
  quantity: number
  type: 'in_stock' | 'pre_order'
}

interface Order {
  id: string
  customer_name: string
  phone: string
  items: OrderItem[]
  total: number
  status: string
  week_cycle_id: string | null
  created_at: string
}

// GET - Download Excel report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cycleId = searchParams.get('cycleId')

    const supabase = getSupabase()

    let orders: Order[] = []

    if (!supabase) {
      orders = getOrders() as Order[]
    } else {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (cycleId) {
        query = query.eq('week_cycle_id', cycleId)
      }

      const { data, error } = await query

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
      }

      orders = (data || []) as Order[]
    }

    // Filter orders that have at least one pre-order item
    const preOrderOrders = orders.filter(order =>
      order.items.some(item => item.type === 'pre_order')
    )

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // Sheet 1: Pre-order Orders Summary
    const ordersData = preOrderOrders.map((order, index) => ({
      'No.': index + 1,
      'ID del Pedido': order.id.substring(0, 8),
      'Cliente': order.customer_name,
      'Teléfono': order.phone,
      'Total': order.total,
      'Estado': order.status === 'pending' ? 'Pendiente' : order.status === 'confirmed' ? 'Confirmado' : 'Cancelado',
      'Fecha': new Date(order.created_at).toLocaleDateString('es-CR'),
      'Hora': new Date(order.created_at).toLocaleTimeString('es-CR'),
    }))

    const ordersSheet = XLSX.utils.json_to_sheet(ordersData)
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Pedidos Pre-pedido')

    // Sheet 2: Pre-order Products Summary (only pre-order items)
    const productCounts: Record<string, { quantity: number; revenue: number }> = {}

    preOrderOrders.forEach(order => {
      order.items.forEach(item => {
        // Only count pre-order items
        if (item.type === 'pre_order') {
          if (!productCounts[item.name]) {
            productCounts[item.name] = { quantity: 0, revenue: 0 }
          }
          productCounts[item.name].quantity += item.quantity
          productCounts[item.name].revenue += item.price * item.quantity
        }
      })
    })

    const productsData = Object.entries(productCounts)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .map(([name, data], index) => ({
        'No.': index + 1,
        'Producto': name,
        'Cantidad': data.quantity,
        'Ingresos': data.revenue,
      }))

    const productsSheet = XLSX.utils.json_to_sheet(productsData)
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Productos a Comprar')

    // Sheet 3: Summary
    const totalRevenue = preOrderOrders.reduce((sum, o) => sum + o.total, 0)
    const pendingOrders = preOrderOrders.filter(o => o.status === 'pending').length
    const confirmedOrders = preOrderOrders.filter(o => o.status === 'confirmed').length
    const cancelledOrders = preOrderOrders.filter(o => o.status === 'cancelled').length
    const preOrderItems = preOrderOrders.flatMap(o => o.items).filter(i => i.type === 'pre_order').reduce((sum, i) => sum + i.quantity, 0)

    const summaryData = [
      { 'Métrica': 'Pedidos con Pre-pedido', 'Valor': preOrderOrders.length },
      { 'Métrica': 'Pedidos Pendientes', 'Valor': pendingOrders },
      { 'Métrica': 'Pedidos Confirmados', 'Valor': confirmedOrders },
      { 'Métrica': 'Pedidos Cancelados', 'Valor': cancelledOrders },
      { 'Métrica': 'Total Productos Pre-pedido', 'Valor': preOrderItems },
      { 'Métrica': 'Ingresos Totales', 'Valor': `₡${totalRevenue.toFixed(2)}` },
    ]

    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Return as download
    const date = new Date().toISOString().split('T')[0]
    const filename = `reporte-indira-${date}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Excel generation error:', error)
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 })
  }
}