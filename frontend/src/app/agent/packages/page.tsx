'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from "@/components/ui/pagination"
import { Plus, Search, MoreVertical, Edit, Trash2, Eye, Package, MapPin, Calendar, Filter, Download, Archive, Copy, BarChart, ArrowUpDown, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAgentPackages, deleteAgentPackage, updateAgentPackageStatus } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface PackageData {
    id: string
    title: string
    slug: string
    destination: string
    duration_days: number
    price_per_person: number
    status: string
    created_at: string
    package_mode?: string
}

export default function AgentPackagesPage() {
    const router = useRouter()
    const { hasPermission, isSubUser } = useAuth()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')

    const [statusFilter, setStatusFilter] = useState('all')
    const [destinationFilter, setDestinationFilter] = useState('all')
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [selectedPackages, setSelectedPackages] = useState<string[]>([])

    // Pagination & Sort State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(5)
    const [sortConfig, setSortConfig] = useState<{ key: keyof PackageData; direction: 'asc' | 'desc' } | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['agent-packages', currentPage, itemsPerPage, sortConfig, statusFilter, destinationFilter, searchQuery],
        queryFn: () => fetchAgentPackages({
            page: currentPage,
            limit: itemsPerPage,
            sort_by: sortConfig?.key || 'created_at',
            sort_order: sortConfig?.direction || 'desc',
            status_filter: statusFilter === 'all' ? undefined : statusFilter,
            destination: destinationFilter === 'all' ? (searchQuery || undefined) : destinationFilter
        })
    })

    const packages = data?.items || []
    const totalPackages = data?.total || 0

    useEffect(() => {
        if (isSubUser && !hasPermission('packages', 'view')) {
            router.push('/agent/dashboard')
            return
        }

        // Check if agent is logged in
        const userStr = localStorage.getItem('user')
        if (!userStr) {
            router.push('/login')
            return
        }

        try {
            const user = JSON.parse(userStr)
            const role = user.role?.toUpperCase()
            if (role !== 'AGENT' && role !== 'ADMIN' && role !== 'SUB_USER') {
                // Redirect if customer or other roles that shouldn't be here
                if (role === 'CUSTOMER') {
                    router.push('/')
                } else {
                    router.push('/login')
                }
            }
        } catch (e) {
            router.push('/login')
        }
    }, [router])

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: deleteAgentPackage,
        onMutate: async (id: string) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['agent-packages'] })

            // Snapshot the previous value
            const previousPackages = queryClient.getQueryData(['agent-packages'])

            // Optimistically update to the new value
            queryClient.setQueriesData({ queryKey: ['agent-packages'] }, (oldData: any) => {
                if (!oldData || !oldData.items) return oldData
                return {
                    ...oldData,
                    items: oldData.items.filter((pkg: any) => pkg.id !== id),
                    total: Math.max(0, (oldData.total || 0) - 1)
                }
            })

            // Return a context object with the snapshotted value
            return { previousPackages }
        },
        onSuccess: async () => {
            await queryClient.resetQueries({ queryKey: ['agent-packages'] })
            await queryClient.resetQueries({ queryKey: ['agent-dashboard-stats'] })
            toast.success('Your package has been deleted.')
            setDeleteId(null)
            setSelectedPackages(prev => prev.filter(id => id !== deleteId))
        },
        onError: (error: any, id: string, context: any) => {
            // Rollback on error
            if (context?.previousPackages) {
                queryClient.setQueryData(['agent-packages'], context.previousPackages)
            }

            const detail = error?.response?.data?.detail
            if (detail && detail.toLowerCase().includes('archive')) {
                toast.error(detail, {
                    duration: 6000,
                    action: {
                        label: 'Archive Instead',
                        onClick: () => {
                            if (id) {
                                statusMutation.mutate({ id: id, new_status: 'ARCHIVED' })
                                setDeleteId(null)
                            }
                        }
                    }
                })
            } else {
                toast.error(error.message || 'Failed to delete package.')
            }
        }
    })

    const statusMutation = useMutation({
        mutationFn: ({ id, new_status }: { id: string, new_status: string }) => updateAgentPackageStatus(id, new_status),
        onMutate: async ({ id, new_status }) => {
            await queryClient.cancelQueries({ queryKey: ['agent-packages'] })
            const previousPackages = queryClient.getQueryData(['agent-packages'])

            queryClient.setQueriesData({ queryKey: ['agent-packages'] }, (oldData: any) => {
                if (!oldData || !oldData.items) return oldData
                return {
                    ...oldData,
                    items: oldData.items.map((pkg: any) =>
                        pkg.id === id ? { ...pkg, status: new_status.toLowerCase() } : pkg
                    )
                }
            })

            return { previousPackages }
        },
        onSuccess: async () => {
            await queryClient.resetQueries({ queryKey: ['agent-packages'] })
            await queryClient.resetQueries({ queryKey: ['agent-dashboard-stats'] })
            toast.success('Status updated successfully')
        },
        onError: (error: any, variables, context) => {
            if (context?.previousPackages) {
                queryClient.setQueryData(['agent-packages'], context.previousPackages)
            }
            toast.error(error.message || 'Failed to update status')
        }
    })

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            return Promise.all(ids.map(id => deleteAgentPackage(id)))
        },
        onMutate: async (ids: string[]) => {
            await queryClient.cancelQueries({ queryKey: ['agent-packages'] })
            const previousPackages = queryClient.getQueryData(['agent-packages'])

            queryClient.setQueriesData({ queryKey: ['agent-packages'] }, (oldData: any) => {
                if (!oldData || !oldData.items) return oldData
                return {
                    ...oldData,
                    items: oldData.items.filter((pkg: any) => !ids.includes(pkg.id)),
                    total: Math.max(0, (oldData.total || 0) - ids.length)
                }
            })

            return { previousPackages }
        },
        onSuccess: async () => {
            await queryClient.resetQueries({ queryKey: ['agent-packages'] })
            await queryClient.resetQueries({ queryKey: ['agent-dashboard-stats'] })
            toast.success('Packages deleted successfully')
            setSelectedPackages([])
        },
        onError: (error, ids, context) => {
            if (context?.previousPackages) {
                queryClient.setQueryData(['agent-packages'], context.previousPackages)
            }
            toast.error('Failed to delete some packages')
        }
    })

    const handleDeleteClick = (id: string) => {
        setDeleteId(id)
    }

    const confirmDelete = () => {
        if (deleteId) {
            deleteMutation.mutate(deleteId)
        }
    }

    const handleToggleStatus = (id: string, currentStatus: string) => {
        const new_status = currentStatus.toUpperCase() === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
        statusMutation.mutate({ id, new_status })
    }

    const handleBulkDelete = () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedPackages.length} packages?`)) return
        bulkDeleteMutation.mutate(selectedPackages)
    }

    // Selection Handlers
    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedPackages(prev => [...prev, id])
        } else {
            setSelectedPackages(prev => prev.filter(pkgId => pkgId !== id))
        }
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = packages.map((pkg: any) => pkg.id)
            setSelectedPackages(allIds)
        } else {
            setSelectedPackages([])
        }
    }


    // Server-side Pagination Logic
    const totalPages = Math.ceil(totalPackages / itemsPerPage);
    // Note: 'packages' state now contains only the current page's items fetched from backend


    const handleSort = (key: keyof PackageData) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setDestinationFilter('all');
        setSortConfig(null);
        setCurrentPage(1);
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const lowerStatus = status.toLowerCase()
        const styles: Record<string, string> = {
            published: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ring-emerald-500/10',
            draft: 'bg-amber-500/10 text-amber-600 border-amber-500/20 ring-amber-500/10',
            archived: 'bg-slate-500/10 text-[var(--color-primary-font)] border-slate-500/20 ring-slate-500/10'
        }

        const dots: Record<string, string> = {
            published: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
            draft: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
            archived: 'bg-slate-400'
        }

        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${styles[lowerStatus] || 'bg-gray-500/10 text-[var(--color-primary-font)] border-gray-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dots[lowerStatus] || 'bg-gray-600'}`}></span>
                {status}
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            {/* Content Container */}
            <div className="container mx-auto px-4 py-8">
                {/* Page Header Card */}
                <div className="page-header-card animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col gap-4">
                        {/* Breadcrumb */}
                        <nav className="flex items-center text-sm text-[var(--color-primary-font)]">
                            <span
                                className="hover:text-[var(--primary)] cursor-pointer transition-colors"
                                onClick={() => router.push('/agent/dashboard')}
                            >
                                Dashboard
                            </span>
                            <span className="mx-2 text-gray-400">/</span>
                            <span className="font-medium text-[var(--color-primary-font)]">Packages</span>
                        </nav>

                        {/* Title & Subtitle */}
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-[var(--primary)]/10 rounded-xl">
                                <Package className="h-7 w-7 text-[var(--primary)]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[var(--color-primary-font)] tracking-tight">Agent Package Management</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[var(--color-primary-font)]/70 text-sm">Create and manage your tour packages</p>
                                    <span className="text-gray-400">•</span>
                                    <div className="flex items-center gap-1 text-sm font-medium text-[var(--color-primary-font)]">
                                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary-font)]"></span>
                                        {totalPackages} Packages
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {hasPermission('packages', 'edit') && (
                            <Button
                                onClick={() => router.push('/agent/packages/new')}
                                className="text-black px-8 py-6 transition-all hover:scale-[1.02] active:scale-[0.98] border-none shadow-xl rounded-full"
                                style={{
                                    background: 'linear-gradient(135deg, var(--button-bg), var(--button-bg-light))',
                                    boxShadow: '0 8px 25px var(--button-glow)',
                                    fontWeight: '700',
                                    letterSpacing: '-0.01em'
                                }}
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                Create New Package
                            </Button>
                        )}
                    </div>
                </div>

                <Card className="overflow-hidden">
                    <CardHeader className="border-b border-white/10 pb-6 px-8 pt-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-xl text-[var(--color-primary-font)]">
                                    <Package className="h-5 w-5 text-[var(--primary)]" />
                                    All Packages
                                </CardTitle>
                                <CardDescription className="mt-1 text-[var(--color-primary-font)]/70">
                                    Manage, track, and update your {totalPackages} tour packages
                                </CardDescription>
                            </div>

                            {/* Enhanced Search & Filter Toolbar */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-primary-font)]/60" />
                                    <Input
                                        placeholder="Search packages..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="glass-input pl-10 w-48 sm:w-64 rounded-full text-[var(--color-primary-font)] placeholder-gray-500"
                                    />
                                </div>

                                {/* Filters */}
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="glass-input appearance-none pl-4 pr-8 py-2 text-sm rounded-full cursor-pointer text-[var(--color-primary-font)]"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="draft">Draft</option>
                                            <option value="published">Published</option>
                                        </select>
                                        <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-[var(--color-primary-font)]/60 pointer-events-none" />
                                    </div>

                                    <div className="relative">
                                        <Input
                                            placeholder="Filter destination..."
                                            value={destinationFilter === 'all' ? '' : destinationFilter}
                                            onChange={(e) => setDestinationFilter(e.target.value || 'all')}
                                            className="glass-input pl-4 pr-8 py-2 text-sm w-40 rounded-full text-[var(--color-primary-font)] placeholder-gray-500"
                                        />
                                        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-primary-font)]/60 pointer-events-none" />
                                    </div>



                                    {(statusFilter !== 'all' || destinationFilter !== 'all' || sortConfig !== null || searchQuery) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFilters}
                                            className="text-[var(--color-primary-font)]/70 hover:text-red-500 hover:bg-red-50 rounded-full px-3"
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </div>

                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="text-center py-20">
                                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[var(--primary)]/10 border-t-[var(--primary)]"></div>
                                <p className="mt-4 text-[var(--color-primary-font)] font-medium">Loading your packages...</p>
                            </div>
                        ) : packages.length === 0 ? (
                            <div className="text-center py-20 px-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Package className="h-8 w-8 text-[var(--color-primary-font)]/60" />
                                </div>
                                <h3 className="text-lg font-semibold text-[var(--color-primary-font)]">No packages found</h3>
                                <p className="text-[var(--color-primary-font)]/70 mt-1 max-w-sm mx-auto">
                                    Get started by creating your first tour package to reach more travelers.
                                </p>
                                {hasPermission('packages', 'edit') && (
                                    <Button
                                        onClick={() => router.push('/agent/packages/new')}
                                        className="mt-6 text-white rounded-full px-8 shadow-lg"
                                        style={{
                                            background: 'linear-gradient(135deg, var(--button-bg), var(--button-bg-light))',
                                            boxShadow: '0 6px 20px var(--button-glow)',
                                        }}
                                    >
                                        Create First Package
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Desktop View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-white/40 backdrop-blur-md">
                                            <TableRow className="hover:bg-transparent border-b border-white/10">
                                                <TableHead className="w-12 pl-6">
                                                    <Checkbox
                                                        checked={packages.length > 0 && selectedPackages.length === packages.length}
                                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                                        className="data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)]"
                                                    />
                                                </TableHead>
                                                <TableHead className="py-4 pl-6 font-semibold text-[var(--color-primary-font)] w-[30%] cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => handleSort('title')}>
                                                    <div className="flex items-center gap-2">
                                                        Package Details
                                                        {sortConfig?.key === 'title' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-[var(--color-primary-font)] cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => handleSort('destination')}>
                                                    <div className="flex items-center gap-2">
                                                        Destination
                                                        {sortConfig?.key === 'destination' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-[var(--color-primary-font)] cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => handleSort('duration_days')}>
                                                    <div className="flex items-center gap-2">
                                                        Duration
                                                        {sortConfig?.key === 'duration_days' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-[var(--color-primary-font)] cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => handleSort('price_per_person')}>
                                                    <div className="flex items-center gap-2">
                                                        Price
                                                        {sortConfig?.key === 'price_per_person' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-[var(--color-primary-font)] cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => handleSort('status')}>
                                                    <div className="flex items-center gap-2">
                                                        Status
                                                        {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 pr-6 text-right font-semibold text-[var(--color-primary-font)]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {packages.map((pkg: any, index: number) => (
                                                <TableRow
                                                    key={pkg.id}
                                                    className={cn(
                                                        "group transition-all duration-300 hover:bg-white/40 border-b border-white/10",
                                                        selectedPackages.includes(pkg.id) ? "bg-white/50" : "bg-transparent"
                                                    )}
                                                >
                                                    <TableCell className="pl-6">
                                                        <Checkbox
                                                            checked={selectedPackages.includes(pkg.id)}
                                                            onCheckedChange={(checked) => handleSelectRow(pkg.id, checked as boolean)}
                                                            className="data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)]"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-5 pl-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0 text-lg font-bold">
                                                                {pkg.title.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-[var(--color-primary-font)]">{pkg.title}</div>
                                                                <div className="text-xs text-[var(--color-primary-font)]/60 mt-0.5 max-w-[200px] truncate">ID: {pkg.id.slice(0, 8)}...</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <div className="flex items-center gap-2 text-[var(--color-primary-font)]">
                                                            {pkg.package_mode === 'multi' ? (
                                                                <>
                                                                    <MapPin className="h-4 w-4 text-[var(--color-primary-font)]/40" />
                                                                    <span className="font-semibold text-[var(--color-primary-font)]">Multi-City</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <MapPin className="h-4 w-4 text-[var(--color-primary-font)]/40" />
                                                                    <span className="font-medium text-[var(--color-primary-font)]/80">{pkg.destination}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <div className="flex items-center gap-2 text-[var(--color-primary-font)]">
                                                            <Calendar className="h-4 w-4 text-[var(--color-primary-font)]/40" />
                                                            <span className="text-[var(--color-primary-font)]/80">{pkg.duration_days} Days</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <div className="flex items-center gap-1 font-bold text-[var(--color-primary-font)]">
                                                            <span className="text-[var(--color-primary-font)]/50">₹</span>
                                                            {pkg.price_per_person.toLocaleString('en-IN')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <StatusBadge status={pkg.status} />
                                                    </TableCell>
                                                    <TableCell className="py-5 pr-6 text-right">
                                                        <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                                            {hasPermission('packages', 'edit') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-[var(--color-primary-font)]/60 hover:text-indigo-600 hover:bg-indigo-50 hidden sm:inline-flex"
                                                                    onClick={() => router.push(`/agent/packages/new?id=${pkg.id}`)}
                                                                    title="Edit"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            )}

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--color-primary-font)]/60 hover:text-[var(--primary)]">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent
                                                                    align="end"
                                                                    className="w-56 !bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_25px_60px_rgba(0,0,0,0.25)] rounded-2xl p-1.5 animate-in fade-in zoom-in-95 duration-200"
                                                                >
                                                                    {hasPermission('packages', 'edit') && (
                                                                        <DropdownMenuItem
                                                                            className="gap-2 cursor-pointer py-2 px-3 focus:bg-[var(--primary)]/10 focus:text-black rounded-lg transition-all duration-200"
                                                                            onClick={() => router.push(`/agent/packages/new?id=${pkg.id}`)}
                                                                        >
                                                                            <Edit className="mr-2 h-4 w-4 text-indigo-500" />
                                                                            <span className="font-medium text-[var(--color-primary-font)]">Edit Package</span>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuItem
                                                                        className="gap-2 cursor-pointer py-2 px-3 focus:bg-[var(--primary)]/10 focus:text-black rounded-lg transition-all duration-200"
                                                                        onClick={() => window.open(`/plan-trip/${pkg.slug}?mode=preview`, '_blank')}
                                                                    >
                                                                        <Eye className="mr-2 h-4 w-4 text-[var(--color-primary-font)]/60" />
                                                                        <span className="font-medium text-[var(--color-primary-font)]">Preview Listing</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="bg-black/5 mx-2 my-1" />
                                                                    {hasPermission('packages', 'edit') && (
                                                                        <DropdownMenuItem
                                                                            className="gap-2 cursor-pointer py-2 px-3 focus:bg-[var(--primary)]/10 focus:text-black rounded-lg transition-all duration-200"
                                                                            onClick={() => handleToggleStatus(pkg.id, pkg.status)}
                                                                        >
                                                                            {pkg.status.toLowerCase() === 'published' ? (
                                                                                <>
                                                                                    <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                                                                                    <span className="font-medium text-[var(--color-primary-font)]">Unpublish (Draft)</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                                                                                    <span className="font-medium text-[var(--color-primary-font)]">Publish Live</span>
                                                                                </>
                                                                            )}
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuSeparator className="bg-black/5 mx-2 my-1" />
                                                                    {hasPermission('packages', 'full') && (
                                                                        <>
                                                                            <DropdownMenuItem
                                                                                className="gap-2 cursor-pointer py-2 px-3 focus:bg-[var(--primary)]/10 focus:text-black rounded-lg transition-all duration-200"
                                                                                onClick={() => statusMutation.mutate({ id: pkg.id, new_status: 'ARCHIVED' })}
                                                                            >
                                                                                <Archive className="mr-2 h-4 w-4 text-[var(--color-primary-font)]/60" />
                                                                                <span className="font-medium text-[var(--color-primary-font)]">Archive Package</span>
                                                                            </DropdownMenuItem>

                                                                            <DropdownMenuItem
                                                                                className="gap-2 cursor-pointer py-2 px-3 text-red-600 focus:text-red-700 focus:bg-red-50/50 rounded-lg transition-all duration-200"
                                                                                onClick={() => handleDeleteClick(pkg.id)}
                                                                            >
                                                                                <Trash2 className="mr-2 h-4 w-4 text-gray-400 group-hover/delete:text-red-500 transition-colors" />
                                                                                <span className="text-[var(--color-primary-font)] group-hover/delete:text-red-600 font-semibold">Delete Package</span>
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile View (Cards) */}
                                <div className="md:hidden grid gap-4 p-4">
                                    {packages.map((pkg: any) => (
                                        <div key={pkg.id} className={cn(
                                            "rounded-[24px] p-5 transition-all duration-300 glass-agent shadow-lg hover:shadow-xl",
                                            selectedPackages.includes(pkg.id) ? "ring-2 ring-[var(--primary)] bg-white/40" : ""
                                        )}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={selectedPackages.includes(pkg.id)}
                                                        onCheckedChange={(checked) => handleSelectRow(pkg.id, checked as boolean)}
                                                        className="mr-1 data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)]"
                                                    />
                                                    <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-lg">
                                                        {pkg.title.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-[var(--color-primary-font)] line-clamp-1">{pkg.title}</h3>
                                                        <p className="text-xs text-[var(--color-primary-font)]/60">ID: {pkg.id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8 text-[var(--color-primary-font)]/60">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="w-52 !bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_25px_60px_rgba(0,0,0,0.25)] rounded-2xl p-1.5 animate-in fade-in zoom-in-95 duration-200"
                                                    >
                                                        {hasPermission('packages', 'edit') && (
                                                            <DropdownMenuItem onClick={() => router.push(`/agent/packages/new?id=${pkg.id}`)}>
                                                                <span className="text-[var(--color-primary-font)] font-medium">Edit</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => window.open(`/plan-trip/${pkg.slug}?mode=preview`, '_blank')}>
                                                            <span className="text-[var(--color-primary-font)] font-medium">Preview</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {hasPermission('packages', 'full') && (
                                                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(pkg.id)}>
                                                                Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <div className="grid grid-cols-2 gap-y-2 text-sm text-[var(--color-primary-font)]/80 mb-4 font-medium">
                                                <div className="flex items-center gap-2">
                                                    {pkg.package_mode === 'multi' ? (
                                                        <>
                                                            <MapPin className="h-4 w-4 text-[var(--color-primary-font)]" />
                                                            <span className="font-semibold text-[var(--color-primary-font)]">Multi-City</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <MapPin className="h-4 w-4 text-[var(--color-primary-font)]" />
                                                            <span className="truncate">{pkg.destination}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-[var(--color-primary-font)]" />
                                                    <span>{pkg.duration_days} Days</span>
                                                </div>
                                                <div className="flex items-center gap-2 col-span-2 mt-1 font-normal">
                                                    <StatusBadge status={pkg.status} />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                <div className="font-bold text-lg text-[var(--color-primary-font)]">
                                                    ₹{pkg.price_per_person.toLocaleString('en-IN')}
                                                </div>
                                                {hasPermission('packages', 'edit') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => router.push(`/agent/packages/new?id=${pkg.id}`)}
                                                        className="rounded-full text-xs h-8 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] hover:border-[var(--primary)]/30"
                                                    >
                                                        Manage
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {/* Pagination */}
                        {totalPackages > 0 && (
                            <div className="py-4 border-t border-white/30 bg-transparent">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page: number) => (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    isActive={page === currentPage}
                                                    onClick={() => setCurrentPage(page)}
                                                    className="cursor-pointer"
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </CardContent>

                    {/* Floating Bulk Action Bar */}
                    {selectedPackages.length > 0 && (
                        <div className="glass-panel text-[var(--color-primary-font)] rounded-full px-6 py-3 fixed bottom-6 left-1/2 transform -translate-x-1/2 shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
                            <span className="font-medium text-sm border-r border-white/40 pr-4 text-[var(--color-primary-font)]">
                                {selectedPackages.length} selected
                            </span>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="text-[var(--color-primary-font)]/70 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10" onClick={() => setSelectedPackages([])}>
                                    Cancel
                                </Button>
                                {hasPermission('packages', 'full') && (
                                    <Button variant="destructive" size="sm" className="rounded-full shadow-sm" onClick={handleBulkDelete}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Selected
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Delete Confirmation Dialog with Glassmorphism */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="max-w-md glass-premium border-0" overlayClass="bg-black/40">
                    <DialogHeader>
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 mx-auto sm:mx-0 transition-transform hover:scale-110">
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-[var(--color-primary-font)]">Are you sure?</DialogTitle>
                        <DialogDescription className="text-[var(--color-primary-font)]/80 pt-2 leading-relaxed font-medium">
                            This action cannot be undone. This will permanently remove <span className="font-bold text-[var(--color-primary-font)]">{packages.find((p: any) => p.id === deleteId)?.title}</span> from your package library.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-8 gap-3 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteId(null)}
                            className="flex-1 bg-white/20 hover:bg-white/40 border-white/40 text-gray-700 backdrop-blur-sm transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteMutation.isPending}
                            className="flex-1 bg-red-500/90 hover:bg-red-600 shadow-lg shadow-red-200/50 transition-all"
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
