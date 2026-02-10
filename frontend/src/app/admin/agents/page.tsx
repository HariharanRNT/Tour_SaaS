'use client'

import { useState, useEffect } from 'react'
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

interface Agent {
    id: string
    email: string
    first_name: string
    last_name: string
    phone?: string
    is_active: boolean
    created_at: string
}

export default function AdminAgentsPage() {
    const router = useRouter()
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
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

    // Validation states
    const [emailValid, setEmailValid] = useState<boolean | null>(null)

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
    }, [router])

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

    const loadAgents = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:8000/api/v1/admin/agents', {
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
    }

    const handleCreateAgent = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        try {
            const token = localStorage.getItem('token')
            const payload = {
                ...newAgent,
                country: Country.getCountryByCode(newAgent.country)?.name || newAgent.country,
                state: State.getStateByCodeAndCountry(newAgent.state, newAgent.country)?.name || newAgent.state
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/admin/dashboard')}
                                className="mb-2"
                            >
                                ← Back to Dashboard
                            </Button>
                            <h1 className="text-3xl font-bold">Agent Management</h1>
                            <p className="text-gray-600 mt-1">Manage travel agents and their access</p>
                        </div>

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
                                <Button className="shadow-lg">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add New Agent
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl">Add New Agent</DialogTitle>
                                    <DialogDescription>
                                        Create a new agent account. They will be able to log in immediately.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateAgent} className="space-y-8">
                                    {/* Personal Details - Always Expanded */}
                                    <div className="space-y-4 p-6 bg-blue-50/50 rounded-lg border border-blue-100">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <Shield className="h-5 w-5 text-blue-600" />
                                            Personal Details
                                        </h3>
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
                                    </div>

                                    {/* Collapsible Sections */}
                                    <Accordion type="multiple" defaultValue={[]} className="space-y-4">
                                        {/* Agency Details */}
                                        <AccordionItem value="agency" className="border rounded-lg px-6 bg-purple-50/50 border-purple-100">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                                    <Shield className="h-5 w-5 text-purple-600" />
                                                    Agency Details (Optional)
                                                </h3>
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-4 pb-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="agency_name" className="font-semibold">Agency Name</Label>
                                                        <Input
                                                            id="agency_name"
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
                                                        <Label htmlFor="company_legal_name" className="font-semibold">Company Legal Name</Label>
                                                        <Input
                                                            id="company_legal_name"
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
                                                    <Label htmlFor="domain" className="font-semibold">Website / Domain Name</Label>
                                                    <Input
                                                        id="domain"
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
                                                    <Label htmlFor="business_address" className="font-semibold">Business Address</Label>
                                                    <Input
                                                        id="business_address"
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

                                        {/* Financial Details */}
                                        <AccordionItem value="financial" className="border rounded-lg px-6 bg-green-50/50 border-green-100">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                                    <Shield className="h-5 w-5 text-green-600" />
                                                    Financial Details (Optional)
                                                </h3>
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-4 pb-4">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="gst_no" className="font-semibold">GST No</Label>
                                                        <Input
                                                            id="gst_no"
                                                            placeholder="22AAAAA0000A1Z5"
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
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="commission_type" className="font-semibold">Commission Type</Label>
                                                        <select
                                                            id="commission_type"
                                                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                            value={newAgent.commission_type}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, commission_type: e.target.value })
                                                                setFormTouched(true)
                                                            }}
                                                        >
                                                            <option value="percentage">Percentage (%)</option>
                                                            <option value="fixed">Fixed Amount</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="commission_value" className="font-semibold">Commission Value</Label>
                                                        <Input
                                                            id="commission_value"
                                                            type="number"
                                                            placeholder="0"
                                                            value={newAgent.commission_value}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, commission_value: e.target.value })
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
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-blue-900">Total Agents</CardTitle>
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
                            <p className="text-xs text-blue-700 mt-1">All registered agents</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-green-900">Active Agents</CardTitle>
                                <UserCheck className="h-5 w-5 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-900">{stats.active}</div>
                            <p className="text-xs text-green-700 mt-1">{stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-purple-900">New This Month</CardTitle>
                                <UserPlus className="h-5 w-5 text-purple-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-900">{stats.newThisMonth}</div>
                            <p className="text-xs text-purple-700 mt-1">Joined in {new Date().toLocaleString('default', { month: 'long' })}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-orange-900">Total Bookings</CardTitle>
                                <TrendingUp className="h-5 w-5 text-orange-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-orange-900">{stats.totalBookings}</div>
                            <p className="text-xs text-orange-700 mt-1">Across all agents</p>
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
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Agents</CardTitle>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Showing {paginatedAgents.length} of {filteredAndSortedAgents.length} agent{filteredAndSortedAgents.length !== 1 ? 's' : ''}
                                        {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active)`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm">
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </Button>
                                </div>
                            </div>

                            {/* Filters Row */}
                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Status Filter */}
                                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                                    <SelectTrigger className="w-40">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active Only</SelectItem>
                                        <SelectItem value="inactive">Inactive Only</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Date Filter */}
                                <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                                    <SelectTrigger className="w-40">
                                        <Calendar className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Date" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Time</SelectItem>
                                        <SelectItem value="week">This Week</SelectItem>
                                        <SelectItem value="month">This Month</SelectItem>
                                        <SelectItem value="year">This Year</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Search */}
                                <div className="relative flex-1 min-w-64">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search by name or email..."
                                        className="pl-10 pr-10"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Clear Filters */}
                                {activeFilterCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="text-blue-600 hover:text-blue-700"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Clear filters
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
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={selectedAgents.size === filteredAndSortedAgents.length && filteredAndSortedAgents.length > 0}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Name</span>
                                                <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'name' ? 'text-blue-600' : 'text-gray-400'}`} />
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('email')}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Email</span>
                                                <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'email' ? 'text-blue-600' : 'text-gray-400'}`} />
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold">Phone</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('created_at')}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Created</span>
                                                <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'created_at' ? 'text-blue-600' : 'text-gray-400'}`} />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right font-semibold">Actions</TableHead>
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
                                        paginatedAgents.map((agent, index) => (
                                            <TableRow
                                                key={agent.id}
                                                className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                                            >
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedAgents.has(agent.id)}
                                                        onCheckedChange={() => handleSelectAgent(agent.id)}
                                                        aria-label={`Select ${agent.first_name} ${agent.last_name}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-semibold text-gray-900">
                                                    {agent.first_name} {agent.last_name}
                                                </TableCell>
                                                <TableCell className="text-gray-600">{agent.email}</TableCell>
                                                <TableCell className="text-gray-600">{agent.phone || '-'}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={agent.is_active ? 'default' : 'secondary'}
                                                        className={`font-medium ${agent.is_active ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-100'}`}
                                                    >
                                                        <span className={`mr-1 ${agent.is_active ? 'text-green-600' : 'text-gray-600'}`}>●</span>
                                                        {agent.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    {new Date(agent.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <MoreVertical className="h-4 w-4" />
                                                                <span className="sr-only">Open menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => toggleStatus(agent)}>
                                                                {agent.is_active ? (
                                                                    <>
                                                                        <UserX className="mr-2 h-4 w-4 text-red-600" />
                                                                        <span>Deactivate</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                                                                        <span>Activate</span>
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteClick(agent)}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                <span>Delete</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
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
