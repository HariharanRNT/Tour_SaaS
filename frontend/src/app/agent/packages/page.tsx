'use client'

import { useState, useEffect } from 'react'
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
    TableRow } from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle } from '@/components/ui/dialog'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious } from "@/components/ui/pagination"
import { Plus, Search, MoreVertical, Edit, Trash2, Eye, Package, MapPin, Calendar, Filter, Download, Archive, Copy, BarChart, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAgentPackages, deleteAgentPackage, updateAgentPackageStatus } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface Package {
    id: string
    title: string
    slug: string
    destination: string
    duration_days: number
    price_per_person: number
    status: string
    created_at: string
}

export default function AgentPackagesPage() {
    const router = useRouter()
    const { hasPermission } = useAuth()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')

    const [statusFilter, setStatusFilter] = useState('all')
    const [destinationFilter, setDestinationFilter] = useState('all')
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [selectedPackages, setSelectedPackages] = useState<string[]>([])

    // Pagination & Sort State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(5)
    const [sortConfig, setSortConfig] = useState<{ key: keyof Package; direction: 'asc' | 'desc' } | null>(null)

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-packages'] })
            toast.success('Your package has been deleted.')
            setDeleteId(null)
            setSelectedPackages(prev => prev.filter(id => id !== deleteId))
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete package.')
        }
    })

    const statusMutation = useMutation({
        mutationFn: ({ id, new_status }: { id: string, new_status: string }) => updateAgentPackageStatus(id, new_status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-packages'] })
            toast.success('Status updated successfully')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update status')
        }
    })

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            return Promise.all(ids.map(id => deleteAgentPackage(id)))
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-packages'] })
            toast.success(`${selectedPackages.length} packages deleted successfully`)
            setSelectedPackages([])
        },
        onError: () => {
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
        const new_status = currentStatus.toLowerCase() === 'published' ? 'draft' : 'published'
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


    const handleSort = (key: keyof Package) => {
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
            archived: 'bg-slate-500/10 text-slate-600 border-slate-500/20 ring-slate-500/10' }

        const dots: Record<string, string> = {
            published: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
            draft: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
            archived: 'bg-slate-400' }

        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${styles[lowerStatus] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dots[lowerStatus] || 'bg-gray-400'}`}></span>
                {status}
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="glass-navbar sticky top-0 z-30 shadow-sm">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            {/* Breadcrumb */}
                            <nav className="flex items-center text-sm text-gray-500 mb-2">
                                <span className="hover:text-gray-900 cursor-pointer transition-colors" onClick={() => router.push('/agent/dashboard')}>Dashboard</span>
                                <span className="mx-2">/</span>
                                <span className="font-medium text-gray-900">Packages</span>
                            </nav>

                            {/* Title & Subtitle */}
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                                    <Package className="h-6 w-6 text-[var(--primary)]" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Agent Package Management</h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-gray-500 text-sm">Create and manage your tour packages</p>
                                        <span className="hidden md:inline text-gray-300">•</span>
                                        <div className="hidden md:flex items-center gap-3 text-sm font-medium text-gray-600">
                                            <span className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                                {totalPackages} Packages
                                            </span>
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
                                    className="text-white px-6 transition-all hover:-translate-y-0.5 border-none"
                                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', borderRadius: '100px', boxShadow: '0 6px 20px var(--primary-glow)' }}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create New Package
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Mobile Stats (Visible only on small screens) */}
                    <div className="md:hidden mt-4 pt-4 border-t flex justify-between text-sm">
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-gray-900">{totalPackages}</span>
                            <span className="text-gray-500 text-xs">Total</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <Card className="bg-white/70 backdrop-blur-[40px] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden rounded-[32px]">
                    <CardHeader className="border-b border-white/10 pb-6 px-8 pt-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Package className="h-5 w-5 text-[var(--primary)]" />
                                    All Packages
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Manage, track, and update your {totalPackages} tour packages
                                </CardDescription>
                            </div>

                            {/* Enhanced Search & Filter Toolbar */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Search packages..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="glass-input pl-10 w-48 sm:w-64 rounded-full text-gray-800 placeholder-gray-500"
                                    />
                                </div>

                                {/* Filters */}
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="glass-input appearance-none pl-4 pr-8 py-2 text-sm rounded-full cursor-pointer text-gray-800"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="draft">Draft</option>
                                            <option value="published">Published</option>
                                        </select>
                                        <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none" />
                                    </div>

                                    <div className="relative">
                                        <Input
                                            placeholder="Filter destination..."
                                            value={destinationFilter === 'all' ? '' : destinationFilter}
                                            onChange={(e) => setDestinationFilter(e.target.value || 'all')}
                                            className="glass-input pl-4 pr-8 py-2 text-sm w-40 rounded-full text-gray-800 placeholder-gray-500"
                                        />
                                        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                                    </div>



                                    {(statusFilter !== 'all' || destinationFilter !== 'all' || sortConfig !== null || searchQuery) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFilters}
                                            className="text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full px-3"
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
                                <p className="mt-4 text-gray-500 font-medium">Loading your packages...</p>
                            </div>
                        ) : packages.length === 0 ? (
                            <div className="text-center py-20 px-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Package className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">No packages found</h3>
                                <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                                    Get started by creating your first tour package to reach more travelers.
                                </p>
                                {hasPermission('packages', 'edit') && (
                                    <Button
                                        onClick={() => router.push('/agent/packages/new')}
                                        className="mt-6 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-full px-8 shadow-lg shadow-[var(--primary-glow)]"
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
                                                <TableHead className="py-4 pl-6 font-semibold text-gray-600 w-[30%] cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => handleSort('title')}>
                                                    <div className="flex items-center gap-2">
                                                        Package Details
                                                        {sortConfig?.key === 'title' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-gray-600 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => handleSort('destination')}>
                                                    <div className="flex items-center gap-2">
                                                        Destination
                                                        {sortConfig?.key === 'destination' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-gray-600 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => handleSort('duration_days')}>
                                                    <div className="flex items-center gap-2">
                                                        Duration
                                                        {sortConfig?.key === 'duration_days' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-gray-600 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => handleSort('price_per_person')}>
                                                    <div className="flex items-center gap-2">
                                                        Price
                                                        {sortConfig?.key === 'price_per_person' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-gray-600 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => handleSort('status')}>
                                                    <div className="flex items-center gap-2">
                                                        Status
                                                        {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 pr-6 text-right font-semibold text-gray-600">Actions</TableHead>
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
                                                                <div className="font-semibold text-gray-900">{pkg.title}</div>
                                                                <div className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">ID: {pkg.id.slice(0, 8)}...</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <div className="flex items-center gap-2 text-gray-600">
                                                            <MapPin className="h-4 w-4 text-gray-400" />
                                                            <span className="font-medium">{pkg.destination}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <div className="flex items-center gap-2 text-gray-600">
                                                            <Calendar className="h-4 w-4 text-gray-400" />
                                                            <span>{pkg.duration_days} Days</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <div className="flex items-center gap-1 font-bold text-gray-900">
                                                            <span className="text-gray-400">₹</span>
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
                                                                    className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 hidden sm:inline-flex"
                                                                    onClick={() => router.push(`/agent/packages/new?id=${pkg.id}`)}
                                                                    title="Edit"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            )}

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-56 shadow-xl border-gray-100 rounded-xl p-1">
                                                                    {hasPermission('packages', 'edit') && (
                                                                        <DropdownMenuItem
                                                                            className="glass-popover-item"
                                                                            onClick={() => router.push(`/agent/packages/new?id=${pkg.id}`)}
                                                                        >
                                                                            <Edit className="mr-2 h-4 w-4 text-indigo-500" />
                                                                            <span className="font-medium">Edit Package</span>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuItem
                                                                        className="glass-popover-item"
                                                                        onClick={() => window.open(`/plan-trip/${pkg.slug}?mode=preview`, '_blank')}
                                                                    >
                                                                        <Eye className="mr-2 h-4 w-4 text-gray-500" />
                                                                        Preview Listing
                                                                    </DropdownMenuItem>
                                                                    <div className="h-px bg-gray-100 my-1" />
                                                                    {hasPermission('packages', 'edit') && (
                                                                        <DropdownMenuItem
                                                                            className="glass-popover-item"
                                                                            onClick={() => handleToggleStatus(pkg.id, pkg.status)}
                                                                        >
                                                                            {pkg.status.toLowerCase() === 'published' ? (
                                                                                <>
                                                                                    <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                                                                                    Unpublish (Draft)
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                                                                                    Publish Live
                                                                                </>
                                                                            )}
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <div className="h-px bg-gray-100 my-1" />
                                                                    {hasPermission('packages', 'full') && (
                                                                        <DropdownMenuItem
                                                                            className="group/delete glass-popover-item text-red-600 focus:text-red-400"
                                                                            onClick={() => handleDeleteClick(pkg.id)}
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4 text-gray-400 group-hover/delete:text-red-500 transition-colors" />
                                                                            <span className="text-gray-600 group-hover/delete:text-red-600">Delete Package</span>
                                                                        </DropdownMenuItem>
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
                                            "bg-white/60 backdrop-blur-[30px] border border-white/20 rounded-[24px] p-5 transition-all duration-300 shadow-lg hover:shadow-xl",
                                            selectedPackages.includes(pkg.id) ? "ring-2 ring-indigo-500 bg-white/80" : ""
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
                                                        <h3 className="font-semibold text-gray-900 line-clamp-1">{pkg.title}</h3>
                                                        <p className="text-xs text-gray-500">ID: {pkg.id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8 text-gray-400">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {hasPermission('packages', 'edit') && (
                                                            <DropdownMenuItem onClick={() => router.push(`/agent/packages/new?id=${pkg.id}`)}>
                                                                Edit
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => window.open(`/plan-trip/${pkg.slug}?mode=preview`, '_blank')}>
                                                            Preview
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

                                            <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-gray-400" />
                                                    <span className="truncate">{pkg.destination}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    <span>{pkg.duration_days} Days</span>
                                                </div>
                                                <div className="flex items-center gap-2 col-span-2 mt-1">
                                                    <StatusBadge status={pkg.status} />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                <div className="font-bold text-lg text-gray-900">
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
                        <div className="glass-panel text-gray-900 rounded-full px-6 py-3 fixed bottom-6 left-1/2 transform -translate-x-1/2 shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
                            <span className="font-medium text-sm border-r border-white/40 pr-4">
                                {selectedPackages.length} selected
                            </span>
                             <div className="flex items-center gap-2">
                                 <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10" onClick={() => setSelectedPackages([])}>
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the package.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
