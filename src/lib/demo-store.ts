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
  variant_id: string | null
  variant_name: string | null
  name: string
  price: number
  quantity: number
  type: 'in_stock' | 'pre_order'
}

export interface DemoProductVariant {
  id: string
  product_id: string
  name: string
  sku: string | null
  price: number
  stock: number
  is_default: boolean
  sort_order: number
  created_at: string
}

export interface DemoProductImage {
  id: string
  product_id: string
  image_url: string
  alt_text: string | null
  sort_order: number
  is_primary: boolean
  created_at: string
}

export interface DemoOrder {
  id: string
  order_number?: string
  customer_name: string
  phone: string
  items: DemoOrderItem[]
  total: number
  total_with_shipping?: number
  amount_paid?: number
  advance_payment?: number
  payment_proof_url?: string | null
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
let productVariants: DemoProductVariant[] = []
let productImages: DemoProductImage[] = []
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

// Product Variants CRUD
export function getVariantsByProductId(productId: string): DemoProductVariant[] {
  return productVariants
    .filter(v => v.product_id === productId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function getVariant(id: string): DemoProductVariant | null {
  return productVariants.find(v => v.id === id) || null
}

export function createVariant(data: Omit<DemoProductVariant, 'id' | 'created_at'>): DemoProductVariant {
  const variant: DemoProductVariant = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
  }
  productVariants.push(variant)
  return variant
}

export function updateVariant(id: string, data: Partial<DemoProductVariant>): DemoProductVariant | null {
  const index = productVariants.findIndex(v => v.id === id)
  if (index === -1) return null
  productVariants[index] = { ...productVariants[index], ...data }
  return productVariants[index]
}

export function deleteVariant(id: string): boolean {
  const index = productVariants.findIndex(v => v.id === id)
  if (index === -1) return false
  productVariants.splice(index, 1)
  return true
}

export function deleteVariantsByProductId(productId: string): void {
  productVariants = productVariants.filter(v => v.product_id !== productId)
}

// Get products with their variants
export function getProductsWithVariants(): (DemoProduct & { variants: DemoProductVariant[]; images?: DemoProductImage[] })[] {
  return getProducts().map(product => ({
    ...product,
    variants: getVariantsByProductId(product.id),
    images: getImagesByProductId(product.id)
  }))
}

// Product Images CRUD
export function getImagesByProductId(productId: string): DemoProductImage[] {
  return productImages
    .filter(img => img.product_id === productId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function createImage(data: Omit<DemoProductImage, 'id' | 'created_at'>): DemoProductImage {
  const image: DemoProductImage = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
  }
  productImages.push(image)
  return image
}

export function deleteImage(id: string): boolean {
  const index = productImages.findIndex(img => img.id === id)
  if (index === -1) return false
  productImages.splice(index, 1)
  return true
}

export function deleteImagesByProductId(productId: string): void {
  productImages = productImages.filter(img => img.product_id !== productId)
}

export function updateImageSortOrder(id: string, sortOrder: number): DemoProductImage | null {
  const index = productImages.findIndex(img => img.id === id)
  if (index === -1) return null
  productImages[index] = { ...productImages[index], sort_order: sortOrder }
  return productImages[index]
}

// Initialize default variants for existing products (for backward compatibility)
export function initializeDefaultVariants(): void {
  for (const product of products) {
    const existingVariants = productVariants.filter(v => v.product_id === product.id)
    if (existingVariants.length === 0) {
      createVariant({
        product_id: product.id,
        name: 'Default',
        sku: null,
        price: product.price,
        stock: product.stock,
        is_default: true,
        sort_order: 0
      })
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
        // Update variant stock if variant_id exists
        if (item.variant_id) {
          const variant = getVariant(item.variant_id)
          if (variant) {
            const newStock = Math.max(0, variant.stock - item.quantity)
            updateVariant(item.variant_id, { stock: newStock })
          }
        } else {
          // Fallback to product stock for backward compatibility
          const product = getProduct(item.product_id)
          if (product) {
            const newStock = Math.max(0, product.stock - item.quantity)
            updateProductStock(item.product_id, newStock)
          }
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

export function deleteOrder(id: string): DemoOrder | null {
  const index = orders.findIndex(o => o.id === id)
  if (index === -1) return null
  const deleted = orders[index]
  orders.splice(index, 1)
  return deleted
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

export function updateWeekCycle(id: string, startDate: string, endDate: string): DemoWeekCycle | null {
  const index = weekCycles.findIndex(c => c.id === id)
  if (index === -1) return null

  weekCycles[index] = {
    ...weekCycles[index],
    start_date: startDate,
    end_date: endDate,
    updated_at: new Date().toISOString()
  }
  return weekCycles[index]
}

export function deleteWeekCycle(id: string): DemoWeekCycle | null {
  const index = weekCycles.findIndex(c => c.id === id)
  if (index === -1) return null

  const deleted = weekCycles[index]
  weekCycles.splice(index, 1)
  return deleted
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