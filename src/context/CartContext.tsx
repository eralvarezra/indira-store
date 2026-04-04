'use client'

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { Product, CartItem } from '@/types/database.types'

interface CartState {
  items: CartItem[]
  isOpen: boolean
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'CLOSE_CART' }

const CartContext = createContext<{
  state: CartState
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  closeCart: () => void
  totalItems: number
  totalPrice: number
} | null>(null)

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(
        (item) => item.product.id === action.payload.id
      )

      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.product.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        }
      }

      return {
        ...state,
        items: [...state.items, { product: action.payload, quantity: 1 }],
      }
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.product.id !== action.payload),
      }

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (item) => item.product.id !== action.payload.productId
          ),
        }
      }

      return {
        ...state,
        items: state.items.map((item) =>
          item.product.id === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
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

  const addItem = (product: Product) => dispatch({ type: 'ADD_ITEM', payload: product })
  const removeItem = (productId: string) => dispatch({ type: 'REMOVE_ITEM', payload: productId })
  const updateQuantity = (productId: string, quantity: number) =>
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } })
  const clearCart = () => dispatch({ type: 'CLEAR_CART' })
  const toggleCart = () => dispatch({ type: 'TOGGLE_CART' })
  const closeCart = () => dispatch({ type: 'CLOSE_CART' })

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = state.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

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