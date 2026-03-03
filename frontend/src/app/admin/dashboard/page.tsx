'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    Users,
    TrendingUp,
    Calendar,
    ArrowUp,
    ArrowDown,
    DollarSign,
    Clock,
    CreditCard,
    Plus,
    Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart'
import { RecentActivityFeed } from '@/components/admin/dashboard/RecentActivityFeed'

export default function AdminDashboard() {
    const [dateFilter, setDateFilter] = useState('ALL')
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
        alerts: {
            paymentFailures: 0,
            cancelledBookings: 0
        },
        monthlyTrends: [],
        weeklyTrends: [],
        agentPerformance: []
    })

    useEffect(() => {
        loadStats()
    }, [dateFilter])

    const loadStats = async () => {
        try {
            const token = localStorage.getItem('token')
            const query = new URLSearchParams()
            query.append('filter_type', dateFilter)

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

    // Modern Stat Card Component
    const StatCard = ({ title, value, change, changeLabel, icon: Icon, colorClass, link, accentColor }: any) => (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="flex-1"
        >
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 glass-card group h-full">
                {/* Accent Border at Top */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${accentColor}`} />

                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-bold text-slate-500 tracking-wider uppercase">{title}</CardTitle>
                    <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 group-hover:bg-opacity-100 transition-all duration-500 delay-75 shadow-sm group-hover:shadow-lg`}>
                        <Icon className={`h-5 w-5 ${colorClass.replace('bg-', 'text-')} group-hover:text-white transition-colors duration-500`} />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="flex flex-col">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-4xl font-[900] text-slate-800 tracking-tight"
                        >
                            {value}
                        </motion.div>
                        {(change || changeLabel) && (
                            <div className="flex items-center text-xs mt-2 font-bold">
                                {change && (
                                    <span className={`flex items-center px-1.5 py-0.5 rounded-full ${change > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} mr-2 shadow-sm`}>
                                        {change > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                                        {Math.abs(change)}%
                                    </span>
                                )}
                                <span className="text-slate-400">{changeLabel}</span>
                            </div>
                        )}
                    </div>
                    {link && (
                        <div className="mt-4 pt-4 border-t border-slate-50">
                            <Link href={link} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center transition-all group-hover:translate-x-1">
                                View Full Report <ArrowUp className="h-3 w-3 ml-1 rotate-45" />
                            </Link>
                        </div>
                    )}
                </CardContent>

                {/* Background Watermark Icon */}
                <Icon className="absolute -bottom-6 -right-6 h-32 w-32 text-slate-100 group-hover:text-slate-200/50 transition-colors duration-500 -rotate-12 pointer-events-none" />
            </Card>
        </motion.div>
    )


    return (
        <div className="p-8 md:p-10 lg:p-12 glass-panel min-h-screen">
            <div className="max-w-[1536px] mx-auto space-y-10">

                {/* Page Header & Filter */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-indigo-100/50">
                    <div>
                        <motion.h1
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="text-4xl font-[900] text-slate-900 tracking-tight"
                        >
                            Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 underline decoration-indigo-200 underline-offset-8">Overview</span>
                        </motion.h1>
                        <p className="text-slate-500 mt-3 text-lg font-medium">Welcome back, <span className="text-indigo-700">Admin</span>. Here's your business at a glance.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-[180px] bg-white border-transparent rounded-2xl shadow-sm hover:shadow-md transition-all h-12 font-bold text-slate-700">
                                <Calendar className="h-5 w-5 mr-3 text-indigo-500" />
                                <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-indigo-50 shadow-xl">
                                <SelectItem value="ALL">All Time</SelectItem>
                                <SelectItem value="1D">Today</SelectItem>
                                <SelectItem value="7D">Last 7 Days</SelectItem>
                                <SelectItem value="30D">Last 30 Days</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button className="bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] hover:scale-105 transition-all text-white shadow-xl shadow-blue-500/20 rounded-2xl h-12 px-6 font-bold">
                            <CreditCard className="h-5 w-5 mr-3" />
                            Generate Report
                        </Button>
                    </div>
                </div>


                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <StatCard
                        title="Total Revenue"
                        value={`₹${(stats.totalRevenue / 1000).toFixed(1)}k`}
                        change={12}
                        changeLabel="vs last month"
                        icon={DollarSign}
                        colorClass="bg-emerald-500"
                        accentColor="bg-emerald-500"
                        link="/admin/billing"
                    />
                    <StatCard
                        title="Active Agents"
                        value={stats.agents.active}
                        change={5}
                        changeLabel="new this month"
                        icon={Users}
                        colorClass="bg-blue-500"
                        accentColor="bg-blue-500"
                        link="/admin/agents"
                    />
                    <StatCard
                        title="Expiring Soon"
                        value={stats.subscriptionsNearingExpiry}
                        changeLabel={stats.expiryDetails && stats.expiryDetails.length > 0
                            ? `Next: ${stats.expiryDetails[0].name.split(' ')[0]}`
                            : "Agents expiring in 3 days"}
                        icon={Clock}
                        colorClass="bg-rose-500"
                        accentColor="bg-rose-500"
                        link="/admin/billing"
                    />
                </div>


                {/* Charts & Activity Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Revenue Chart - Takes 2 columns */}
                    <div className="lg:col-span-2">
                        <Card className="h-full border-0 shadow-2xl shadow-indigo-100/50 overflow-hidden rounded-3xl glass-panel">
                            <CardHeader className="bg-white border-b border-slate-50 py-8 px-8 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-[900] text-slate-800">Revenue Analytics</CardTitle>
                                    <CardDescription className="text-slate-500 font-medium mt-1">Monthly business performance and trends</CardDescription>
                                </div>
                                <div className="p-2 bg-indigo-50 rounded-xl">
                                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <RevenueChart
                                    data={stats.monthlyTrends || []}
                                    weeklyData={stats.weeklyTrends || []}
                                />
                            </CardContent>
                        </Card>
                    </div>


                    {/* Recent Activity Feed - Takes 1 column */}
                    <div className="lg:col-span-1">
                        <Card className="h-full border-gray-100 shadow-sm flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
                                <CardDescription>Latest system events</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden p-0">
                                <RecentActivityFeed activities={stats.packageAnalytics?.agentActivities || []} />
                            </CardContent>
                            <div className="p-4 border-t border-gray-100">
                                <Button variant="outline" className="w-full text-sm">View All Activity</Button>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Bottom Section: Management Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Agent Management Card */}
                    <Card className="border-gray-100 shadow-sm bg-indigo-50/30">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-100 rounded-lg">
                                    <Users className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Agent Management</h3>
                                    <p className="text-sm text-gray-500">Manage agents and their access</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-4 mb-6">
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-100 shadow-sm">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="text-sm font-medium text-gray-700">{stats.agents.active} active</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-100 shadow-sm">
                                    <div className="h-2 w-2 rounded-full bg-orange-400" />
                                    <span className="text-sm font-medium text-gray-700">{stats.agents.inactive} inactive/pending</span>
                                </div>
                            </div>

                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" asChild>
                                <Link href="/admin/agents">
                                    <Users className="h-4 w-4 mr-2" />
                                    Manage Agents
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Billing & Subscriptions Card */}
                    <Card className="border-gray-100 shadow-sm bg-orange-50/30">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <DollarSign className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Billing & Subscriptions</h3>
                                    <p className="text-sm text-gray-500">Manage plans and invoices</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-4 mb-6">
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-100 shadow-sm">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="text-sm font-medium text-gray-700">₹{(stats.totalRevenue / 1000).toFixed(1)}k revenue</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-100 shadow-sm">
                                    <div className="h-2 w-2 rounded-full bg-red-500" />
                                    <span className="text-sm font-medium text-gray-700">{stats.alerts.paymentFailures} pending</span>
                                </div>
                            </div>

                            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" asChild>
                                <Link href="/admin/billing">
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Manage Billing
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}
