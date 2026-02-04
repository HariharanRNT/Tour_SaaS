'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreVertical, Edit, Trash2, Eye } from 'lucide-react'

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
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    useEffect(() => {
        // Check if admin is logged in
        const isAdmin = localStorage.getItem('isAdmin')
        if (!isAdmin || isAdmin !== 'true') {
            router.push('/admin/login')
            return
        }

        loadPackages()
    }, [statusFilter, router])

    const loadPackages = async () => {
        setLoading(true)
        try {
            // Use simplified admin endpoint that works
            const response = await fetch('http://localhost:8000/api/v1/admin-simple/packages-simple')

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            setPackages(data || [])
        } catch (error) {
            console.error('Failed to load packages:', error)
            setPackages([])
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this package?')) {
            return
        }

        try {
            const response = await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                loadPackages()
                toast.success('Package deleted successfully')
            } else {
                throw new Error('Failed to delete')
            }
        } catch (error) {
            console.error('Failed to delete package:', error)
            toast.error('Failed to delete package')
        }
    }

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'

        try {
            await fetch(`http://localhost:8000/api/v1/admin/packages/${id}/status?new_status=${newStatus}`, {
                method: 'PATCH'
            })
            loadPackages()
        } catch (error) {
            console.error('Failed to toggle status:', error)
        }
    }

    const filteredPackages = packages.filter(pkg =>
        pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.destination.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getStatusBadge = (status: string) => {
        const variants: Record<string, any> = {
            PUBLISHED: 'default',
            DRAFT: 'secondary',
            ARCHIVED: 'outline'
        }
        return (
            <Badge variant={variants[status] || 'secondary'}>
                {status}
            </Badge>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push('/admin/dashboard')}
                                >
                                    ← Back to Dashboard
                                </Button>
                            </div>
                            <h1 className="text-3xl font-bold">Package Management</h1>
                            <p className="text-gray-600 mt-1">Create and manage tour packages</p>
                        </div>
                        <Button onClick={() => router.push('/admin/packages/new')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Package
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>All Packages</CardTitle>
                                <CardDescription>
                                    {filteredPackages.length} package(s) found
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {/* Status Filter */}
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="border rounded-md px-3 py-2"
                                >
                                    <option value="all">All Status</option>
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                </select>

                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search packages..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 w-64"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <p className="mt-4 text-gray-600">Loading packages...</p>
                            </div>
                        ) : filteredPackages.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No packages found</p>
                                <Button
                                    onClick={() => router.push('/admin/packages/new')}
                                    className="mt-4"
                                >
                                    Create Your First Package
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Destination</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPackages.map((pkg) => (
                                        <TableRow key={pkg.id}>
                                            <TableCell className="font-medium">{pkg.title}</TableCell>
                                            <TableCell>{pkg.destination}</TableCell>
                                            <TableCell>{pkg.duration_days} days</TableCell>
                                            <TableCell>₹{pkg.price_per_person}</TableCell>
                                            <TableCell>{getStatusBadge(pkg.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => router.push(`/admin/packages/${pkg.id}`)}
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            View/Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => router.push(`/packages/${pkg.id}`)}
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Preview
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleStatus(pkg.id, pkg.status)}
                                                        >
                                                            {pkg.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(pkg.id)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div >
    )
}
