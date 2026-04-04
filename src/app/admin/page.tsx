'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Package, ShoppingBag, Settings, LogOut, Plus, Edit2, Trash2, X, Save, Loader2, Upload, Image as ImageIcon, Check, XCircle, Percent, Tag, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { Product, Order, SKINCARE_CATEGORIES, CategoryId } from '@/types/database.types'

type Tab = 'products' | 'orders' | 'promos' | 'settings'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState({ telegram_bot_token: '', telegram_chat_id: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    stock: '',
    category: '' as CategoryId | '',
  })
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Promos state
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [bulkDiscount, setBulkDiscount] = useState('')
  const [isUpdatingDiscount, setIsUpdatingDiscount] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/verify')
      if (!response.ok) {
        router.push('/admin/login')
      }
    } catch {
      router.push('/admin/login')
    }
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [productsRes, ordersRes, settingsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders'),
        fetch('/api/admin/settings'),
      ])

      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(data.products || [])
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.orders || [])
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data.settings || { telegram_bot_token: '', telegram_chat_id: '' })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.url) {
        setProductForm({ ...productForm, image_url: data.url })
      } else {
        alert(data.error || 'Error al subir la imagen')
        setImagePreview(null)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Error al subir la imagen')
      setImagePreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveProduct = async () => {
    try {
      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price) || 0,
        image_url: productForm.image_url || null,
        stock: parseInt(productForm.stock) || 0,
        category: productForm.category || null,
      }

      let response
      if (editingProduct) {
        response = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        })
      } else {
        response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        })
      }

      if (response.ok) {
        setShowProductModal(false)
        setEditingProduct(null)
        setProductForm({ name: '', description: '', price: '', image_url: '', stock: '', category: '' })
        setImagePreview(null)
        fetchData()
      }
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setProducts(products.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        alert('Configuración guardada correctamente')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'confirmed' | 'cancelled') => {
    const statusText = newStatus === 'confirmed' ? 'confirmar' : 'cancelar'
    if (!confirm(`¿Estás seguro de ${statusText} este pedido?`)) return

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchData() // Refresh products and orders
      } else {
        alert('Error al actualizar el pedido')
      }
    } catch (error) {
      console.error('Error updating order:', error)
      alert('Error al actualizar el pedido')
    }
  }

  // Promos handlers
  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSelectAllProducts = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  const handleBulkDiscount = async () => {
    const discount = parseFloat(bulkDiscount)
    if (isNaN(discount) || discount < 0 || discount > 100) {
      alert('Ingresa un porcentaje válido (0-100)')
      return
    }

    if (selectedProducts.length === 0) {
      alert('Selecciona al menos un producto')
      return
    }

    setIsUpdatingDiscount(true)

    try {
      const response = await fetch('/api/products/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedProducts,
          discountPercentage: discount,
        }),
      })

      if (response.ok) {
        fetchData()
        setSelectedProducts([])
        setBulkDiscount('')
        alert(`Descuento del ${discount}% aplicado a ${selectedProducts.length} productos`)
      } else {
        alert('Error al aplicar el descuento')
      }
    } catch (error) {
      console.error('Error applying discount:', error)
      alert('Error al aplicar el descuento')
    } finally {
      setIsUpdatingDiscount(false)
    }
  }

  const handleRemoveDiscount = async (productId: string) => {
    try {
      const response = await fetch('/api/products/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: [productId],
          discountPercentage: 0,
        }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error removing discount:', error)
    }
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      image_url: product.image_url || '',
      stock: product.stock.toString(),
      category: (product.category || '') as CategoryId | '',
    })
    setImagePreview(product.image_url || null)
    setShowProductModal(true)
  }

  const closeModal = () => {
    setShowProductModal(false)
    setEditingProduct(null)
    setProductForm({ name: '', description: '', price: '', image_url: '', stock: '', category: '' })
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-CR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Indira Store"
              className="h-8 w-auto"
            />
            <span className="text-sm font-medium text-gray-500">Admin</span>
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 active:text-red-600 transition-colors px-3 py-2 touch-target"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="px-4">
          <nav className="flex gap-1">
            {[
              { id: 'products' as Tab, label: 'Productos', icon: Package },
              { id: 'orders' as Tab, label: 'Pedidos', icon: ShoppingBag },
              { id: 'promos' as Tab, label: 'Promos', icon: Tag },
              { id: 'settings' as Tab, label: 'Config', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm',
                  activeTab === tab.id
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-500 border-transparent active:text-gray-700'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="px-3 py-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Gestión de Productos</h2>
                  <button
                    onClick={() => {
                      setEditingProduct(null)
                      setProductForm({ name: '', description: '', price: '', image_url: '', stock: '', category: '' })
                      setImagePreview(null)
                      setShowProductModal(true)
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Nuevo Producto
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                      <div className="aspect-video bg-gray-100 relative">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                              Agotado
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-lg font-bold text-indigo-600">{formatPrice(product.price)}</span>
                          <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => openEditModal(product)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {products.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay productos. Agrega el primero.</p>
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                <h2 className="text-lg font-semibold mb-6">Historial de Pedidos</h2>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{order.customer_name}</h3>
                            <p className="text-sm text-gray-500">{order.phone}</p>
                          </div>
                          <div className="text-right">
                            <span className={clsx(
                              'px-3 py-1 rounded-full text-xs font-medium',
                              order.status === 'pending' && 'bg-yellow-100 text-yellow-700',
                              order.status === 'confirmed' && 'bg-green-100 text-green-700',
                              order.status === 'cancelled' && 'bg-red-100 text-red-700'
                            )}>
                              {order.status === 'pending' ? 'Pendiente' : order.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
                            </span>
                            <p className="text-xs text-gray-400 mt-1">{formatDate(order.created_at)}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          {Array.isArray(order.items) && (order.items as { name: string; quantity: number; price: number }[]).map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-sm py-1">
                              <span>{item.name} x{item.quantity}</span>
                              <span className="text-gray-600">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between font-bold pt-2 mt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span className="text-indigo-600">{formatPrice(order.total)}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {order.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              Confirmar Entrega
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancelar
                            </button>
                          </div>
                        )}

                        {order.status === 'confirmed' && (
                          <div className="flex items-center gap-2 mt-4 p-3 bg-green-50 rounded-lg">
                            <Check className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-700">Pedido entregado - Stock actualizado</span>
                          </div>
                        )}

                        {order.status === 'cancelled' && (
                          <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 rounded-lg">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="text-sm text-red-700">Pedido cancelado - Stock devuelto</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {orders.length === 0 && (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay pedidos aún.</p>
                  </div>
                )}
              </div>
            )}

            {/* Promos Tab */}
            {activeTab === 'promos' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Gestión de Promociones</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {selectedProducts.length} seleccionados
                    </span>
                    {selectedProducts.length > 0 && (
                      <button
                        onClick={() => setSelectedProducts([])}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Limpiar selección
                      </button>
                    )}
                  </div>
                </div>

                {/* Bulk Discount Controls */}
                <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descuento (%)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={bulkDiscount}
                          onChange={(e) => setBulkDiscount(e.target.value)}
                          className="w-24 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-500 outline-none text-center"
                          placeholder="0"
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                    </div>
                    <button
                      onClick={handleBulkDiscount}
                      disabled={selectedProducts.length === 0 || isUpdatingDiscount}
                      className={clsx(
                        'px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                        selectedProducts.length === 0 || isUpdatingDiscount
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      )}
                    >
                      {isUpdatingDiscount ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Aplicando...
                        </>
                      ) : (
                        <>
                          <Percent className="w-4 h-4" />
                          Aplicar Descuento
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Selecciona productos y aplica un descuento porcentual. Usa 0% para eliminar descuentos.
                  </p>
                </div>

                {/* Products Grid */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  {/* Select All Header */}
                  <div className="border-b p-3 bg-gray-50 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={handleSelectAllProducts}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Seleccionar todos ({products.length})
                    </span>
                  </div>

                  {/* Products List */}
                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {products.map((product) => {
                      const isSelected = selectedProducts.includes(product.id)
                      const discount = (product as Product & { discount_percentage?: number }).discount_percentage || 0
                      const hasDiscount = discount > 0

                      return (
                        <div
                          key={product.id}
                          className={clsx(
                            'p-4 flex items-center gap-4 cursor-pointer transition-colors',
                            isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                          )}
                          onClick={() => handleSelectProduct(product.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectProduct(product.id)}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                            <p className="text-sm text-gray-500">Stock: {product.stock}</p>
                          </div>
                          <div className="text-right">
                            <div className={clsx('font-bold', hasDiscount ? 'text-gray-400 line-through text-sm' : 'text-indigo-600')}>
                              {formatPrice(product.price)}
                            </div>
                            {hasDiscount && (
                              <div className="text-lg font-bold text-indigo-600">
                                {formatPrice(product.price * (1 - discount / 100))}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {hasDiscount ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                -{discount}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                Sin desc.
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {products.length === 0 && (
                    <div className="text-center py-12">
                      <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No hay productos para promocionar.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="max-w-lg">
                <h2 className="text-lg font-semibold mb-6">Configuración de Telegram</h2>
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bot Token
                    </label>
                    <input
                      type="password"
                      value={settings.telegram_bot_token}
                      onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-colors"
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chat ID
                    </label>
                    <input
                      type="text"
                      value={settings.telegram_chat_id}
                      onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-colors"
                      placeholder="-1001234567890"
                    />
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Guardar Configuración
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio (CRC)</label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none"
                  step="0.01"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagen del Producto</label>

                {/* Image Preview */}
                {(imagePreview || productForm.image_url) ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 mb-3">
                    <img
                      src={imagePreview || productForm.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null)
                        setProductForm({ ...productForm, image_url: '' })
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Toca para subir imagen</span>
                        <span className="text-xs text-gray-400 mt-1">JPG, PNG, WebP (max 5MB)</span>
                      </>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Alternative: URL input */}
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">o pega una URL</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <input
                    type="url"
                    value={productForm.image_url && !imagePreview ? productForm.image_url : ''}
                    onChange={(e) => {
                      setProductForm({ ...productForm, image_url: e.target.value })
                      setImagePreview(null)
                    }}
                    placeholder="https://..."
                    className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <div className="relative">
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value as CategoryId })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none appearance-none bg-white pr-10"
                  >
                    <option value="">Sin categoría</option>
                    {SKINCARE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none"
                />
              </div>
              <button
                onClick={handleSaveProduct}
                disabled={isUploading}
                className={clsx(
                  'w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2',
                  isUploading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  editingProduct ? 'Guardar Cambios' : 'Crear Producto'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}