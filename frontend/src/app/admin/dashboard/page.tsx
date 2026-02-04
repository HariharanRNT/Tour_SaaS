'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    LayoutDashboard,
    Package,
    Users,
    Settings,
    LogOut,
    TrendingUp,
    DollarSign,
    MapPin,
    Calendar,
    FileText,
    AlertTriangle,
    XCircle,
    Star,
    Clock,
    Trophy,
    TrendingDown
} from 'lucide-react'
import Link from 'next/link'
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart'
import { RecentActivityFeed } from '../../../components/admin/dashboard/RecentActivityFeed'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export default function AdminDashboard() {
    const router = useRouter()
    const [adminEmail, setAdminEmail] = useState('')
    const [dateFilter, setDateFilter] = useState('ALL')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    const [stats, setStats] = useState<any>({
        totalPackages: 0,
        totalBookings: 0,
        agents: {
            total: 0,
            active: 0,
            inactive: 0
        },
        totalRevenue: 0,
        activeSubscriptions: 0,
        subscriptionsNearingExpiry: 0,
        expiryDetails: [],
        alerts: {
            paymentFailures: 0,
            cancelledBookings: 0
        },
        agentPerformance: []
    })

    useEffect(() => {
        const email = localStorage.getItem('adminEmail')
        setAdminEmail(email || '')
        loadStats()
    }, [dateFilter]) // Reload when filter changes (except custom wait for apply)

    const loadStats = async () => {
        // For custom, only load if we have dates or explicitly requested (handled by effect dependency + logic)
        if (dateFilter === 'CUSTOM' && (!customStart || !customEnd)) {
            return
        }

        try {
            const token = localStorage.getItem('token')
            const query = new URLSearchParams()
            query.append('filter_type', dateFilter)
            if (dateFilter === 'CUSTOM') {
                query.append('start_date', customStart)
                query.append('end_date', customEnd)
            }

            const response = await fetch(`http://localhost:8000/api/v1/admin-simple/dashboard-stats?${query.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                console.error('Failed to fetch stats:', response.statusText)
                return
            }

            const data = await response.json()
            setStats(data)

        } catch (error) {
            console.error('Failed to load stats:', error)
        }
    }

    const applyCustomFilter = () => {
        if (customStart && customEnd) {
            loadStats()
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('isAdmin')
        localStorage.removeItem('adminEmail')
        router.push('/admin/login')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <LayoutDashboard className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                                <p className="text-sm text-gray-600">{adminEmail}</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">

                {/* Date Filter Controls */}
                <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Date Range:</span>
                    </div>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Time</SelectItem>
                            <SelectItem value="1D">Last 24 Hours</SelectItem>
                            <SelectItem value="7D">Last 7 Days</SelectItem>
                            <SelectItem value="30D">Last 30 Days</SelectItem>
                            <SelectItem value="CUSTOM">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    {dateFilter === 'CUSTOM' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-5">
                            <Input
                                type="date"
                                className="w-auto"
                                value={customStart}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={e => setCustomStart(e.target.value)}
                            />
                            <span className="text-gray-400">-</span>
                            <Input
                                type="date"
                                className="w-auto"
                                value={customEnd}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={e => setCustomEnd(e.target.value)}
                            />
                            <Button onClick={applyCustomFilter} size="sm">
                                Apply
                            </Button>
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="hover:shadow-md transition-all border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">Active Subscriptions</CardTitle>
                            <div className="bg-blue-100 p-2 rounded-full">
                                <Star className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">{stats.activeSubscriptions}</div>
                            <p className="text-xs text-gray-500 mt-1">Active agent plans</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-all border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">Total Bookings</CardTitle>
                            <div className="bg-orange-100 p-2 rounded-full">
                                <FileText className="h-4 w-4 text-orange-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-700">{stats.totalBookings}</div>
                            <p className="text-xs text-gray-500 mt-1">Confirmed and pending</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-all border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">Total Agents</CardTitle>
                            <div className="bg-green-100 p-2 rounded-full">
                                <Users className="h-4 w-4 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700">{stats.agents.total}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.agents.active} Active, {stats.agents.inactive} Inactive
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-all border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">Nearing Expiry</CardTitle>
                            <div className="bg-purple-100 p-2 rounded-full">
                                <Clock className="h-4 w-4 text-purple-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-700">{stats.subscriptionsNearingExpiry}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.expiryDetails && stats.expiryDetails.length > 0
                                    ? `Next: ${stats.expiryDetails[0].name.split(' ')[0]} (${stats.expiryDetails[0].date})`
                                    : "Agents expiring in 7 days"}
                            </p>
                        </CardContent>
                    </Card>
                </div>


                {/* Alerts & System Health */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        System Health & Alerts
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="hover:shadow-md transition-all border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-white">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-red-700">Payment Failures</CardTitle>
                                <div className="bg-red-100 p-2 rounded-full">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-700">{stats.alerts?.paymentFailures || 0}</div>
                                <p className="text-xs text-gray-500 mt-1">Failed transactions requiring attention</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-all border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-white">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-orange-700">Cancelled Bookings</CardTitle>
                                <div className="bg-orange-100 p-2 rounded-full">
                                    <XCircle className="h-4 w-4 text-orange-600" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-700">{stats.alerts?.cancelledBookings || 0}</div>
                                <p className="text-xs text-gray-500 mt-1">Bookings cancelled by users or system</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Charts and Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 mb-8">
                    <RevenueChart />
                    <RecentActivityFeed packages={stats.packageAnalytics?.recent} />
                </div>

                {/* Agent Performance & Package Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">





                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <Link href="/admin/agents">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-3 rounded-lg">
                                        <Users className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle>Agent Management</CardTitle>
                                        <CardDescription>Manage agents and their access</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full">
                                    Manage Agents
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <Link href="/admin/billing">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-100 p-3 rounded-lg">
                                        <DollarSign className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <CardTitle>Billing & Subscriptions</CardTitle>
                                        <CardDescription>Manage plans and invoices</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full">
                                    Manage Billing
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 p-3 rounded-lg">
                                    <MapPin className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <CardTitle>Destinations</CardTitle>
                                    <CardDescription>Manage destinations and locations</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" variant="outline" disabled>
                                Coming Soon
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div >
        </div >
    )
}
