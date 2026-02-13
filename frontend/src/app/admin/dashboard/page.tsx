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
    MapPin,
    Calendar,
    FileText,
    AlertTriangle,
    XCircle,
    Star,
    Clock,
    Trophy,
    TrendingDown,
    Bell,
    HelpCircle,
    ChevronRight,
    UserCircle,
    ArrowUp,
    ArrowDown,
    DollarSign,
    AlertCircle,
    CheckCircle2
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

// Custom Rupee Icon Component
const RupeeIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M6 3h12" />
        <path d="M6 8h12" />
        <path d="m6 13 8.5 8" />
        <path d="M6 13h3" />
        <path d="M9 13c6.667 0 6.667-10 0-10" />
    </svg>
)

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
        monthlyTrends: [],
        weeklyTrends: [],
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
            <div className="bg-white/80 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-lg shadow-blue-500/20">
                                <LayoutDashboard className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                {/* Breadcrumb */}
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">


                                    <span className="text-slate-700 font-medium">Dashboard</span>
                                </div>
                                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-sky-700">Admin Dashboard</h1>
                            </div>
                        </div>

                        {/* Right side actions */}
                        <div className="flex items-center gap-3">
                            {/* Quick Action Buttons */}
                            <Button variant="ghost" size="icon" className="relative hover:bg-indigo-50 hover:text-indigo-600">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:bg-indigo-50 hover:text-indigo-600">
                                <Settings className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:bg-indigo-50 hover:text-indigo-600">
                                <HelpCircle className="h-5 w-5" />
                            </Button>

                            {/* Admin Profile */}
                            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-slate-200">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-slate-700">Admin</p>
                                    <p className="text-xs text-slate-500">{adminEmail}</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-full">
                                    <UserCircle className="h-6 w-6 text-white" />
                                </div>
                            </div>

                            <Button variant="outline" onClick={handleLogout} className="hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-300">
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
                <div className="flex flex-wrap items-center gap-4 mb-8 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 backdrop-blur-md p-5 rounded-2xl border border-indigo-100 shadow-sm">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-indigo-100 shadow-sm">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-bold text-slate-700">Showing data for:</span>
                    </div>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-[200px] bg-white border-indigo-100 focus:ring-[#4F46E5]/20 text-slate-700 font-medium shadow-sm">
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Time</SelectItem>
                            <SelectItem value="1D">Today</SelectItem>
                            <SelectItem value="7D">Last 7 Days</SelectItem>
                            <SelectItem value="30D">Last 30 Days</SelectItem>
                            <SelectItem value="CUSTOM">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    {dateFilter === 'CUSTOM' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-5">
                            <Input
                                type="date"
                                className="w-auto bg-white border-indigo-100 shadow-sm"
                                value={customStart}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={e => setCustomStart(e.target.value)}
                            />
                            <span className="text-slate-400 font-medium">to</span>
                            <Input
                                type="date"
                                className="w-auto bg-white border-indigo-100 shadow-sm"
                                value={customEnd}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={e => setCustomEnd(e.target.value)}
                            />
                            <Button onClick={applyCustomFilter} size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">
                                Apply
                            </Button>
                        </div>
                    )}

                    {/* Display selected date range */}
                    {dateFilter !== 'CUSTOM' && (
                        <div className="text-sm text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                            {dateFilter === 'ALL' && 'All historical data'}
                            {dateFilter === '1D' && `Today, ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                            {dateFilter === '7D' && `Last 7 days`}
                            {dateFilter === '30D' && `Last 30 days`}
                        </div>
                    )}
                    {dateFilter === 'CUSTOM' && customStart && customEnd && (
                        <div className="text-sm text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                            {new Date(customStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(customEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Active Subscriptions */}
                    <Card className="relative overflow-hidden border-0 bg-[rgba(79,70,229,0.03)] backdrop-blur-xl shadow-md hover:shadow-lg transition-all duration-300 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Active Plans</CardTitle>
                            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-lg shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Star className="h-6 w-6 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-4xl font-bold text-slate-900 mb-2">{stats.activeSubscriptions}</div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                    <ArrowUp className="h-3 w-3" />
                                    <span>8%</span>
                                </div>
                                <span className="text-xs text-slate-500">vs last month</span>
                            </div>
                            <Link href="/admin/billing" className="text-xs font-medium text-blue-600 hover:underline">
                                View all plans →
                            </Link>
                        </CardContent>
                    </Card>



                    {/* Total Agents */}
                    <Card className="relative overflow-hidden border-0 bg-[rgba(79,70,229,0.03)] backdrop-blur-xl shadow-md hover:shadow-lg transition-all duration-300 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Agents</CardTitle>
                            <div className="bg-gradient-to-br from-[#10B981] to-emerald-600 p-2.5 rounded-lg shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-4xl font-bold text-slate-900 mb-2">{stats.agents.total}</div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                    <ArrowUp className="h-3 w-3" />
                                    <span>4%</span>
                                </div>
                                <span className="text-xs text-slate-500">vs last month</span>
                            </div>
                            <div className="flex gap-2 text-xs">
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                    {stats.agents.active} Active
                                </span>
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                    {stats.agents.inactive} Inactive
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Nearing Expiry */}
                    <Card className="relative overflow-hidden border-0 bg-[rgba(79,70,229,0.03)] backdrop-blur-xl shadow-md hover:shadow-lg transition-all duration-300 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#EC4899]/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Expiring Soon</CardTitle>
                            <div className="bg-gradient-to-br from-[#EC4899] to-pink-600 p-2.5 rounded-lg shadow-md shadow-pink-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Clock className="h-6 w-6 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-4xl font-bold text-slate-900 mb-2">{stats.subscriptionsNearingExpiry}</div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center gap-1 text-slate-500 text-sm font-medium">
                                    <span>—</span>
                                </div>
                                <span className="text-xs text-slate-500">no change</span>
                            </div>
                            <p className="text-xs font-medium text-[#EC4899] bg-pink-50 w-fit px-2 py-1 rounded-full truncate max-w-full">
                                {stats.expiryDetails && stats.expiryDetails.length > 0
                                    ? `Next: ${stats.expiryDetails[0].name.split(' ')[0]}`
                                    : "Agents expiring in 3d"}
                            </p>
                        </CardContent>
                    </Card>


                </div>


                {/* Alerts & System Health */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
                            System Health & Alerts
                        </h2>
                        <Button variant="outline" size="sm" className="text-slate-600 hover:text-indigo-600">
                            <Clock className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="backdrop-blur-sm bg-gradient-to-br from-red-50/50 to-red-100/30 border-red-200 shadow-md hover:shadow-lg transition-all group">
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <div>
                                    <CardTitle className="text-sm font-bold text-[#991B1B] flex items-center gap-2">
                                        <div className="bg-red-100 p-1.5 rounded-full">
                                            <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
                                        </div>
                                        Payment Failures
                                    </CardTitle>
                                    <p className="text-xs text-slate-500 mt-1">Last checked: 5 minutes ago</p>
                                </div>
                                {stats.alerts?.paymentFailures > 0 && (
                                    <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                        CRITICAL
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-slate-900 mb-2">{stats.alerts?.paymentFailures || 0}</div>
                                {stats.alerts?.paymentFailures > 0 ? (
                                    <Link href="/admin/billing" className="text-xs font-semibold text-[#EF4444] hover:underline flex items-center gap-1">
                                        Action Required →
                                    </Link>
                                ) : (
                                    <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        All payments processed successfully
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="backdrop-blur-sm bg-gradient-to-br from-amber-50/50 to-amber-100/30 border-amber-200 shadow-md hover:shadow-lg transition-all group">
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <div>
                                    <CardTitle className="text-sm font-bold text-[#92400E] flex items-center gap-2">
                                        <div className="bg-amber-100 p-1.5 rounded-full">
                                            <XCircle className="h-4 w-4 text-[#F59E0B]" />
                                        </div>
                                        Cancelled Bookings
                                    </CardTitle>
                                    <p className="text-xs text-slate-500 mt-1">Last checked: 5 minutes ago</p>
                                </div>
                                {stats.alerts?.cancelledBookings > 0 && (
                                    <div className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        WARNING
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-slate-900 mb-2">{stats.alerts?.cancelledBookings || 0}</div>
                                {stats.alerts?.cancelledBookings > 0 ? (
                                    <button className="text-xs font-semibold text-[#F59E0B] hover:underline flex items-center gap-1">
                                        Review cancellation reasons →
                                    </button>
                                ) : (
                                    <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        No cancellations today
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Charts and Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 mb-8">
                    <RevenueChart
                        data={stats.monthlyTrends || []}
                        weeklyData={stats.weeklyTrends || []}
                    />
                    <RecentActivityFeed activities={stats.packageAnalytics?.agentActivities} />
                </div>

                {/* Agent Performance & Package Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">





                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="hover:shadow-xl transition-all cursor-pointer border-0 bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 backdrop-blur-xl border-indigo-100 group">
                        <Link href="/admin/agents">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-100 p-3 rounded-lg group-hover:bg-indigo-200 transition-colors group-hover:scale-110 duration-300">
                                        <Users className="h-7 w-7 text-[#4F46E5]" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-slate-800 text-lg">Agent Management</CardTitle>
                                        <CardDescription>Manage agents and their access</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Quick Stats */}
                                <div className="flex gap-3 mb-4 text-sm">
                                    <div className="bg-white/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        <span className="text-slate-700 font-medium">{stats.agents.active} active</span>
                                    </div>
                                    <div className="bg-white/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        <span className="text-slate-700 font-medium">2 pending reviews</span>
                                    </div>
                                </div>
                                <Button className="w-full bg-[#4F46E5] hover:bg-[#4338ca] text-white shadow-md group-hover:shadow-lg transition-all">
                                    <Users className="h-4 w-4 mr-2" />
                                    Manage Agents
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>

                    <Card className="hover:shadow-xl transition-all cursor-pointer border-0 bg-gradient-to-br from-amber-50/50 to-amber-100/30 backdrop-blur-xl border-amber-100 group">
                        <Link href="/admin/billing">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-100 p-3 rounded-lg group-hover:bg-amber-200 transition-colors group-hover:scale-110 duration-300">
                                        <RupeeIcon className="h-7 w-7 text-[#F59E0B]" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-slate-800 text-lg">Billing & Subscriptions</CardTitle>
                                        <CardDescription>Manage plans and invoices</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Quick Stats */}
                                <div className="flex gap-3 mb-4 text-sm">
                                    <div className="bg-white/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <DollarSign className="h-3.5 w-3.5 text-green-600" />
                                        <span className="text-slate-700 font-medium">₹{Math.round(stats.totalRevenue / 1000)}k revenue</span>
                                    </div>
                                    <div className="bg-white/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                                        <span className="text-slate-700 font-medium">{stats.alerts?.paymentFailures || 0} pending</span>
                                    </div>
                                </div>
                                <Button className="w-full bg-[#F59E0B] hover:bg-[#d97706] text-white shadow-md group-hover:shadow-lg transition-all">
                                    <RupeeIcon className="h-4 w-4 mr-2" />
                                    Manage Billing
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>
                </div>
            </div >
        </div >
    )
}
