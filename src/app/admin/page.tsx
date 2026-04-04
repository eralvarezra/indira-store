'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Package, ShoppingBag, Settings, LogOut, Plus, Edit2, Trash2, X, Save, Loader2, Upload, Image as ImageIcon, Check, XCircle, Percent, Tag, ChevronDown, BarChart3, Calendar, Clock, Download, FolderOpen } from 'lucide-react'
import clsx from 'clsx'
import { Product, Order, Category } from '@/types/database.types'

type Tab = 'products' | 'orders' | 'promos' | 'categories' | 'reports' | 'settings'

interface WeekCycle {
  id: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  report_sent: boolean
  created_at: string
  updated_at: string
}

interface WeeklyReport {
  cycleId: string
  startDate: string
  endDate: string
  startDateFormatted: string
  endDateFormatted: string
  totalOrders: number
  inStockOrders: number
  preOrderCount: number
  inStockCount: number
  productCounts: Record<string, number>
  totalRevenue: number
}

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
    category: '',
  })
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Promos state
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [bulkDiscount, setBulkDiscount] = useState('')
  const [isUpdatingDiscount, setIsUpdatingDiscount] = useState(false)

  // Week cycles and reports state
  const [weekCycles, setWeekCycles] = useState<WeekCycle[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState<string>('all')
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showEditWeekModal, setShowEditWeekModal] = useState(false)
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null)
  const [editWeekForm, setEditWeekForm] = useState({ startDate: '', endDate: '' })

  // Categories state
  const [categories, setCategories] = useState<Category[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    icon: '',
    parent_id: '' as string | null,
    sort_order: 0,
  })

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
      const [productsRes, ordersRes, settingsRes, cyclesRes, categoriesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders'),
        fetch('/api/admin/settings'),
        fetch('/api/week-cycles'),
        fetch('/api/categories'),
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

      if (cyclesRes.ok) {
        const data = await cyclesRes.json()
        setWeekCycles(data.cycles || [])
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || [])
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

  // Weekly report functions
  const fetchWeeklyReport = async () => {
    setIsLoadingReport(true)
    try {
      const response = await fetch('/api/admin/weekly-report')
      if (response.ok) {
        const data = await response.json()
        setWeeklyReport(data.report)
      }
    } catch (error) {
      console.error('Error fetching weekly report:', error)
    } finally {
      setIsLoadingReport(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!confirm('¿Estás seguro de cerrar esta semana y generar el reporte? Esta acción no se puede deshacer.')) return

    setIsLoadingReport(true)
    try {
      const response = await fetch('/api/admin/weekly-report', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setWeeklyReport(data.report)
        fetchData()
        alert('Reporte semanal generado y enviado por Telegram')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al generar el reporte')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error al generar el reporte')
    } finally {
      setIsLoadingReport(false)
    }
  }

  const handleDownloadExcel = async () => {
    setIsDownloading(true)
    try {
      const url = selectedCycleId === 'all'
        ? '/api/reports/excel'
        : `/api/reports/excel?cycleId=${selectedCycleId}`

      const response = await fetch(url)
      if (!response.ok) throw new Error('Error downloading Excel')

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `reporte-indira-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading Excel:', error)
      alert('Error al descargar el reporte')
    } finally {
      setIsDownloading(false)
    }
  }

  const openEditWeekModal = (cycleId: string) => {
    const cycle = weekCycles.find(c => c.id === cycleId)
    if (!cycle) return

    // Format dates for date input (YYYY-MM-DD)
    const startDate = new Date(cycle.start_date).toISOString().slice(0, 10)
    const endDate = new Date(cycle.end_date).toISOString().slice(0, 10)

    setEditingCycleId(cycleId)
    setEditWeekForm({ startDate, endDate })
    setShowEditWeekModal(true)
  }

  const handleSaveEditWeek = async () => {
    if (!editingCycleId) return

    // Validate that start date is a Saturday
    const selectedDate = new Date(editWeekForm.startDate + 'T00:00:00')
    if (selectedDate.getDay() !== 6) {
      alert('La fecha de inicio debe ser un sábado')
      return
    }

    setIsLoadingReport(true)
    try {
      // Start: Saturday 00:00:00
      const startDateTime = new Date(editWeekForm.startDate + 'T00:00:00')
      // End: Friday 23:59:59 (6 days after Saturday)
      const endDateTime = new Date(editWeekForm.startDate + 'T00:00:00')
      endDateTime.setDate(endDateTime.getDate() + 6)
      endDateTime.setHours(23, 59, 59, 999)

      const response = await fetch('/api/week-cycles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: editingCycleId,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
        }),
      })

      if (response.ok) {
        await fetchData()
        setShowEditWeekModal(false)
        setEditingCycleId(null)
        alert('Semana actualizada correctamente')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al actualizar la semana')
      }
    } catch (error) {
      console.error('Error updating week cycle:', error)
      alert('Error al actualizar la semana')
    } finally {
      setIsLoadingReport(false)
    }
  }

  const handleDeleteWeekCycle = async (cycleId: string) => {
    const cycle = weekCycles.find(c => c.id === cycleId)
    if (!cycle) return

    if (cycle.status === 'open') {
      alert('No puedes eliminar la semana activa')
      return
    }

    if (!confirm('¿Estás seguro de eliminar esta semana? Esta acción no se puede deshacer.')) return

    setIsLoadingReport(true)
    try {
      const response = await fetch(`/api/week-cycles?id=${cycleId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData()
        alert('Semana eliminada correctamente')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al eliminar la semana')
      }
    } catch (error) {
      console.error('Error deleting week cycle:', error)
      alert('Error al eliminar la semana')
    } finally {
      setIsLoadingReport(false)
    }
  }

  // Filter orders by week cycle
  const filteredOrders = selectedCycleId === 'all'
    ? orders
    : orders.filter(order => order.week_cycle_id === selectedCycleId)

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      image_url: product.image_url || '',
      stock: product.stock.toString(),
      category: product.category || '',
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
              className="h-12 w-auto"
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
              { id: 'categories' as Tab, label: 'Categorías', icon: FolderOpen },
              { id: 'reports' as Tab, label: 'Reportes', icon: BarChart3 },
              { id: 'settings' as Tab, label: 'Config', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm',
                  activeTab === tab.id
                    ? 'text-[#E8775A] border-[#f6a07a]'
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
            <Loader2 className="w-8 h-8 animate-spin text-[#E8775A]" />
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
                    className="flex items-center gap-2 bg-[#f6a07a] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#e58e6a] transition-colors"
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
                          <span className="text-lg font-bold text-[#E8775A]">{formatPrice(product.price)}</span>
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Historial de Pedidos</h2>
                  {/* Week Cycle Filter */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <select
                      value={selectedCycleId}
                      onChange={(e) => setSelectedCycleId(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#f6a07a] outline-none"
                    >
                      <option value="all">Todos los pedidos</option>
                      {weekCycles.map((cycle) => (
                        <option key={cycle.id} value={cycle.id}>
                          {new Date(cycle.start_date).toLocaleDateString('es-CR', { month: 'short', day: 'numeric' })} - {new Date(cycle.end_date).toLocaleDateString('es-CR', { month: 'short', day: 'numeric' })}
                          {cycle.status === 'open' ? ' (Actual)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const orderItems = Array.isArray(order.items) ? order.items as { name: string; quantity: number; price: number; type?: 'in_stock' | 'pre_order' }[] : []
                    const hasPreOrder = orderItems.some(item => item.type === 'pre_order')

                    return (
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
                              {hasPreOrder && (
                                <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                  Pre-pedido
                                </span>
                              )}
                              <p className="text-xs text-gray-400 mt-1">{formatDate(order.created_at)}</p>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            {orderItems.map((item, index) => (
                              <div key={index} className="flex items-center justify-between text-sm py-1">
                                <span className="flex items-center gap-2">
                                  {item.name} x{item.quantity}
                                  {item.type === 'pre_order' && (
                                    <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                                      Pre-pedido
                                    </span>
                                  )}
                                </span>
                                <span className="text-gray-600">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between font-bold pt-2 mt-2 border-t border-gray-200">
                              <span>Total</span>
                              <span className="text-[#E8775A]">{formatPrice(order.total)}</span>
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
                    )
                  })}
                </div>

                {filteredOrders.length === 0 && (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay pedidos para mostrar.</p>
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
                          className="w-24 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-[#f6a07a] outline-none text-center"
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
                          : 'bg-[#f6a07a] text-white hover:bg-[#e58e6a]'
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
                      className="w-5 h-5 rounded border-gray-300 text-[#E8775A] focus:ring-indigo-500"
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
                            className="w-5 h-5 rounded border-gray-300 text-[#E8775A] focus:ring-indigo-500"
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
                            <div className={clsx('font-bold', hasDiscount ? 'text-gray-400 line-through text-sm' : 'text-[#E8775A]')}>
                              {formatPrice(product.price)}
                            </div>
                            {hasDiscount && (
                              <div className="text-lg font-bold text-[#E8775A]">
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

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Gestión de Categorías</h2>
                  <button
                    onClick={() => {
                      setEditingCategory(null)
                      setCategoryForm({ name: '', slug: '', icon: '', parent_id: null, sort_order: 0 })
                      setShowCategoryModal(true)
                    }}
                    className="flex items-center gap-2 bg-[#f6a07a] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#e58e6a] transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Nueva Categoría
                  </button>
                </div>

                {/* Main Categories */}
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                            <p className="text-sm text-gray-500">{category.subcategories?.length || 0} subcategorías</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCategory(category)
                              setCategoryForm({
                                name: category.name,
                                slug: category.slug,
                                icon: category.icon || '',
                                parent_id: null,
                                sort_order: category.sort_order,
                              })
                              setShowCategoryModal(true)
                            }}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Subcategories */}
                      {category.subcategories && category.subcategories.length > 0 && (
                        <div className="border-t bg-gray-50 p-3 space-y-2">
                          {category.subcategories.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span>{sub.icon}</span>
                                <span className="text-sm text-gray-700">{sub.name}</span>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingCategory(sub)
                                  setCategoryForm({
                                    name: sub.name,
                                    slug: sub.slug,
                                    icon: sub.icon || '',
                                    parent_id: sub.parent_id,
                                    sort_order: sub.sort_order,
                                  })
                                  setShowCategoryModal(true)
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              setEditingCategory(null)
                              setCategoryForm({
                                name: '',
                                slug: '',
                                icon: '',
                                parent_id: category.id,
                                sort_order: (category.subcategories?.length || 0) + 1,
                              })
                              setShowCategoryModal(true)
                            }}
                            className="w-full py-2 text-sm text-[#f6a07a] hover:bg-[#f6a07a]/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Agregar subcategoría
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {categories.length === 0 && (
                  <div className="text-center py-12">
                    <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay categorías. Crea la primera.</p>
                  </div>
                )}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Reporte Semanal</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchWeeklyReport()}
                      disabled={isLoadingReport}
                      className="flex items-center gap-2 px-4 py-2 bg-[#f6a07a] text-white rounded-lg font-medium hover:bg-[#e58e6a] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isLoadingReport ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4" />
                          Ver Reporte Actual
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadExcel}
                      disabled={isDownloading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Descargando...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Descargar Excel
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Current Week Info */}
                {weekCycles.find(c => c.status === 'open') && (
                  <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Semana Actual</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(weekCycles.find(c => c.status === 'open')!.start_date).toLocaleDateString('es-CR', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })} - {new Date(weekCycles.find(c => c.status === 'open')!.end_date).toLocaleDateString('es-CR', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Activa
                        </span>
                        <button
                          onClick={() => openEditWeekModal(weekCycles.find(c => c.status === 'open')!.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar fechas de la semana"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={handleGenerateReport}
                        disabled={isLoadingReport}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        <Clock className="w-4 h-4" />
                        Cerrar Semana y Generar Reporte
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Esto enviará el reporte a Telegram y creará una nueva semana.
                      </p>
                    </div>
                  </div>
                )}

                {/* Weekly Report */}
                {weeklyReport && (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Resumen de la Semana</h3>
                      <p className="text-sm text-gray-500">
                        {weeklyReport.startDateFormatted} - {weeklyReport.endDateFormatted}
                      </p>
                    </div>

                    <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-indigo-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-[#E8775A]">{weeklyReport.totalOrders}</div>
                        <div className="text-xs text-gray-600">Pedidos Totales</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{weeklyReport.inStockCount}</div>
                        <div className="text-xs text-gray-600">En Stock</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-amber-600">{weeklyReport.preOrderCount}</div>
                        <div className="text-xs text-gray-600">Pre-pedidos</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-purple-600">{formatPrice(weeklyReport.totalRevenue)}</div>
                        <div className="text-xs text-gray-600">Ingresos</div>
                      </div>
                    </div>

                    {/* Top Products */}
                    {Object.keys(weeklyReport.productCounts).length > 0 && (
                      <div className="p-4 border-t border-gray-100">
                        <h4 className="font-medium text-gray-900 mb-3">Productos Más Vendidos</h4>
                        <div className="space-y-2">
                          {Object.entries(weeklyReport.productCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([name, count]) => (
                              <div key={name} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{name}</span>
                                <span className="font-medium text-gray-900">{count} unidades</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {weeklyReport.preOrderCount > 0 && (
                      <div className="p-4 bg-amber-50 border-t border-amber-100">
                        <div className="flex items-start gap-2">
                          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Acción Requerida</p>
                            <p className="text-xs text-amber-700 mt-1">
                              Hay {weeklyReport.preOrderCount} productos en pre-pedido que necesitan ser ordenados a proveedores.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Past Weeks */}
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Semanas Anteriores</h3>
                  <div className="space-y-3">
                    {weekCycles.filter(c => c.status === 'closed').map((cycle) => (
                      <div key={cycle.id} className="bg-white rounded-xl shadow-sm border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(cycle.start_date).toLocaleDateString('es-CR', { month: 'short', day: 'numeric' })} - {new Date(cycle.end_date).toLocaleDateString('es-CR', { month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-sm text-gray-500">
                              {cycle.report_sent ? 'Reporte enviado' : 'Pendiente'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditWeekModal(cycle.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar semana"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteWeekCycle(cycle.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar semana"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {weekCycles.filter(c => c.status === 'closed').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No hay semanas anteriores
                      </div>
                    )}
                  </div>
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
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none transition-colors"
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
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none transition-colors"
                      placeholder="-1001234567890"
                    />
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    className="w-full bg-[#f6a07a] text-white py-3 rounded-xl font-semibold hover:bg-[#e58e6a] transition-colors flex items-center justify-center gap-2"
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio (CRC)</label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
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
                      <Loader2 className="w-8 h-8 text-[#E8775A] animate-spin" />
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
                    className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none text-sm"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <div className="relative">
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none appearance-none bg-white pr-10"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((cat) => (
                      <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>
                        <option value={cat.id}>{cat.icon} {cat.name} (principal)</option>
                        {cat.subcategories?.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.icon} {sub.name}
                          </option>
                        ))}
                      </optgroup>
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                />
              </div>
              <button
                onClick={handleSaveProduct}
                disabled={isUploading}
                className={clsx(
                  'w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2',
                  isUploading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#f6a07a] text-white hover:bg-[#e58e6a]'
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCategoryModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  placeholder="Nombre de la categoría"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  placeholder="categoria-url"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icono (emoji)</label>
                <input
                  type="text"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  placeholder="🧴"
                />
              </div>
              {!editingCategory && categoryForm.parent_id === null && (
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={categoryForm.parent_id !== null}
                      onChange={(e) => setCategoryForm({
                        ...categoryForm,
                        parent_id: e.target.checked ? categories[0]?.id || null : null
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Es subcategoría</span>
                  </label>
                </div>
              )}
              {categoryForm.parent_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría Padre</label>
                  <select
                    value={categoryForm.parent_id || ''}
                    onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value || null })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={async () => {
                  if (!categoryForm.name || !categoryForm.slug) {
                    alert('Nombre y slug son requeridos')
                    return
                  }
                  try {
                    const url = '/api/categories'
                    const method = editingCategory ? 'PUT' : 'POST'
                    const body = editingCategory
                      ? { ...categoryForm, id: editingCategory.id }
                      : categoryForm

                    const response = await fetch(url, {
                      method,
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    })

                    if (response.ok) {
                      setShowCategoryModal(false)
                      fetchData()
                    } else {
                      alert('Error al guardar la categoría')
                    }
                  } catch (error) {
                    console.error('Error saving category:', error)
                    alert('Error al guardar la categoría')
                  }
                }}
                className="w-full py-3 rounded-xl font-semibold bg-[#f6a07a] text-white hover:bg-[#e58e6a] transition-colors"
              >
                {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Week Modal */}
      {showEditWeekModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowEditWeekModal(false); setEditingCycleId(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {weekCycles.find(c => c.id === editingCycleId)?.status === 'open' ? 'Editar Semana Actual' : 'Editar Semana'}
              </h3>
              <button onClick={() => { setShowEditWeekModal(false); setEditingCycleId(null); }} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Inicio (Sábado)
                </label>
                <input
                  type="date"
                  value={editWeekForm.startDate}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value + 'T00:00:00')
                    const dayOfWeek = selectedDate.getDay()
                    // Saturday = 6
                    if (dayOfWeek !== 6) {
                      alert('Solo puedes seleccionar sábados como fecha de inicio')
                      return
                    }
                    const endDate = new Date(selectedDate)
                    endDate.setDate(selectedDate.getDate() + 6)
                    endDate.setHours(23, 59, 59, 999)
                    setEditWeekForm({
                      startDate: e.target.value,
                      endDate: endDate.toISOString().slice(0, 10)
                    })
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">La semana inicia el sábado a las 12:00 AM</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin (Viernes)</label>
                <div className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-700">
                  {editWeekForm.endDate ? new Date(editWeekForm.endDate + 'T23:59:59').toLocaleDateString('es-CR', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  }) : '-'}
                </div>
                <p className="text-xs text-gray-500 mt-1">La semana termina el viernes a las 11:59 PM</p>
              </div>
              <button
                onClick={handleSaveEditWeek}
                disabled={isLoadingReport}
                className="w-full py-3 rounded-xl font-semibold bg-[#f6a07a] text-white hover:bg-[#e58e6a] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoadingReport ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}