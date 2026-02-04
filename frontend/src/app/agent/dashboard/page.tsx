'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    LayoutDashboard,
    Package,
    Users,
    Calendar,
    TrendingUp,
    DollarSign,
    Plus,
    Clock,
    LogOut,
    FileText,
    Trophy,
    Star,
    TrendingDown,
    AlertTriangle,
    Settings
} from 'lucide-react'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface DashboardStats {
    totalPackages: number
    publishedPackages: number
    draftPackages: number
    totalBookings: number
    activeBookings: number
    pendingBookings: number
    totalRevenue: number
    highlights?: {
        mostPopular: any
        leastPopular: any
    }
    packageAnalytics?: {
        mostBooked: any[]
    }
}

export default function AgentDashboard() {
    const router = useRouter()
    const [agentName, setAgentName] = useState('')
    const [dateFilter, setDateFilter] = useState('ALL')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    const [stats, setStats] = useState<DashboardStats>({
        totalPackages: 0,
        publishedPackages: 0,
        draftPackages: 0,
        totalBookings: 0,
        activeBookings: 0,
        pendingBookings: 0,
        totalRevenue: 0,
        highlights: { mostPopular: null, leastPopular: null },
        packageAnalytics: { mostBooked: [] }
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // 1. Auth Check
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')

        if (!token || !userStr) {
            router.push('/login')
            return
        }

        try {
            const user = JSON.parse(userStr)
            if (user.role !== 'agent') {
                router.push('/packages') // Redirect non-agents
                return
            }
            setAgentName(user.first_name || 'Agent')
        } catch (e) {
            router.push('/login')
            return
        }

        // 2. Load Data
        loadDashboardData(token)
    }, [router, dateFilter]) // Reload when dateFilter changes

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
    }

    const loadDashboardData = async (token: string) => {
        // For custom, only load if we have dates or explicitly requested
        if (dateFilter === 'CUSTOM' && (!customStart || !customEnd)) {
            // Wait for user to apply
            if (!customStart && !customEnd) return // Initial "CUSTOM" selection
        }

        setLoading(true)
        try {
            // Prepare Query Params
            const query = new URLSearchParams()
            query.append('filter_type', dateFilter)
            if (dateFilter === 'CUSTOM') {
                if (customStart) query.append('start_date', customStart)
                if (customEnd) query.append('end_date', customEnd)
            }

            // Fetch Market Insights & Stats (New Endpoint logic handles aggregates)
            let backendStats: any = {}
            try {
                const marketRes = await fetch(`http://localhost:8000/api/v1/agent-dashboard/stats?${query.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (marketRes.ok) {
                    backendStats = await marketRes.json()
                }
            } catch (err) {
                console.error("Failed to fetch market insights", err)
            }

            // Note: We use the backend returned stats directly now, 
            // instead of calculating from list endpoints unless strictly necessary for other things.
            // The lists (packages/bookings) are not needed for the dashboard summary anymore if backend returns all counts.

            setStats({
                totalPackages: backendStats.totalPackages || 0,
                publishedPackages: backendStats.publishedPackages || 0,
                draftPackages: backendStats.draftPackages || 0,
                totalBookings: backendStats.totalBookings || 0,
                activeBookings: backendStats.activeBookings || 0,
                pendingBookings: backendStats.pendingBookings || 0,
                totalRevenue: backendStats.totalRevenue || 0,
                highlights: backendStats.highlights,
                packageAnalytics: backendStats.packageAnalytics
            })

        } catch (error) {
            console.error('Failed to load dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const applyCustomFilter = () => {
        if (customStart && customEnd) {
            const token = localStorage.getItem('token')
            if (token) loadDashboardData(token)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <LayoutDashboard className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Welcome back, {agentName}</h1>
                                <p className="text-sm text-gray-600">Here's what's happening with your business today.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/agent/packages/new">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create New Package
                                </Button>
                            </Link>
                            <Link href="/agent/settings">
                                <Button variant="ghost">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </Button>
                            </Link>
                            <Button variant="outline" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </div>
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

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="hover:shadow-md transition-all border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">Total Revenue</CardTitle>
                            <div className="bg-green-100 p-2 rounded-full">
                                <DollarSign className="h-4 w-4 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700">₹{stats.totalRevenue.toLocaleString()}</div>
                            <p className="text-xs text-gray-500 mt-1">From confirmed bookings</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-all border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">Active Bookings</CardTitle>
                            <div className="bg-blue-100 p-2 rounded-full">
                                <Users className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">{stats.activeBookings}</div>
                            <p className="text-xs text-gray-500 mt-1">{stats.pendingBookings} Pending confirmation</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-all border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">Packages</CardTitle>
                            <div className="bg-purple-100 p-2 rounded-full">
                                <Package className="h-4 w-4 text-purple-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-700">{stats.totalPackages}</div>
                            <p className="text-xs text-gray-500 mt-1">{stats.publishedPackages} Published, {stats.draftPackages} Drafts</p>
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
                            <p className="text-xs text-gray-500 mt-1">Lifetime booking count</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Market Insights Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Performance Highlights
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Top Performer Card */}
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-green-800">
                                    <Trophy className="h-5 w-5 text-yellow-500" />
                                    My Top Performer
                                </CardTitle>
                                <CardDescription className="text-green-700">Your #1 booked package</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {stats.highlights?.mostPopular ? (
                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{stats.highlights.mostPopular.title}</h3>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <span className="text-2xl font-extrabold text-green-700">{stats.highlights.mostPopular.bookings}</span>
                                                <span className="text-xs text-green-600 font-medium">Total Bookings</span>
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-green-200/60">
                                            <p className="text-[10px] uppercase tracking-wide text-green-600 font-semibold mb-1">Sales Volume</p>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-green-900 truncate">Total Sales</span>
                                                <span className="bg-white/60 px-1.5 py-0.5 rounded text-[10px] font-bold text-green-800 ml-2">
                                                    {stats.highlights.mostPopular.agent_sales} Sold
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-green-700/60 text-sm">No data available</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Lowest Traction Card */}
                        <Card className="bg-gray-50 border-gray-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-gray-700">
                                    <TrendingDown className="h-5 w-5 text-gray-500" />
                                    Lowest Traction
                                </CardTitle>
                                <CardDescription>Least booked active package</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {stats.highlights?.leastPopular ? (
                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{stats.highlights.leastPopular.title}</h3>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <span className="text-2xl font-extrabold text-gray-700">{stats.highlights.leastPopular.bookings}</span>
                                                <span className="text-xs text-gray-500 font-medium">Total Bookings</span>
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200">
                                            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Sales Volume</p>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-700 truncate">Total Sales</span>
                                                <span className="bg-white px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600 border border-gray-100 ml-2">
                                                    {stats.highlights.leastPopular.agent_sales} Sold
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500/60 text-sm">No data available</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Popular Packages List */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Star className="h-5 w-5 text-yellow-500" />
                                    Popular Packages
                                </CardTitle>
                                <CardDescription>Your top 5 by volume</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2">
                                {(stats.packageAnalytics?.mostBooked?.length || 0) > 0 ? (
                                    <ul className="space-y-3">
                                        {stats.packageAnalytics?.mostBooked.map((pkg: any, index: number) => (
                                            <li key={index} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                                                <span className="font-medium text-gray-800 truncate pr-2 max-w-[180px]">{pkg.title}</span>
                                                <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                                                    {pkg.bookings}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Quick Actions */}
                {/* Quick Actions */}
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-blue-600" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-transparent hover:border-blue-100">
                        <Link href="/agent/packages">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-3 rounded-lg">
                                        <Package className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Manage Packages</CardTitle>
                                        <CardDescription>View, edit, or create tours</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full bg-white text-blue-700 border border-blue-200 hover:bg-blue-50">
                                    Go to Packages
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-transparent hover:border-green-100">
                        <Link href="/agent/customers">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 p-3 rounded-lg">
                                        <Users className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Customers</CardTitle>
                                        <CardDescription>Manage client profiles</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full bg-white text-green-700 border border-green-200 hover:bg-green-50">
                                    View Customers
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-transparent hover:border-orange-100">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-100 p-3 rounded-lg">
                                    <FileText className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">My Bookings</CardTitle>
                                    <CardDescription>Track booking status</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full bg-white text-orange-700 border border-orange-200 hover:bg-orange-50" disabled>
                                View Bookings (Soon)
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-transparent hover:border-purple-100">
                        <Link href="/agent/subscription">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-100 p-3 rounded-lg">
                                        <Star className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Subscription</CardTitle>
                                        <CardDescription>Manage plan & billing</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full bg-white text-purple-700 border border-purple-200 hover:bg-purple-50">
                                    Manage Plan
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-transparent hover:border-gray-100">
                        <Link href="/agent/settings">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-100 p-3 rounded-lg">
                                        <Settings className="h-6 w-6 text-gray-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Settings</CardTitle>
                                        <CardDescription>Configure preferences</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50">
                                    Configure Settings
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>
                </div>
            </div>
        </div>
    )
}
