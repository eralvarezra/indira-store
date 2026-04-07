'use client'

import { Product, ProductVariant, ProductImage, ProductWithVariants, getDiscountedPrice, getEffectivePrice, getEffectiveStock, getCartItemId } from '@/types/database.types'
import { useCart } from '@/context/CartContext'
import { X, Plus, Minus, ShoppingCart, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useState, useEffect } from 'react'

interface ProductDetailModalProps {
  product: ProductWithVariants
  isOpen: boolean
  onClose: () => void
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const { addItem, state, updateQuantity } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  // Get variants and images
  const variants = product.variants || []
  const hasMultipleVariants = variants.length > 1
  const images = (product as ProductWithVariants & { images?: ProductImage[] }).images || []
  const allImages = images.length > 0 ? images : (product.image_url ? [{ image_url: product.image_url, is_primary: true }] : [])
  const hasMultipleImages = allImages.length > 1

  // Initialize with default variant
  useEffect(() => {
    if (variants.length > 0) {
      const defaultVariant = variants.find(v => v.is_default) || variants[0]
      setSelectedVariant(defaultVariant)
    } else {
      setSelectedVariant(null)
    }
    setSelectedImageIndex(0)
  }, [product, variants])

  // Update selected image when variant changes
  useEffect(() => {
    if (selectedVariant && images.length > 0) {
      // Find image associated with this variant
      const variantImageIndex = images.findIndex(img => img.variant_id === selectedVariant.id)
      if (variantImageIndex !== -1) {
        setSelectedImageIndex(variantImageIndex)
      }
    }
  }, [selectedVariant, images])

  // Get quantity for selected variant
  const quantity = selectedVariant
    ? state.items.find((item) => getCartItemId(item) === `${product.id}-${selectedVariant.id}`)?.quantity || 0
    : state.items.find((item) => item.product.id === product.id && !item.variant)?.quantity || 0

  const handleAdd = () => {
    setIsAdding(true)
    addItem(product, selectedVariant || undefined)
    setTimeout(() => setIsAdding(false), 300)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(price)
  }

  // Calculate effective values based on selected variant
  const effectivePrice = selectedVariant ? getEffectivePrice(product, selectedVariant) : product.price
  const effectiveStock = selectedVariant ? getEffectiveStock(product, selectedVariant) : product.stock
  const isOutOfStock = effectiveStock <= 0

  const discountPercentage = product.discount_percentage || 0
  const hasDiscount = discountPercentage > 0
  const discountedPrice = getDiscountedPrice(effectivePrice, discountPercentage)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col animate-in fade-in slide-up duration-300">
        {/* Header with close button - always visible */}
        <div className="sticky top-0 z-20 bg-white rounded-t-3xl sm:rounded-t-2xl">
          {/* Close button - prominent and easy to tap */}
          <div className="flex justify-between items-center p-3">
            <div className="w-10" /> {/* Spacer */}
            <div className="flex justify-center">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Scrollable content - Image + Details */}
        <div className="flex-1 overflow-y-auto scroll-container">
          {/* Image Carousel */}
          <div className="relative min-h-64 sm:min-h-48 bg-gray-100 flex items-center justify-center">
            {allImages.length > 0 && allImages[selectedImageIndex]?.image_url ? (
              <img
                src={allImages[selectedImageIndex].image_url}
                alt={product.name}
                className="max-w-full max-h-80 sm:max-h-64 object-contain"
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <ShoppingCart className="w-16 h-16 text-gray-300" />
              </div>
            )}

            {/* Discount Badge */}
            {hasDiscount && (
              <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                -{discountPercentage}%
              </div>
            )}

            {/* Image Navigation */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={() => setSelectedImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={() => setSelectedImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
                {/* Image Indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {allImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={clsx(
                        'w-2 h-2 rounded-full transition-colors',
                        index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {hasMultipleImages && (
            <div className="flex gap-2 p-2 overflow-x-auto">
              {allImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={clsx(
                    'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors bg-gray-50 flex items-center justify-center',
                    index === selectedImageIndex ? 'border-[#E8775A]' : 'border-transparent hover:border-gray-300'
                  )}
                >
                  <img
                    src={image.image_url}
                    alt={`${product.name} ${index + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            {/* Name and Price */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-xl font-bold text-gray-900">
                {product.name}
              </h2>
              <div className="text-right flex-shrink-0">
                {hasDiscount ? (
                  <>
                    <span className="text-sm text-gray-400 line-through block">
                      {formatPrice(effectivePrice)}
                    </span>
                    <span className="text-xl font-bold text-[#E8775A]">
                      {formatPrice(discountedPrice)}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-[#E8775A]">
                    {formatPrice(effectivePrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Variant Selector */}
            {hasMultipleVariants && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Seleccionar opción</h3>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const variantDiscountedPrice = getDiscountedPrice(variant.price, discountPercentage)
                    return (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={clsx(
                          'px-4 py-2.5 rounded-xl border-2 transition-all text-left',
                          selectedVariant?.id === variant.id
                            ? 'border-[#E8775A] bg-[#E8775A]/10'
                            : 'border-gray-200 hover:border-gray-300 active:bg-gray-50'
                        )}
                      >
                        <div className="font-medium text-gray-900">{variant.name}</div>
                        <div className="text-sm text-gray-500">
                          {formatPrice(variantDiscountedPrice)}
                          {variant.stock <= 0 && (
                            <span className="ml-2 text-amber-600 text-xs">(Agotado)</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Descripción</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {product.description || 'Sin descripción'}
              </p>
            </div>

            {/* Stock info */}
            <div className="flex flex-col gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit ${
                effectiveStock > 10
                  ? 'bg-green-100 text-green-700'
                  : effectiveStock > 0
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-amber-100 text-amber-700'
              }`}>
                {isOutOfStock ? 'Pre-pedido disponible' : `${effectiveStock} disponibles`}
              </span>

              {/* Pre-order message for out of stock */}
              {isOutOfStock && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Producto disponible para pre-pedido</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Este producto está actualmente agotado para entrega inmediata.
                      Puedes hacer tu pedido y te lo entregaremos en aproximadamente 1.5 semanas.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Add to Cart */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 sm:p-5 safe-bottom">
          {quantity > 0 ? (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => updateQuantity(product.id, quantity - 1, selectedVariant?.id)}
                className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-colors touch-target"
              >
                <Minus className="w-6 h-6 text-gray-700" />
              </button>
              <span className="text-3xl font-bold w-16 text-center">{quantity}</span>
              <button
                onClick={handleAdd}
                className={clsx(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors touch-target",
                  isOutOfStock
                    ? "bg-amber-500 hover:bg-amber-400 active:bg-amber-600"
                    : "bg-[#f6a07a] hover:bg-[#ffb599] active:bg-[#e58e6a]"
                )}
              >
                <Plus className="w-6 h-6 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={hasMultipleVariants && !selectedVariant}
              className={clsx(
                'w-full py-4 sm:py-5 rounded-2xl font-semibold text-white text-lg transition-all touch-target flex items-center justify-center gap-2',
                isOutOfStock
                  ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600'
                  : 'bg-[#f6a07a] hover:bg-[#ffb599] active:bg-[#e58e6a]',
                (hasMultipleVariants && !selectedVariant) && 'opacity-50 cursor-not-allowed',
                isAdding && 'scale-[1.02]'
              )}
            >
              {isOutOfStock ? (
                <>
                  <Clock className="w-5 h-5" />
                  Hacer Pre-pedido
                </>
              ) : (
                'Agregar al Carrito'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}