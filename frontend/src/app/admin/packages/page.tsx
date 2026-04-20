'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPackagesSimple, deletePackageSimple, updatePackageStatus } from '@/lib/api'
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
    TableRow } from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    const { data: packages = [], isLoading } = useQuery({
        queryKey: ['packages', statusFilter],
        queryFn: fetchPackagesSimple })

    const deleteMutation = useMutation({
        mutationFn: deletePackageSimple,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] })
            toast.success('Package deleted successfully')
        },
        onError: () => toast.error('Failed to delete package')
    })

    const statusMutation = useMutation({
        mutationFn: ({ id, newStatus }: { id: string, newStatus: string }) => 
            updatePackageStatus(id, newStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] })
            toast.success('Status updated successfully')
        },
        onError: () => toast.error('Failed to update status')
    })

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this package?')) {
            deleteMutation.mutate(id)
        }
    }

    const handleToggleStatus = (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
        statusMutation.mutate({ id, newStatus })
    }

    const filteredPackages = packages.filter((pkg: Package) =>
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
        <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-[1440px] mx-auto space-y-6">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/admin/dashboard')}
                            className="mb-2 p-0 h-auto hover:bg-transparent text-blue-600 font-medium"
                        >
                            ← Back to Dashboard
                        </Button>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Package Management</h1>
                        <p className="text-slate-900 mt-1">Create and manage tour packages</p>
                    </div>

                    <Button onClick={() => router.push('/admin/packages/new')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Package
                    </Button>
                </div>

                {/* Content */}
                <Card className="border-gray-100 shadow-sm glass-panel">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg font-semibold text-gray-900">All Packages</CardTitle>
                                <CardDescription>
                                    {filteredPackages.length} package(s) found
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {/* Status Filter */}
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="border rounded-md px-3 py-2 text-sm glass-input border-gray-200"
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
                                        className="pl-10 w-64 border-gray-200"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <p className="mt-4 text-gray-600">Loading packages...</p>
                            </div>
                        ) : filteredPackages.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-900">No packages found</p>
                                <Button
                                    onClick={() => router.push('/admin/packages/new')}
                                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                                >
                                    Create Your First Package
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-semibold text-gray-900">Title</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Destination</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Duration</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Price</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Status</TableHead>
                                        <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPackages.map((pkg: Package) => (
                                        <TableRow key={pkg.id} className="group transition-colors">
                                            <TableCell className="font-medium text-gray-900">{pkg.title}</TableCell>
                                            <TableCell className="text-gray-600">{pkg.destination}</TableCell>
                                            <TableCell className="text-gray-600">{pkg.duration_days} days</TableCell>
                                            <TableCell className="text-gray-900 font-semibold">₹{pkg.price_per_person}</TableCell>
                                            <TableCell>{getStatusBadge(pkg.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40">
                                                        <DropdownMenuItem
                                                            onClick={() => router.push(`/admin/packages/${pkg.id}`)}
                                                            className="cursor-pointer"
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            View/Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => router.push(`/plan-trip?packageId=${pkg.id}&openPopup=true`)}
                                                            className="cursor-pointer"
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Preview
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleStatus(pkg.id, pkg.status)}
                                                            className="cursor-pointer"
                                                        >
                                                            {pkg.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(pkg.id)}
                                                            className="text-red-600 focus:text-red-600 cursor-pointer"
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
        </div>
    )
}
