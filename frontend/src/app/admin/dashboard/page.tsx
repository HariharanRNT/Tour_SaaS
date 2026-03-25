'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
    Activity,
    Award,
    ShieldAlert,
    RefreshCw,
    CheckCircle2,
    LayoutDashboard,
    ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart'
import { RecentActivityFeed } from '@/components/admin/dashboard/RecentActivityFeed'
import { fetchDashboardStats } from '@/lib/api'

const INITIAL_STATS = {
    totalPackages: 0,
    totalBookings: 128,
    totalRevenue: 1400,
    avgOrderValue: 352,
    conversionRate: 18.4,
    agents: { total: 5, active: 4, inactive: 1, pending: 2 },
    activeSubscriptions: 4,
    subscriptionsNearingExpiry: 0,
    packageAnalytics: {
        popularDestinations: [],
        agentActivities: []
    },
    alerts: {
        paymentFailures: 0,
        cancelledBookings: 0
    },
    monthlyTrends: [],
    ytmTrends: [],
    weeklyTrends: [],
    dailyTrends: [
        { name: 'Mon', revenue: 120, bookings: 2 },
        { name: 'Tue', revenue: 340, bookings: 5 },
        { name: 'Wed', revenue: 210, bookings: 3 },
        { name: 'Thu', revenue: 450, bookings: 8 },
        { name: 'Fri', revenue: 380, bookings: 6 },
        { name: 'Sat', revenue: 520, bookings: 10 },
        { name: 'Sun', revenue: 480, bookings: 9 },
    ],
    leaderboard: [
        { name: "ABC Travels", revenue: 600, bookings: 32, avatar: "A" },
        { name: "Global Travels", revenue: 420, bookings: 24, avatar: "G" },
        { name: "Sky Tours", revenue: 210, bookings: 12, avatar: "S" },
    ],
    renewals: [
        { name: "ABC Travels", date: "Mar 12", daysLeft: 6 },
        { name: "Sky Tours", date: "Mar 18", daysLeft: 12 },
        { name: "Travel Hub", date: "Mar 22", daysLeft: 16 },
    ],
    health: {
        activePlans: 4,
        expiringSoon: 1,
        trialUsers: 2,
        churnRate: 5,
        system: [
            { name: "API Status", status: "Operational", color: "text-emerald-500" },
            { name: "Payments", status: "Active", color: "text-emerald-500" },
            { name: "Bookings API", status: "Delay", color: "text-amber-500" },
        ]
    },
    sparklines: {
        revenue: [30, 45, 35, 60, 55, 75, 70],
        agents: [2, 3, 3, 4, 4, 4, 4],
        bookings: [10, 15, 8, 20, 18, 25, 22]
    }
}

