'use client'

import { useCart } from '@/context/CartContext'
import { X, Plus, Minus, Trash2, ShoppingBag, Clock, Package } from 'lucide-react'
import clsx from 'clsx'

interface CartDrawerProps {
  onCheckout: () => void
}

export function CartDrawer({ onCheckout }: CartDrawerProps) {
  const { state, closeCart, updateQuantity, removeItem, clearCart, totalItems, totalPrice } =
    useCart()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(price)
  }

  // Separate items into in_stock and pre_order
  const inStockItems = state.items.filter(item => item.product.stock > 0)
  const preOrderItems = state.items.filter(item => item.product.stock === 0)

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          state.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeCart}
      />

      {/* Drawer - Full width on mobile, side panel on desktop */}
      <div
        className={clsx(
          'fixed inset-y-0 right-0 sm:right-0 sm:w-full sm:max-w-md bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out',
          state.isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10 safe-top">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Tu Carrito</h2>
            {totalItems > 0 && (
              <span className="bg-indigo-100 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="p-2 active:bg-gray-100 rounded-full transition-colors touch-target"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100vh-130px)] sm:h-[calc(100vh-140px)]">
          {state.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-500 text-center mb-2">Tu carrito está vacío</p>
              <p className="text-gray-400 text-sm text-center">
                Agrega productos para comenzar
              </p>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="flex-1 overflow-y-auto px-4 py-4 scroll-container">
                {/* In-stock items */}
                {inStockItems.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Package className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Disponibles</span>
                    </div>
                    <div className="space-y-3">
                      {inStockItems.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex gap-3 bg-gray-50 rounded-xl p-3"
                        >
                          {/* Image */}
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.product.image_url ? (
                              <img
                                src={item.product.image_url}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-gray-300" />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                              {item.product.name}
                            </h3>
                            <p className="text-indigo-600 font-semibold text-sm mt-0.5">
                              {formatPrice(item.product.price)}
                            </p>

                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                  className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center active:bg-gray-100 transition-colors touch-target"
                                >
                                  <Minus className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                                <span className="w-7 text-center text-sm font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.product.stock}
                                  className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
                                >
                                  <Plus className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeItem(item.product.id)}
                                className="p-2 text-gray-400 active:text-red-500 active:bg-red-50 rounded-full transition-colors touch-target"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pre-order items */}
                {preOrderItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">Pre-pedido (~1.5 semanas)</span>
                    </div>
                    <div className="space-y-3">
                      {preOrderItems.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex gap-3 bg-amber-50 rounded-xl p-3 border border-amber-200"
                        >
                          {/* Image */}
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                            {item.product.image_url ? (
                              <img
                                src={item.product.image_url}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-gray-300" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                Pre-pedido
                              </span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                              {item.product.name}
                            </h3>
                            <p className="text-indigo-600 font-semibold text-sm mt-0.5">
                              {formatPrice(item.product.price)}
                            </p>
                            <p className="text-amber-600 text-xs mt-1">
                              Entrega en ~1.5 semanas
                            </p>

                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                  className="w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center active:bg-amber-100 transition-colors touch-target"
                                >
                                  <Minus className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                                <span className="w-7 text-center text-sm font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                  className="w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center active:bg-amber-100 transition-colors touch-target"
                                >
                                  <Plus className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeItem(item.product.id)}
                                className="p-2 text-gray-400 active:text-red-500 active:bg-red-50 rounded-full transition-colors touch-target"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 space-y-3 safe-bottom">
                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={clearCart}
                    className="px-4 py-3 text-red-600 bg-red-50 rounded-xl font-medium active:bg-red-100 transition-colors touch-target"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      closeCart()
                      onCheckout()
                    }}
                    className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold active:bg-indigo-700 active:scale-[0.98] transition-all touch-target"
                  >
                    Proceder al Pago
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}