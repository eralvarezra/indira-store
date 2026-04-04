// In-memory store for demo mode (no Supabase)
// This allows CRUD operations in demo mode

export interface DemoProduct {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  stock: number
  discount_percentage: number
  category: string | null
  created_at: string
}

export interface DemoOrderItem {
  product_id: string
  name: string
  price: number
  quantity: number
  type: 'in_stock' | 'pre_order'
}

export interface DemoOrder {
  id: string
  customer_name: string
  phone: string
  items: DemoOrderItem[]
  total: number
  status: string
  week_cycle_id: string | null
  created_at: string
}

export interface DemoWeekCycle {
  id: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  report_sent: boolean
  created_at: string
  updated_at: string
}

// Initial sample products
const initialProducts: DemoProduct[] = [
  {
    id: '1',
    name: 'Producto de Ejemplo 1',
    description: 'Descripción del producto de ejemplo',
    price: 199.99,
    image_url: 'https://via.placeholder.com/400',
    stock: 10,
    discount_percentage: 0,
    category: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Producto de Ejemplo 2',
    description: 'Otro producto de ejemplo',
    price: 299.99,
    image_url: 'https://via.placeholder.com/400',
    stock: 5,
    discount_percentage: 0,
    category: null,
    created_at: new Date().toISOString(),
  },
]

// In-memory stores
let products: DemoProduct[] = [...initialProducts]
let orders: DemoOrder[] = []
let weekCycles: DemoWeekCycle[] = []

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

// Products CRUD
export function getProducts(): DemoProduct[] {
  return products.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function getProduct(id: string): DemoProduct | null {
  return products.find(p => p.id === id) || null
}

export function createProduct(data: Omit<DemoProduct, 'id' | 'created_at'>): DemoProduct {
  const product: DemoProduct = {
    ...data,
    discount_percentage: data.discount_percentage || 0,
    category: data.category || null,
    id: generateId(),
    created_at: new Date().toISOString(),
  }
  products.unshift(product)
  return product
}

export function updateProduct(id: string, data: Partial<DemoProduct>): DemoProduct | null {
  const index = products.findIndex(p => p.id === id)
  if (index === -1) return null

  products[index] = { ...products[index], ...data }
  return products[index]
}

export function deleteProduct(id: string): boolean {
  const index = products.findIndex(p => p.id === id)
  if (index === -1) return false
  products.splice(index, 1)
  return true
}

export function updateProductStock(id: string, stock: number): DemoProduct | null {
  const index = products.findIndex(p => p.id === id)
  if (index === -1) return null
  products[index] = { ...products[index], stock }
  return products[index]
}

export function updateProductDiscount(id: string, discountPercentage: number): DemoProduct | null {
  const index = products.findIndex(p => p.id === id)
  if (index === -1) return null
  products[index] = { ...products[index], discount_percentage: discountPercentage }
  return products[index]
}

export function bulkUpdateDiscount(productIds: string[], discountPercentage: number): void {
  for (const id of productIds) {
    const index = products.findIndex(p => p.id === id)
    if (index !== -1) {
      products[index] = { ...products[index], discount_percentage: discountPercentage }
    }
  }
}

// Orders CRUD
export function getOrders(): DemoOrder[] {
  return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function getOrder(id: string): DemoOrder | null {
  return orders.find(o => o.id === id) || null
}

export function createOrder(data: Omit<DemoOrder, 'id' | 'created_at' | 'week_cycle_id'>): DemoOrder {
  // Get or create current week cycle
  const currentCycle = getCurrentWeekCycle()

  const order: DemoOrder = {
    ...data,
    id: generateId(),
    week_cycle_id: currentCycle.id,
    created_at: new Date().toISOString(),
  }
  orders.unshift(order)

  // Reserve stock for pending orders (only for in_stock items)
  if (order.status === 'pending') {
    for (const item of order.items) {
      if (item.type === 'in_stock') {
        const product = getProduct(item.product_id)
        if (product) {
          const newStock = Math.max(0, product.stock - item.quantity)
          updateProductStock(item.product_id, newStock)
        }
      }
    }
  }

  return order
}

export function updateOrder(id: string, data: Partial<DemoOrder>): DemoOrder | null {
  const index = orders.findIndex(o => o.id === id)
  if (index === -1) return null
  orders[index] = { ...orders[index], ...data }
  return orders[index]
}

// Week Cycles CRUD
export function getWeekCycles(): DemoWeekCycle[] {
  return weekCycles.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
}

export function getCurrentWeekCycle(): DemoWeekCycle {
  const now = new Date()

  // Find existing open cycle
  const existingCycle = weekCycles.find(c =>
    c.status === 'open' &&
    new Date(c.start_date) <= now &&
    new Date(c.end_date) >= now
  )

  if (existingCycle) return existingCycle

  // Calculate current week cycle (Saturday to Friday)
  const dayOfWeek = now.getDay()
  const daysSinceSaturday = (dayOfWeek + 1) % 7 // 0 = Saturday, 1 = Sunday, etc.
  const startDate = new Date(now)
  startDate.setDate(now.getDate() - daysSinceSaturday)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)
  endDate.setHours(23, 59, 59, 999)

  // Create new cycle
  const newCycle: DemoWeekCycle = {
    id: generateId(),
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    status: 'open',
    report_sent: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }

  weekCycles.push(newCycle)
  return newCycle
}

export function createWeekCycle(startDate: Date, endDate: Date): DemoWeekCycle {
  const cycle: DemoWeekCycle = {
    id: generateId(),
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    status: 'open',
    report_sent: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  weekCycles.push(cycle)
  return cycle
}

export function closeWeekCycle(id: string): DemoWeekCycle | null {
  const index = weekCycles.findIndex(c => c.id === id)
  if (index === -1) return null

  weekCycles[index] = {
    ...weekCycles[index],
    status: 'closed',
    report_sent: true,
    updated_at: new Date().toISOString()
  }
  return weekCycles[index]
}

export function getOrdersByWeekCycle(weekCycleId: string): DemoOrder[] {
  return orders.filter(o => o.week_cycle_id === weekCycleId)
}

// Reset to initial state (useful for testing)
export function resetDemoStore(): void {
  products = [...initialProducts]
  orders = []
  weekCycles = []
}