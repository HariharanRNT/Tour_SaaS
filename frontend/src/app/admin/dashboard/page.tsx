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
import { GlassCard } from '@/components/ui/GlassCard'

const INITIAL_STATS = {
    totalPackages: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingPaymentsValue: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    agents: { total: 0, active: 0, inactive: 0, pending: 0 },
    activeSubscriptions: 0,
    subscriptionsNearingExpiry: 0,
    revenueGrowth: 0,
    agentGrowth: 0,
    bookingGrowth: 0,
    changeLabel: "vs last month",
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
    dailyTrends: [],
    leaderboard: [],
    renewals: [],
    health: {
        activePlans: 0,
        expiringSoon: 0,
        trialUsers: 0,
        churnRate: 0,
        system: [
            { name: "API Status", status: "Loading...", color: "text-black" },
            { name: "Payments", status: "Loading...", color: "text-black" },
            { name: "Bookings API", status: "Loading...", color: "text-black" },
        ]
    },
    sparklines: {
        revenue: [],
        agents: [],
        bookings: []
    }
}

export default function AdminDashboard() {
    const [dateFilter, setDateFilter] = useState('ALL')

    const { data: apiStats } = useQuery({
        queryKey: ['dashboard-stats', dateFilter],
        queryFn: () => fetchDashboardStats(dateFilter)
    })

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

    // Modern StatCard Component
    const StatCard = ({ title, value, change, changeLabel, secondMetric, icon: Icon, colorClass, link, accentColor, sparkData }: any) => (
        <motion.div
            whileHover={{ y: -4 }}
            className="flex-1 h-full"
        >
            <GlassCard className="h-full p-5 flex flex-col justify-between group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-black">{title}</h3>
                        <div className={cn(
                            "p-2.5 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm border border-white/40 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1",
                            colorClass.replace('bg-', 'text-')
                        )}>
                            <Icon className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="flex justify-between items-end gap-2">
                        <div className="flex-1">
                            <div className="text-3xl font-black text-black tracking-tight leading-none mb-1">
                                {value}
                            </div>
                            {(change || changeLabel) && (
                                <div className="flex items-center text-[11px] font-bold mt-2">
                                    {change !== undefined && (
                                        <span className={cn(
                                            "flex items-center px-1.5 py-0.5 rounded-md mr-2",
                                            change > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                        )}>
                                            {change > 0 ? <ArrowUp className="h-3 w-3 mr-0.5" /> : <ArrowDown className="h-3 w-3 mr-0.5" />}
                                            {Math.abs(change)}%
                                        </span>
                                    )}
                                    <span className="text-black uppercase tracking-widest text-[9px]">{changeLabel}</span>
                                </div>
                            )}
                            {secondMetric && (
                                <p className="text-[10px] font-semibold text-orange-600 bg-orange-50 w-fit px-3 py-1 rounded-full mt-3 border border-orange-100">{secondMetric}</p>
                            )}
                        </div>
                        {sparkData && (
                            <div className="pb-1 group-hover:opacity-100 transition-opacity">
                                <Sparkline data={sparkData} color={accentColor?.includes('emerald') ? '#10b981' : accentColor?.includes('blue') ? '#3b82f6' : '#FF6B2B'} />
                            </div>
                        )}
                    </div>
                </div>

                {link && (
                    <div className="mt-5 pt-4 border-t border-white/10 group/link">
                        <Link href={link} className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center transition-all uppercase tracking-widest underline decoration-orange-500/20 underline-offset-4">
                            View Details <ArrowRight className="h-3 w-3 ml-2 group-hover/link:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                )}
            </GlassCard>
        </motion.div>
    )

    return (
        <div className="p-8 md:p-10 lg:p-12 min-h-screen noise-overlay relative overflow-hidden">
            {/* Background Blobs for Depth */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-400/10 blur-[120px] rounded-full animate-blob pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-400/10 blur-[120px] rounded-full animate-blob animation-delay-2000 pointer-events-none" />
            <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-rose-400/10 blur-[120px] rounded-full animate-blob animation-delay-4000 pointer-events-none" />

            <div className="max-w-[1536px] mx-auto space-y-10 relative z-10">

                {/* Page Header & Filter */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-orange-100/50">
                    <div>
                        <motion.h1
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="text-[42px] font-[900] text-black tracking-tight leading-none"
                        >
                            Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B2B] to-[#F59E0B] underline decoration-orange-200 underline-offset-8">Overview</span>
                        </motion.h1>
                        <p className="text-black mt-4 text-lg font-bold tracking-tight uppercase text-[10px]">System Administrator Portal</p>
                        <p className="text-black mt-1 text-lg font-medium">Welcome back, <span className="text-orange-600 font-bold underline decoration-orange-200 underline-offset-4">Admin</span>. Your business is thriving.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-[180px] bg-white border-transparent rounded-2xl shadow-sm hover:shadow-md transition-all h-12 font-black text-xs uppercase tracking-widest text-black">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatCard
                        title="Total Revenue"
                        value={`₹${(stats.totalRevenue / 1000).toFixed(1)}k`}
                        change={stats.revenueGrowth}
                        changeLabel={stats.changeLabel}
                        secondMetric={`Avg booking: ₹${stats.avgOrderValue}`}
                        icon={DollarSign}
                        colorClass="bg-emerald-500"
                        accentColor="bg-emerald-500"
                        link="/admin/billing"
                    />
                    <StatCard
                        title="Active Agents"
                        value={stats.agents.active}
                        change={stats.agentGrowth}
                        changeLabel={stats.changeLabel}
                        secondMetric={`${stats.agents.pending} pending approvals`}
                        icon={Users}
                        colorClass="bg-blue-500"
                        accentColor="bg-blue-500"
                        link="/admin/agents"
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
                    />
                    <StatCard
                        title="Active Plans"
                        value={stats.activeSubscriptions}
                        secondMetric="Current subscribers"
                        icon={CheckCircle2}
                        colorClass="bg-emerald-600"
                        link="/admin/billing"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 gap-5">
                    {/* Revenue Chart - Full Width */}
                    <div>
                        <Card className="h-full rounded-[24px] backdrop-blur-[18px] bg-white/18 border border-white/25 p-0 overflow-hidden transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] group relative">
                            <div className="bg-white/20 backdrop-blur-md border-b border-white/10 py-8 px-8 flex flex-row items-center justify-between z-10 relative">
                                <div>
                                    <h2 className="text-[13px] font-bold tracking-[1px] uppercase text-black">Analytics Hub</h2>
                                    <CardDescription className="text-black font-medium text-[11px] mt-1">Real-time performance across all revenue streams</CardDescription>
                                </div>
                                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 shadow-sm">
                                    <TrendingUp className="h-5 w-5 text-orange-600" />
                                </div>
                            </div>
                            <CardContent className="p-8 z-10 relative">
                                <RevenueChart data={stats.monthlyTrends} ytmData={stats.ytmTrends} weeklyData={stats.weeklyTrends} dailyData={stats.dailyTrends} />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Section Title for Monitoring */}
                <div className="pt-6">
                    <h2 className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-2 px-1">Monitoring</h2>
                    <div className="h-px bg-gradient-to-r from-slate-200 via-transparent to-transparent w-full" />
                </div>

                {/* Business Monitoring Masonry-Style Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 content-start items-stretch">
                    {/* Performance Ranking Card */}
                    <Card className="rounded-[24px] backdrop-blur-[18px] bg-white/18 border border-white/25 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] hover:border-orange-500/30 group relative">
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[13px] font-bold tracking-[1px] uppercase text-black">Top Agents</h3>
                                <Award className="h-5 w-5 text-black" />
                            </div>

                            <div className="space-y-2.5">
                                {stats.leaderboard.map((agent: any, i: number) => (
                                    <div key={i} className={cn(
                                        "grid items-center gap-3 p-2 rounded-xl transition-all",
                                        i === 0
                                            ? "bg-white/50 border border-orange-500/20 scale-[1.02] shadow-[0_8px_20px_rgba(251,146,60,0.15)] z-10"
                                            : "hover:bg-white/20 border border-transparent"
                                    )} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto' }}>
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white",
                                            i === 0 ? "bg-gradient-to-br from-orange-400 to-rose-500 shadow-[0_0_12px_rgba(251,146,60,0.3)]" : i === 1 ? "bg-slate-700" : "bg-slate-600"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-black truncate">{agent.name}</p>
                                            <p className="text-[9px] text-black font-medium uppercase tracking-tighter">{agent.bookings} bookings</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-black">₹{agent.revenue}k</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Subscription Lifecycle Card */}
                    <Card className="rounded-[24px] backdrop-blur-[18px] bg-white/18 border border-white/25 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] hover:border-orange-500/30 group relative">
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[13px] font-bold tracking-[1px] uppercase text-black">Renewals</h3>
                                <RefreshCw className="h-5 w-5 text-black" />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-[11px] font-bold text-black uppercase tracking-widest mb-1">Upcoming Renewals</p>
                                    <p className="text-lg font-black text-black">{stats.renewals.length} agents</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    )
}
