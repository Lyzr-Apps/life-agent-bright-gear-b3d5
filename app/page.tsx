'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { cn, generateUUID } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  FiShoppingCart,
  FiCalendar,
  FiCoffee,
  FiShoppingBag,
  FiSend,
  FiArrowLeft,
  FiClock,
  FiCheck,
  FiX,
  FiSearch,
  FiSettings,
  FiHome,
  FiList,
  FiMapPin,
  FiPlus,
  FiChevronRight,
  FiPackage,
  FiEdit2,
  FiRefreshCw,
  FiAlertCircle,
  FiHeart,
  FiUser,
  FiTrash2,
  FiStar
} from 'react-icons/fi'
import { HiOutlineSparkles } from 'react-icons/hi'

// ─── TypeScript Interfaces ───────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: string
  agentData?: any
  type: 'text' | 'summary' | 'confirmation'
}

interface SavedRequest {
  id: string
  type: 'grocery' | 'appointment' | 'food' | 'shopping'
  description: string
  status: 'pending' | 'confirmed' | 'completed'
  timestamp: string
  agentData?: any
}

interface UserProfile {
  name: string
  email: string
  phone: string
}

interface UserAddress {
  label: string
  address: string
}

interface UserPreferences {
  dietary: string
  preferredStores: string
  defaultCuisine: string
  orderNotifications: boolean
  appointmentReminders: boolean
}

interface LifeEaseStats {
  tasksCompleted: number
  timeSaved: number
}

interface GroceryItem {
  name: string
  quantity: string
  estimated_price: string
  category: string
}

interface OrderSummary {
  items: GroceryItem[]
  estimated_total: string
  store: string
  status: string
}

interface AppointmentDetails {
  type: string
  provider: string
  date: string
  time: string
  location: string
  status: string
  calendar_event_created: boolean
  notes: string
}

interface FoodOrderItem {
  name: string
  price: string
  customizations: string
}

interface OrderDetails {
  restaurant: string
  items: FoodOrderItem[]
  estimated_total: string
  delivery_time: string
  delivery_address: string
  status: string
}

interface ProductRecommendation {
  name: string
  price: string
  rating: string
  store: string
  pros: string
  cons: string
}

