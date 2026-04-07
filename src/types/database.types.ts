// Category type with subcategories
export interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  subcategories?: Category[]
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          image_url: string
          stock: number
          discount_percentage: number
          category: string
          category_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          price: number
          image_url?: string
          stock?: number
          discount_percentage?: number
          category?: string
          category_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          image_url?: string
          stock?: number
          discount_percentage?: number
          category?: string
          category_id?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          icon: string | null
          parent_id: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          icon?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          icon?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string | null
          customer_name: string
          phone: string
          email: string | null
          items: Json
          total: number
          total_with_shipping: number | null
          amount_paid: number
          advance_payment: number | null
          status: string
          week_cycle_id: string | null
          // Shipping fields
          province: string | null
          canton: string | null
          district: string | null
          exact_address: string | null
          shipping_method: string
          shipping_cost: number
          // Payment fields
          payment_method: string | null
          payment_details: Json | null
          payment_proof_url: string | null
          // Billing fields
          billing_same_as_shipping: boolean
          billing_name: string | null
          billing_province: string | null
          billing_canton: string | null
          billing_district: string | null
          billing_exact_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_number?: string | null
          customer_name: string
          phone: string
          email?: string | null
          items: Json
          total: number
          total_with_shipping?: number | null
          amount_paid?: number
          advance_payment?: number | null
          status?: string
          week_cycle_id?: string | null
          province?: string | null
          canton?: string | null
          district?: string | null
          exact_address?: string | null
          shipping_method?: string
          shipping_cost?: number
          payment_method?: string | null
          payment_details?: Json | null
          payment_proof_url?: string | null
          billing_same_as_shipping?: boolean
          billing_name?: string | null
          billing_province?: string | null
          billing_canton?: string | null
          billing_district?: string | null
          billing_exact_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_number?: string | null
          customer_name?: string
          phone?: string
          email?: string | null
          items?: Json
          total?: number
          total_with_shipping?: number | null
          amount_paid?: number
          advance_payment?: number | null
          status?: string
          week_cycle_id?: string | null
          province?: string | null
          canton?: string | null
          district?: string | null
          exact_address?: string | null
          shipping_method?: string
          shipping_cost?: number
          payment_method?: string | null
          payment_details?: Json | null
          payment_proof_url?: string | null
          billing_same_as_shipping?: boolean
          billing_name?: string | null
          billing_province?: string | null
          billing_canton?: string | null
          billing_district?: string | null
          billing_exact_address?: string | null
          created_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          name: string
          description: string | null
          instructions: string | null
          account_info: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          instructions?: string | null
          account_info?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          instructions?: string | null
          account_info?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      week_cycles: {
        Row: {
          id: string
          start_date: string
          end_date: string
          status: string
          report_sent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          start_date: string
          end_date: string
          status?: string
          report_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          start_date?: string
          end_date?: string
          status?: string
          report_sent?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Product = Database['public']['Tables']['products']['Row']
export type CategoryDB = Database['public']['Tables']['categories']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type WeekCycle = Database['public']['Tables']['week_cycles']['Row']
export type Setting = Database['public']['Tables']['settings']['Row']
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']

// Costa Rica Provinces
export const COSTA_RICA_PROVINCES = [
  'San José',
  'Alajuela',
  'Cartago',
  'Heredia',
  'Guanacaste',
  'Puntarenas',
  'Limón'
] as const

export type CostaRicaProvince = typeof COSTA_RICA_PROVINCES[number]

// Shipping methods
export const SHIPPING_METHODS = {
  pickup: {
    name: 'Recoger en tienda',
    description: 'Recoge tu pedido sin costo adicional',
    price: 0
  },
  gam: {
    name: 'Correos de Costa Rica - Dentro del GAM',
    description: 'Entrega en 2-3 días hábiles dentro del Gran Área Metropolitana',
    price: 2500
  },
  outside_gam: {
    name: 'Correos de Costa Rica - Fuera del GAM',
    description: 'Entrega en 3-5 días hábiles fuera del Gran Área Metropolitana',
    price: 3500
  }
} as const

// Shipping method with optional instructions (fetched from settings)
export interface ShippingMethodWithInstructions {
  key: string
  name: string
  description: string
  price: number
  instructions: string | null
}

export type ShippingMethodKey = keyof typeof SHIPPING_METHODS

// Checkout form data
export interface CheckoutFormData {
  // Contact
  customer_name: string
  phone: string
  country_code: string
  email: string
  // Shipping
  province: string
  canton: string
  district: string
  exact_address: string
  shipping_method: ShippingMethodKey
  // Payment
  payment_method: string
  // Billing
  billing_same_as_shipping: boolean
  billing_name: string
  billing_province: string
  billing_canton: string
  billing_district: string
  billing_exact_address: string
}

// Product Variant type
export interface ProductVariant {
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

// Product Image type
export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  alt_text: string | null
  sort_order: number
  is_primary: boolean
  variant_id: string | null
  created_at: string
}

// Product with variants and images
export interface ProductWithVariants extends Product {
  variants: ProductVariant[]
  images?: ProductImage[]
}

export interface CartItem {
  product: Product
  variant?: ProductVariant
  quantity: number
}

// Helper to get unique cart item ID
export function getCartItemId(item: CartItem): string {
  return item.variant
    ? `${item.product.id}-${item.variant.id}`
    : item.product.id
}

// Order item type - includes whether it's in_stock or pre_order
export interface OrderItem {
  product_id: string
  variant_id: string | null
  variant_name: string | null
  name: string
  price: number
  quantity: number
  type: 'in_stock' | 'pre_order'
}

// Helper to calculate discounted price
export function getDiscountedPrice(price: number, discountPercentage: number): number {
  if (discountPercentage <= 0) return price
  return price * (1 - discountPercentage / 100)
}

// Helper to format price with discount
export function formatPriceWithDiscount(price: number, discountPercentage: number): { original: number; discounted: number; hasDiscount: boolean } {
  return {
    original: price,
    discounted: getDiscountedPrice(price, discountPercentage),
    hasDiscount: discountPercentage > 0
  }
}

// Helper to determine order item type based on stock
export function getOrderItemType(stock: number): 'in_stock' | 'pre_order' {
  return stock > 0 ? 'in_stock' : 'pre_order'
}

// Helper to get effective price (variant or product)
export function getEffectivePrice(product: Product, variant?: ProductVariant): number {
  if (variant) {
    return variant.price
  }
  return product.price
}

// Helper to get effective stock (variant or product)
export function getEffectiveStock(product: Product, variant?: ProductVariant): number {
  if (variant) {
    return variant.stock
  }
  return product.stock
}