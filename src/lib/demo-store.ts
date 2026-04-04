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

export interface DemoOrder {
  id: string
  customer_name: string
  phone: string
  items: Array<{
    product_id: string
    name: string
    price: number
    quantity: number
  }>
  total: number
  status: string
  created_at: string
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

export function createOrder(data: Omit<DemoOrder, 'id' | 'created_at'>): DemoOrder {
  const order: DemoOrder = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
  }
  orders.unshift(order)

  // Reserve stock for pending orders
  if (order.status === 'pending') {
    for (const item of order.items) {
      const product = getProduct(item.product_id)
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity)
        updateProductStock(item.product_id, newStock)
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

// Reset to initial state (useful for testing)
export function resetDemoStore(): void {
  products = [...initialProducts]
  orders = []
}