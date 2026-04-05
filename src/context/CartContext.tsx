'use client'

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { Product, ProductVariant, CartItem, getDiscountedPrice, getEffectivePrice } from '@/types/database.types'

interface CartState {
  items: CartItem[]
  isOpen: boolean
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; variant?: ProductVariant } }
  | { type: 'REMOVE_ITEM'; payload: { productId: string; variantId?: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; variantId?: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'CLOSE_CART' }

const CartContext = createContext<{
  state: CartState
  addItem: (product: Product, variant?: ProductVariant) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  toggleCart: () => void
  closeCart: () => void
  totalItems: number
  totalPrice: number
} | null>(null)

// Helper to get unique cart item key
function getCartItemKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}-${variantId}` : productId
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, variant } = action.payload
      const itemKey = getCartItemKey(product.id, variant?.id)

      const existingItem = state.items.find((item) =>
        getCartItemKey(item.product.id, item.variant?.id) === itemKey
      )

      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            getCartItemKey(item.product.id, item.variant?.id) === itemKey
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        }
      }

      return {
        ...state,
        items: [...state.items, { product, variant, quantity: 1 }],
      }
    }

    case 'REMOVE_ITEM': {
      const { productId, variantId } = action.payload
      const itemKey = getCartItemKey(productId, variantId)

      return {
        ...state,
        items: state.items.filter(
          (item) => getCartItemKey(item.product.id, item.variant?.id) !== itemKey
        ),
      }
    }

    case 'UPDATE_QUANTITY': {
      const { productId, variantId, quantity } = action.payload
      const itemKey = getCartItemKey(productId, variantId)

      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (item) => getCartItemKey(item.product.id, item.variant?.id) !== itemKey
          ),
        }
      }

      return {
        ...state,
        items: state.items.map((item) =>
          getCartItemKey(item.product.id, item.variant?.id) === itemKey
            ? { ...item, quantity }
            : item
        ),
      }
    }

    case 'CLEAR_CART':
      return { ...state, items: [] }

    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen }

    case 'CLOSE_CART':
      return { ...state, isOpen: false }

    case 'SET_CART':
      return { ...state, items: action.payload }

    default:
      return state
  }
}

const CART_STORAGE_KEY = 'indira_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
  })

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY)
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        dispatch({ type: 'SET_CART', payload: parsedCart })
      } catch (e) {
        console.error('Failed to parse cart from localStorage:', e)
      }
    }
  }, [])

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items))
  }, [state.items])

  const addItem = (product: Product, variant?: ProductVariant) =>
    dispatch({ type: 'ADD_ITEM', payload: { product, variant } })
  const removeItem = (productId: string, variantId?: string) =>
    dispatch({ type: 'REMOVE_ITEM', payload: { productId, variantId } })
  const updateQuantity = (productId: string, quantity: number, variantId?: string) =>
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, variantId, quantity } })
  const clearCart = () => dispatch({ type: 'CLEAR_CART' })
  const toggleCart = () => dispatch({ type: 'TOGGLE_CART' })
  const closeCart = () => dispatch({ type: 'CLOSE_CART' })

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = state.items.reduce((sum, item) => {
    const effectivePrice = getEffectivePrice(item.product, item.variant)
    const discountedPrice = getDiscountedPrice(effectivePrice, item.product.discount_percentage || 0)
    return sum + discountedPrice * item.quantity
  }, 0)

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        toggleCart,
        closeCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}