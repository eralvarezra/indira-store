'use client'

import { useCart } from '@/context/CartContext'
import { ShoppingCart } from 'lucide-react'

export function FloatingCartButton() {
  const { toggleCart, totalItems } = useCart()

  return (
    <button
      onClick={toggleCart}
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg active:bg-indigo-700 active:scale-95 transition-all z-30 touch-target"
      aria-label="Open cart"
    >
      <ShoppingCart className="w-6 h-6" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-pulse">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </button>
  )
}