'use client'

import { useCart } from '@/context/CartContext'
import { ShoppingCart, Clock } from 'lucide-react'
import { getEffectiveStock } from '@/types/database.types'

export function FloatingCartButton() {
  const { state, toggleCart, totalItems } = useCart()

  // Check if cart has pre-order items
  const hasPreOrderItems = state.items.some(item => {
    const stock = getEffectiveStock(item.product, item.variant)
    return stock <= 0
  })

  return (
    <button
      onClick={toggleCart}
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 bg-[#f6a07a] text-white p-4 rounded-full shadow-lg active:bg-[#e58e6a] active:scale-95 transition-all z-30 touch-target relative"
      aria-label="Open cart"
    >
      <ShoppingCart className="w-6 h-6" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-pulse">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
      {hasPreOrderItems && (
        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1 rounded-full">
          <Clock className="w-3 h-3" />
        </span>
      )}
    </button>
  )
}