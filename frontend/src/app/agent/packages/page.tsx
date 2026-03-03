'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
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
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Plus, Search, MoreVertical, Edit, Trash2, Eye, Package, MapPin, Calendar, Filter, Download, Archive, Copy, BarChart, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'

interface Package {
    id: string
    title: string
    destination: string
    duration_days: number
    price_per_person: number
    status: string
    created_at: string
}

export default function AdminPackagesPage() {
    const router = useRouter()
    const [packages, setPackages] = useState<Package[]>([])
    const [totalPackages, setTotalPackages] = useState(0)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    const [statusFilter, setStatusFilter] = useState('all')
    const [destinationFilter, setDestinationFilter] = useState('all')
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [selectedPackages, setSelectedPackages] = useState<string[]>([])

    // Pagination & Sort State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(5)
    const [sortConfig, setSortConfig] = useState<{ key: keyof Package; direction: 'asc' | 'desc' } | null>(null)

    useEffect(() => {
        // Check if agent is logged in
        const userStr = localStorage.getItem('user')
        if (!userStr) {
            router.push('/login')
            return
        }

        try {
            const user = JSON.parse(userStr)
            if (user.role !== 'agent' && user.role !== 'admin') { // Allow admin to view for now if needed, or strict agent
                // For now strict agent or admin. Let's redirect if customer
                if (user.role === 'customer') {
                    router.push('/')
                }
            }
        } catch (e) {
            router.push('/login')
        }

        loadPackages()
    }, [router, currentPage, itemsPerPage, sortConfig, statusFilter, destinationFilter])

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadPackages()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const loadPackages = async () => {
        setLoading(true)
        try {
            // Build query params
            const params = new URLSearchParams()
            params.append('page', currentPage.toString())
            params.append('limit', itemsPerPage.toString())

            if (sortConfig) {
                params.append('sort_by', sortConfig.key as string)
                params.append('sort_order', sortConfig.direction)
            } else {
                params.append('sort_by', 'created_at')
                params.append('sort_order', 'desc')
            }

            if (statusFilter !== 'all') {
                params.append('status_filter', statusFilter)
            }

            if (destinationFilter !== 'all') {
                params.append('destination', destinationFilter)
            }
            // For now, search query filter acts on client side for destination/title if backend doesn't support generic search yet? 
            // The backend supports 'destination' filter. Title search might not be fully supported by backend 'list_agent_packages' yet 
            // except via 'destination' param? 
            // Let's check backend: It has 'destination' and 'status_filter'. 
            // No generic 'q' or 'title' search. 
            // For now, strict server side filtering for destination. 
            // If user types in search, we might need to update backend to support title search or just use destination for now.
            // Let's assume search query maps to destination for now or we add title search support later.
            // Wait, the backend has:
            // if destination: stmt = stmt.where(Package.destination.ilike(f"%{destination}%"))
            // It does NOT search title.
            // Let's leave search client side? No, that breaks pagination.
            // We should ideally update backend to search title too. 
            // For now, let's map search query to destination if provided.
            if (searchQuery) {
                params.append('destination', searchQuery)
            }

            // Use agent endpoint
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/agent/packages?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            setPackages(data.items || [])
            setTotalPackages(data.total || 0)
        } catch (error) {
            console.error('Failed to load packages:', error)
            setPackages([])
            setTotalPackages(0)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteClick = (id: string) => {
        setDeleteId(id)
    }

    const confirmDelete = async () => {
        if (!deleteId) return

        setIsDeleting(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/agent/packages/${deleteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                loadPackages()
                toast.success('Your package has been deleted.')
                setDeleteId(null)
            } else {
                const errorData = await response.json().catch(() => ({}))
                const errorMessage = errorData.detail || 'Failed to delete'
                throw new Error(errorMessage)
            }
        } catch (error: any) {
            console.error('Failed to delete package:', error)
            toast.error(error.message || 'Failed to delete package.')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        // Backend uses lowercase enum values: 'published', 'draft'
        const newStatus = currentStatus.toLowerCase() === 'published' ? 'draft' : 'published'

        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/agent/packages/${id}/status?new_status=${newStatus}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error('Status update failed:', errorData)
                toast.error(`Failed to update status: ${errorData.detail}`)
                return
            }

            loadPackages()
        } catch (error) {
            console.error('Failed to toggle status:', error)
            toast.error('Network error while updating status')
        }
    }

    // Bulk Actions Handlers
    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedPackages(prev => [...prev, id])
        } else {
            setSelectedPackages(prev => prev.filter(pkgId => pkgId !== id))
        }
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = packages.map(pkg => pkg.id)
            setSelectedPackages(allIds)
        } else {
            setSelectedPackages([])
        }
    }

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedPackages.length} packages?`)) return

        setIsDeleting(true)
        try {
            const token = localStorage.getItem('token')
            const deletePromises = selectedPackages.map(id =>
                fetch(`http://localhost:8000/api/v1/agent/packages/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }).then(async res => {
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}))
                        throw new Error(data.detail || `Failed to delete package`)
                    }
                    return id
                })
            )

            await Promise.all(deletePromises)

            toast.success(`${selectedPackages.length} packages deleted successfully`)
            setSelectedPackages([])
            loadPackages()
        } catch (error) {
            console.error('Bulk delete failed:', error)
            toast.error('Failed to delete some packages')
        } finally {
            setIsDeleting(false)
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
            published: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/30',
            draft: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/30',
            archived: 'bg-transparent text-slate-700 border-slate-200 ring-slate-500/30',
        }

        const dots: Record<string, string> = {
            published: 'bg-emerald-500',
            draft: 'bg-amber-500',
            archived: 'bg-transparent0',
        }

        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ring-4 ring-opacity-20 ${styles[lowerStatus] || 'bg-transparent text-gray-700 border-gray-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dots[lowerStatus] || 'bg-gray-400'}`}></span>
                {status.charAt(0).toUpperCase() + status.slice(1)}
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
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Package className="h-6 w-6 text-indigo-600" />
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
                            <Button
                                onClick={() => router.push('/agent/packages/new')}
                                className="text-white px-6 transition-all hover:-translate-y-0.5 border-none"
                                style={{ background: 'linear-gradient(135deg, #6c47ff, #9333ea)', borderRadius: '100px', boxShadow: '0 6px 20px rgba(108,71,255,0.40)' }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create New Package
                            </Button>
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
                <Card className="glass-panel shadow-xl overflow-hidden rounded-[20px]">
                    <CardHeader className="border-b border-white/30 pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Package className="h-5 w-5 text-indigo-600" />
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
                        {loading ? (
                            <div className="text-center py-20">
                                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600"></div>
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
                                <Button
                                    onClick={() => router.push('/agent/packages/new')}
                                    className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 shadow-lg shadow-indigo-600/20"
                                >
                                    Create First Package
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Desktop View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-white/30">
                                            <TableRow className="hover:bg-transparent border-b border-white/30">
                                                <TableHead className="w-12 pl-6">
                                                    <Checkbox
                                                        checked={packages.length > 0 && selectedPackages.length === packages.length}
                                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                                    />
                                                </TableHead>
                                                <TableHead className="py-4 pl-6 font-semibold text-gray-600 w-[30%] cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('title')}>
                                                    <div className="flex items-center gap-2">
                                                        Package Details
                                                        {sortConfig?.key === 'title' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('destination')}>
                                                    <div className="flex items-center gap-2">
                                                        Destination
                                                        {sortConfig?.key === 'destination' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('duration_days')}>
                                                    <div className="flex items-center gap-2">
                                                        Duration
                                                        {sortConfig?.key === 'duration_days' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('price_per_person')}>
                                                    <div className="flex items-center gap-2">
                                                        Price
                                                        {sortConfig?.key === 'price_per_person' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 font-semibold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('status')}>
                                                    <div className="flex items-center gap-2">
                                                        Status
                                                        {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-4 pr-6 text-right font-semibold text-gray-600">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {packages.map((pkg, index) => (
                                                <TableRow
                                                    key={pkg.id}
                                                    className={`
                                                        group transition-all duration-200 hover:shadow-sm hover:border-white/40
                                                        ${selectedPackages.includes(pkg.id) ? 'bg-[rgba(255,255,255,0.15)]' : 'bg-transparent'} hover:bg-[rgba(255,255,255,0.15)]
                                                    `}
                                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.30)' }}
                                                >
                                                    <TableCell className="pl-6">
                                                        <Checkbox
                                                            checked={selectedPackages.includes(pkg.id)}
                                                            onCheckedChange={(checked) => handleSelectRow(pkg.id, checked as boolean)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-5 pl-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 text-lg">
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
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 hidden sm:inline-flex"
                                                                onClick={() => router.push(`/agent/packages/new?id=${pkg.id}`)}
                                                                title="Edit"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-56 shadow-xl border-gray-100 rounded-xl p-1">
                                                                    <DropdownMenuItem
                                                                        className="rounded-lg focus:bg-indigo-50 focus:text-indigo-700 py-2.5 px-3 cursor-pointer"
                                                                        onClick={() => router.push(`/agent/packages/new?id=${pkg.id}`)}
                                                                    >
                                                                        <Edit className="mr-2 h-4 w-4 text-indigo-500" />
                                                                        <span className="font-medium">Edit Package</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        className="rounded-lg focus:bg-transparent py-2.5 px-3 cursor-pointer"
                                                                        onClick={() => window.open(`/packages/${pkg.id}`, '_blank')}
                                                                    >
                                                                        <Eye className="mr-2 h-4 w-4 text-gray-500" />
                                                                        Preview Listing
                                                                    </DropdownMenuItem>
                                                                    <div className="h-px bg-gray-100 my-1" />
                                                                    <DropdownMenuItem
                                                                        className="rounded-lg focus:bg-amber-50 focus:text-amber-700 py-2.5 px-3 cursor-pointer"
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
                                                                    <div className="h-px bg-gray-100 my-1" />
                                                                    <DropdownMenuItem
                                                                        className="rounded-lg focus:bg-red-50 focus:text-red-700 group/delete py-2.5 px-3 cursor-pointer"
                                                                        onClick={() => handleDeleteClick(pkg.id)}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4 text-gray-400 group-hover/delete:text-red-500 transition-colors" />
                                                                        <span className="text-gray-600 group-hover/delete:text-red-600">Delete Package</span>
                                                                    </DropdownMenuItem>
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
                                    {packages.map((pkg) => (
                                        <div key={pkg.id} className={`glass-card rounded-2xl p-4 transition-all duration-300 ${selectedPackages.includes(pkg.id) ? 'ring-2 ring-violet-500' : ''}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={selectedPackages.includes(pkg.id)}
                                                        onCheckedChange={(checked) => handleSelectRow(pkg.id, checked as boolean)}
                                                        className="mr-1"
                                                    />
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
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
                                                        <DropdownMenuItem onClick={() => router.push(`/agent/packages/edit/${pkg.id}`)}>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => window.open(`/packages/${pkg.id}`, '_blank')}>Preview</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(pkg.id)}>Delete</DropdownMenuItem>
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
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.push(`/agent/packages/edit/${pkg.id}`)}
                                                    className="rounded-full text-xs h-8"
                                                >
                                                    Manage
                                                </Button>
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
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => setSelectedPackages([])}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" size="sm" className="rounded-full shadow-sm" onClick={handleBulkDelete}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Selected
                                </Button>
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
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
