'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Users, Search, Loader2, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from 'lucide-react'

export default function CustomersPage() {
    const router = useRouter()
    const [customers, setCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')

        if (!token || !userStr) {
            router.push('/login')
            return
        }

        try {
            const user = JSON.parse(userStr)
            if (user.role !== 'agent') {
                router.push('/packages')
                return
            }
            loadCustomers(token)
        } catch (e) {
            router.push('/login')
        }
    }, [router])

    const loadCustomers = async (token: string) => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/agent/customers', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setCustomers(data)
            }
        } catch (error) {
            console.error('Failed to load customers:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredCustomers = customers.filter(c =>
        c.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleStatusToggle = async (customerId: string, currentStatus: boolean) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`http://localhost:8000/api/v1/agent/customers/${customerId}/status?is_active=${!currentStatus}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                setCustomers(customers.map(c =>
                    c.id === customerId ? { ...c, is_active: !currentStatus } : c
                ))
            }
        } catch (error) {
            console.error('Failed to update status:', error)
        }
    }

    const handleDelete = async (customerId: string) => {
        if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`http://localhost:8000/api/v1/agent/customers/${customerId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                setCustomers(customers.filter(c => c.id !== customerId))
            }
        } catch (error) {
            console.error('Failed to delete customer:', error)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                        <p className="text-muted-foreground">Manage your customer base and their bookings.</p>
                    </div>
                    <Link href="/agent/customers/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Customer
                        </Button>
                    </Link>
                </div>

                {/* Back Button */}
                <div className="flex justify-start">
                    <Link href="/agent/dashboard">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Directory</CardTitle>
                        <CardDescription>
                            Total Customers: {customers.length}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2 max-w-sm mb-6">
                            <Search className="h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCustomers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                No customers found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCustomers.map((customer) => (
                                            <TableRow key={customer.id}>
                                                <TableCell className="font-medium">
                                                    {customer.first_name} {customer.last_name}
                                                </TableCell>
                                                <TableCell>{customer.email}</TableCell>
                                                <TableCell>{customer.phone || '-'}</TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {customer.is_active ? 'Active' : 'Blocked'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{new Date(customer.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => router.push(`/agent/customers/${customer.id}`)}>
                                                                View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusToggle(customer.id, customer.is_active)}>
                                                                {customer.is_active ? 'Block Customer' : 'Activate Customer'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-600"
                                                                onClick={() => handleDelete(customer.id)}
                                                            >
                                                                Delete Customer
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
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