export default function AdminDashboard() {
    const [dateFilter, setDateFilter] = useState('ALL')

    const { data: apiStats } = useQuery({
        queryKey: ['dashboard-stats', dateFilter],
        queryFn: () => fetchDashboardStats(dateFilter) })

    const stats = { ...INITIAL_STATS, ...apiStats }

    // Simple Sparkline Component
    function Sparkline({ data, color }: { data: number[], color: string }) {
        if (!data || data.length === 0) return null;
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max === min ? 1 : max - min;
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 30 - ((val - min) / range) * 20; // Scale to fit height 30
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg viewBox="0 0 100 30" className="w-24 h-8 overflow-visible">
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    className="drop-shadow-sm"
                />
            </svg>
        );
    }

    // Modern Stat Card Component
    const StatCard = ({ title, value, change, changeLabel, secondMetric, icon: Icon, colorClass, link, accentColor, sparkData }: any) => (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex-1"
        >
            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[32px] glass-panel group h-full">
                {/* Thick accent strip at the top as requested */}
                <div className={`absolute top-0 left-0 right-0 h-2 ${accentColor} opacity-90`} />

                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-8 relative z-10 px-8">
                    <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">{title}</h3>
                    <div className={cn(
                        "p-3 rounded-2xl bg-white shadow-sm border border-slate-50 transition-all duration-500 group-hover:shadow-lg group-hover:-translate-y-1",
                        colorClass.replace('bg-', 'text-')
                    )}>
                        <Icon className="h-6 w-6" />
                    </div>
                </CardHeader>

                <CardContent className="relative z-10 px-8 pb-8">
                    <div className="flex justify-between items-end gap-2">
                        <div className="flex-1">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-4xl font-[1000] text-slate-800 tracking-tight leading-none mb-2"
                            >
                                {value}
                            </motion.div>
                            {(change || changeLabel) && (
                                <div className="flex items-center text-[11px] font-black tracking-tight mt-3">
                                    {change && (
                                        <span className={cn(
                                            "flex items-center px-2 py-1 rounded-lg mr-2",
                                            change > 0 ? "bg-emerald-50 text-emerald-600 shadow-[0_2px_10px_rgba(16,185,129,0.1)]" : "bg-rose-50 text-rose-600 shadow-[0_2px_10px_rgba(244,63,94,0.1)]"
                                        )}>
                                            {change > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                                            {Math.abs(change)}%
                                        </span>
                                    )}
                                    <span className="text-slate-400 uppercase tracking-widest">{changeLabel}</span>
                                </div>
                            )}
                            {secondMetric && (
                                <p className="text-[10px] text-slate-500 mt-4 font-bold opacity-60 uppercase tracking-widest">{secondMetric}</p>
                            )}
                        </div>
                        {sparkData && (
                            <div className="pb-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Sparkline data={sparkData} color={accentColor.includes('emerald') ? '#10b981' : accentColor.includes('blue') ? '#3b82f6' : '#FF6B2B'} />
                            </div>
                        )}
                    </div>

                    {link && (
                        <div className="mt-6 pt-6 border-t border-slate-50 group/link">
                            <Link href={link} className="text-[10px] font-black text-orange-600 hover:text-orange-700 flex items-center transition-all uppercase tracking-[0.2em]">
                                Full Analysis <ArrowRight className="h-3 w-3 ml-2 group-hover/link:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    )}
                </CardContent>

                <div className={`absolute -bottom-10 -right-10 h-40 w-40 ${accentColor} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rounded-full pointer-events-none blur-3xl`} />
            </Card>
        </motion.div>
    )

    return (
        <div className="p-8 md:p-10 lg:p-12 glass-panel min-h-screen">
            <div className="max-w-[1536px] mx-auto space-y-10">

                {/* Page Header & Filter */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-orange-100/50">
                    <div>
                        <motion.h1
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="text-[42px] font-[900] text-slate-900 tracking-tight leading-none"
                        >
                            Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B2B] to-[#F59E0B] underline decoration-orange-200 underline-offset-8">Overview</span>
                        </motion.h1>
                        <p className="text-slate-500 mt-4 text-lg font-bold tracking-tight uppercase text-[10px] opacity-60">System Administrator Portal</p>
                        <p className="text-slate-600 mt-1 text-lg font-medium">Welcome back, <span className="text-orange-600 font-bold underline decoration-orange-200 underline-offset-4">Admin</span>. Your business is thriving.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-[180px] bg-white border-transparent rounded-2xl shadow-sm hover:shadow-md transition-all h-12 font-black text-xs uppercase tracking-widest text-slate-700">
                                <Calendar className="h-4 w-4 mr-3 text-orange-500" />
                                <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-orange-50 shadow-xl">
                                <SelectItem value="ALL" className="text-xs font-bold uppercase tracking-widest">All Time</SelectItem>
                                <SelectItem value="1D" className="text-xs font-bold uppercase tracking-widest">Today</SelectItem>
                                <SelectItem value="7D" className="text-xs font-bold uppercase tracking-widest">Last 7 Days</SelectItem>
                                <SelectItem value="30D" className="text-xs font-bold uppercase tracking-widest">Last 30 Days</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button className="bg-gradient-to-r from-[#FF692B] to-[#F59E0B] hover:scale-105 transition-all text-white shadow-xl shadow-orange-500/20 rounded-2xl h-12 px-8 font-black text-xs uppercase tracking-widest">
                            <CreditCard className="h-4 w-4 mr-3" />
                            Generate Report
                        </Button>
                    </div>
                </div>

                {/* KPI Cards Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <StatCard
                        title="Total Revenue"
                        value={`₹${(stats.totalRevenue / 1000).toFixed(1)}k`}
                        change={12}
                        changeLabel="vs last month"
                        secondMetric={`Avg booking: ₹${stats.avgOrderValue}`}
                        icon={DollarSign}
                        colorClass="bg-emerald-500"
                        accentColor="bg-emerald-500"
                        link="/admin/billing"
                        sparkData={stats.sparklines.revenue}
                    />
                    <StatCard
                        title="Active Agents"
                        value={stats.agents.active}
                        change={5}
                        changeLabel="new this week"
                        secondMetric={`${stats.agents.pending} pending approvals`}
                        icon={Users}
                        colorClass="bg-blue-500"
                        accentColor="bg-blue-500"
                        link="/admin/agents"
                        sparkData={stats.sparklines.agents}
                    />
                    <StatCard
                        title="Expiring Soon"
                        value={stats.renewals.filter((r: any) => r.daysLeft <= 7).length}
                        changeLabel={stats.renewals.length > 0 ? `Next: ${stats.renewals[0].date}` : "No upcoming expiries"}
                        secondMetric={`Renewal revenue: ₹${stats.renewals.length * 400}`}
                        icon={Clock}
                        colorClass="bg-rose-500"
                        accentColor="bg-rose-500"
                        link="/admin/billing"
                        sparkData={stats.sparklines.bookings}
                    />
                </div>

                {/* Quick Stats Row - SaaS Pills */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
                    {[
                        { label: 'Total Bookings', value: stats.totalBookings, color: 'text-indigo-600', borderColor: 'border-l-indigo-500' },
                        { label: 'Pending Payments', value: `₹2.1k`, color: 'text-amber-600', borderColor: 'border-l-amber-500' },
                        { label: 'Active Plans', value: stats.activeSubscriptions, color: 'text-emerald-600', borderColor: 'border-l-emerald-500' },
                        { label: 'Conversion Rate', value: `${stats.conversionRate}%`, color: 'text-rose-600', borderColor: 'border-l-rose-500' },
                    ].map((pill, i) => (
                        <div key={i} className={cn(
                            "bg-white/40 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/60 border-l-4 shadow-sm flex items-center justify-between group hover:bg-white transition-all cursor-default",
                            pill.borderColor
                        )}>
                            <span className="text-xs font-[900] text-slate-500 uppercase tracking-tight">{pill.label}</span>
                            <span className={cn("text-lg font-black tracking-tight", pill.color)}>{pill.value}</span>
                        </div>
                    ))}
                </div>

                {/* Charts & Activity Section */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Revenue Chart - Expanded to 3 columns for better readability */}
                    <div className="lg:col-span-3">
                        <Card className="h-full border-0 shadow-2xl shadow-orange-100/30 overflow-hidden rounded-[40px] glass-panel relative">
                            <CardHeader className="bg-white/80 backdrop-blur-md border-b border-slate-50 py-10 px-10 flex flex-row items-center justify-between z-10 relative">
                                <div>
                                    <h2 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-1">Business Intelligence</h2>
                                    <CardTitle className="text-2xl font-[900] text-slate-800 tracking-tight">Analytics Hub</CardTitle>
                                    <CardDescription className="text-slate-400 font-bold text-[11px] mt-1 italic">Real-time performance across all revenue streams</CardDescription>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100 shadow-sm">
                                    <TrendingUp className="h-6 w-6 text-orange-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-10 z-10 relative">
                                <RevenueChart data={stats.monthlyTrends} ytmData={stats.ytmTrends} weeklyData={stats.weeklyTrends} dailyData={stats.dailyTrends} />
                            </CardContent>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-orange-100/10 blur-[150px] pointer-events-none rounded-full" />
                        </Card>
                    </div>

                    {/* Activity Feed Container - 1 column */}
                    <div className="lg:col-span-1">
                        <Card className="h-full border-0 shadow-2xl shadow-indigo-100/30 overflow-hidden rounded-[40px] glass-panel bg-white/40">
                            <CardHeader className="bg-white/80 backdrop-blur-md border-b border-slate-50 py-10 px-8 flex flex-row items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Live Monitor</h2>
                                        <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[8px] font-black text-emerald-700 uppercase tracking-wider">Live</span>
                                        </div>
                                    </div>
                                    <CardTitle className="text-2xl font-[900] text-slate-800 tracking-tight">Smart Feed</CardTitle>
                                    <CardDescription className="text-slate-400 font-bold text-[11px] mt-1 italic">Global system events</CardDescription>
                                </div>
                                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm">
                                    <Activity className="h-6 w-6 text-indigo-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 overflow-y-auto max-h-[600px] scrollbar-hide">
                                <RecentActivityFeed activities={stats.packageAnalytics?.agentActivities || []} />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Section Title for Monitoring */}
                <div className="pt-6">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 px-1">Health & Monitoring</h2>
                    <div className="h-px bg-gradient-to-r from-slate-200 via-transparent to-transparent w-full" />
                </div>

                {/* Business Monitoring Masonry-Style Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 content-start items-stretch">
                    {/* Subscription Health */}
                    <Card className="border-0 shadow-xl rounded-[32px] glass-panel overflow-hidden group hover:shadow-2xl transition-all duration-500 min-h-[420px] h-full flex flex-col">
                        <CardHeader className="pb-4 border-b border-slate-50 bg-white/60">
                            <div>
                                <h2 className="text-[9px] font-black text-orange-600 uppercase tracking-[0.2em] mb-1">Stability Metrics</h2>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-[11px] font-[900] text-slate-800 uppercase tracking-widest">Plan Health</CardTitle>
                                    <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                        <LayoutDashboard className="h-4 w-4 text-emerald-600 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-8 space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                                    <span className="text-slate-400">Retention</span>
                                    <span className="text-emerald-600">84%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-[2px]">
                                    <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: '84%' }} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                                    <span className="text-slate-400">Churn Rate</span>
                                    <span className="text-rose-600">2.4%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-[2px]">
                                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '12%' }} />
                                </div>
                            </div>
                            <div className="pt-4 grid grid-cols-2 gap-3">
                                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trials</p>
                                    <p className="text-xl font-black text-slate-800">{stats.health.trialUsers}</p>
                                </div>
                                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Renewals</p>
                                    <p className="text-xl font-black text-slate-800">92%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Agents Leaderboard */}
                    <Card className="border-0 shadow-xl rounded-[32px] glass-panel overflow-hidden group hover:shadow-2xl transition-all duration-500 min-h-[420px] h-full flex flex-col">
                        <CardHeader className="pb-4 border-b border-slate-50 bg-white/60">
                            <div>
                                <h2 className="text-[9px] font-black text-orange-600 uppercase tracking-[0.2em] mb-1">Performance Ranking</h2>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-[11px] font-[900] text-slate-800 uppercase tracking-widest">Top Agents</CardTitle>
                                    <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                                        <Award className="h-4 w-4 text-amber-600" />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-1.5 flex-1 pr-2">
                            {stats.leaderboard.map((agent: any, i: number) => (
                                <div key={i} className={cn(
                                    "flex items-center justify-between p-2.5 rounded-2xl transition-all border group relative",
                                    i === 0
                                        ? "bg-white shadow-xl shadow-orange-200/20 border-orange-100 scale-[1.01] z-10"
                                        : "bg-transparent border-transparent hover:border-white/40 hover:bg-white/10"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md transform group-hover:rotate-6 transition-transform",
                                            i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-600" : i === 1 ? "bg-cyan-500" : "bg-violet-500"
                                        )}>
                                            {agent.avatar}
                                            {i === 0 && (
                                                <div className="absolute -top-1 -left-1">
                                                    <Award className="h-3 w-3 text-amber-500 fill-amber-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-[900] text-slate-800 tracking-tight">{agent.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{agent.bookings} Bookings</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-orange-600 tracking-tighter">₹{agent.revenue}k</p>
                                        {i === 0 && <p className="text-[7px] font-black text-amber-500 uppercase tracking-tighter leading-none">Rank #1</p>}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Upcoming Renewals */}
                    <Card className="border-0 shadow-xl rounded-[32px] glass-panel overflow-hidden group hover:shadow-2xl transition-all duration-500 min-h-[420px] h-full flex flex-col">
                        <CardHeader className="pb-4 border-b border-slate-50 bg-white/60">
                            <div>
                                <h2 className="text-[9px] font-black text-orange-600 uppercase tracking-[0.2em] mb-1">Subscription Lifecycle</h2>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-[11px] font-[900] text-slate-800 uppercase tracking-widest">Renewals</CardTitle>
                                    <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                                        <RefreshCw className="h-4 w-4 text-blue-600" />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4 flex-1 flex flex-col">
                            <div className="space-y-3 flex-1">
                                {stats.renewals.slice(0, 3).map((renewal: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-white/60 hover:bg-white/20 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-2 w-2 rounded-full", renewal.daysLeft <= 7 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "bg-blue-500")} />
                                            <div>
                                                <p className="text-sm font-black text-slate-800 tracking-tight">{renewal.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{renewal.date}</p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                            renewal.daysLeft <= 7
                                                ? "bg-rose-50 text-rose-600 border-rose-100 shadow-[0_2px_8px_rgba(244,63,94,0.1)]"
                                                : renewal.daysLeft <= 14
                                                    ? "bg-amber-50 text-amber-600 border-amber-100"
                                                    : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        )}>
                                            {renewal.daysLeft}D
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <Button className="w-full mt-4 h-12 rounded-2xl bg-[#FF692B] hover:bg-[#E05910] text-white shadow-xl shadow-orange-500/20 font-black text-xs uppercase tracking-[0.2em] transition-all transform hover:scale-[1.02]">
                                Send Reminders
                            </Button>
                        </CardContent>
                    </Card>

                    {/* System Health */}
                    <Card className="border-0 shadow-xl rounded-[32px] glass-panel overflow-hidden group hover:shadow-2xl transition-all duration-500 min-h-[420px] h-full flex flex-col">
                        <CardHeader className="pb-4 border-b border-slate-50 bg-white/60">
                            <div>
                                <h2 className="text-[9px] font-black text-orange-600 uppercase tracking-[0.2em] mb-1">Infrastructure Health</h2>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-[11px] font-[900] text-slate-800 uppercase tracking-widest">System Status</CardTitle>
                                    <div className="h-8 w-8 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                                        <ShieldAlert className="h-4 w-4 text-orange-600" />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-3 flex-1">
                            {stats.health.system.map((sys: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3.5 bg-white/40 backdrop-blur-sm rounded-2xl border border-white shadow-sm hover:translate-x-1 transition-transform">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-1.5 w-1.5 rounded-full shadow-lg", sys.color.replace('text-', 'bg-'), sys.status !== 'Operational' && 'animate-pulse')} />
                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{sys.name}</span>
                                    </div>
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/80", sys.color)}>
                                        {sys.status}
                                    </span>
                                </div>
                            ))}
                            <div className="pt-2 flex items-center justify-between px-2">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic flex items-center">
                                    <Clock className="h-3 w-3 mr-1" /> 2m ago
                                </p>
                                <button className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                                    Diagnostics
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}