interface PurchaseSummary {
  selected_product: string
  total_cost: string
  store: string
  status: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AGENT_IDS = {
  grocery: '69995811711ecaca449d0600',
  appointment: '69995811f43190cdde8496c7',
  food: '69995812fc4ac560ff186433',
  shopping: '69995812f43190cdde8496c9',
} as const

type AgentType = keyof typeof AGENT_IDS

const AGENT_INFO: Record<AgentType, { name: string; description: string; icon: React.ReactNode; color: string; quickReplies: string[] }> = {
  grocery: {
    name: 'Grocery Order Agent',
    description: 'Order groceries with AI assistance',
    icon: <FiShoppingCart className="w-5 h-5" />,
    color: 'text-green-400',
    quickReplies: ['I need weekly groceries', 'Order fruits and vegetables', 'Stock up on pantry essentials', 'Organic products only'],
  },
  appointment: {
    name: 'Appointment Booking Agent',
    description: 'Schedule appointments effortlessly',
    icon: <FiCalendar className="w-5 h-5" />,
    color: 'text-blue-400',
    quickReplies: ['Book a doctor appointment', 'Schedule a haircut', 'Reserve a restaurant table', 'Book a dentist visit'],
  },
  food: {
    name: 'Food Order Agent',
    description: 'Order food delivery in minutes',
    icon: <FiCoffee className="w-5 h-5" />,
    color: 'text-orange-400',
    quickReplies: ['I want pizza tonight', 'Order healthy lunch', 'Find Thai food near me', 'Something quick for dinner'],
  },
  shopping: {
    name: 'Shopping Assistant Agent',
    description: 'Find the best products and deals',
    icon: <FiShoppingBag className="w-5 h-5" />,
    color: 'text-purple-400',
    quickReplies: ['Find wireless headphones', 'Best running shoes under $100', 'Gift ideas for birthday', 'Compare laptops for work'],
  },
}

const SAMPLE_REQUESTS: SavedRequest[] = [
  { id: 's1', type: 'grocery', description: 'Weekly grocery order - fruits, milk, bread', status: 'completed', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: 's2', type: 'appointment', description: 'Dentist checkup - Dr. Smith at 2:00 PM', status: 'confirmed', timestamp: new Date(Date.now() - 172800000).toISOString() },
  { id: 's3', type: 'food', description: 'Thai food delivery from Bangkok Kitchen', status: 'completed', timestamp: new Date(Date.now() - 259200000).toISOString() },
  { id: 's4', type: 'shopping', description: 'Sony WH-1000XM5 headphones comparison', status: 'completed', timestamp: new Date(Date.now() - 345600000).toISOString() },
  { id: 's5', type: 'grocery', description: 'Party supplies - chips, drinks, snacks', status: 'pending', timestamp: new Date(Date.now() - 432000000).toISOString() },
]

const SAMPLE_CHAT_MESSAGES: Record<AgentType, ChatMessage[]> = {
  grocery: [
    { id: 'sg1', role: 'user', content: 'I need to order groceries for the week - fruits, vegetables, milk, and bread', timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'text' },
    { id: 'sg2', role: 'agent', content: 'I\'d be happy to help you put together your weekly grocery order! Here\'s what I\'ve found for you based on your request:', timestamp: new Date(Date.now() - 3500000).toISOString(), type: 'summary', agentData: { order_summary: { items: [{ name: 'Bananas (Organic)', quantity: '1 bunch', estimated_price: '$1.99', category: 'Fruits' }, { name: 'Strawberries', quantity: '1 lb', estimated_price: '$3.49', category: 'Fruits' }, { name: 'Baby Spinach', quantity: '5 oz', estimated_price: '$2.99', category: 'Vegetables' }, { name: 'Whole Milk', quantity: '1 gallon', estimated_price: '$4.29', category: 'Dairy' }, { name: 'Whole Wheat Bread', quantity: '1 loaf', estimated_price: '$3.49', category: 'Bakery' }], estimated_total: '$16.25', store: 'Whole Foods Market', status: 'pending' } } },
  ],
  appointment: [
    { id: 'sa1', role: 'user', content: 'I need to book a dentist appointment for next week', timestamp: new Date(Date.now() - 7200000).toISOString(), type: 'text' },
    { id: 'sa2', role: 'agent', content: 'I found a great option for your dental visit. Here are the appointment details:', timestamp: new Date(Date.now() - 7100000).toISOString(), type: 'summary', agentData: { appointment_details: { type: 'Dental Checkup', provider: 'Dr. Sarah Smith, DDS', date: 'March 5, 2026', time: '2:00 PM', location: '456 Health Ave, Suite 200', status: 'confirmed', calendar_event_created: true, notes: 'Regular checkup and cleaning. Please arrive 10 minutes early.' } } },
  ],
  food: [
    { id: 'sf1', role: 'user', content: 'I want to order Thai food for dinner tonight', timestamp: new Date(Date.now() - 5400000).toISOString(), type: 'text' },
    { id: 'sf2', role: 'agent', content: 'Great choice! I found a highly-rated Thai restaurant near you. Here\'s your order:', timestamp: new Date(Date.now() - 5300000).toISOString(), type: 'summary', agentData: { order_details: { restaurant: 'Bangkok Kitchen', items: [{ name: 'Pad Thai', price: '$14.99', customizations: 'Extra spicy, add shrimp' }, { name: 'Green Curry', price: '$16.99', customizations: 'Medium spice, with tofu' }, { name: 'Thai Iced Tea', price: '$4.99', customizations: 'Regular' }], estimated_total: '$36.97', delivery_time: '35-45 minutes', delivery_address: '123 Main St, Apt 4B', status: 'preparing' } } },
  ],
  shopping: [
    { id: 'ss1', role: 'user', content: 'I need wireless noise-cancelling headphones under $350', timestamp: new Date(Date.now() - 9000000).toISOString(), type: 'text' },
    { id: 'ss2', role: 'agent', content: 'I\'ve compared the top options for you. Here are my recommendations:', timestamp: new Date(Date.now() - 8900000).toISOString(), type: 'summary', agentData: { product_recommendations: [{ name: 'Sony WH-1000XM5', price: '$328.00', rating: '4.8/5', store: 'Amazon', pros: 'Best-in-class ANC, comfortable fit, 30hr battery', cons: 'No foldable design, touch controls can be finicky' }, { name: 'Bose QuietComfort Ultra', price: '$329.00', rating: '4.7/5', store: 'Best Buy', pros: 'Excellent ANC, spatial audio, premium build', cons: 'Slightly heavier, shorter battery life' }, { name: 'Apple AirPods Max', price: '$349.00', rating: '4.6/5', store: 'Apple Store', pros: 'Premium build, great with Apple devices, spatial audio', cons: 'Heavy, no USB-C on older models, expensive case' }], purchase_summary: { selected_product: 'Sony WH-1000XM5', total_cost: '$328.00', store: 'Amazon', status: 'ready_to_purchase' } } },
  ],
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHrs < 24) return `${diffHrs}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  } catch {
    return ''
  }
}

function parseAgentResponse(result: any): { message: string; data: any } {
  try {
    let agentData = result?.response?.result
    if (typeof agentData === 'string') {
      try {
        agentData = JSON.parse(agentData)
      } catch {
        // keep as string
      }
    }
    if (typeof agentData === 'string') {
      return { message: agentData, data: null }
    }
    const message = agentData?.message || result?.response?.message || ''
    return { message, data: agentData }
  } catch {
    return { message: result?.response?.message || 'Response received', data: null }
  }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function getStatusColor(status: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'completed' || s === 'confirmed') return 'bg-[hsl(160,70%,40%)] text-white'
  if (s === 'pending' || s === 'preparing') return 'bg-yellow-600 text-white'
  if (s === 'cancelled' || s === 'failed') return 'bg-red-600 text-white'
  return 'bg-[hsl(160,22%,15%)] text-[hsl(160,15%,60%)]'
}

function getTypeIcon(type: AgentType) {
  switch (type) {
    case 'grocery': return <FiShoppingCart className="w-4 h-4" />
    case 'appointment': return <FiCalendar className="w-4 h-4" />
    case 'food': return <FiCoffee className="w-4 h-4" />
    case 'shopping': return <FiShoppingBag className="w-4 h-4" />
  }
}

// ─── LocalStorage helpers ────────────────────────────────────────────────────

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: any) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

// ─── ErrorBoundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(160,30%,4%)] text-[hsl(160,20%,95%)]">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-[hsl(160,15%,60%)] mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-[hsl(160,70%,40%)] text-white rounded-xl text-sm font-medium">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-[hsl(160,70%,40%)]/20 flex items-center justify-center">
        <HiOutlineSparkles className="w-4 h-4 text-[hsl(160,70%,40%)]" />
      </div>
      <div className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[hsl(160,70%,40%)] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-[hsl(160,70%,40%)] animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-[hsl(160,70%,40%)] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

// ─── Grocery Summary Card ────────────────────────────────────────────────────

function GrocerySummaryCard({ data, onConfirm, onEdit }: { data: OrderSummary; onConfirm?: () => void; onEdit?: () => void }) {
  const items = Array.isArray(data?.items) ? data.items : []
  const categories = items.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    const cat = item?.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl overflow-hidden mt-2">
      <div className="px-4 py-3 border-b border-[hsl(160,22%,15%)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiShoppingCart className="w-4 h-4 text-[hsl(160,70%,40%)]" />
          <span className="font-semibold text-sm text-[hsl(160,20%,95%)]">Order Summary</span>
        </div>
        {data?.store && <span className="text-xs text-[hsl(160,15%,60%)]">{data.store}</span>}
      </div>
      <div className="px-4 py-3 space-y-3">
        {Object.entries(categories).map(([cat, catItems]) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-[hsl(160,70%,40%)] uppercase tracking-wider mb-1.5">{cat}</p>
            {catItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[hsl(160,20%,95%)]">{item?.name || 'Item'}</span>
                  <span className="text-xs text-[hsl(160,15%,60%)]">{item?.quantity || ''}</span>
                </div>
                <span className="text-sm font-medium text-[hsl(160,20%,95%)]">{item?.estimated_price || ''}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-[hsl(160,22%,15%)] flex items-center justify-between">
        <span className="text-sm font-semibold text-[hsl(160,20%,95%)]">Estimated Total</span>
        <span className="text-lg font-bold text-[hsl(160,70%,40%)]">{data?.estimated_total || '--'}</span>
      </div>
      {data?.status && (
        <div className="px-4 pb-3 flex items-center justify-between gap-2">
          <Badge className={cn('text-xs', getStatusColor(data.status))}>{data.status}</Badge>
          <div className="flex gap-2">
            {onEdit && <button onClick={onEdit} className="text-xs text-[hsl(160,15%,60%)] hover:text-[hsl(160,70%,40%)] flex items-center gap-1 transition-colors"><FiEdit2 className="w-3 h-3" /> Edit</button>}
            {onConfirm && <button onClick={onConfirm} className="text-xs bg-[hsl(160,70%,40%)] text-white px-3 py-1 rounded-lg font-medium hover:bg-[hsl(160,70%,35%)] flex items-center gap-1 transition-colors"><FiCheck className="w-3 h-3" /> Confirm</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Appointment Summary Card ────────────────────────────────────────────────

function AppointmentSummaryCard({ data, onConfirm }: { data: AppointmentDetails; onConfirm?: () => void }) {
  return (
    <div className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl overflow-hidden mt-2">
      <div className="px-4 py-3 border-b border-[hsl(160,22%,15%)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiCalendar className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm text-[hsl(160,20%,95%)]">Appointment Details</span>
        </div>
        {data?.status && <Badge className={cn('text-xs', getStatusColor(data.status))}>{data.status}</Badge>}
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(160,15%,60%)] w-16">Type</span>
          <span className="text-sm font-medium text-[hsl(160,20%,95%)]">{data?.type || '--'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(160,15%,60%)] w-16">Provider</span>
          <span className="text-sm font-medium text-[hsl(160,20%,95%)]">{data?.provider || '--'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(160,15%,60%)] w-16">Date</span>
          <span className="text-sm font-medium text-[hsl(160,20%,95%)]">{data?.date || '--'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(160,15%,60%)] w-16">Time</span>
          <span className="text-sm font-medium text-[hsl(160,20%,95%)]">{data?.time || '--'}</span>
        </div>
        <div className="flex items-center gap-3">
          <FiMapPin className="w-3 h-3 text-[hsl(160,15%,60%)] flex-shrink-0" />
          <span className="text-sm text-[hsl(160,20%,95%)]">{data?.location || '--'}</span>
        </div>
        {data?.calendar_event_created && (
          <div className="flex items-center gap-2 text-[hsl(160,70%,40%)]">
            <FiCheck className="w-3 h-3" />
            <span className="text-xs font-medium">Added to calendar</span>
          </div>
        )}
        {data?.notes && (
          <div className="bg-[hsl(160,22%,15%)]/50 rounded-lg p-2.5 mt-1">
            <p className="text-xs text-[hsl(160,15%,60%)]">{data.notes}</p>
          </div>
        )}
      </div>
      {onConfirm && (
        <div className="px-4 py-3 border-t border-[hsl(160,22%,15%)] flex justify-end">
          <button onClick={onConfirm} className="text-xs bg-[hsl(160,70%,40%)] text-white px-4 py-1.5 rounded-lg font-medium hover:bg-[hsl(160,70%,35%)] flex items-center gap-1 transition-colors"><FiCheck className="w-3 h-3" /> Confirm</button>
        </div>
      )}
    </div>
  )
}

// ─── Food Order Summary Card ─────────────────────────────────────────────────

function FoodSummaryCard({ data, onConfirm, onEdit }: { data: OrderDetails; onConfirm?: () => void; onEdit?: () => void }) {
  const items = Array.isArray(data?.items) ? data.items : []

  return (
    <div className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl overflow-hidden mt-2">
      <div className="px-4 py-3 border-b border-[hsl(160,22%,15%)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiCoffee className="w-4 h-4 text-orange-400" />
          <span className="font-semibold text-sm text-[hsl(160,20%,95%)]">{data?.restaurant || 'Restaurant'}</span>
        </div>
        {data?.status && <Badge className={cn('text-xs', getStatusColor(data.status))}>{data.status}</Badge>}
      </div>
      <div className="px-4 py-3 space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start justify-between py-1">
            <div>
              <span className="text-sm text-[hsl(160,20%,95%)]">{item?.name || 'Item'}</span>
              {item?.customizations && <p className="text-xs text-[hsl(160,15%,60%)]">{item.customizations}</p>}
            </div>
            <span className="text-sm font-medium text-[hsl(160,20%,95%)] ml-3 flex-shrink-0">{item?.price || ''}</span>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-[hsl(160,22%,15%)] space-y-1.5">
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-[hsl(160,20%,95%)]">Estimated Total</span>
          <span className="text-lg font-bold text-orange-400">{data?.estimated_total || '--'}</span>
        </div>
        {data?.delivery_time && (
          <div className="flex items-center gap-1.5 text-[hsl(160,15%,60%)]">
            <FiClock className="w-3 h-3" />
            <span className="text-xs">{data.delivery_time}</span>
          </div>
        )}
        {data?.delivery_address && (
          <div className="flex items-center gap-1.5 text-[hsl(160,15%,60%)]">
            <FiMapPin className="w-3 h-3" />
            <span className="text-xs">{data.delivery_address}</span>
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-[hsl(160,22%,15%)] flex justify-end gap-2">
        {onEdit && <button onClick={onEdit} className="text-xs text-[hsl(160,15%,60%)] hover:text-orange-400 flex items-center gap-1 transition-colors"><FiEdit2 className="w-3 h-3" /> Edit</button>}
        {onConfirm && <button onClick={onConfirm} className="text-xs bg-orange-500 text-white px-3 py-1 rounded-lg font-medium hover:bg-orange-600 flex items-center gap-1 transition-colors"><FiCheck className="w-3 h-3" /> Confirm</button>}
      </div>
    </div>
  )
}

// ─── Shopping Summary Card ───────────────────────────────────────────────────

function ShoppingSummaryCard({ recommendations, summary }: { recommendations?: ProductRecommendation[]; summary?: PurchaseSummary }) {
  const items = Array.isArray(recommendations) ? recommendations : []

  return (
    <div className="mt-2 space-y-2">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((product, idx) => (
            <div key={idx} className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-[hsl(160,20%,95%)]">{product?.name || 'Product'}</h4>
                <span className="text-sm font-bold text-purple-400">{product?.price || '--'}</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                {product?.rating && (
                  <div className="flex items-center gap-1">
                    <FiStar className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-[hsl(160,15%,60%)]">{product.rating}</span>
                  </div>
                )}
                {product?.store && <span className="text-xs text-[hsl(160,15%,60%)]">{product.store}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {product?.pros && (
                  <div className="bg-[hsl(160,70%,40%)]/10 rounded-lg p-2">
                    <p className="text-xs font-medium text-[hsl(160,70%,40%)] mb-0.5">Pros</p>
                    <p className="text-xs text-[hsl(160,20%,95%)]">{product.pros}</p>
                  </div>
                )}
                {product?.cons && (
                  <div className="bg-red-500/10 rounded-lg p-2">
                    <p className="text-xs font-medium text-red-400 mb-0.5">Cons</p>
                    <p className="text-xs text-[hsl(160,20%,95%)]">{product.cons}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {summary && (
        <div className="bg-[hsl(160,30%,6%)] border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FiPackage className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-sm text-[hsl(160,20%,95%)]">Purchase Summary</span>
          </div>
          <div className="space-y-1.5">
            {summary?.selected_product && <div className="flex justify-between"><span className="text-xs text-[hsl(160,15%,60%)]">Product</span><span className="text-sm text-[hsl(160,20%,95%)]">{summary.selected_product}</span></div>}
            {summary?.store && <div className="flex justify-between"><span className="text-xs text-[hsl(160,15%,60%)]">Store</span><span className="text-sm text-[hsl(160,20%,95%)]">{summary.store}</span></div>}
            {summary?.total_cost && <div className="flex justify-between"><span className="text-xs text-[hsl(160,15%,60%)]">Total</span><span className="text-sm font-bold text-purple-400">{summary.total_cost}</span></div>}
            {summary?.status && <Badge className={cn('text-xs mt-1', getStatusColor(summary.status))}>{summary.status}</Badge>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Chat Interface ──────────────────────────────────────────────────────────

function ChatInterface({
  agentType,
  onBack,
  sampleMode,
  onSaveRequest,
}: {
  agentType: AgentType
  onBack: () => void
  sampleMode: boolean
  onSaveRequest: (req: SavedRequest) => void
}) {
  const agent = AGENT_INFO[agentType]
  const agentId = AGENT_IDS[agentType]
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId] = useState(() => generateUUID())
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (sampleMode) {
      setMessages(SAMPLE_CHAT_MESSAGES[agentType] || [])
    } else {
      setMessages([])
    }
  }, [sampleMode, agentType])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || inputValue.trim()
    if (!msg || isLoading) return
    setInputValue('')
    setError(null)

    const userMessage: ChatMessage = {
      id: generateUUID(),
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
      type: 'text',
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const result = await callAIAgent(msg, agentId, { session_id: sessionId })

      if (result.success) {
        const parsed = parseAgentResponse(result)
        const agentMessage: ChatMessage = {
          id: generateUUID(),
          role: 'agent',
          content: parsed.message || 'Here are the results:',
          timestamp: new Date().toISOString(),
          agentData: parsed.data,
          type: parsed.data ? 'summary' : 'text',
        }
        setMessages(prev => [...prev, agentMessage])

        // Save to requests
        if (parsed.data) {
          const req: SavedRequest = {
            id: generateUUID(),
            type: agentType,
            description: msg.length > 60 ? msg.substring(0, 60) + '...' : msg,
            status: 'pending',
            timestamp: new Date().toISOString(),
            agentData: parsed.data,
          }
          onSaveRequest(req)
        }
      } else {
        setError(result.error || 'Failed to get response from agent')
        const errorMessage: ChatMessage = {
          id: generateUUID(),
          role: 'agent',
          content: result.error || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
          type: 'text',
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (err) {
      setError('Network error. Please check your connection.')
      const errorMessage: ChatMessage = {
        id: generateUUID(),
        role: 'agent',
        content: 'Sorry, I encountered a network error. Please try again.',
        timestamp: new Date().toISOString(),
        type: 'text',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, agentId, sessionId, agentType, onSaveRequest])

  const handleConfirm = useCallback((msgData: any) => {
    const confirmMsg: ChatMessage = {
      id: generateUUID(),
      role: 'user',
      content: 'Please confirm and finalize this order.',
      timestamp: new Date().toISOString(),
      type: 'confirmation',
    }
    setMessages(prev => [...prev, confirmMsg])
    handleSend('Please confirm and finalize this order.')
  }, [handleSend])

  const renderSummaryCard = (msg: ChatMessage) => {
    const data = msg.agentData
    if (!data) return null

    if (agentType === 'grocery' && data?.order_summary) {
      return <GrocerySummaryCard data={data.order_summary} onConfirm={() => handleConfirm(data)} onEdit={() => handleSend('I want to edit my order')} />
    }
    if (agentType === 'appointment' && data?.appointment_details) {
      return <AppointmentSummaryCard data={data.appointment_details} onConfirm={() => handleConfirm(data)} />
    }
    if (agentType === 'food' && data?.order_details) {
      return <FoodSummaryCard data={data.order_details} onConfirm={() => handleConfirm(data)} onEdit={() => handleSend('I want to modify my order')} />
    }
    if (agentType === 'shopping') {
      const recs = Array.isArray(data?.product_recommendations) ? data.product_recommendations : []
      const ps = data?.purchase_summary
      if (recs.length > 0 || ps) {
        return <ShoppingSummaryCard recommendations={recs} summary={ps} />
      }
    }
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(160,22%,15%)] bg-[hsl(160,30%,5%)]">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-[hsl(160,22%,15%)] flex items-center justify-center hover:bg-[hsl(160,22%,20%)] transition-colors">
          <FiArrowLeft className="w-4 h-4 text-[hsl(160,20%,95%)]" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', agentType === 'grocery' ? 'bg-green-500/20' : agentType === 'appointment' ? 'bg-blue-500/20' : agentType === 'food' ? 'bg-orange-500/20' : 'bg-purple-500/20')}>
            <span className={agent.color}>{agent.icon}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[hsl(160,20%,95%)]">{agent.name}</p>
            <p className="text-xs text-[hsl(160,15%,60%)]">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[hsl(160,70%,40%)]/10">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(160,70%,40%)] animate-pulse" />
          <span className="text-xs text-[hsl(160,70%,40%)] font-medium">AI</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mb-4', agentType === 'grocery' ? 'bg-green-500/20' : agentType === 'appointment' ? 'bg-blue-500/20' : agentType === 'food' ? 'bg-orange-500/20' : 'bg-purple-500/20')}>
              <span className={cn('w-8 h-8', agent.color)}>{React.cloneElement(agent.icon as React.ReactElement, { className: 'w-8 h-8' })}</span>
            </div>
            <h3 className="text-lg font-semibold text-[hsl(160,20%,95%)] mb-1">{agent.name}</h3>
            <p className="text-sm text-[hsl(160,15%,60%)] max-w-xs">{agent.description}. Start by describing what you need below.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'agent' && (
              <div className="w-7 h-7 rounded-full bg-[hsl(160,70%,40%)]/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <HiOutlineSparkles className="w-3.5 h-3.5 text-[hsl(160,70%,40%)]" />
              </div>
            )}
            <div className={cn('max-w-[85%]', msg.role === 'user' ? '' : '')}>
              <div className={cn('rounded-2xl px-4 py-2.5', msg.role === 'user' ? 'bg-[hsl(160,70%,40%)] text-white rounded-br-md' : 'bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] text-[hsl(160,20%,95%)] rounded-bl-md')}>
                {msg.content && renderMarkdown(msg.content)}
              </div>
              {msg.role === 'agent' && msg.agentData && renderSummaryCard(msg)}
              <p className={cn('text-[10px] mt-1 px-1', msg.role === 'user' ? 'text-right text-[hsl(160,15%,60%)]' : 'text-[hsl(160,15%,60%)]')}>{formatTimestamp(msg.timestamp)}</p>
            </div>
          </div>
        ))}

        {isLoading && <TypingIndicator />}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
            <FiAlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><FiX className="w-3 h-3 text-red-400" /></button>
          </div>
        )}
      </div>

      {/* Quick Replies */}
      {messages.length === 0 && !isLoading && (
        <div className="px-4 pb-2">
          <p className="text-xs text-[hsl(160,15%,60%)] mb-2">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {agent.quickReplies.map((reply, idx) => (
              <button key={idx} onClick={() => handleSend(reply)} className="text-xs bg-[hsl(160,22%,15%)] text-[hsl(160,20%,95%)] px-3 py-1.5 rounded-full hover:bg-[hsl(160,22%,20%)] transition-colors border border-[hsl(160,22%,20%)]">
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-[hsl(160,22%,15%)] bg-[hsl(160,30%,5%)]">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={`Message ${agent.name}...`}
            disabled={isLoading}
            className="flex-1 bg-[hsl(160,22%,15%)] border border-[hsl(160,22%,20%)] rounded-xl px-4 py-2.5 text-sm text-[hsl(160,20%,95%)] placeholder:text-[hsl(160,15%,60%)] focus:outline-none focus:ring-1 focus:ring-[hsl(160,70%,40%)] disabled:opacity-50"
          />
          <button onClick={() => handleSend()} disabled={!inputValue.trim() || isLoading} className="w-10 h-10 rounded-xl bg-[hsl(160,70%,40%)] flex items-center justify-center hover:bg-[hsl(160,70%,35%)] transition-colors disabled:opacity-50 disabled:hover:bg-[hsl(160,70%,40%)]">
            <FiSend className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Screen ────────────────────────────────────────────────────────

function DashboardScreen({
  onSelectTask,
  sampleMode,
  requests,
  stats,
}: {
  onSelectTask: (type: AgentType) => void
  sampleMode: boolean
  requests: SavedRequest[]
  stats: LifeEaseStats
}) {
  const [greeting, setGreeting] = useState('Good day')

  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  const recentRequests = sampleMode
    ? SAMPLE_REQUESTS.slice(0, 5)
    : (Array.isArray(requests) ? requests : []).slice(-5).reverse()

  const taskCards: { type: AgentType; label: string; desc: string }[] = [
    { type: 'grocery', label: 'Order Groceries', desc: 'Fresh produce, pantry items & more' },
    { type: 'appointment', label: 'Book Appointment', desc: 'Doctors, salons, restaurants' },
    { type: 'food', label: 'Order Food', desc: 'Delivery from local restaurants' },
    { type: 'shopping', label: 'Shop Products', desc: 'Compare & find best deals' },
  ]

  const displayStats = sampleMode ? { tasksCompleted: 24, timeSaved: 12 } : stats

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-sm text-[hsl(160,15%,60%)] font-medium tracking-tight">LifeEase AI</p>
        <h1 className="text-2xl font-bold text-[hsl(160,20%,95%)] tracking-tight mt-0.5">{greeting}, User</h1>
      </div>

      {/* Stats Bar */}
      <div className="px-5 pb-4">
        <div className="flex gap-3">
          <div className="flex-1 bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <FiCheck className="w-4 h-4 text-[hsl(160,70%,40%)]" />
              <span className="text-xs text-[hsl(160,15%,60%)]">Tasks Done</span>
            </div>
            <p className="text-2xl font-bold text-[hsl(160,20%,95%)]">{displayStats?.tasksCompleted ?? 0}</p>
          </div>
          <div className="flex-1 bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <FiClock className="w-4 h-4 text-[hsl(160,70%,40%)]" />
              <span className="text-xs text-[hsl(160,15%,60%)]">Hours Saved</span>
            </div>
            <p className="text-2xl font-bold text-[hsl(160,20%,95%)]">{displayStats?.timeSaved ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Task Cards */}
      <div className="px-5 pb-4">
        <h2 className="text-sm font-semibold text-[hsl(160,20%,95%)] mb-3 tracking-tight">What can I help with?</h2>
        <div className="grid grid-cols-2 gap-3">
          {taskCards.map((card) => {
            const info = AGENT_INFO[card.type]
            const bgColor = card.type === 'grocery' ? 'from-green-500/10 to-green-500/5' : card.type === 'appointment' ? 'from-blue-500/10 to-blue-500/5' : card.type === 'food' ? 'from-orange-500/10 to-orange-500/5' : 'from-purple-500/10 to-purple-500/5'
            const borderHover = card.type === 'grocery' ? 'hover:border-green-500/30' : card.type === 'appointment' ? 'hover:border-blue-500/30' : card.type === 'food' ? 'hover:border-orange-500/30' : 'hover:border-purple-500/30'
            const shadowHover = card.type === 'grocery' ? 'hover:shadow-green-500/10' : card.type === 'appointment' ? 'hover:shadow-blue-500/10' : card.type === 'food' ? 'hover:shadow-orange-500/10' : 'hover:shadow-purple-500/10'

            return (
              <button key={card.type} onClick={() => onSelectTask(card.type)} className={cn('bg-gradient-to-br border border-[hsl(160,22%,15%)] rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg', bgColor, borderHover, shadowHover)}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', card.type === 'grocery' ? 'bg-green-500/20' : card.type === 'appointment' ? 'bg-blue-500/20' : card.type === 'food' ? 'bg-orange-500/20' : 'bg-purple-500/20')}>
                  <span className={info.color}>{info.icon}</span>
                </div>
                <p className="text-sm font-semibold text-[hsl(160,20%,95%)] mb-0.5 tracking-tight">{card.label}</p>
                <p className="text-xs text-[hsl(160,15%,60%)] leading-relaxed">{card.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-5 pb-24">
        <h2 className="text-sm font-semibold text-[hsl(160,20%,95%)] mb-3 tracking-tight">Recent Activity</h2>
        {recentRequests.length === 0 ? (
          <div className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl p-6 text-center">
            <FiClock className="w-8 h-8 text-[hsl(160,22%,15%)] mx-auto mb-2" />
            <p className="text-sm text-[hsl(160,15%,60%)]">No recent activity yet</p>
            <p className="text-xs text-[hsl(160,15%,60%)]/60 mt-1">Start by selecting a task above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentRequests.map((req) => (
              <div key={req.id} className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', req.type === 'grocery' ? 'bg-green-500/20' : req.type === 'appointment' ? 'bg-blue-500/20' : req.type === 'food' ? 'bg-orange-500/20' : 'bg-purple-500/20')}>
                  <span className={AGENT_INFO[req.type]?.color || 'text-white'}>{getTypeIcon(req.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[hsl(160,20%,95%)] truncate">{req.description}</p>
                  <p className="text-xs text-[hsl(160,15%,60%)]">{formatTimestamp(req.timestamp)}</p>
                </div>
                <Badge className={cn('text-[10px] flex-shrink-0', getStatusColor(req.status))}>{req.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── My Requests Screen ──────────────────────────────────────────────────────

function MyRequestsScreen({
  requests,
  sampleMode,
  onReorder,
}: {
  requests: SavedRequest[]
  sampleMode: boolean
  onReorder: (type: AgentType) => void
}) {
  const [filter, setFilter] = useState<'all' | AgentType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const allRequests = sampleMode ? SAMPLE_REQUESTS : (Array.isArray(requests) ? requests : [])
  const filteredRequests = allRequests.filter((req) => {
    if (filter !== 'all' && req.type !== filter) return false
    if (searchQuery && !req.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const filterTabs: { key: 'all' | AgentType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'grocery', label: 'Groceries' },
    { key: 'appointment', label: 'Appointments' },
    { key: 'food', label: 'Food' },
    { key: 'shopping', label: 'Shopping' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-bold text-[hsl(160,20%,95%)] tracking-tight">My Requests</h1>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(160,15%,60%)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests..."
            className="w-full bg-[hsl(160,22%,15%)] border border-[hsl(160,22%,20%)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[hsl(160,20%,95%)] placeholder:text-[hsl(160,15%,60%)] focus:outline-none focus:ring-1 focus:ring-[hsl(160,70%,40%)]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-5 pb-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors', filter === tab.key ? 'bg-[hsl(160,70%,40%)] text-white' : 'bg-[hsl(160,22%,15%)] text-[hsl(160,15%,60%)] hover:bg-[hsl(160,22%,20%)]')}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Request List */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FiList className="w-12 h-12 text-[hsl(160,22%,15%)] mb-3" />
            <p className="text-sm text-[hsl(160,15%,60%)] font-medium">No requests found</p>
            <p className="text-xs text-[hsl(160,15%,60%)]/60 mt-1">{searchQuery ? 'Try a different search term' : 'Your requests will appear here'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRequests.map((req) => (
              <RequestCard key={req.id} request={req} onReorder={() => onReorder(req.type)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RequestCard({ request, onReorder }: { request: SavedRequest; onReorder: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', request.type === 'grocery' ? 'bg-green-500/20' : request.type === 'appointment' ? 'bg-blue-500/20' : request.type === 'food' ? 'bg-orange-500/20' : 'bg-purple-500/20')}>
          <span className={AGENT_INFO[request.type]?.color || 'text-white'}>{getTypeIcon(request.type)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[hsl(160,20%,95%)] truncate">{request.description}</p>
          <p className="text-xs text-[hsl(160,15%,60%)]">{formatTimestamp(request.timestamp)}</p>
        </div>
        <Badge className={cn('text-[10px] flex-shrink-0', getStatusColor(request.status))}>{request.status}</Badge>
        <FiChevronRight className={cn('w-4 h-4 text-[hsl(160,15%,60%)] transition-transform flex-shrink-0', expanded ? 'rotate-90' : '')} />
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t border-[hsl(160,22%,15%)]">
          <div className="pt-3">
            {request.agentData ? (
              <div className="text-xs text-[hsl(160,15%,60%)]">
                <pre className="whitespace-pre-wrap break-words text-xs bg-[hsl(160,22%,15%)]/50 rounded-lg p-3">{JSON.stringify(request.agentData, null, 2)}</pre>
              </div>
            ) : (
              <p className="text-xs text-[hsl(160,15%,60%)]">No additional details available.</p>
            )}
            <button onClick={onReorder} className="mt-3 text-xs bg-[hsl(160,70%,40%)] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[hsl(160,70%,35%)] flex items-center gap-1.5 transition-colors">
              <FiRefreshCw className="w-3 h-3" /> Reorder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Settings Screen ─────────────────────────────────────────────────────────

function SettingsScreen({
  profile,
  setProfile,
  addresses,
  setAddresses,
  preferences,
  setPreferences,
}: {
  profile: UserProfile
  setProfile: (p: UserProfile) => void
  addresses: UserAddress[]
  setAddresses: (a: UserAddress[]) => void
  preferences: UserPreferences
  setPreferences: (p: UserPreferences) => void
}) {
  const [activeSection, setActiveSection] = useState<'profile' | 'addresses' | 'preferences' | 'notifications'>('profile')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const handleSave = () => {
    saveToStorage('lifeease_profile', profile)
    saveToStorage('lifeease_addresses', addresses)
    saveToStorage('lifeease_preferences', preferences)
    setSaveMessage('Settings saved successfully')
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const sections = [
    { key: 'profile' as const, label: 'Profile', icon: <FiUser className="w-4 h-4" /> },
    { key: 'addresses' as const, label: 'Addresses', icon: <FiMapPin className="w-4 h-4" /> },
    { key: 'preferences' as const, label: 'Preferences', icon: <FiHeart className="w-4 h-4" /> },
    { key: 'notifications' as const, label: 'Notifications', icon: <FiSettings className="w-4 h-4" /> },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-bold text-[hsl(160,20%,95%)] tracking-tight">Settings</h1>
      </div>

      {/* Section Tabs */}
      <div className="px-5 pb-4">
        <div className="flex gap-1.5 overflow-x-auto">
          {sections.map((s) => (
            <button key={s.key} onClick={() => setActiveSection(s.key)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors', activeSection === s.key ? 'bg-[hsl(160,70%,40%)] text-white' : 'bg-[hsl(160,22%,15%)] text-[hsl(160,15%,60%)] hover:bg-[hsl(160,22%,20%)]')}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {saveMessage && (
        <div className="mx-5 mb-3 px-3 py-2 bg-[hsl(160,70%,40%)]/10 border border-[hsl(160,70%,40%)]/20 rounded-xl flex items-center gap-2">
          <FiCheck className="w-4 h-4 text-[hsl(160,70%,40%)]" />
          <span className="text-xs text-[hsl(160,70%,40%)] font-medium">{saveMessage}</span>
        </div>
      )}

      <div className="px-5 pb-24">
        {/* Profile */}
        {activeSection === 'profile' && (
          <div className="space-y-4">
            <div className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl p-4 space-y-4">
              <div>
                <Label className="text-xs text-[hsl(160,15%,60%)] mb-1.5 block">Name</Label>
                <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full bg-[hsl(160,22%,15%)] border border-[hsl(160,22%,20%)] rounded-xl px-3 py-2 text-sm text-[hsl(160,20%,95%)] focus:outline-none focus:ring-1 focus:ring-[hsl(160,70%,40%)]" placeholder="Your name" />
              </div>
              <div>
                <Label className="text-xs text-[hsl(160,15%,60%)] mb-1.5 block">Email</Label>
                <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full bg-[hsl(160,22%,15%)] border border-[hsl(160,22%,20%)] rounded-xl px-3 py-2 text-sm text-[hsl(160,20%,95%)] focus:outline-none focus:ring-1 focus:ring-[hsl(160,70%,40%)]" placeholder="email@example.com" />
              </div>
              <div>
                <Label className="text-xs text-[hsl(160,15%,60%)] mb-1.5 block">Phone</Label>
                <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full bg-[hsl(160,22%,15%)] border border-[hsl(160,22%,20%)] rounded-xl px-3 py-2 text-sm text-[hsl(160,20%,95%)] focus:outline-none focus:ring-1 focus:ring-[hsl(160,70%,40%)]" placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-[hsl(160,70%,40%)] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[hsl(160,70%,35%)] transition-colors">Save Profile</button>
          </div>
        )}

        {/* Addresses */}
        {activeSection === 'addresses' && (
          <div className="space-y-3">
            {(Array.isArray(addresses) ? addresses : []).map((addr, idx) => (
              <div key={idx} className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <input value={addr.label} onChange={(e) => { const copy = [...addresses]; copy[idx] = { ...copy[idx], label: e.target.value }; setAddresses(copy) }} className="bg-transparent text-sm font-semibold text-[hsl(160,20%,95%)] focus:outline-none w-24" placeholder="Label" />
                  <button onClick={() => { const copy = addresses.filter((_, i) => i !== idx); setAddresses(copy) }} className="text-red-400 hover:text-red-300 transition-colors"><FiTrash2 className="w-3.5 h-3.5" /></button>
                </div>
                <input value={addr.address} onChange={(e) => { const copy = [...addresses]; copy[idx] = { ...copy[idx], address: e.target.value }; setAddresses(copy) }} className="w-full bg-[hsl(160,22%,15%)] border border-[hsl(160,22%,20%)] rounded-lg px-3 py-2 text-sm text-[hsl(160,20%,95%)] focus:outline-none focus:ring-1 focus:ring-[hsl(160,70%,40%)]" placeholder="Enter address" />
              </div>
            ))}
            <button onClick={() => setAddresses([...addresses, { label: 'New', address: '' }])} className="w-full border border-dashed border-[hsl(160,22%,20%)] rounded-xl py-3 text-sm text-[hsl(160,15%,60%)] hover:border-[hsl(160,70%,40%)] hover:text-[hsl(160,70%,40%)] transition-colors flex items-center justify-center gap-1.5">
              <FiPlus className="w-4 h-4" /> Add Address
            </button>
            <button onClick={handleSave} className="w-full bg-[hsl(160,70%,40%)] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[hsl(160,70%,35%)] transition-colors">Save Addresses</button>
          </div>
        )}

        {/* Preferences */}
        {activeSection === 'preferences' && (
          <div className="space-y-4">
            <div className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl p-4 space-y-4">
              <div>
                <Label className="text-xs text-[hsl(160,15%,60%)] mb-1.5 block">Dietary Restrictions</Label>
                <input value={preferences.dietary} onChange={(e) => setPreferences({ ...preferences, dietary: e.target.value })} className="w-full bg-[hsl(160,22%,15%)] border border-[hsl(160,22%,20%)] rounded-xl px-3 py-2 text-sm text-[hsl(160,20%,95%)] focus:outline-none focus:ring-1 focus:ring-[hsl(160,70%,40%)]" placeholder="e.g., Vegetarian, Gluten-free" />
              </div>
              <div>
                <Label className="text-xs text-[hsl(160,15%,60%)] mb-1.5 block">Preferred Stores</Label>
                <input value={preferences.preferredStores} onChange={(e) => setPreferences({ ...preferences, preferredStores: e.target.value })} className="w-full bg-[hsl(160,22%,15%)] border border-[hsl(160,22%,20%)] rounded-xl px-3 py-2 text-sm text-[hsl(160,20%,95%)] focus:outline-none focus:ring-1 focus:ring-[hsl(160,70%,40%)]" placeholder="e.g., Whole Foods, Trader Joe's" />
              </div>
              <div>
                <Label className="text-xs text-[hsl(160,15%,60%)] mb-1.5 block">Default Cuisine</Label>
                <input value={preferences.defaultCuisine} onChange={(e) => setPreferences({ ...preferences, defaultCuisine: e.target.value })} className="w-full bg-[hsl(160,22%,15%)] border border-[hsl(160,22%,20%)] rounded-xl px-3 py-2 text-sm text-[hsl(160,20%,95%)] focus:outline-none focus:ring-1 focus:ring-[hsl(160,70%,40%)]" placeholder="e.g., Italian, Thai, Mexican" />
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-[hsl(160,70%,40%)] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[hsl(160,70%,35%)] transition-colors">Save Preferences</button>
          </div>
        )}

        {/* Notifications */}
        {activeSection === 'notifications' && (
          <div className="space-y-3">
            <div className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[hsl(160,20%,95%)]">Order Updates</p>
                  <p className="text-xs text-[hsl(160,15%,60%)]">Get notified about order status changes</p>
                </div>
                <Switch checked={preferences.orderNotifications} onCheckedChange={(checked) => setPreferences({ ...preferences, orderNotifications: checked })} />
              </div>
            </div>
            <div className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[hsl(160,20%,95%)]">Appointment Reminders</p>
                  <p className="text-xs text-[hsl(160,15%,60%)]">Receive reminders before appointments</p>
                </div>
                <Switch checked={preferences.appointmentReminders} onCheckedChange={(checked) => setPreferences({ ...preferences, appointmentReminders: checked })} />
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-[hsl(160,70%,40%)] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[hsl(160,70%,35%)] transition-colors mt-4">Save Notifications</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Agent Status Panel ──────────────────────────────────────────────────────

function AgentStatusPanel({ activeAgentId }: { activeAgentId: string | null }) {
  const agents = [
    { id: AGENT_IDS.grocery, name: 'Grocery Agent', type: 'grocery' as AgentType },
    { id: AGENT_IDS.appointment, name: 'Appointment Agent', type: 'appointment' as AgentType },
    { id: AGENT_IDS.food, name: 'Food Order Agent', type: 'food' as AgentType },
    { id: AGENT_IDS.shopping, name: 'Shopping Agent', type: 'shopping' as AgentType },
  ]

  return (
    <div className="bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <HiOutlineSparkles className="w-3.5 h-3.5 text-[hsl(160,70%,40%)]" />
        <span className="text-xs font-semibold text-[hsl(160,20%,95%)]">AI Agents</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {agents.map((a) => (
          <div key={a.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[hsl(160,22%,15%)]/50">
            <span className={cn('w-1.5 h-1.5 rounded-full', activeAgentId === a.id ? 'bg-[hsl(160,70%,40%)] animate-pulse' : 'bg-[hsl(160,15%,60%)]/40')} />
            <span className={cn('text-[10px]', activeAgentId === a.id ? 'text-[hsl(160,70%,40%)] font-medium' : 'text-[hsl(160,15%,60%)]')}>{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function Page() {
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'chat' | 'requests' | 'settings'>('dashboard')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'settings'>('dashboard')
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('grocery')
  const [sampleMode, setSampleMode] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Persisted state
  const [requests, setRequests] = useState<SavedRequest[]>([])
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', phone: '' })
  const [addresses, setAddresses] = useState<UserAddress[]>([
    { label: 'Home', address: '' },
    { label: 'Work', address: '' },
  ])
  const [preferences, setPreferences] = useState<UserPreferences>({
    dietary: '',
    preferredStores: '',
    defaultCuisine: '',
    orderNotifications: true,
    appointmentReminders: true,
  })
  const [stats, setStats] = useState<LifeEaseStats>({ tasksCompleted: 0, timeSaved: 0 })

  // Load from localStorage on mount
  useEffect(() => {
    setRequests(loadFromStorage<SavedRequest[]>('lifeease_requests', []))
    setProfile(loadFromStorage<UserProfile>('lifeease_profile', { name: '', email: '', phone: '' }))
    setAddresses(loadFromStorage<UserAddress[]>('lifeease_addresses', [{ label: 'Home', address: '' }, { label: 'Work', address: '' }]))
    setPreferences(loadFromStorage<UserPreferences>('lifeease_preferences', { dietary: '', preferredStores: '', defaultCuisine: '', orderNotifications: true, appointmentReminders: true }))
    setStats(loadFromStorage<LifeEaseStats>('lifeease_stats', { tasksCompleted: 0, timeSaved: 0 }))
  }, [])

  // Save requests to localStorage when they change
  useEffect(() => {
    if (Array.isArray(requests) && requests.length > 0) {
      saveToStorage('lifeease_requests', requests)
    }
  }, [requests])

  const handleSelectTask = useCallback((type: AgentType) => {
    setSelectedAgentType(type)
    setActiveAgentId(AGENT_IDS[type])
    setCurrentScreen('chat')
  }, [])

  const handleBack = useCallback(() => {
    setCurrentScreen('dashboard')
    setActiveAgentId(null)
  }, [])

  const handleSaveRequest = useCallback((req: SavedRequest) => {
    setRequests(prev => [...prev, req])
    setStats(prev => {
      const updated = { tasksCompleted: prev.tasksCompleted + 1, timeSaved: prev.timeSaved + 0.5 }
      saveToStorage('lifeease_stats', updated)
      return updated
    })
  }, [])

  const handleTabSwitch = useCallback((tab: 'dashboard' | 'requests' | 'settings') => {
    setActiveTab(tab)
    setCurrentScreen(tab)
    if (tab !== 'dashboard') setActiveAgentId(null)
  }, [])

  const navItems = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: <FiHome className="w-5 h-5" /> },
    { key: 'requests' as const, label: 'Requests', icon: <FiList className="w-5 h-5" /> },
    { key: 'settings' as const, label: 'Settings', icon: <FiSettings className="w-5 h-5" /> },
  ]

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[hsl(160,30%,4%)] text-[hsl(160,20%,95%)] font-sans tracking-tight">
        {/* Mobile container */}
        <div className="max-w-md mx-auto h-screen flex flex-col relative">
          {/* Sample Data Toggle */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            <span className="text-[10px] text-[hsl(160,15%,60%)] font-medium">Sample Data</span>
            <Switch checked={sampleMode} onCheckedChange={setSampleMode} className="data-[state=checked]:bg-[hsl(160,70%,40%)]" />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            {currentScreen === 'dashboard' && (
              <DashboardScreen
                onSelectTask={handleSelectTask}
                sampleMode={sampleMode}
                requests={requests}
                stats={stats}
              />
            )}

            {currentScreen === 'chat' && (
              <ChatInterface
                agentType={selectedAgentType}
                onBack={handleBack}
                sampleMode={sampleMode}
                onSaveRequest={handleSaveRequest}
              />
            )}

            {currentScreen === 'requests' && (
              <MyRequestsScreen
                requests={requests}
                sampleMode={sampleMode}
                onReorder={handleSelectTask}
              />
            )}

            {currentScreen === 'settings' && (
              <SettingsScreen
                profile={profile}
                setProfile={setProfile}
                addresses={addresses}
                setAddresses={setAddresses}
                preferences={preferences}
                setPreferences={setPreferences}
              />
            )}
          </div>

          {/* Agent Status (visible on dashboard only) */}
          {currentScreen === 'dashboard' && (
            <div className="absolute bottom-20 left-5 right-5 z-40">
              <AgentStatusPanel activeAgentId={activeAgentId} />
            </div>
          )}

          {/* Bottom Navigation */}
          {currentScreen !== 'chat' && (
            <div className="bg-[hsl(160,30%,5%)] border-t border-[hsl(160,22%,15%)] px-6 py-2 flex items-center justify-around">
              {navItems.map((item) => (
                <button key={item.key} onClick={() => handleTabSwitch(item.key)} className={cn('flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-lg transition-colors', activeTab === item.key ? 'text-[hsl(160,70%,40%)]' : 'text-[hsl(160,15%,60%)] hover:text-[hsl(160,20%,95%)]')}>
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {activeTab === item.key && <span className="w-1 h-1 rounded-full bg-[hsl(160,70%,40%)] mt-0.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
