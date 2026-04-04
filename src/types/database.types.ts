// Skincare product categories
export const SKINCARE_CATEGORIES = [
  { id: 'cleansers', name: 'Limpiadores', icon: '🧼' },
  { id: 'toners', name: 'Tónicos', icon: '💧' },
  { id: 'serums', name: 'Sérums', icon: '✨' },
  { id: 'moisturizers', name: 'Hidratantes', icon: '🧴' },
  { id: 'sunscreen', name: 'Protectores Solares', icon: '☀️' },
  { id: 'masks', name: 'Mascarillas', icon: '🎭' },
  { id: 'exfoliants', name: 'Exfoliantes', icon: '🌿' },
  { id: 'oils', name: 'Aceites', icon: '🫒' },
  { id: 'treatments', name: 'Tratamientos', icon: '💊' },
  { id: 'eye-care', name: 'Contorno de Ojos', icon: '👁️' },
] as const

export type CategoryId = typeof SKINCARE_CATEGORIES[number]['id']

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
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_name: string
          phone: string
          items: Json
          total: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_name: string
          phone: string
          items: Json
          total: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          customer_name?: string
          phone?: string
          items?: Json
          total?: number
          status?: string
          created_at?: string
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
export type Order = Database['public']['Tables']['orders']['Row']
export type Setting = Database['public']['Tables']['settings']['Row']

export interface CartItem {
  product: Product
  quantity: number
}

export interface OrderItem {
  product_id: string
  name: string
  price: number
  quantity: number
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

// Helper to get category info
export function getCategoryInfo(categoryId: string) {
  return SKINCARE_CATEGORIES.find(c => c.id === categoryId) || null
}