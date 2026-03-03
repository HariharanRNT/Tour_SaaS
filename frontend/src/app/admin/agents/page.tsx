'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'
import { Plus, Search, UserCheck, UserX, Shield, Trash2, Check, X, Eye, EyeOff, ChevronDown, Filter, MoreVertical, ArrowUpDown, Download, TrendingUp, Users, UserPlus, Calendar } from 'lucide-react'
import { toast } from 'react-toastify'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { Country, State, City } from 'country-state-city'
import { ICountry, IState, ICity } from 'country-state-city'
import { motion, AnimatePresence } from 'framer-motion'


interface Agent {
    id: string
    email: string
    first_name: string
    last_name: string
    phone?: string
    is_active: boolean
    approval_status: 'pending' | 'approved' | 'rejected'
    created_at: string
}

export default function AdminAgentsPage() {
    const router = useRouter()
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
    const [showPassword, setShowPassword] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState(0)

    // Sorting state
    const [sortColumn, setSortColumn] = useState<'name' | 'email' | 'created_at' | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Bulk selection state
    const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())

    // Date filter state
    const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all')

    // Stats state
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        newThisMonth: 0,
        totalBookings: 0
    })

    // Create Agent Form State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [formTouched, setFormTouched] = useState(false)
    const [newAgent, setNewAgent] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        // Extended Fields
        agency_name: '',
        company_legal_name: '',
        business_address: '',
        country: 'IN',
        state: '',
        city: '',
        gst_no: '',
        tax_id: '',
        domain: '',
        currency: 'INR',
        commission_type: 'percentage',
        commission_value: '0'
    })

    // Geographic state
    const [allCountries] = useState<ICountry[]>(Country.getAllCountries())
    const [countryStates, setCountryStates] = useState<IState[]>(State.getStatesOfCountry('IN'))
    const [stateCities, setStateCities] = useState<ICity[]>([])

    // Delete Confirmation State
    const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)

    // Edit Agent State
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [editForm, setEditForm] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        agency_name: '',
        company_legal_name: '',
        business_address: '',
        country: '',
        state: '',
        city: '',
        gst_no: '',
        tax_id: '',
        domain: '',
        currency: '',
        commission_type: '',
        commission_value: ''
    })

    // Validation states
    const [emailValid, setEmailValid] = useState<boolean | null>(null)

    const loadAgents = useCallback(async (status: string = statusFilter) => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const url = new URL('http://localhost:8000/api/v1/admin/agents')
            if (status !== 'all') {
                url.searchParams.append('status', status)
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    router.push('/admin/login')
                    return
                }
                throw new Error('Failed to load agents')
            }

            const data = await response.json()
            setAgents(data)

            // Calculate stats
            const now = new Date()
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const newThisMonth = data.filter((agent: Agent) => new Date(agent.created_at) >= thisMonth).length

            setStats({
                total: data.length,
                active: data.filter((agent: Agent) => agent.is_active).length,
                newThisMonth,
                totalBookings: 0 // TODO: Fetch from API
            })
        } catch (error) {
            console.error('Failed to load agents:', error)
        } finally {
            setLoading(false)
        }
    }, [statusFilter, setLoading, setAgents, setStats, router])

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')

        if (!token || !userStr) {
            router.push('/admin/login')
            return
        }

        try {
            const user = JSON.parse(userStr)
            if (user.role !== 'admin') {
                router.push('/login')
                return
            }
        } catch (e) {
            router.push('/admin/login')
            return
        }

        loadAgents()
    }, [router, loadAgents])

    // Password strength calculator
    useEffect(() => {
        const password = newAgent.password
        let strength = 0
        if (password.length >= 8) strength++
        if (password.length >= 12) strength++
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
        if (/\d/.test(password)) strength++
        if (/[^a-zA-Z0-9]/.test(password)) strength++
        setPasswordStrength(strength)
    }, [newAgent.password])

    // Email validation
    useEffect(() => {
        if (newAgent.email.length === 0) {
            setEmailValid(null)
            return
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        setEmailValid(emailRegex.test(newAgent.email))
    }, [newAgent.email])

    const handleApprove = async (id: string) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/admin/agents/${id}/approve`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) throw new Error('Failed to approve agent')

            toast.success('Agent approved successfully')
            loadAgents()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleReject = async (id: string, reason: string = "") => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/admin/agents/${id}/reject`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            })

            if (!response.ok) throw new Error('Failed to reject agent')

            toast.success('Agent rejected')
            loadAgents()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleCreateAgent = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        try {
            const token = localStorage.getItem('token')
            const payload = {
                ...newAgent,
                country: Country.getCountryByCode(newAgent.country)?.name || newAgent.country,
                state: State.getStateByCodeAndCountry(newAgent.state, newAgent.country)?.name || newAgent.state,
                // Fix for 422: Convert empty strings to null or correct types
                commission_value: newAgent.commission_value ? Number(newAgent.commission_value) : 0,
                phone: newAgent.phone || null,
                gst_no: newAgent.gst_no || null,
                tax_id: newAgent.tax_id || null,
                agency_name: newAgent.agency_name || null,
                company_legal_name: newAgent.company_legal_name || null,
                business_address: newAgent.business_address || null,
                city: newAgent.city || null,
                domain: newAgent.domain || null,
            }
            const response = await fetch('http://localhost:8000/api/v1/admin/agents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    router.push('/admin/login')
                    toast.error('Session expired. Please login again.')
                    return
                }
                const error = await response.json()
                throw new Error(error.detail || 'Failed to create agent')
            }

            await loadAgents()
            setIsCreateOpen(false)
            setNewAgent({
                email: '', password: '', first_name: '', last_name: '', phone: '',
                agency_name: '', company_legal_name: '', business_address: '',
                country: 'IN', state: '', city: '', gst_no: '', tax_id: '', domain: '',
                currency: 'INR', commission_type: 'percentage', commission_value: '0'
            })
            setCountryStates(State.getStatesOfCountry('IN'))
            setStateCities([])
            setFormTouched(false)
            toast.success('Agent created successfully')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setCreating(false)
        }
    }

    const toggleStatus = async (agent: Agent) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/admin/agents/${agent.id}/status?is_active=${!agent.is_active}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) throw new Error('Failed to update status')

            loadAgents()
            toast.success(`Agent ${!agent.is_active ? 'activated' : 'deactivated'} successfully`)
        } catch (error) {
            console.error('Failed to toggle status:', error)
            toast.error('Failed to update status')
        }
    }

    const handleDeleteClick = (agent: Agent) => {
        setDeleteAgent(agent)
    }

    const confirmDelete = async () => {
        if (!deleteAgent) return

        setIsDeleting(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/admin/agents/${deleteAgent.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || 'Failed to delete agent')
            }

            await loadAgents()
            toast.success('Agent has been deleted.')
            setDeleteAgent(null)
        } catch (error: any) {
            console.error('Failed to delete agent:', error)
            toast.error(error.message)
        } finally {
            setIsDeleting(false)
        }
    }

    const handleEditClick = (agent: any) => {
        setEditingAgent(agent)
        setEditForm({
            first_name: agent.first_name || '',
            last_name: agent.last_name || '',
            phone: agent.phone || '',
            agency_name: agent.agency_name || '',
            company_legal_name: agent.company_legal_name || '',
            business_address: agent.business_address || '',
            country: agent.country || 'IN',
            state: agent.state || '',
            city: agent.city || '',
            gst_no: agent.gst_no || '',
            tax_id: agent.tax_id || '',
            domain: agent.domain || '',
            currency: agent.currency || 'INR',
            commission_type: agent.commission_type || 'percentage',
            commission_value: agent.commission_value ? String(agent.commission_value) : '0'
        })

        // Load states for the country
        const countryCode = agent.country || 'IN';
        setCountryStates(State.getStatesOfCountry(countryCode));

        // Load cities if state is present
        if (agent.state) {
            setStateCities(City.getCitiesOfState(countryCode, agent.state));
        }

        setIsEditOpen(true)
    }

    const handleUpdateAgent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingAgent) return

        setIsUpdating(true)
        try {
            const token = localStorage.getItem('token')
            const payload = {
                ...editForm,
                country: Country.getCountryByCode(editForm.country)?.name || editForm.country,
                state: State.getStateByCodeAndCountry(editForm.state, editForm.country)?.name || editForm.state,
                commission_value: editForm.commission_value ? Number(editForm.commission_value) : 0,
                phone: editForm.phone || null,
                gst_no: editForm.gst_no || null,
                tax_id: editForm.tax_id || null,
                agency_name: editForm.agency_name || null,
                company_legal_name: editForm.company_legal_name || null,
                business_address: editForm.business_address || null,
                city: editForm.city || null,
                domain: editForm.domain || null,
            }

            const response = await fetch(`http://localhost:8000/api/v1/admin/agents/${editingAgent.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || 'Failed to update agent')
            }

            await loadAgents()
            setIsEditOpen(false)
            toast.success('Agent updated successfully')
        } catch (error: any) {
            console.error('Failed to update agent:', error)
            toast.error(error.message)
        } finally {
            setIsUpdating(false)
        }
    }

    // Helper functions
    const handleSort = (column: 'name' | 'email' | 'created_at') => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const handleSelectAll = () => {
        if (selectedAgents.size === filteredAndSortedAgents.length) {
            setSelectedAgents(new Set())
        } else {
            setSelectedAgents(new Set(filteredAndSortedAgents.map(a => a.id)))
        }
    }

    const handleSelectAgent = (agentId: string) => {
        const newSelected = new Set(selectedAgents)
        if (newSelected.has(agentId)) {
            newSelected.delete(agentId)
        } else {
            newSelected.add(agentId)
        }
        setSelectedAgents(newSelected)
    }

    const handleBulkDelete = async () => {
        setShowBulkDeleteDialog(false)

        const count = selectedAgents.size
        try {
            const token = localStorage.getItem('token')
            await Promise.all(
                Array.from(selectedAgents).map(id =>
                    fetch(`http://localhost:8000/api/v1/admin/agents/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                )
            )
            await loadAgents()
            setSelectedAgents(new Set())
            toast.success(`Successfully deleted ${count} agent${count > 1 ? 's' : ''}`)
        } catch (error) {
            console.error('Failed to delete agents:', error)
            toast.error('Failed to delete agents. Please try again.')
        }
    }

    const handleBulkStatusChange = async (isActive: boolean) => {
        try {
            const token = localStorage.getItem('token')
            await Promise.all(
                Array.from(selectedAgents).map(id =>
                    fetch(`http://localhost:8000/api/v1/admin/agents/${id}/status?is_active=${isActive}`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                )
            )
            await loadAgents()
            setSelectedAgents(new Set())
            toast.success(`${selectedAgents.size} agents ${isActive ? 'activated' : 'deactivated'}`)
        } catch (error) {
            toast.error('Failed to update agents')
        }
    }

    const clearFilters = () => {
        setStatusFilter('all')
        setDateFilter('all')
        setSearchQuery('')
    }

    const activeFilterCount = [
        statusFilter !== 'all' ? 1 : 0,
        dateFilter !== 'all' ? 1 : 0,
        searchQuery ? 1 : 0
    ].reduce((a, b) => a + b, 0)

    // Filtering and sorting
    const filteredAndSortedAgents = agents.filter(agent => {
        const matchesSearch = agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.last_name.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && agent.is_active) ||
            (statusFilter === 'inactive' && !agent.is_active)

        const matchesDate = (() => {
            if (dateFilter === 'all') return true
            const createdDate = new Date(agent.created_at)
            const now = new Date()
            if (dateFilter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                return createdDate >= weekAgo
            }
            if (dateFilter === 'month') {
                const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
                return createdDate >= monthAgo
            }
            if (dateFilter === 'year') {
                const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
                return createdDate >= yearAgo
            }
            return true
        })()

        return matchesSearch && matchesStatus && matchesDate
    }).sort((a, b) => {
        if (!sortColumn) return 0

        let aValue: any, bValue: any

        if (sortColumn === 'name') {
            aValue = `${a.first_name} ${a.last_name}`.toLowerCase()
            bValue = `${b.first_name} ${b.last_name}`.toLowerCase()
        } else if (sortColumn === 'email') {
            aValue = a.email.toLowerCase()
            bValue = b.email.toLowerCase()
        } else if (sortColumn === 'created_at') {
            aValue = new Date(a.created_at).getTime()
            bValue = new Date(b.created_at).getTime()
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
    })

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedAgents.length / itemsPerPage)
    const paginatedAgents = filteredAndSortedAgents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, statusFilter, dateFilter])

    const filteredAgents = agents.filter(agent => {
        const matchesSearch = agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.last_name.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && agent.is_active) ||
            (statusFilter === 'inactive' && !agent.is_active)

        return matchesSearch && matchesStatus
    })

    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 1) return 'bg-red-500'
        if (passwordStrength <= 3) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    const getPasswordStrengthText = () => {
        if (passwordStrength <= 1) return 'Weak'
        if (passwordStrength <= 3) return 'Medium'
        return 'Strong'
    }

    return (
        <div className="p-8 md:p-10 lg:p-12 bg-[#F8FAFF] min-h-screen">
            <div className="max-w-[1536px] mx-auto space-y-10">


                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-indigo-100/50">
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/admin/dashboard')}
                            className="mb-4 p-0 h-auto hover:bg-transparent text-indigo-600 font-bold flex items-center gap-1 group"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Dashboard
                        </Button>
                        <motion.h1
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="text-[28px] font-bold text-[#0F172A] tracking-tight font-['Plus_Jakarta_Sans',sans-serif]"
                        >
                            Agent <span className="text-[#6366F1]">Management</span>
                        </motion.h1>
                        <p className="text-slate-500 mt-4 text-lg font-medium">Manage travel agents and their system permissions.</p>
                    </div>


                    <div className="flex items-center gap-2">
                        <Dialog open={isCreateOpen} onOpenChange={(open) => {
                            if (!open && formTouched) {
                                if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                                    setIsCreateOpen(false)
                                    setFormTouched(false)
                                }
                            } else {
                                setIsCreateOpen(open)
                            }
                        }}>
                            <DialogTrigger asChild>
                                <motion.div
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button className="bg-gradient-to-br from-[#6366F1] to-[#4F46E5] hover:shadow-[0_8px_24px_rgba(99,102,241,0.45)] text-white font-bold shadow-[0_4px_16px_rgba(99,102,241,0.35)] rounded-[12px] h-[44px] px-[24px] transition-all duration-200">
                                        <Plus className="mr-2 h-[16px] w-[16px]" />
                                        <span className="text-[14px] font-bold">Add New Agent</span>
                                    </Button>
                                </motion.div>

                            </DialogTrigger>

                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl">Add New Agent</DialogTitle>
                                    <DialogDescription>
                                        Create a new agent account. They will be able to log in immediately.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateAgent} className="space-y-8">
                                    {/* Collapsible Sections */}
                                    <Accordion type="multiple" defaultValue={[]} className="space-y-4">
                                        {/* Agency Details */}
                                        <AccordionItem value="agency" className="border rounded-lg px-6 bg-purple-50/50 border-purple-100">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                                    <Shield className="h-5 w-5 text-purple-600" />
                                                    Agency Details
                                                </h3>
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-4 pb-4 px-1">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="agency_name" className="font-semibold">Agency Name *</Label>
                                                        <Input
                                                            id="agency_name"
                                                            required
                                                            placeholder="Your Travel Agency"
                                                            value={newAgent.agency_name}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, agency_name: e.target.value })
                                                                setFormTouched(true)
                                                            }}
                                                            className="h-11"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="company_legal_name" className="font-semibold">Company Legal Name *</Label>
                                                        <Input
                                                            id="company_legal_name"
                                                            required
                                                            placeholder="Legal entity name"
                                                            value={newAgent.company_legal_name}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, company_legal_name: e.target.value })
                                                                setFormTouched(true)
                                                            }}
                                                            className="h-11"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="domain" className="font-semibold">Website / Domain Name *</Label>
                                                    <Input
                                                        id="domain"
                                                        required
                                                        placeholder="example.com"
                                                        value={newAgent.domain}
                                                        onChange={e => {
                                                            setNewAgent({ ...newAgent, domain: e.target.value })
                                                            setFormTouched(true)
                                                        }}
                                                        className="h-11"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="business_address" className="font-semibold">Business Address *</Label>
                                                    <Input
                                                        id="business_address"
                                                        required
                                                        placeholder="Street address, building, floor"
                                                        value={newAgent.business_address}
                                                        onChange={e => {
                                                            setNewAgent({ ...newAgent, business_address: e.target.value })
                                                            setFormTouched(true)
                                                        }}
                                                        className="h-11"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="country" className="font-semibold">Country *</Label>
                                                        <select
                                                            id="country"
                                                            required
                                                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                            value={newAgent.country}
                                                            onChange={e => {
                                                                const countryCode = e.target.value;
                                                                setNewAgent({ ...newAgent, country: countryCode, state: '', city: '' });
                                                                setCountryStates(State.getStatesOfCountry(countryCode));
                                                                setStateCities([]);
                                                                setFormTouched(true)
                                                            }}
                                                        >
                                                            {allCountries.map(c => (
                                                                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="state" className="font-semibold">State *</Label>
                                                        <select
                                                            id="state"
                                                            required
                                                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                            value={newAgent.state}
                                                            onChange={e => {
                                                                const stateCode = e.target.value;
                                                                setNewAgent({ ...newAgent, state: stateCode, city: '' });
                                                                setStateCities(City.getCitiesOfState(newAgent.country, stateCode));
                                                                setFormTouched(true)
                                                            }}
                                                        >
                                                            <option value="">Select State</option>
                                                            {countryStates.map(s => (
                                                                <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="city" className="font-semibold">City *</Label>
                                                        <select
                                                            id="city"
                                                            required
                                                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                            value={newAgent.city}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, city: e.target.value })
                                                                setFormTouched(true)
                                                            }}
                                                        >
                                                            <option value="">Select City</option>
                                                            {stateCities.map(c => (
                                                                <option key={c.name} value={c.name}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>

                                        {/* Personal Details */}
                                        <AccordionItem value="personal" className="border rounded-lg px-6 glass-card border-blue-100">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                                    <Shield className="h-5 w-5 text-blue-600" />
                                                    Contact Details
                                                </h3>
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-4 pb-4 px-1">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="first_name" className="font-semibold">First Name *</Label>
                                                        <Input
                                                            id="first_name"
                                                            required
                                                            placeholder="Enter first name"
                                                            value={newAgent.first_name}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, first_name: e.target.value })
                                                                setFormTouched(true)
                                                            }}
                                                            className="h-11"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="last_name" className="font-semibold">Last Name *</Label>
                                                        <Input
                                                            id="last_name"
                                                            required
                                                            placeholder="Enter last name"
                                                            value={newAgent.last_name}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, last_name: e.target.value })
                                                                setFormTouched(true)
                                                            }}
                                                            className="h-11"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="email" className="font-semibold">Email *</Label>
                                                        <div className="relative">
                                                            <Input
                                                                id="email"
                                                                type="email"
                                                                required
                                                                placeholder="agent@company.com"
                                                                value={newAgent.email}
                                                                onChange={e => {
                                                                    setNewAgent({ ...newAgent, email: e.target.value })
                                                                    setFormTouched(true)
                                                                }}
                                                                className="h-11 pr-10"
                                                            />
                                                            {emailValid !== null && (
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                    {emailValid ? (
                                                                        <Check className="h-5 w-5 text-green-500" />
                                                                    ) : (
                                                                        <X className="h-5 w-5 text-red-500" />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="phone" className="font-semibold">Mobile Number (Optional)</Label>
                                                        <PhoneInput
                                                            country={'in'}
                                                            value={newAgent.phone}
                                                            onChange={phone => {
                                                                setNewAgent({ ...newAgent, phone })
                                                                setFormTouched(true)
                                                            }}
                                                            inputProps={{
                                                                name: 'phone',
                                                                id: 'phone'
                                                            }}
                                                            containerClass="w-full !rounded-md"
                                                            inputClass="!w-full !h-11 !text-sm !border-gray-200 !rounded-md"
                                                            buttonClass="!border-gray-200 !rounded-l-md !bg-white"
                                                            dropdownClass="!rounded-md !shadow-lg"
                                                            enableSearch={true}
                                                            searchPlaceholder="Search country..."
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="password" className="font-semibold">Password *</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="password"
                                                            type={showPassword ? "text" : "password"}
                                                            required
                                                            minLength={8}
                                                            placeholder="Minimum 8 characters"
                                                            value={newAgent.password}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, password: e.target.value })
                                                                setFormTouched(true)
                                                            }}
                                                            className="h-11 pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                        >
                                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                        </button>
                                                    </div>
                                                    {newAgent.password && (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full transition-all ${getPasswordStrengthColor()}`}
                                                                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-medium">{getPasswordStrengthText()}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-500">
                                                                Use 8+ characters with a mix of letters, numbers & symbols
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>

                                        {/* Financial Details */}
                                        <AccordionItem value="financial" className="border rounded-lg px-6 bg-green-50/50 border-green-100">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                                    <Shield className="h-5 w-5 text-green-600" />
                                                    Financial Details (Optional)
                                                </h3>
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-4 pb-4 px-1">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="gst_no" className="font-semibold">GST No</Label>
                                                        <Input
                                                            id="gst_no"
                                                            placeholder="22AAAAA0000A1Z5"
                                                            maxLength={15}
                                                            value={newAgent.gst_no}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, gst_no: e.target.value })
                                                                setFormTouched(true)
                                                            }}
                                                            className="h-11"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="currency" className="font-semibold">Currency</Label>
                                                        <Input
                                                            id="currency"
                                                            placeholder="INR"
                                                            value={newAgent.currency}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, currency: e.target.value })
                                                                setFormTouched(true)
                                                            }}
                                                            className="h-11"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="tax_id" className="font-semibold">Tax ID (if no GST)</Label>
                                                        <Input
                                                            id="tax_id"
                                                            placeholder="Tax identification number"
                                                            value={newAgent.tax_id}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, tax_id: e.target.value })
                                                                setFormTouched(true)
                                                            }}
                                                            className="h-11"
                                                        />
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>

                                    {/* Sticky Footer */}
                                    <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white border-t shadow-lg flex justify-end gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsCreateOpen(false)}
                                            className="min-w-24"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={creating}
                                            className="min-w-32"
                                        >
                                            {creating ? 'Creating...' : '✓ Create Agent'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8 space-y-6">
                {/* Stats Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Agents - Indigo */}
                    <Card className="bg-white border-[1.5px] border-[#F1F5F9] rounded-[18px] shadow-[0_2px_16px_rgba(0,0,0,0.05)] relative overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-[1.2px]">TOTAL AGENTS</p>
                                <div className="absolute top-[20px] right-[20px] w-[40px] h-[40px] rounded-[12px] flex items-center justify-center" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                                    <Users className="h-[20px] w-[20px] text-[#6366F1]" />
                                </div>
                            </div>
                            <div className="text-[40px] font-extrabold text-[#0F172A] tracking-[-1.5px] font-['Outfit',sans-serif] leading-none">{stats.total}</div>
                            <p className="text-[12px] font-normal text-[#6366F1] mt-2">All registered agents</p>
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#6366F1]" />
                        </CardContent>
                    </Card>

                    {/* Active Agents - Green */}
                    <Card className="bg-white border-[1.5px] border-[#F1F5F9] rounded-[18px] shadow-[0_2px_16px_rgba(0,0,0,0.05)] relative overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-[1.2px]">ACTIVE AGENTS</p>
                                <div className="absolute top-[20px] right-[20px] w-[40px] h-[40px] rounded-[12px] flex items-center justify-center" style={{ backgroundColor: 'rgba(16,185,129,0.12)' }}>
                                    <UserCheck className="h-[20px] w-[20px] text-[#10B981]" />
                                </div>
                            </div>
                            <div className="text-[40px] font-extrabold text-[#0F172A] tracking-[-1.5px] font-['Outfit',sans-serif] leading-none">{stats.active}</div>
                            <p className="text-[12px] font-normal text-[#10B981] mt-2">{stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total</p>
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#10B981]" />
                        </CardContent>
                    </Card>

                    {/* New This Month - Purple */}
                    <Card className="bg-white border-[1.5px] border-[#F1F5F9] rounded-[18px] shadow-[0_2px_16px_rgba(0,0,0,0.05)] relative overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-[1.2px]">NEW THIS MONTH</p>
                                <div className="absolute top-[20px] right-[20px] w-[40px] h-[40px] rounded-[12px] flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.12)' }}>
                                    <UserPlus className="h-[20px] w-[20px] text-[#8B5CF6]" />
                                </div>
                            </div>
                            <div className="text-[40px] font-extrabold text-[#0F172A] tracking-[-1.5px] font-['Outfit',sans-serif] leading-none">{stats.newThisMonth}</div>
                            <p className="text-[12px] font-normal text-[#8B5CF6] mt-2">Joined in {new Date().toLocaleString('default', { month: 'long' })}</p>
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#8B5CF6]" />
                        </CardContent>
                    </Card>

                    {/* Total Bookings - Orange */}
                    <Card className="bg-white border-[1.5px] border-[#F1F5F9] rounded-[18px] shadow-[0_2px_16px_rgba(0,0,0,0.05)] relative overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-[1.2px]">TOTAL BOOKINGS</p>
                                <div className="absolute top-[20px] right-[20px] w-[40px] h-[40px] rounded-[12px] flex items-center justify-center" style={{ backgroundColor: 'rgba(249,115,22,0.12)' }}>
                                    <TrendingUp className="h-[20px] w-[20px] text-[#F97316]" />
                                </div>
                            </div>
                            <div className="text-[40px] font-extrabold text-[#0F172A] tracking-[-1.5px] font-['Outfit',sans-serif] leading-none">{stats.totalBookings}</div>
                            <p className="text-[12px] font-normal text-[#F97316] mt-2">Across all agents</p>
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#F97316]" />
                        </CardContent>
                    </Card>
                </div>

                {/* Bulk Action Bar */}
                {selectedAgents.size > 0 && (
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-blue-900">
                                        {selectedAgents.size} agent{selectedAgents.size !== 1 ? 's' : ''} selected
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedAgents(new Set())}
                                        className="text-blue-700 hover:text-blue-900"
                                    >
                                        Deselect all
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBulkStatusChange(true)}
                                        className="bg-white"
                                    >
                                        <UserCheck className="h-4 w-4 mr-2" />
                                        Activate
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBulkStatusChange(false)}
                                        className="bg-white"
                                    >
                                        <UserX className="h-4 w-4 mr-2" />
                                        Deactivate
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setShowBulkDeleteDialog(true)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Main Table Card */}
                <Card className="border-0 shadow-2xl shadow-indigo-100/50 overflow-hidden rounded-3xl glass-panel">

                    <CardHeader className="glass-navbar border-b border-slate-100 py-8 px-8 sticky top-0 z-10 shadow-sm">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-[20px] font-bold text-[#0F172A] font-['Plus_Jakarta_Sans',sans-serif]">Agent Directory</CardTitle>
                                    <p className="text-[13px] font-normal text-[#64748B] mt-2">
                                        Showing {paginatedAgents.length} active partnerships
                                        {activeFilterCount > 0 && ` (${activeFilterCount} active filters)`}
                                    </p>
                                    <div className="h-[1px] bg-[#F1F5F9] mt-4" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="outline" size="lg" className="rounded-2xl border-slate-200 font-bold h-12 px-6 hover:bg-transparent">
                                        <Download className="h-5 w-5 mr-3 text-slate-400" />
                                        Export List
                                    </Button>
                                </div>
                            </div>


                            {/* Filters Row */}
                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Search */}
                                <div className="relative flex-1 min-w-80 group">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-[16px] w-[16px] text-[#94A3B8] group-focus-within:text-[#6366F1] transition-colors" />
                                    <Input
                                        placeholder="Search agents by name or email..."
                                        className="pl-12 pr-12 bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] focus:border-[#6366F1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.1)] rounded-[10px] h-[42px] font-medium"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>

                                {/* Status Filter */}
                                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                                    <SelectTrigger className="w-48 bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] rounded-[10px] h-[42px] font-medium text-[13px] text-slate-700">
                                        <Filter className="h-4 w-4 mr-2 text-[#64748B]" />
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-[10px] border-[#F1F5F9] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                                        <SelectItem value="all">All Agents</SelectItem>
                                        <SelectItem value="active">Active Members</SelectItem>
                                        <SelectItem value="inactive">Inactive Members</SelectItem>
                                        <SelectItem value="pending">Pending Approval</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Date Filter */}
                                <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                                    <SelectTrigger className="w-48 bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] rounded-[10px] h-[42px] font-medium text-[13px] text-slate-700">
                                        <Calendar className="h-4 w-4 mr-2 text-[#64748B]" />
                                        <SelectValue placeholder="Joined" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-[10px] border-[#F1F5F9] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                                        <SelectItem value="all">Anytime</SelectItem>
                                        <SelectItem value="week">Past Week</SelectItem>
                                        <SelectItem value="month">Past Month</SelectItem>
                                        <SelectItem value="year">Past Year</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Clear Filters */}
                                {activeFilterCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="text-indigo-600 hover:text-indigo-700 font-bold"
                                    >
                                        <X className="h-5 w-5 mr-2" />
                                        Reset Filters
                                    </Button>
                                )}


                                {/* Items per page */}
                                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10 per page</SelectItem>
                                        <SelectItem value="25">25 per page</SelectItem>
                                        <SelectItem value="50">50 per page</SelectItem>
                                        <SelectItem value="100">100 per page</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-hidden">
                            <Table>
                                <TableHeader className="sticky top-0 z-10">
                                    <TableRow className="bg-[#F8FAFC] border-b-[2px] border-[#F1F5F9]">
                                        <TableHead className="w-16 px-8 h-[48px]">
                                            <Checkbox
                                                checked={selectedAgents.size === filteredAndSortedAgents.length && filteredAndSortedAgents.length > 0}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                                className="rounded-[5px] h-[18px] w-[18px] border-[2px] border-[#E2E8F0] data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1]"
                                            />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none px-[20px] h-[48px]" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[10px] text-[#94A3B8] uppercase tracking-[1px]">Agent Profile</span>
                                                <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'name' ? 'text-indigo-600' : 'text-slate-300'}`} />
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none px-[20px] h-[48px]" onClick={() => handleSort('email')}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[10px] text-[#94A3B8] uppercase tracking-[1px]">Contact Information</span>
                                                <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'email' ? 'text-indigo-600' : 'text-slate-300'}`} />
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-bold text-[10px] text-[#94A3B8] uppercase tracking-[1px] h-[48px] px-[20px]">Status</TableHead>
                                        <TableHead className="cursor-pointer select-none h-[48px] px-[20px]" onClick={() => handleSort('created_at')}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[10px] text-[#94A3B8] uppercase tracking-[1px]">Join Date</span>
                                                <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'created_at' ? 'text-indigo-600' : 'text-slate-300'}`} />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right px-8 h-[48px] font-bold text-[10px] text-[#94A3B8] uppercase tracking-[1px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {loading ? (
                                        // Skeleton loader
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : paginatedAgents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Users className="h-12 w-12 text-gray-300" />
                                                    <p className="text-gray-500 font-medium">
                                                        {activeFilterCount > 0 ? 'No agents match your filters' : 'No agents found'}
                                                    </p>
                                                    {activeFilterCount > 0 && (
                                                        <Button variant="link" onClick={clearFilters} className="text-blue-600">
                                                            Clear all filters
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedAgents.map((agent, index) => {
                                            // Dynamic avatar colors - 4 color rotation
                                            const avatarColors = [
                                                { bg: 'rgba(236,72,153,0.15)', text: '#EC4899' },  // Pink
                                                { bg: 'rgba(99,102,241,0.15)', text: '#6366F1' },  // Indigo
                                                { bg: 'rgba(16,185,129,0.15)', text: '#10B981' },  // Green
                                                { bg: 'rgba(249,115,22,0.15)', text: '#F97316' }   // Orange
                                            ];
                                            const colorIndex = index % 4;
                                            const avatarColor = avatarColors[colorIndex];

                                            return (
                                                <TableRow
                                                    key={agent.id}
                                                    className="group transition-all duration-150 hover:bg-[rgba(99,102,241,0.03)] relative border-b border-[#F8FAFC] h-[72px] cursor-pointer hover:border-l-[3px] hover:border-l-[#6366F1]"
                                                >
                                                    <TableCell className="px-8 py-6">
                                                        <Checkbox
                                                            checked={selectedAgents.has(agent.id)}
                                                            onCheckedChange={() => handleSelectAgent(agent.id)}
                                                            aria-label={`Select ${agent.first_name} ${agent.last_name}`}
                                                            className="rounded-[5px] h-[18px] w-[18px] border-[2px] border-[#E2E8F0] data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1]"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-4 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div
                                                                className="h-[44px] w-[44px] rounded-[12px] flex items-center justify-center font-bold text-[14px] uppercase"
                                                                style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
                                                            >
                                                                {agent.first_name[0]}{agent.last_name[0]}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-[15px] text-[#0F172A]">{agent.first_name} {agent.last_name}</span>
                                                                <span
                                                                    className="text-[10px] font-bold uppercase tracking-[0.8px] mt-1 px-2 py-0.5 rounded-[4px] w-fit"
                                                                    style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}
                                                                >
                                                                    PREMIUM AGENT
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-6">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-[13px] text-[#374151]">{agent.email}</span>
                                                            </div>
                                                            <span className="text-[12px] font-normal text-[#94A3B8]">{agent.phone || 'No phone provided'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-6">
                                                        <Badge
                                                            variant={agent.approval_status === 'pending' ? 'outline' : agent.is_active ? 'default' : 'secondary'}
                                                            className={`font-bold text-[11px] py-1 px-3 rounded-[20px] border-0 w-fit ${agent.approval_status === 'pending'
                                                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                : agent.is_active
                                                                    ? 'bg-[#DCFCE7] text-[#16A34A]'
                                                                    : 'bg-slate-100 text-slate-500'
                                                                }`}
                                                        >
                                                            {agent.is_active && agent.approval_status !== 'pending' && <span className="mr-1.5 h-[6px] w-[6px] rounded-full inline-block bg-[#16A34A]"></span>}
                                                            {agent.approval_status === 'pending' ? 'Pending Approval' : agent.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-6">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-[12px] w-[12px] text-[#94A3B8]" />
                                                            <span className="font-medium text-[13px] text-[#475569]">
                                                                {new Date(agent.created_at).toLocaleDateString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right px-8 py-6">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {agent.approval_status === 'pending' ? (
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-9 w-9 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 opacity-0 group-hover:opacity-100 transition-all duration-300"
                                                                        title="Approve"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleApprove(agent.id);
                                                                        }}
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-9 w-9 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all duration-300"
                                                                        title="Reject"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleReject(agent.id);
                                                                        }}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-10 w-10 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-300"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleStatus(agent);
                                                                    }}
                                                                >
                                                                    {agent.is_active ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                                                                </Button>
                                                            )}
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl hover:bg-transparent">
                                                                        <MoreVertical className="h-5 w-5" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-[220px] rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] border-[#F1F5F9] p-2">
                                                                    <DropdownMenuLabel className="font-bold text-[10px] text-[#94A3B8] uppercase tracking-[1.2px] px-[14px] pt-2 pb-1">AGENT OPERATIONS</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => {
                                                                        if (agent.approval_status === 'pending') {
                                                                            handleApprove(agent.id);
                                                                        } else {
                                                                            toggleStatus(agent);
                                                                        }
                                                                    }} className="px-[14px] py-[10px] font-medium text-[14px] text-[#374151] rounded-[8px] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all duration-150 cursor-pointer">
                                                                        {agent.approval_status === 'pending' ? (
                                                                            <>
                                                                                <Check className="mr-2.5 h-[16px] w-[16px] text-green-600" />
                                                                                <span>Approve Registration</span>
                                                                            </>
                                                                        ) : agent.is_active ? (
                                                                            <>
                                                                                <UserX className="mr-2.5 h-[16px] w-[16px] text-[#64748B]" />
                                                                                <span>Deactivate Agent</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <UserCheck className="mr-2.5 h-[16px] w-[16px] text-[#64748B]" />
                                                                                <span>Re-activate Access</span>
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuItem>
                                                                    {agent.approval_status === 'pending' && (
                                                                        <DropdownMenuItem onClick={() => handleReject(agent.id)} className="px-[14px] py-[10px] font-medium text-[14px] text-red-600 rounded-[8px] hover:bg-red-50 hover:text-red-700 transition-all duration-150 cursor-pointer">
                                                                            <X className="mr-2.5 h-[16px] w-[16px]" />
                                                                            <span>Reject Registration</span>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuItem onClick={() => handleEditClick(agent)} className="px-[14px] py-[10px] font-medium text-[14px] text-[#374151] rounded-[8px] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all duration-150 cursor-pointer">
                                                                        <Check className="mr-2.5 h-[16px] w-[16px] text-[#64748B]" />
                                                                        <span>Edit Agent Details</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="px-[14px] py-[10px] font-medium text-[14px] text-[#374151] rounded-[8px] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all duration-150 cursor-pointer">
                                                                        <Shield className="mr-2.5 h-[16px] w-[16px] text-[#64748B]" />
                                                                        <span>Modify Permissions</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="my-1 bg-[#F1F5F9]" />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDeleteClick(agent)}
                                                                        className="px-[14px] py-[10px] font-medium text-[14px] text-[#EF4444] rounded-[8px] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-all duration-150 cursor-pointer"
                                                                    >
                                                                        <Trash2 className="mr-2.5 h-[16px] w-[16px]" />
                                                                        <span>Permanent Delete</span>
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {!loading && paginatedAgents.length > 0 && totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum
                                            if (totalPages <= 5) {
                                                pageNum = i + 1
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i
                                            } else {
                                                pageNum = currentPage - 2 + i
                                            }
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={currentPage === pageNum ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className="w-8 h-8 p-0"
                                                >
                                                    {pageNum}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Agent Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Edit Agent Details</DialogTitle>
                        <DialogDescription>
                            Update agent profile, agency details, and financial information.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateAgent} className="space-y-8">
                        {/* Collapsible Sections */}
                        <Accordion type="multiple" defaultValue={['agency', 'personal']} className="space-y-4">
                            {/* Agency Details */}
                            <AccordionItem value="agency" className="border rounded-lg px-6 bg-purple-50/50 border-purple-100">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-purple-600" />
                                        Agency Details
                                    </h3>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pb-4 px-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_agency_name" className="font-semibold">Agency Name</Label>
                                            <Input
                                                id="edit_agency_name"
                                                value={editForm.agency_name}
                                                onChange={e => setEditForm({ ...editForm, agency_name: e.target.value })}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_company_legal_name" className="font-semibold">Company Legal Name</Label>
                                            <Input
                                                id="edit_company_legal_name"
                                                value={editForm.company_legal_name}
                                                onChange={e => setEditForm({ ...editForm, company_legal_name: e.target.value })}
                                                className="h-11"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_domain" className="font-semibold">Website / Domain Name</Label>
                                        <Input
                                            id="edit_domain"
                                            value={editForm.domain}
                                            onChange={e => setEditForm({ ...editForm, domain: e.target.value })}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_business_address" className="font-semibold">Business Address</Label>
                                        <Input
                                            id="edit_business_address"
                                            value={editForm.business_address}
                                            onChange={e => setEditForm({ ...editForm, business_address: e.target.value })}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_country" className="font-semibold">Country</Label>
                                            <select
                                                id="edit_country"
                                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                value={editForm.country}
                                                onChange={e => {
                                                    const countryCode = e.target.value;
                                                    setEditForm({ ...editForm, country: countryCode, state: '', city: '' });
                                                    setCountryStates(State.getStatesOfCountry(countryCode));
                                                    setStateCities([]);
                                                }}
                                            >
                                                {allCountries.map(c => (
                                                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_state" className="font-semibold">State</Label>
                                            <select
                                                id="edit_state"
                                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                value={editForm.state}
                                                onChange={e => {
                                                    const stateCode = e.target.value;
                                                    setEditForm({ ...editForm, state: stateCode, city: '' });
                                                    setStateCities(City.getCitiesOfState(editForm.country, stateCode));
                                                }}
                                            >
                                                <option value="">Select State</option>
                                                {countryStates.map(s => (
                                                    <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_city" className="font-semibold">City</Label>
                                            <select
                                                id="edit_city"
                                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                value={editForm.city}
                                                onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                            >
                                                <option value="">Select City</option>
                                                {stateCities.map(c => (
                                                    <option key={c.name} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Personal Details */}
                            <AccordionItem value="personal" className="border rounded-lg px-6 bg-blue-50/50 border-blue-100">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-blue-600" />
                                        Contact Details
                                    </h3>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pb-4 px-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_first_name" className="font-semibold">First Name</Label>
                                            <Input
                                                id="edit_first_name"
                                                value={editForm.first_name}
                                                onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_last_name" className="font-semibold">Last Name</Label>
                                            <Input
                                                id="edit_last_name"
                                                value={editForm.last_name}
                                                onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                                                className="h-11"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_phone" className="font-semibold">Mobile Number</Label>
                                            <PhoneInput
                                                country={'in'}
                                                value={editForm.phone}
                                                onChange={phone => setEditForm({ ...editForm, phone })}
                                                inputProps={{
                                                    name: 'phone',
                                                    id: 'edit_phone'
                                                }}
                                                containerClass="w-full !rounded-md"
                                                inputClass="!w-full !h-11 !text-sm !border-gray-200 !rounded-md"
                                                buttonClass="!border-gray-200 !rounded-l-md !bg-white"
                                                dropdownClass="!rounded-md !shadow-lg"
                                                enableSearch={true}
                                                searchPlaceholder="Search country..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-semibold text-gray-400">Email (Cannot be changed)</Label>
                                            <Input
                                                disabled
                                                value={editingAgent?.email || ''}
                                                className="h-11 bg-transparent"
                                            />
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Financial Details */}
                            <AccordionItem value="financial" className="border rounded-lg px-6 bg-green-50/50 border-green-100">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-green-600" />
                                        Financial Details
                                    </h3>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pb-4 px-1">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_gst_no" className="font-semibold">GST No</Label>
                                            <Input
                                                id="edit_gst_no"
                                                maxLength={15}
                                                value={editForm.gst_no}
                                                onChange={e => setEditForm({ ...editForm, gst_no: e.target.value })}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_currency" className="font-semibold">Currency</Label>
                                            <Input
                                                id="edit_currency"
                                                value={editForm.currency}
                                                onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_tax_id" className="font-semibold">Tax ID</Label>
                                            <Input
                                                id="edit_tax_id"
                                                value={editForm.tax_id}
                                                onChange={e => setEditForm({ ...editForm, tax_id: e.target.value })}
                                                className="h-11"
                                            />
                                        </div>
                                    </div>

                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        {/* Sticky Footer */}
                        <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white border-t shadow-lg flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditOpen(false)}
                                className="min-w-24"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isUpdating}
                                className="min-w-32 bg-indigo-600 hover:bg-indigo-700"
                            >
                                {isUpdating ? 'Updating...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteAgent} onOpenChange={() => setDeleteAgent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Agent?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {deleteAgent?.first_name} {deleteAgent?.last_name}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteAgent(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete {selectedAgents.size} Agent{selectedAgents.size > 1 ? 's' : ''}?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedAgents.size} selected agent{selectedAgents.size > 1 ? 's' : ''}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDelete}>
                            Delete {selectedAgents.size} Agent{selectedAgents.size > 1 ? 's' : ''}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
