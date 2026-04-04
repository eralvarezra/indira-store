'use client'

import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import { X, Loader2, CheckCircle, ShoppingBag, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
}

interface FormData {
  customer_name: string
  phone: string
  country_code: string
}

interface FormErrors {
  customer_name?: string
  phone?: string
  country_code?: string
}

const countries = [
  { code: 'CR', name: 'Costa Rica', digits: 8, prefix: '+506', placeholder: '8888 8888' },
  { code: 'MX', name: 'México', digits: 10, prefix: '+52', placeholder: '55 1234 5678' },
  { code: 'US', name: 'Estados Unidos', digits: 10, prefix: '+1', placeholder: '(555) 123-4567' },
  { code: 'CO', name: 'Colombia', digits: 10, prefix: '+57', placeholder: '321 456 7890' },
  { code: 'AR', name: 'Argentina', digits: 10, prefix: '+54', placeholder: '11 1234-5678' },
  { code: 'PE', name: 'Perú', digits: 9, prefix: '+51', placeholder: '987 654 321' },
  { code: 'ES', name: 'España', digits: 9, prefix: '+34', placeholder: '612 345 678' },
  { code: 'OTHER', name: 'Otro país', digits: 0, prefix: '', placeholder: 'Número completo' },
]

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { state, clearCart, totalPrice, totalItems } = useCart()
  const [formData, setFormData] = useState<FormData>({
    customer_name: '',
    phone: '',
    country_code: 'CR',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const selectedCountry = countries.find(c => c.code === formData.country_code) || countries[0]

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(price)
  }

  const validatePhone = (phone: string, countryCode: string) => {
    const country = countries.find(c => c.code === countryCode)
    if (!country) return phone.length >= 8

    // If "Other country", just check minimum length
    if (country.digits === 0) {
      return phone.replace(/\D/g, '').length >= 8
    }

    const cleanPhone = phone.replace(/\D/g, '')
    return cleanPhone.length === country.digits
  }

  const validateForm = () => {
    const newErrors: FormErrors = {}

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'El nombre es requerido'
    } else if (formData.customer_name.trim().length < 2) {
      newErrors.customer_name = 'El nombre debe tener al menos 2 caracteres'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido'
    } else if (!validatePhone(formData.phone, formData.country_code)) {
      const country = countries.find(c => c.code === formData.country_code)
      if (country && country.digits > 0) {
        newErrors.phone = `Ingresa ${country.digits} dígitos para ${country.name}`
      } else {
        newErrors.phone = 'Ingresa un número de teléfono válido'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    if (state.items.length === 0) {
      setErrors({ phone: 'El carrito está vacío' })
      return
    }

    setIsSubmitting(true)

    try {
      const cleanPhone = formData.phone.replace(/\D/g, '')
      const fullPhone = selectedCountry.prefix ? `${selectedCountry.prefix} ${cleanPhone}` : cleanPhone

      const orderData = {
        customer_name: formData.customer_name.trim(),
        phone: fullPhone,
        items: state.items.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
        })),
        total: totalPrice,
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        throw new Error('Error al procesar el pedido')
      }

      setIsSuccess(true)
      clearCart()

      setTimeout(() => {
        setIsSuccess(false)
        setFormData({ customer_name: '', phone: '', country_code: 'CR' })
        onClose()
      }, 3000)
    } catch (error) {
      console.error('Order submission error:', error)
      setErrors({ phone: 'Error al procesar el pedido. Intenta de nuevo.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Bottom sheet on mobile */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-hidden animate-in fade-in slide-up duration-200">
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {isSuccess ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              ¡Pedido Enviado!
            </h3>
            <p className="text-gray-600">
              Te contactaremos pronto para confirmar tu pedido.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Confirmar Pedido</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 active:bg-gray-100 rounded-full transition-colors touch-target"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Productos ({totalItems})</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total a pagar</span>
                <span className="text-indigo-600">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto scroll-container" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {/* Name Input */}
              <div>
                <label
                  htmlFor="customer_name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nombre completo
                </label>
                <input
                  type="text"
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  className={clsx(
                    'w-full px-4 py-3.5 rounded-xl border-2 transition-colors outline-none text-base',
                    errors.customer_name
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-indigo-500'
                  )}
                  placeholder="Tu nombre"
                  autoComplete="name"
                />
                {errors.customer_name && (
                  <p className="mt-1 text-sm text-red-500">{errors.customer_name}</p>
                )}
              </div>

              {/* Country Selector */}
              <div>
                <label
                  htmlFor="country_code"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  País
                </label>
                <div className="relative">
                  <select
                    id="country_code"
                    value={formData.country_code}
                    onChange={(e) => handleInputChange('country_code', e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none appearance-none bg-white pr-10 text-base"
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name} {country.prefix && `(${country.prefix})`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Phone Input */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Teléfono {selectedCountry.digits > 0 && `(${selectedCountry.digits} dígitos)`}
                </label>
                <div className="flex gap-2">
                  {selectedCountry.prefix && (
                    <div className="flex items-center px-4 py-3.5 bg-gray-100 rounded-xl border-2 border-gray-200 text-gray-600 font-medium text-base">
                      {selectedCountry.prefix}
                    </div>
                  )}
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
                    className={clsx(
                      'flex-1 px-4 py-3.5 rounded-xl border-2 transition-colors outline-none text-base',
                      errors.phone
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-indigo-500'
                    )}
                    placeholder={selectedCountry.placeholder}
                    maxLength={selectedCountry.digits > 0 ? selectedCountry.digits : 15}
                    autoComplete="tel"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || state.items.length === 0}
                className={clsx(
                  'w-full py-4 rounded-xl font-semibold text-white transition-all touch-target text-base',
                  isSubmitting || state.items.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-indigo-600 active:bg-indigo-700 active:scale-[0.98]'
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </span>
                ) : (
                  'Confirmar Pedido'
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Te contactaremos para coordinar el pago y la entrega.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}