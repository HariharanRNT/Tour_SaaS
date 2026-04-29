'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    fetchAgents, 
    approveAgent, 
    rejectAgent, 
    createAgent, 
    updateAgent as apiUpdateAgent, 
    deleteAgent as apiDeleteAgent, 
    updateAgentStatus as apiUpdateAgentStatus,
    bulkDeleteAgents,
    bulkUpdateAgentsStatus
} from '@/lib/api'
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
    TableRow } from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger } from '@/components/ui/dialog'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger } from '@/components/ui/accordion'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious } from '@/components/ui/pagination'
import { Plus, Search, UserCheck, UserX, Shield, Trash2, Check, X, Eye, EyeOff, ChevronDown, Filter, MoreVertical, ArrowUpDown, Download, TrendingUp, Users, UserPlus, Calendar, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { Country, State, City } from 'country-state-city'
import { ICountry, IState, ICity } from 'country-state-city'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatError, EMAIL_REGEX, GST_REGEX, NAME_REGEX } from '@/lib/utils'
import * as XLSX from 'xlsx'


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
    const searchParams = useSearchParams()
    const urlStatus = searchParams.get('status') as 'all' | 'active' | 'inactive' | 'pending' | null
    
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>(urlStatus || 'all')
    const [showPassword, setShowPassword] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState(0)
    const [showConflictModal, setShowConflictModal] = useState(false)
    const [conflictMessage, setConflictMessage] = useState('')

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

    const queryClient = useQueryClient()

    // Queries
    const { data: agents = [], isLoading: loading } = useQuery({
        queryKey: ['agents', statusFilter],
        queryFn: () => fetchAgents(statusFilter) })

    // Mutations
    const approveMutation = useMutation({
        mutationFn: approveAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] })
        } })

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string, reason: string }) => rejectAgent(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] })
        } })

    const createMutation = useMutation({
        mutationFn: createAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] })
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
        },
        onError: (error: any) => {
            if (error.response?.status === 409) {
                setConflictMessage(formatError(error) || 'This email has already registered')
                setShowConflictModal(true)
            } else {
                toast.error(formatError(error))
            }
        }
    })

    const statusMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: string, is_active: boolean }) => apiUpdateAgentStatus(id, is_active),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] })
        } })

    const deleteMutation = useMutation({
        mutationFn: apiDeleteAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] })
            setAgentToDelete(null)
        },
        onError: (error: any) => toast.error(formatError(error))
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => apiUpdateAgent(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] })
            setIsEditOpen(false)
            toast.success('Agent updated successfully')
        },
        onError: (error: any) => {
            if (error.response?.status === 409) {
                setConflictMessage(formatError(error) || 'This email has already registered')
                setShowConflictModal(true)
            } else {
                toast.error(formatError(error))
            }
        }
    })

    const bulkDeleteMutation = useMutation({
        mutationFn: bulkDeleteAgents,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] })
            setSelectedAgents(new Set())
            setShowBulkDeleteDialog(false)
            toast.success('Agents deleted successfully')
        },
        onError: (error: any) => toast.error(formatError(error))
    })

    const bulkStatusMutation = useMutation({
        mutationFn: ({ ids, is_active }: { ids: string[], is_active: boolean }) => bulkUpdateAgentsStatus(ids, is_active),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['agents'] })
            setSelectedAgents(new Set())
            toast.success(`Agents ${variables.is_active ? 'activated' : 'deactivated'} successfully`)
        },
        onError: (error: any) => toast.error(formatError(error))
    })

    // Derived stats
    const stats = useMemo(() => {
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const newThisMonth = agents.filter((agent: Agent) => new Date(agent.created_at) >= thisMonth).length

        return {
            total: agents.length,
            active: agents.filter((agent: Agent) => agent.is_active).length,
            newThisMonth,
            totalBookings: 0 // TODO: Fetch from API
        }
    }, [agents])

    // Create Agent Form State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
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
    const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null)
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)

    // Edit Agent State
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [agentToEdit, setAgentToEdit] = useState<Agent | null>(null)
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
    const [domainValid, setDomainValid] = useState<boolean | null>(null)


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

    // Domain validation
    useEffect(() => {
        if (newAgent.domain.length === 0) {
            setDomainValid(null)
            return
        }
        const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
        setDomainValid(domainRegex.test(newAgent.domain))
    }, [newAgent.domain])

    // Confirmation Dialog State
    const [confirmAction, setConfirmAction] = useState<{
        id: string;
        type: 'approve' | 'reject' | 'activate' | 'deactivate';
        agentName: string;
    } | null>(null);

    const handleApprove = async (id: string) => {
        approveMutation.mutate(id, {
            onSuccess: () => {
                toast.success('Agent approved successfully');
                setConfirmAction(null);
            },
            onError: (error: any) => toast.error(formatError(error))
        })
    }

    const handleReject = async (id: string, reason: string = "") => {
        rejectMutation.mutate({ id, reason }, {
            onSuccess: () => {
                toast.success('Agent rejected');
                setConfirmAction(null);
            },
            onError: (error: any) => toast.error(formatError(error))
        })
    }

    const handleCreateAgent = async (e: React.FormEvent) => {
        e.preventDefault()

        // Mandatory Field Validation
        if (!newAgent.agency_name.trim()) {
            toast.error("Agency Name is required");
            return;
        }
        if (!newAgent.company_legal_name.trim()) {
            toast.error("Company Legal Name is required");
            return;
        }
        if (!newAgent.domain.trim()) {
            toast.error("Website / Domain Name is required");
            return;
        }
        if (domainValid === false) {
            toast.error('Please enter a valid domain name (e.g., example.com)')
            return
        }
        if (!newAgent.business_address.trim()) {
            toast.error("Business Address is required");
            return;
        }
        if (!newAgent.country.trim()) {
            toast.error("Country is required");
            return;
        }
        if (!newAgent.state.trim()) {
            toast.error("State is required");
            return;
        }
        if (!newAgent.city.trim()) {
            toast.error("City is required");
            return;
        }
        if (!newAgent.first_name.trim()) {
            toast.error("First Name is required");
            return;
        }
        if (!newAgent.last_name.trim()) {
            toast.error("Last Name is required");
            return;
        }
        if (!newAgent.email.trim()) {
            toast.error("Email is required");
            return;
        }
        if (!newAgent.password.trim()) {
            toast.error("Password is required");
            return;
        }
        if (newAgent.password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        // Specific Format Validation
        if (!EMAIL_REGEX.test(newAgent.email)) {
            toast.error("Please enter a valid email address");
            return;
        }
        if (!NAME_REGEX.test(newAgent.first_name)) {
            toast.error("First Name contains invalid characters");
            return;
        }
        if (!NAME_REGEX.test(newAgent.last_name)) {
            toast.error("Last Name contains invalid characters");
            return;
        }
        if (newAgent.gst_no && !GST_REGEX.test(newAgent.gst_no.toUpperCase().trim())) {
            toast.error("Invalid GST format. Must be 15 characters (e.g., 22AAAAA0000A1Z5)");
            return;
        }
        if (newAgent.currency && (newAgent.currency.length !== 3 || !/^[a-zA-Z]+$/.test(newAgent.currency))) {
            toast.error("Currency must be a 3-letter ISO code (e.g., INR, USD)");
            return;
        }
        if (newAgent.tax_id && newAgent.tax_id.length > 20) {
            toast.error("Tax ID cannot exceed 20 characters");
            return;
        }

        const payload = {
            ...newAgent,
            country: Country.getCountryByCode(newAgent.country)?.name || newAgent.country,
            state: State.getStateByCodeAndCountry(newAgent.state, newAgent.country)?.name || newAgent.state,
            commission_value: newAgent.commission_value ? Number(newAgent.commission_value) : 0,
            phone: newAgent.phone || null,
            gst_no: newAgent.gst_no ? newAgent.gst_no.toUpperCase().trim() : null,
            tax_id: newAgent.tax_id || null,
            agency_name: newAgent.agency_name || null,
            company_legal_name: newAgent.company_legal_name || null,
            business_address: newAgent.business_address || null,
            city: newAgent.city || null,
            domain: newAgent.domain || null }
        createMutation.mutate(payload)
    }

    const toggleStatus = async (agentId: string, is_active: boolean) => {
        statusMutation.mutate({ id: agentId, is_active }, {
            onSuccess: () => {
                toast.success(`Agent ${is_active ? 'activated' : 'deactivated'} successfully`);
                setConfirmAction(null);
            },
            onError: (error: any) => toast.error(formatError(error))
        })
    }

    const handleDeleteClick = (agent: Agent) => {
        setAgentToDelete(agent)
    }

    const confirmDelete = async () => {
        if (!agentToDelete) return
        deleteMutation.mutate(agentToDelete.id)
    }

    const handleEditClick = (agent: any) => {
        setAgentToEdit(agent)
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
        if (!agentToEdit) return

        // Mandatory Field Validation for Edit
        if (!editForm.agency_name.trim()) {
            toast.error("Agency Name is required");
            return;
        }
        if (!editForm.company_legal_name.trim()) {
            toast.error("Company Legal Name is required");
            return;
        }
        if (!editForm.domain.trim()) {
            toast.error("Website / Domain Name is required");
            return;
        }
        if (!editForm.business_address.trim()) {
            toast.error("Business Address is required");
            return;
        }
        if (!editForm.first_name.trim()) {
            toast.error("First Name is required");
            return;
        }
        if (!editForm.last_name.trim()) {
            toast.error("Last Name is required");
            return;
        }

        // Specific Format Validation for Edit
        if (!NAME_REGEX.test(editForm.first_name)) {
            toast.error("First Name contains invalid characters");
            return;
        }
        if (!NAME_REGEX.test(editForm.last_name)) {
            toast.error("Last Name contains invalid characters");
            return;
        }
        if (editForm.gst_no && !GST_REGEX.test(editForm.gst_no.toUpperCase().trim())) {
            toast.error("Invalid GST format. Must be 15 characters (e.g., 22AAAAA0000A1Z5)");
            return;
        }
        if (editForm.currency && (editForm.currency.length !== 3 || !/^[a-zA-Z]+$/.test(editForm.currency))) {
            toast.error("Currency must be a 3-letter ISO code (e.g., INR, USD)");
            return;
        }
        if (editForm.tax_id && editForm.tax_id.length > 20) {
            toast.error("Tax ID cannot exceed 20 characters");
            return;
        }

        // Domain validation for edit form
        if (editForm.domain) {
            const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
            if (!domainRegex.test(editForm.domain)) {
                toast.error('Please enter a valid domain name (e.g., example.com)')
                return
            }
        }

        const payload = {
            ...editForm,
            country: Country.getCountryByCode(editForm.country)?.name || editForm.country,
            state: State.getStateByCodeAndCountry(editForm.state, editForm.country)?.name || editForm.state,
            commission_value: editForm.commission_value ? Number(editForm.commission_value) : 0,
            phone: editForm.phone || null,
            gst_no: editForm.gst_no ? editForm.gst_no.toUpperCase().trim() : null,
            tax_id: editForm.tax_id || null,
            agency_name: editForm.agency_name || null,
            company_legal_name: editForm.company_legal_name || null,
            business_address: editForm.business_address || null,
            city: editForm.city || null,
            domain: editForm.domain || null }

        updateMutation.mutate({ id: agentToEdit.id, data: payload })
    }


    // Filtering and sorting
    const filteredAndSortedAgents = useMemo(() => {
        return agents.filter((agent: Agent) => {
            const matchesSearch = agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                agent.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                agent.last_name.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && agent.is_active) ||
                (statusFilter === 'inactive' && !agent.is_active) ||
                (statusFilter === 'pending' && agent.approval_status === 'pending')

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
        }).sort((a: Agent, b: Agent) => {
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
    }, [agents, searchQuery, statusFilter, dateFilter, sortColumn, sortDirection])

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedAgents.length / itemsPerPage)
    const paginatedAgents = filteredAndSortedAgents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

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
            setSelectedAgents(new Set(filteredAndSortedAgents.map((a: Agent) => a.id)))
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

    const handleBulkDelete = () => {
        bulkDeleteMutation.mutate(Array.from(selectedAgents))
    }

    const handleBulkStatusChange = (is_active: boolean) => {
        bulkStatusMutation.mutate({ ids: Array.from(selectedAgents), is_active })
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
    ].reduce((a: number, b: number) => a + b, 0)

    const handleExport = () => {
        if (filteredAndSortedAgents.length === 0) {
            toast.error('No agents to export')
            return
        }

        const data = filteredAndSortedAgents.map((agent: any) => ({
            'Agent Name': `${agent.first_name} ${agent.last_name}`,
            'Email': agent.email,
            'Phone': agent.phone || 'N/A',
            'Agency Name': agent.agency_name || 'N/A',
            'Approval Status': agent.approval_status.toUpperCase(),
            'Access Status': agent.is_active ? 'ACTIVE' : 'INACTIVE',
            'GST No': agent.gst_no || 'N/A',
            'City': agent.city || 'N/A',
            'State': agent.state || 'N/A',
            'Country': agent.country || 'N/A',
            'Joined Date': new Date(agent.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })
        }))

        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Agents')

        const fileName = `agents-directory-${new Date().toISOString().split('T')[0]}.xlsx`
        
        try {
            XLSX.writeFile(wb, fileName)
            toast.success(`Successfully exported ${filteredAndSortedAgents.length} agents to Excel`)
        } catch (error) {
            console.error('Export failed:', error)
            toast.error('Failed to export agents list')
        }
    }

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, statusFilter, dateFilter])

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
        <div className="p-8 md:p-10 lg:p-12 min-h-screen relative" style={{
            background: 'linear-gradient(135deg, #F97316 0%, #FDBA74 50%, #FED7AA 100%)',
            backgroundAttachment: 'fixed'
        }}>
            <div className="max-w-[1536px] mx-auto space-y-10 relative z-10">


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
                        <p className="text-slate-900 mt-4 text-lg font-medium">Manage travel agents and their system permissions.</p>
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
                                    <Button className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8E53] hover:shadow-[0_8px_24px_rgba(255,107,43,0.35)] text-white font-black shadow-[0_4px_16px_rgba(255,107,43,0.25)] rounded-[14px] h-[48px] px-8 transition-all duration-300 border-0 group">
                                        <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                                        <span className="text-[14px] uppercase tracking-wider">Add New Agent</span>
                                    </Button>
                                </motion.div>

                            </DialogTrigger>

                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/70 backdrop-blur-[40px] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[32px] p-0">
                                <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-3xl px-8 py-6 border-b border-white/10">
                                    <DialogHeader>
                                        <DialogTitle className="text-3xl font-black text-slate-800 tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">Add New <span className="text-orange-600">Agent</span></DialogTitle>
                                        <DialogDescription className="text-slate-900 font-medium mt-2">
                                            Create a new agent account. They will be able to log in immediately.
                                        </DialogDescription>
                                    </DialogHeader>
                                </div>
                                <form onSubmit={handleCreateAgent}>
                                    <div className="p-8 space-y-8">
                                    {/* Collapsible Sections */}
                                    <Accordion type="multiple" defaultValue={[]} className="space-y-4">
                                        {/* Agency Details */}
                                        <AccordionItem value="agency" className="rounded-[28px] px-6 bg-white/20 backdrop-blur-2xl border border-white/40 mb-6 shadow-sm group hover:bg-white/30 transition-all duration-500">
                                            <AccordionTrigger className="hover:no-underline py-5">
                                                <h3 className="font-black text-slate-700 text-lg flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center group-data-[state=open]:bg-orange-600 transition-colors duration-300">
                                                        <Shield className="h-5 w-5 text-orange-600 group-data-[state=open]:text-white transition-colors duration-300" />
                                                    </div>
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
                                                            maxLength={50}
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
                                                            maxLength={50}
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
                                                    <div className="relative">
                                                        <Input
                                                            id="domain"
                                                            required
                                                            maxLength={50}
                                                            placeholder="example.com"
                                                            value={newAgent.domain}
                                                            onChange={e => {
                                                                setNewAgent({ ...newAgent, domain: e.target.value })
                                                                setFormTouched(true)
                                                            }}
                                                            className="h-11 pr-10"
                                                        />
                                                        {domainValid !== null && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                {domainValid ? (
                                                                    <Check className="h-5 w-5 text-green-500" />
                                                                ) : (
                                                                    <X className="h-5 w-5 text-red-500" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="business_address" className="font-semibold">Business Address *</Label>
                                                    <Input
                                                        id="business_address"
                                                        required
                                                        maxLength={200}
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
                                        <AccordionItem value="personal" className="rounded-[28px] px-6 bg-white/20 backdrop-blur-2xl border border-white/40 mb-6 shadow-sm group hover:bg-white/30 transition-all duration-500">
                                            <AccordionTrigger className="hover:no-underline py-5">
                                                <h3 className="font-black text-slate-700 text-lg flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-data-[state=open]:bg-blue-600 transition-colors duration-300">
                                                        <Users className="h-5 w-5 text-blue-600 group-data-[state=open]:text-white transition-colors duration-300" />
                                                    </div>
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
                                                            maxLength={50}
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
                                                            maxLength={50}
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
                                                                maxLength={50}
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
                                                            maxLength={50}
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
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-900 hover:text-gray-700"
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
                                                            <p className="text-xs text-slate-900">
                                                                Use 8+ characters with a mix of letters, numbers & symbols
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>

                                        {/* Financial Details */}
                                        <AccordionItem value="financial" className="rounded-[28px] px-6 bg-white/20 backdrop-blur-2xl border border-white/40 mb-6 shadow-sm group hover:bg-white/30 transition-all duration-500">
                                            <AccordionTrigger className="hover:no-underline py-5">
                                                <h3 className="font-black text-slate-700 text-lg flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-data-[state=open]:bg-emerald-600 transition-colors duration-300">
                                                        <TrendingUp className="h-5 w-5 text-emerald-600 group-data-[state=open]:text-white transition-colors duration-300" />
                                                    </div>
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
                                                            maxLength={3}
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
                                                            maxLength={20}
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
                                    </div>

                                    {/* Sticky Footer */}
                                    <div className="sticky bottom-0 bg-white/40 backdrop-blur-3xl px-8 py-5 border-t border-white/10 flex justify-end gap-3 z-20">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setIsCreateOpen(false)}
                                            className="min-w-28 h-12 rounded-xl text-slate-900 font-bold hover:bg-slate-50"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={createMutation.isPending}
                                            className="min-w-40 h-12 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all"
                                        >
                                            {createMutation.isPending ? 'Creating Agent...' : '✓ Create Agent'}
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
                    {/* Total Agents - Indigo strip */}
                    <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] shadow-xl relative overflow-hidden group hover:translate-y-[-8px] transition-all duration-500 h-full">
                        <CardContent className="p-7">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] opacity-80">Total Agents</p>
                                <div className="absolute top-6 right-6 w-10 h-10 rounded-xl flex items-center justify-center bg-white/40 shadow-sm">
                                    <Users className="h-5 w-5 text-indigo-600" />
                                </div>
                            </div>
                            <div className="text-4xl font-black text-slate-800 tracking-tight font-['Plus_Jakarta_Sans',sans-serif] leading-none mb-2">{stats.total}</div>
                            <p className="text-[11px] font-[900] text-indigo-600 uppercase tracking-wider opacity-80">All registered agents</p>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
                        </CardContent>
                    </Card>

                    {/* Active Agents - Green strip */}
                    <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] shadow-xl relative overflow-hidden group hover:translate-y-[-8px] transition-all duration-500 h-full">
                        <CardContent className="p-7">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] opacity-80">Active Agents</p>
                                <div className="absolute top-6 right-6 w-10 h-10 rounded-xl flex items-center justify-center bg-white/40 shadow-sm">
                                    <UserCheck className="h-5 w-5 text-emerald-600" />
                                </div>
                            </div>
                            <div className="text-4xl font-black text-slate-800 tracking-tight font-['Plus_Jakarta_Sans',sans-serif] leading-none mb-2">{stats.active}</div>
                            <p className="text-[11px] font-[900] text-emerald-600 uppercase tracking-wider opacity-80">{stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total</p>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
                        </CardContent>
                    </Card>

                    {/* New This Month - Purple strip */}
                    <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] shadow-xl relative overflow-hidden group hover:translate-y-[-8px] transition-all duration-500 h-full">
                        <CardContent className="p-7">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] opacity-80">New This Month</p>
                                <div className="absolute top-6 right-6 w-10 h-10 rounded-xl flex items-center justify-center bg-white/40 shadow-sm">
                                    <UserPlus className="h-5 w-5 text-violet-600" />
                                </div>
                            </div>
                            <div className="text-4xl font-black text-slate-800 tracking-tight font-['Plus_Jakarta_Sans',sans-serif] leading-none mb-2">{stats.newThisMonth}</div>
                            <p className="text-[11px] font-[900] text-violet-600 uppercase tracking-wider opacity-80">Joined in {new Date().toLocaleString('default', { month: 'long' })}</p>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-violet-500" />
                        </CardContent>
                    </Card>

                    {/* Total Bookings - Orange strip */}
                    <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] shadow-xl relative overflow-hidden group hover:translate-y-[-8px] transition-all duration-500 h-full">
                        <CardContent className="p-7">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] opacity-80">Total Bookings</p>
                                <div className="absolute top-6 right-6 w-10 h-10 rounded-xl flex items-center justify-center bg-white/40 shadow-sm">
                                    <TrendingUp className="h-5 w-5 text-orange-600" />
                                </div>
                            </div>
                            <div className="text-4xl font-black text-slate-800 tracking-tight font-['Plus_Jakarta_Sans',sans-serif] leading-none mb-2">{stats.totalBookings}</div>
                            <p className="text-[11px] font-[900] text-orange-600 uppercase tracking-wider opacity-80">Across all agents</p>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500" />
                        </CardContent>
                    </Card>
                </div>

                {/* Bulk Action Bar */}
                {selectedAgents.size > 0 && (
                    <Card className="bg-[rgba(255,165,80,0.15)] backdrop-blur-xl border border-white/40 shadow-lg rounded-2xl">
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
                                        disabled={bulkStatusMutation.isPending}
                                        className="bg-white"
                                    >
                                        <UserCheck className="h-4 w-4 mr-2" />
                                        Activate
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBulkStatusChange(false)}
                                        disabled={bulkStatusMutation.isPending}
                                        className="bg-white"
                                    >
                                        <UserX className="h-4 w-4 mr-2" />
                                        Deactivate
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setShowBulkDeleteDialog(true)}
                                        disabled={bulkDeleteMutation.isPending}
                                        className="bg-rose-500 hover:bg-rose-600 font-bold uppercase tracking-wider text-[10px]"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Main Table Card Wrapper */}
                <div className="bg-white/5 backdrop-blur-2xl rounded-[40px] p-1 border border-white/10 shadow-2xl">
                    <Card className="shadow-none overflow-hidden rounded-[38px] bg-white/10 backdrop-blur-md border border-white/20">

                        <CardHeader className="bg-white/10 border-b border-white/20 py-8 px-8 sticky top-0 z-10">
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-[20px] font-black text-slate-800 uppercase tracking-[0.1em]">Agent Directory</CardTitle>
                                        <p className="text-[11px] font-bold text-slate-700 mt-1 uppercase tracking-wider">
                                            Showing <span className="text-orange-600 font-black">{paginatedAgents.length}</span> active partnerships
                                            {activeFilterCount > 0 && ` • ${activeFilterCount} active filters`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={handleExport}
                                            className="rounded-xl border-white/60 bg-white/40 backdrop-blur-md font-black h-11 px-6 hover:bg-white text-[11px] uppercase tracking-wider text-slate-600 shadow-sm transition-all duration-300"
                                        >
                                            <Download className="h-4 w-4 mr-2 text-orange-500" />
                                            Export List
                                        </Button>
                                    </div>
                                </div>


                                {/* Filters Row */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    {/* Search */}
                                    <div className="relative flex-1 min-w-80 group">
                                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-[16px] w-[16px] text-orange-400 group-focus-within:text-orange-600 transition-colors" />
                                        <Input
                                            placeholder="Search agents by name or email..."
                                            className="pl-12 pr-12 bg-white/30 backdrop-blur-md border border-white/40 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 rounded-xl h-12 font-bold text-slate-700 placeholder:text-slate-700 transition-all duration-300"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-700 hover:text-orange-500 transition-colors"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Status Filter */}
                                    <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                                        <SelectTrigger className="w-48 bg-white/30 backdrop-blur-md border border-white/40 rounded-xl h-12 font-bold text-[12px] uppercase tracking-wider text-slate-600 focus:ring-4 focus:ring-orange-400/10 transition-all">
                                            <Filter className="h-4 w-4 mr-2 text-orange-500" />
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
                                        <SelectTrigger className="w-48 bg-white/30 backdrop-blur-md border border-white/40 rounded-xl h-12 font-bold text-[12px] uppercase tracking-wider text-slate-600 focus:ring-4 focus:ring-orange-400/10 transition-all">
                                            <Calendar className="h-4 w-4 mr-2 text-orange-500" />
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
                                            className="text-orange-600 hover:text-orange-700 font-black uppercase tracking-widest text-[10px]"
                                        >
                                            <X className="h-4 w-4 mr-2" />
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
                                        <TableRow className="bg-white/40 backdrop-blur-md border-b border-white/40">
                                            <TableHead className="w-16 px-8 h-[48px]">
                                                <Checkbox
                                                    checked={selectedAgents.size === filteredAndSortedAgents.length && filteredAndSortedAgents.length > 0}
                                                    onCheckedChange={handleSelectAll}
                                                    aria-label="Select all"
                                                    className="rounded-[6px] h-5 w-5 border-2 border-white/60 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 shadow-sm"
                                                />
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none px-5 h-16" onClick={() => handleSort('name')}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-[10px] text-slate-900 uppercase tracking-widest">Agent Profile</span>
                                                    <ArrowUpDown className={`h-3 w-3 ${sortColumn === 'name' ? 'text-orange-500' : 'text-slate-300'}`} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none px-5 h-16" onClick={() => handleSort('email')}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-[10px] text-slate-900 uppercase tracking-widest">Contact</span>
                                                    <ArrowUpDown className={`h-3 w-3 ${sortColumn === 'email' ? 'text-orange-500' : 'text-slate-300'}`} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="font-black text-[10px] text-slate-900 uppercase tracking-widest h-16 px-5">Status</TableHead>
                                            <TableHead className="cursor-pointer select-none h-16 px-5" onClick={() => handleSort('created_at')}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-[10px] text-slate-900 uppercase tracking-widest">Join Date</span>
                                                    <ArrowUpDown className={`h-3 w-3 ${sortColumn === 'created_at' ? 'text-orange-500' : 'text-slate-300'}`} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-right px-8 h-16 font-black text-[10px] text-slate-900 uppercase tracking-widest">Actions</TableHead>
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
                                                        <p className="text-slate-900 font-medium">
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
                                            paginatedAgents.map((agent: Agent, index: number) => {
                                                const initials = `${agent.first_name[0] || ''}${agent.last_name[0] || ''}`;

                                                // Dynamic initials-based gradients
                                                const getAvatarGradient = (initialsStr: string) => {
                                                    const first = initialsStr[0]?.toUpperCase() || 'A';
                                                    const last = initialsStr[1]?.toUpperCase() || 'B';
                                                    const charCode = (first.charCodeAt(0) + last.charCodeAt(0)) % 4;
                                                    const gradients = [
                                                        "from-teal-400 to-blue-600",
                                                        "from-orange-400 to-rose-500",
                                                        "from-violet-400 to-fuchsia-600",
                                                        "from-amber-400 to-orange-600"
                                                    ];
                                                    return gradients[charCode];
                                                };

                                                const avatarGradient = getAvatarGradient(initials);

                                                return (
                                                    <TableRow
                                                        key={agent.id}
                                                        className="group transition-all duration-300 hover:bg-[rgba(255,140,50,0.12)] border-b border-white/20 h-20"
                                                    >
                                                        <TableCell className="px-8 py-6">
                                                            <Checkbox
                                                                checked={selectedAgents.has(agent.id)}
                                                                onCheckedChange={() => handleSelectAgent(agent.id)}
                                                                aria-label={`Select ${agent.first_name} ${agent.last_name}`}
                                                                className="rounded-[6px] h-5 w-5 border-2 border-white/60 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 shadow-sm"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="px-4 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn(
                                                                    "h-12 w-12 rounded-2xl flex items-center justify-center font-black text-[15px] uppercase text-white shadow-lg bg-gradient-to-br transform group-hover:rotate-6 transition-transform duration-500",
                                                                    avatarGradient
                                                                )}>
                                                                    {initials}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-slate-800 tracking-tight text-[15px]">{agent.first_name} {agent.last_name}</span>
                                                                    <div className="flex items-center gap-1.5 mt-1">
                                                                        <div className="bg-[rgba(255,180,50,0.25)] px-2.5 py-0.5 rounded-full border border-amber-200/50">
                                                                            <span className="text-[8px] font-black text-orange-700 uppercase tracking-widest">
                                                                                Premium Agent
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-6">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-[13px] text-[#374151]">{agent.email}</span>
                                                                </div>
                                                                <span className="text-[12px] font-normal text-[#1e293b]">{agent.phone || 'No phone provided'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-6">
                                                            <Badge
                                                                className={cn(
                                                                    "font-black text-[10px] py-1.5 px-4 rounded-full border shadow-sm uppercase tracking-widest",
                                                                    agent.approval_status === 'pending'
                                                                        ? 'bg-amber-100/50 text-amber-700 border-amber-200 backdrop-blur-md'
                                                                        : agent.is_active
                                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_2px_10px_rgba(16,185,129,0.1)]'
                                                                            : 'bg-rose-50 text-rose-600 border-rose-100 shadow-[0_2px_10px_rgba(244,63,94,0.1)]'
                                                                )}
                                                            >
                                                                {agent.is_active && agent.approval_status !== 'pending' && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />}
                                                                {agent.approval_status === 'pending' ? 'Pending Approval' : agent.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-6">
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="h-[12px] w-[12px] text-[#1e293b]" />
                                                                <span className="font-medium text-[13px] text-[#0f172a]">
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
                                                                                setConfirmAction({ 
                                                                                    id: agent.id, 
                                                                                    type: 'approve', 
                                                                                    agentName: `${agent.first_name} ${agent.last_name}` 
                                                                                });
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
                                                                                setConfirmAction({ 
                                                                                    id: agent.id, 
                                                                                    type: 'reject', 
                                                                                    agentName: `${agent.first_name} ${agent.last_name}` 
                                                                                });
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
                                                                            setConfirmAction({ 
                                                                                id: agent.id, 
                                                                                type: agent.is_active ? 'deactivate' : 'activate', 
                                                                                agentName: `${agent.first_name} ${agent.last_name}` 
                                                                            });
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
                                                                    <DropdownMenuContent align="end" className="w-[220px] p-2 glass-popover">
                                                                        <DropdownMenuLabel className="font-bold text-[10px] text-slate-700 uppercase tracking-[1.2px] px-[14px] pt-2 pb-1">AGENT OPERATIONS</DropdownMenuLabel>
                                                                        <DropdownMenuItem onClick={() => {
                                                                            setConfirmAction({ 
                                                                                id: agent.id, 
                                                                                type: agent.approval_status === 'pending' ? 'approve' : (agent.is_active ? 'deactivate' : 'activate'), 
                                                                                agentName: `${agent.first_name} ${agent.last_name}` 
                                                                            });
                                                                        }} className="glass-popover-item">
                                                                            {agent.approval_status === 'pending' ? (
                                                                                <>
                                                                                    <Check className="mr-2.5 h-[16px] w-[16px] text-green-600" />
                                                                                    <span>Approve Registration</span>
                                                                                </>
                                                                            ) : agent.is_active ? (
                                                                                <>
                                                                                    <UserX className="mr-2.5 h-[16px] w-[16px] text-[#0f172a]" />
                                                                                    <span>Deactivate Agent</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <UserCheck className="mr-2.5 h-[16px] w-[16px] text-[#0f172a]" />
                                                                                    <span>Re-activate Access</span>
                                                                                </>
                                                                            )}
                                                                        </DropdownMenuItem>
                                                                        {agent.approval_status === 'pending' && (
                                                                            <DropdownMenuItem onClick={() => {
                                                                                setConfirmAction({ 
                                                                                    id: agent.id, 
                                                                                    type: 'reject', 
                                                                                    agentName: `${agent.first_name} ${agent.last_name}` 
                                                                                });
                                                                            }} className="glass-popover-item text-red-600 focus:text-red-700">
                                                                                <X className="mr-2.5 h-[16px] w-[16px]" />
                                                                                <span>Reject Registration</span>
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        <DropdownMenuItem onClick={() => handleEditClick(agent)} className="glass-popover-item">
                                                                            <Check className="mr-2.5 h-[16px] w-[16px] text-[#0f172a]" />
                                                                            <span>Edit Agent Details</span>
                                                                        </DropdownMenuItem>

                                                                        <DropdownMenuSeparator className="my-1 bg-white/10" />
                                                                        <DropdownMenuItem
                                                                            onClick={() => handleDeleteClick(agent)}
                                                                            className="glass-popover-item text-red-600 focus:text-red-700"
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
                                            onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
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
                                            onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
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
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/70 backdrop-blur-[40px] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[32px] p-0">
                        <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-3xl px-8 py-6 border-b border-white/10">
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black text-slate-800 tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">Edit Agent <span className="text-orange-600">Details</span></DialogTitle>
                                <DialogDescription className="text-slate-900 font-medium mt-2">
                                    Update agent profile, agency details, and financial information.
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                        <form onSubmit={handleUpdateAgent}>
                            <div className="p-8 space-y-8">
                            {/* Collapsible Sections */}
                            <Accordion type="multiple" defaultValue={['agency', 'personal']} className="space-y-4">
                                {/* Agency Details */}
                                <AccordionItem value="agency" className="rounded-[28px] px-6 bg-white/20 backdrop-blur-2xl border border-white/40 mb-6 shadow-sm group hover:bg-white/30 transition-all duration-500">
                                    <AccordionTrigger className="hover:no-underline py-5">
                                        <h3 className="font-black text-slate-700 text-lg flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center group-data-[state=open]:bg-orange-600 transition-colors duration-300">
                                                <Shield className="h-5 w-5 text-orange-600 group-data-[state=open]:text-white transition-colors duration-300" />
                                            </div>
                                            Agency Details
                                        </h3>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pb-4 px-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="edit_agency_name" className="font-semibold">Agency Name *</Label>
                                                <Input
                                                    id="edit_agency_name"
                                                    required
                                                    maxLength={50}
                                                    value={editForm.agency_name}
                                                    onChange={e => setEditForm({ ...editForm, agency_name: e.target.value })}
                                                    className="h-11"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="edit_company_legal_name" className="font-semibold">Company Legal Name *</Label>
                                                <Input
                                                    id="edit_company_legal_name"
                                                    required
                                                    maxLength={50}
                                                    value={editForm.company_legal_name}
                                                    onChange={e => setEditForm({ ...editForm, company_legal_name: e.target.value })}
                                                    className="h-11"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_domain" className="font-semibold">Website / Domain Name *</Label>
                                            <Input
                                                id="edit_domain"
                                                required
                                                maxLength={50}
                                                value={editForm.domain}
                                                onChange={e => setEditForm({ ...editForm, domain: e.target.value })}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_business_address" className="font-semibold">Business Address *</Label>
                                            <Input
                                                id="edit_business_address"
                                                required
                                                maxLength={200}
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
                                {/* Contact Details */}
                                <AccordionItem value="personal" className="rounded-[28px] px-6 bg-white/20 backdrop-blur-2xl border border-white/40 mb-6 shadow-sm group hover:bg-white/30 transition-all duration-500">
                                    <AccordionTrigger className="hover:no-underline py-5">
                                        <h3 className="font-black text-slate-700 text-lg flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-data-[state=open]:bg-blue-600 transition-colors duration-300">
                                                <Users className="h-5 w-5 text-blue-600 group-data-[state=open]:text-white transition-colors duration-300" />
                                            </div>
                                            Contact Details
                                        </h3>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pb-4 px-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="edit_first_name" className="font-semibold">First Name *</Label>
                                                <Input
                                                    id="edit_first_name"
                                                    required
                                                    maxLength={50}
                                                    value={editForm.first_name}
                                                    onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                                                    className="h-11"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="edit_last_name" className="font-semibold">Last Name *</Label>
                                                <Input
                                                    id="edit_last_name"
                                                    required
                                                    maxLength={50}
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
                                                    value={agentToEdit?.email || ''}
                                                    className="h-11 bg-transparent"
                                                />
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Financial Details */}
                                <AccordionItem value="financial" className="rounded-[28px] px-6 bg-white/20 backdrop-blur-2xl border border-white/40 mb-6 shadow-sm group hover:bg-white/30 transition-all duration-500">
                                    <AccordionTrigger className="hover:no-underline py-5">
                                        <h3 className="font-black text-slate-700 text-lg flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-data-[state=open]:bg-emerald-600 transition-colors duration-300">
                                                <TrendingUp className="h-5 w-5 text-emerald-600 group-data-[state=open]:text-white transition-colors duration-300" />
                                            </div>
                                            Financial Details (Optional)
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
                                                    maxLength={3}
                                                    value={editForm.currency}
                                                    onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                                                    className="h-11"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="edit_tax_id" className="font-semibold">Tax ID</Label>
                                                <Input
                                                    id="edit_tax_id"
                                                    maxLength={20}
                                                    value={editForm.tax_id}
                                                    onChange={e => setEditForm({ ...editForm, tax_id: e.target.value })}
                                                    className="h-11"
                                                />
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            </div>

                            {/* Sticky Footer */}
                            <div className="sticky bottom-0 bg-white/40 backdrop-blur-3xl px-8 py-5 border-t border-white/10 flex justify-end gap-3 z-20">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsEditOpen(false)}
                                    className="min-w-28 h-12 rounded-xl text-slate-900 font-bold hover:bg-slate-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="min-w-40 h-12 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all"
                                >
                                    {updateMutation.isPending ? 'Updating...' : '✓ Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={!!agentToDelete} onOpenChange={() => setAgentToDelete(null)}>
                    <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-white/70 backdrop-blur-[40px] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[32px]">
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100/50 shadow-sm transition-transform duration-500 hover:rotate-12">
                                    <AlertTriangle className="h-6 w-6 text-rose-500" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black text-slate-800 tracking-tight uppercase">Delete Agent</DialogTitle>
                                    <DialogDescription className="text-slate-900 font-medium text-xs mt-0.5 uppercase tracking-wider">
                                        Irreversible Action
                                    </DialogDescription>
                                </div>
                            </div>
                            
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Are you sure you want to delete <span className="text-slate-900 font-black">{agentToDelete?.first_name} {agentToDelete?.last_name}</span>? This action cannot be undone and all associated data will be lost.
                            </p>
                        </div>
                        
                        <div className="bg-slate-50/50 backdrop-blur-md px-8 py-6 flex justify-end gap-3 border-t border-white/20">
                            <Button 
                                variant="ghost" 
                                onClick={() => setAgentToDelete(null)}
                                className="h-11 px-6 rounded-xl font-bold text-slate-900 hover:bg-white/50"
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="destructive" 
                                onClick={confirmDelete} 
                                disabled={deleteMutation.isPending}
                                className="h-11 px-8 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black shadow-lg shadow-rose-500/20 uppercase tracking-widest text-[11px]"
                            >
                                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Bulk Delete Confirmation Dialog */}
                <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                    <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-white/70 backdrop-blur-[40px] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[32px]">
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100/50 shadow-sm transition-transform duration-500 hover:rotate-12">
                                    <AlertTriangle className="h-6 w-6 text-rose-500" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black text-slate-800 tracking-tight uppercase">Bulk Delete</DialogTitle>
                                    <DialogDescription className="text-slate-900 font-medium text-xs mt-0.5 uppercase tracking-wider">
                                        Multiple Records
                                    </DialogDescription>
                                </div>
                            </div>
                            
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Are you sure you want to delete <span className="text-slate-900 font-black">{selectedAgents.size}</span> selected agents? This action is permanent and cannot be reversed.
                            </p>
                        </div>
                        
                        <div className="bg-slate-50/50 backdrop-blur-md px-8 py-6 flex justify-end gap-3 border-t border-white/20">
                            <Button 
                                variant="ghost" 
                                onClick={() => setShowBulkDeleteDialog(false)}
                                className="h-11 px-6 rounded-xl font-bold text-slate-900 hover:bg-white/50"
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="destructive" 
                                onClick={handleBulkDelete}
                                className="h-11 px-8 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black shadow-lg shadow-rose-500/20 uppercase tracking-widest text-[11px]"
                            >
                                Delete {selectedAgents.size} Agents
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
                {/* Action Confirmation Dialog */}
                <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
                    <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-white/70 backdrop-blur-[40px] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[32px]">
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm transition-transform duration-500 hover:rotate-12",
                                    confirmAction?.type === 'reject' || confirmAction?.type === 'deactivate' 
                                        ? "bg-rose-50 border-rose-100/50" 
                                        : "bg-emerald-50 border-emerald-100/50"
                                )}>
                                    {confirmAction?.type === 'approve' || confirmAction?.type === 'activate' ? (
                                        <Check className="h-6 w-6 text-emerald-500" />
                                    ) : confirmAction?.type === 'reject' ? (
                                        <X className="h-6 w-6 text-rose-500" />
                                    ) : (
                                        <UserX className="h-6 w-6 text-rose-500" />
                                    )}
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black text-slate-800 tracking-tight uppercase">
                                        {confirmAction?.type === 'approve' && 'Approve Agent'}
                                        {confirmAction?.type === 'reject' && 'Reject Agent'}
                                        {confirmAction?.type === 'activate' && 'Activate Agent'}
                                        {confirmAction?.type === 'deactivate' && 'Deactivate Agent'}
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-900 font-medium text-xs mt-0.5 uppercase tracking-wider">
                                        Confirmation Required
                                    </DialogDescription>
                                </div>
                            </div>
                            
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Are you sure you want to <span className="font-bold">{confirmAction?.type}</span> agent <span className="text-slate-900 font-black">{confirmAction?.agentName}</span>?
                            </p>
                        </div>
                        
                        <div className="bg-slate-50/50 backdrop-blur-md px-8 py-6 flex justify-end gap-3 border-t border-white/20">
                            <Button 
                                variant="ghost" 
                                onClick={() => setConfirmAction(null)}
                                className="h-11 px-6 rounded-xl font-bold text-slate-900 hover:bg-white/50"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={() => {
                                    if (!confirmAction) return;
                                    if (confirmAction.type === 'approve') handleApprove(confirmAction.id);
                                    else if (confirmAction.type === 'reject') handleReject(confirmAction.id);
                                    else if (confirmAction.type === 'activate') toggleStatus(confirmAction.id, true);
                                    else if (confirmAction.type === 'deactivate') toggleStatus(confirmAction.id, false);
                                }} 
                                disabled={approveMutation.isPending || rejectMutation.isPending || statusMutation.isPending}
                                className={cn(
                                    "h-11 px-8 rounded-xl text-white font-black shadow-lg uppercase tracking-widest text-[11px]",
                                    confirmAction?.type === 'reject' || confirmAction?.type === 'deactivate'
                                        ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                                        : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                                )}
                            >
                                {approveMutation.isPending || rejectMutation.isPending || statusMutation.isPending ? 'Processing...' : 'Confirm'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

            {/* Email Conflict Modal */}
            <AlertDialog open={showConflictModal} onOpenChange={setShowConflictModal}>
                <AlertDialogContent className="bg-white/90 backdrop-blur-xl border-orange-100 rounded-[32px] p-8 max-w-[400px]">
                    <AlertDialogHeader className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-orange-600" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-black text-slate-900 text-center">
                            Email Already Registered
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-900 font-bold text-center leading-relaxed">
                            {conflictMessage}. Please use a different email address.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col gap-3 sm:flex-col sm:justify-center mt-6">
                        <AlertDialogAction
                            onClick={() => setShowConflictModal(false)}
                            className="w-full h-12 bg-gradient-to-r from-orange-600 to-orange-400 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20"
                        >
                            Understood
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
