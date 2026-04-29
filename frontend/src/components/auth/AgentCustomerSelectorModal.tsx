'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Search, UserPlus, Check, Loader2, AlertCircle,
    User, Mail, Phone, ChevronRight, ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatError } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuthModal, SelectedCustomer } from '@/context/AuthModalContext'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

type View = 'search' | 'create'

interface CustomerSearchResult {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string | null
}

export function AgentCustomerSelectorModal() {
    const { isAgentSelectorOpen, closeAgentSelector, confirmCustomerSelection } = useAuthModal()

    const [view, setView] = useState<View>('search')
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchError, setSearchError] = useState('')

    const [selected, setSelected] = useState<CustomerSearchResult | null>(null)

    // Create form
    const [createForm, setCreateForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        send_credentials: false,
    })
    const [createLoading, setCreateLoading] = useState(false)
    const [createError, setCreateError] = useState('')

    // Reset on open
    useEffect(() => {
        if (isAgentSelectorOpen) {
            setView('search')
            setSearchQuery('')
            setSearchResults([])
            setSelected(null)
            setSearchError('')
            setCreateForm({ first_name: '', last_name: '', email: '', phone: '', send_credentials: false })
            setCreateError('')
        }
    }, [isAgentSelectorOpen])

    // Debounced search
    const doSearch = useCallback(async (q: string) => {
        setSearchLoading(true)
        setSearchError('')
        try {
            const res = await api.get(`/agent/customers/search?q=${encodeURIComponent(q)}`)
            setSearchResults(res.data || [])
        } catch (err: any) {
            setSearchError(formatError(err))
        } finally {
            setSearchLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!isAgentSelectorOpen) return
        const timer = setTimeout(() => doSearch(searchQuery), 350)
        return () => clearTimeout(timer)
    }, [searchQuery, isAgentSelectorOpen, doSearch])

    const handleConfirm = () => {
        if (!selected) return
        confirmCustomerSelection(selected as SelectedCustomer)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateError('')

        const { first_name, last_name, email, phone } = createForm

        // Basic presence validation
        if (!first_name.trim()) {
            setCreateError('First name is required.')
            return
        }
        if (!last_name.trim()) {
            setCreateError('Last name is required.')
            return
        }
        if (!email.trim()) {
            setCreateError('Email address is required.')
            return
        }

        // Length validation (already enforced by maxLength, but good for safety)
        if (first_name.length > 50 || last_name.length > 50 || email.length > 50 || (phone && phone.length > 50)) {
            setCreateError('Fields cannot exceed 50 characters.')
            return
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setCreateError('Please enter a valid email address.')
            return
        }

        // Phone format validation (if provided)
        if (phone && phone.trim()) {
            const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/
            if (!phoneRegex.test(phone)) {
                setCreateError('Please enter a valid phone number.')
                return
            }
        }

        setCreateLoading(true)
        try {
            const res = await api.post('/agent/customers/quick-create', {
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                email: email.trim(),
                phone: phone ? phone.trim() : null,
                send_credentials: createForm.send_credentials,
            })
            const newCustomer: CustomerSearchResult = res.data
            // Auto-select and confirm immediately
            confirmCustomerSelection(newCustomer as SelectedCustomer)
        } catch (err: any) {
            setCreateError(formatError(err))
        } finally {
            setCreateLoading(false)
        }
    }

    // Close on ESC
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAgentSelector() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [closeAgentSelector])

    if (!isAgentSelectorOpen) return null

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeAgentSelector}
                className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/30 to-[var(--primary-light)]/30 backdrop-blur-md"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="relative w-full max-w-[480px] max-h-[90vh] bg-white/90 backdrop-blur-2xl rounded-[28px] border border-white/60 shadow-[0_24px_64px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-black/5 shrink-0">
                    <div className="flex items-center gap-3">
                        {view === 'create' && (
                            <button
                                onClick={() => setView('search')}
                                className="p-1.5 rounded-xl bg-black/5 hover:bg-black/10 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 text-black/60" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-[17px] font-bold text-black tracking-tight">
                                {view === 'search' ? 'Who is this booking for?' : 'Create New Customer'}
                            </h2>
                            <p className="text-[12px] text-black/50 mt-0.5">
                                {view === 'search'
                                    ? 'Search for an existing customer or create a new one'
                                    : 'Fill in the customer details to proceed'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={closeAgentSelector}
                        className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-black/60 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 scrollbar-none">
                    <AnimatePresence mode="wait">
                        {view === 'search' ? (
                            <motion.div
                                key="search"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="px-6 pt-5 pb-6 flex flex-col gap-4"
                            >
                                {/* Search Input */}
                                <div className="relative group">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 group-focus-within:text-[var(--primary)] transition-colors" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name or email..."
                                        className="pl-10 h-11 bg-black/5 border-black/10 rounded-xl text-black placeholder:text-black/30 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                        autoFocus
                                    />
                                    {searchLoading && (
                                        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 animate-spin" />
                                    )}
                                </div>

                                {searchError && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {searchError}
                                    </div>
                                )}

                                {/* Results */}
                                <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto scrollbar-none pr-0.5">
                                    {searchResults.length === 0 && !searchLoading && (
                                        <p className="text-center text-black/40 text-sm py-6">
                                            {searchQuery ? 'No customers found' : 'Start typing to search customers'}
                                        </p>
                                    )}
                                    {searchResults.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelected(c)}
                                            className={cn(
                                                'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200',
                                                selected?.id === c.id
                                                    ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 shadow-sm'
                                                    : 'bg-black/[0.03] border-black/5 hover:bg-black/[0.06] hover:border-black/10'
                                            )}
                                        >
                                            {/* Avatar */}
                                            <div className={cn(
                                                'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors',
                                                selected?.id === c.id
                                                    ? 'bg-[var(--primary)] text-white'
                                                    : 'bg-black/10 text-black/60'
                                            )}>
                                                {c.first_name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-black text-sm truncate">
                                                    {c.first_name} {c.last_name}
                                                </p>
                                                <p className="text-black/50 text-xs truncate">{c.email}</p>
                                            </div>
                                            {selected?.id === c.id && (
                                                <Check className="w-4 h-4 text-[var(--primary)] shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Divider */}
                                <div className="relative flex items-center gap-3 my-1">
                                    <div className="flex-1 border-t border-black/8" />
                                    <span className="text-[11px] font-bold text-black/30 uppercase tracking-widest">or</span>
                                    <div className="flex-1 border-t border-black/8" />
                                </div>

                                {/* Create New Customer */}
                                <button
                                    onClick={() => setView('create')}
                                    className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-black/15 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 transition-all text-left group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--primary)]/20 transition-colors">
                                        <UserPlus className="w-4 h-4 text-[var(--primary)]" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-black text-sm">Create New Customer</p>
                                        <p className="text-black/40 text-xs">Add a new customer and proceed</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-black/30 ml-auto group-hover:text-[var(--primary)] transition-colors" />
                                </button>

                                {/* Confirm Button */}
                                <Button
                                    onClick={handleConfirm}
                                    disabled={!selected}
                                    className="w-full h-11 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white font-bold rounded-2xl shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {selected
                                        ? `Continue with ${selected.first_name} ${selected.last_name} →`
                                        : 'Select a customer to continue'}
                                </Button>
                            </motion.div>
                        ) : (
                            /* Create View */
                            <motion.div
                                key="create"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="px-6 pt-5 pb-6"
                            >
                                <form onSubmit={handleCreate} className="flex flex-col gap-4">
                                    {createError && (
                                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            {createError}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">First Name *</label>
                                            <Input
                                                value={createForm.first_name}
                                                onChange={(e) => setCreateForm(p => ({ ...p, first_name: e.target.value }))}
                                                placeholder="Aarav"
                                                className="h-11 bg-black/5 border-black/10 rounded-xl text-black focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                                                required
                                                maxLength={50}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Last Name *</label>
                                            <Input
                                                value={createForm.last_name}
                                                onChange={(e) => setCreateForm(p => ({ ...p, last_name: e.target.value }))}
                                                placeholder="Kumar"
                                                className="h-11 bg-black/5 border-black/10 rounded-xl text-black focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                                                required
                                                maxLength={50}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest flex items-center gap-1.5">
                                            <Mail className="w-3 h-3" /> Email *
                                        </label>
                                        <Input
                                            type="email"
                                            value={createForm.email}
                                            onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))}
                                            placeholder="customer@email.com"
                                            className="h-11 bg-black/5 border-black/10 rounded-xl text-black focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                                            required
                                            maxLength={50}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest flex items-center gap-1.5">
                                            <Phone className="w-3 h-3" /> Phone
                                        </label>
                                        <PhoneInput
                                            country={'in'}
                                            value={createForm.phone}
                                            onChange={(val) => setCreateForm(p => ({ ...p, phone: val }))}
                                            placeholder="+91 98765 43210"
                                            inputProps={{
                                                name: 'phone',
                                                required: false,
                                                maxLength: 50
                                            }}
                                            containerClass="!w-full !border-none"
                                            inputClass="!w-full !h-11 !bg-black/5 !border-black/10 !rounded-xl !text-black focus:!ring-[var(--primary)]/30 focus:!border-[var(--primary)] !transition-all !pl-12 !font-sans"
                                            buttonClass="!bg-transparent !border-none !rounded-l-xl hover:!bg-black/5 !transition-colors"
                                            dropdownClass="!rounded-xl !shadow-2xl !border-none !bg-white/90 !backdrop-blur-xl !py-2"
                                            searchClass="!rounded-lg !border-black/10 !mx-2 !mb-2"
                                            enableSearch={true}
                                        />
                                    </div>

                                    {/* Send credentials checkbox */}
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="relative mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={createForm.send_credentials}
                                                onChange={(e) => setCreateForm(p => ({ ...p, send_credentials: e.target.checked }))}
                                                className="sr-only"
                                            />
                                            <div className={cn(
                                                'w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center',
                                                createForm.send_credentials
                                                    ? 'bg-[var(--primary)] border-[var(--primary)]'
                                                    : 'bg-white border-black/20 group-hover:border-[var(--primary)]/40'
                                            )}>
                                                {createForm.send_credentials && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-black">Send login credentials to customer</p>
                                            <p className="text-xs text-black/40 mt-0.5">Auto-generated password will be emailed to the customer</p>
                                        </div>
                                    </label>

                                    <Button
                                        type="submit"
                                        disabled={createLoading}
                                        className="w-full h-11 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white font-bold rounded-2xl shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-2"
                                    >
                                        {createLoading
                                            ? <Loader2 className="w-5 h-5 animate-spin" />
                                            : 'Create & Continue Booking →'}
                                    </Button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer badge */}
                <div className="border-t border-black/5 px-6 py-3 bg-black/[0.02] text-center shrink-0">
                    <p className="text-[10px] text-black/30 font-bold uppercase tracking-wider">
                        🔒 Booking will be recorded under the selected customer's account
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
