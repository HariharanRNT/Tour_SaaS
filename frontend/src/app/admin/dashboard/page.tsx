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
                            <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-3 rounded-xl shadow-lg shadow-indigo-500/20">
                                <LayoutDashboard className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4F46E5] to-[#7C3AED]">Admin Dashboard</h1>
                                <p className="text-sm text-slate-500 font-medium">{adminEmail}</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleLogout} className="hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-300">
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">

                {/* Date Filter Controls */}
                <div className="flex flex-wrap items-center gap-4 mb-8 bg-[rgba(79,70,229,0.03)] backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-indigo-50">
                        <Calendar className="h-4 w-4 text-[#4F46E5]" />
                        <span className="text-sm font-semibold text-slate-700">Date Range</span>
                    </div>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-[180px] bg-white border-indigo-50 focus:ring-[#4F46E5]/20 text-slate-700">
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
                                className="w-auto bg-white/50 border-slate-200"
                                value={customStart}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={e => setCustomStart(e.target.value)}
                            />
                            <span className="text-slate-400 font-medium">-</span>
                            <Input
                                type="date"
                                className="w-auto bg-white/50 border-slate-200"
                                value={customEnd}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={e => setCustomEnd(e.target.value)}
                            />
                            <Button onClick={applyCustomFilter} size="sm" className="bg-slate-900 text-white hover:bg-slate-800 shadow-md">
                                Apply
                            </Button>
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Active Subscriptions */}
                    <Card className="relative overflow-hidden border-0 bg-[rgba(79,70,229,0.03)] backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/5 to-[#7C3AED]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Active Plans</CardTitle>
                            <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-2 rounded-lg shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Star className="h-4 w-4 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-3xl font-bold text-slate-900 mt-2">{stats.activeSubscriptions}</div>
                            <p className="text-sm font-medium text-[#4F46E5] bg-indigo-50 w-fit px-2 py-0.5 rounded-full mt-2">Active agents</p>
                        </CardContent>
                    </Card>

                    {/* Total Bookings */}
                    <Card className="relative overflow-hidden border-0 bg-[rgba(79,70,229,0.03)] backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#F59E0B]/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Total Bookings</CardTitle>
                            <div className="bg-gradient-to-br from-[#F59E0B] to-orange-500 p-2 rounded-lg shadow-md shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                                <FileText className="h-4 w-4 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-3xl font-bold text-slate-900 mt-2">{stats.totalBookings}</div>
                            <p className="text-sm font-medium text-[#F59E0B] bg-amber-50 w-fit px-2 py-0.5 rounded-full mt-2">Confirmed & Pending</p>
                        </CardContent>
                    </Card>

                    {/* Total Agents */}
                    <Card className="relative overflow-hidden border-0 bg-[rgba(79,70,229,0.03)] backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Total Agents</CardTitle>
                            <div className="bg-gradient-to-br from-[#10B981] to-emerald-600 p-2 rounded-lg shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Users className="h-4 w-4 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-3xl font-bold text-slate-900 mt-2">{stats.agents.total}</div>
                            <p className="text-sm font-medium text-[#10B981] bg-emerald-50 w-fit px-2 py-0.5 rounded-full mt-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                                {stats.agents.active} Active
                            </p>
                        </CardContent>
                    </Card>

                    {/* Nearing Expiry */}
                    <Card className="relative overflow-hidden border-0 bg-[rgba(79,70,229,0.03)] backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#EC4899]/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Expiring Soon</CardTitle>
                            <div className="bg-gradient-to-br from-[#EC4899] to-pink-600 p-2 rounded-lg shadow-md shadow-pink-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Clock className="h-4 w-4 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-3xl font-bold text-slate-900 mt-2">{stats.subscriptionsNearingExpiry}</div>
                            <p className="text-sm font-medium text-[#EC4899] bg-pink-50 w-fit px-2 py-0.5 rounded-full mt-2 truncate max-w-full">
                                {stats.expiryDetails && stats.expiryDetails.length > 0
                                    ? `Next: ${stats.expiryDetails[0].name.split(' ')[0]}`
                                    : "Agents expiring in 7d"}
                            </p>
                        </CardContent>
                    </Card>
                </div>


                {/* Alerts & System Health */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                        <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
                        System Health & Alerts
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="backdrop-blur-sm bg-[rgba(239,68,68,0.03)] border-red-100 shadow-sm hover:shadow-red-900/5 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-[#991B1B]">Payment Failures</CardTitle>
                                <div className="bg-red-50 p-2 rounded-full animate-pulse">
                                    <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">{stats.alerts?.paymentFailures || 0}</div>
                                <p className="text-xs font-medium text-[#EF4444] mt-1">Action Required</p>
                            </CardContent>
                        </Card>
                        <Card className="backdrop-blur-sm bg-[rgba(245,158,11,0.03)] border-amber-100 shadow-sm hover:shadow-amber-900/5 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-[#92400E]">Cancelled Bookings</CardTitle>
                                <div className="bg-amber-50 p-2 rounded-full">
                                    <XCircle className="h-4 w-4 text-[#F59E0B]" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">{stats.alerts?.cancelledBookings || 0}</div>
                                <p className="text-xs font-medium text-[#F59E0B] mt-1">Review cancellation reasons</p>
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
                    <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-[rgba(79,70,229,0.03)] backdrop-blur-xl border-white/60 group">
                        <Link href="/admin/agents">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-50 p-3 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                        <Users className="h-6 w-6 text-[#4F46E5]" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-slate-800">Agent Management</CardTitle>
                                        <CardDescription>Manage agents and their access</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full bg-[#4F46E5] hover:bg-[#4338ca] text-white">
                                    Manage Agents
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>

                    <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-[rgba(245,158,11,0.03)] backdrop-blur-xl border-white/60 group">
                        <Link href="/admin/billing">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-50 p-3 rounded-lg group-hover:bg-amber-100 transition-colors">
                                        <RupeeIcon className="h-6 w-6 text-[#F59E0B]" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-slate-800">Billing & Subscriptions</CardTitle>
                                        <CardDescription>Manage plans and invoices</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full bg-[#F59E0B] hover:bg-[#d97706] text-white">
                                    Manage Billing
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>

                    <Card className="hover:shadow-lg transition-all border-0 bg-[rgba(236,72,153,0.03)] backdrop-blur-xl border-white/60">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="bg-pink-50 p-3 rounded-lg">
                                    <MapPin className="h-6 w-6 text-[#EC4899]" />
                                </div>
                                <div>
                                    <CardTitle className="text-slate-800">Destinations</CardTitle>
                                    <CardDescription>Manage destinations and locations</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full border-pink-200 text-[#EC4899] hover:bg-pink-50" variant="outline" disabled>
                                Coming Soon
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div >
        </div >
    )
}
