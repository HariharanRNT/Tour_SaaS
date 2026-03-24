'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
    BarChart2, 
    Download, 
    Calendar, 
    TrendingUp, 
    Users as UsersIcon, 
    XCircle, 
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    FileText,
    TrendingDown,
    ArrowUpDown,
    CheckCircle2,
    HelpCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartOptions
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useQuery } from '@tanstack/react-query'
import { agentReportsAPI, bookingsAPI } from '@/lib/api'
import { Skeleton } from "@/components/ui/skeleton"

// Register ChartJS
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

// Mock data removed in favor of API data

export default function ReportsPage() {
    const { theme } = useTheme()
    const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('week')
    const [customRange, setCustomRange] = useState({ from: '', to: '' })
    const [bookingListStatus, setBookingListStatus] = useState<string>('all')
    const [bookingListRefundStatus, setBookingListRefundStatus] = useState<string>('all')
    const [recentBookingsPage, setRecentBookingsPage] = useState(1)
    const [recentBookingsLimit] = useState(5)

    const { data: summary, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['agentReportSummary', activePeriod, customRange],
        queryFn: () => agentReportsAPI.getSummary({ 
            period: activePeriod, 
            start_date: customRange.from || undefined, 
            end_date: customRange.to || undefined 
        })
    })

    const { data: chartData, isLoading: isChartLoading } = useQuery({
        queryKey: ['agentReportCharts', activePeriod === 'custom' ? 'all' : activePeriod],
        queryFn: () => agentReportsAPI.getCharts(activePeriod === 'custom' ? 'all' : activePeriod)
    })

    const [page, setPage] = useState(1)
    const [limit] = useState(5)
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'revenue', direction: 'desc' })

    // Reset page on filter changes
    useEffect(() => {
        setPage(1)
    }, [activePeriod, customRange])

    const { data: packagePerformanceData, isLoading: isPackageLoading } = useQuery({
        queryKey: ['agentPackagePerformance', activePeriod, customRange, page, sortConfig],
        queryFn: () => agentReportsAPI.getPackagePerformance({
            period: activePeriod,
            start_date: customRange.from || undefined,
            end_date: customRange.to || undefined,
            page,
            limit,
            sort_by: sortConfig.key,
            sort_dir: sortConfig.direction
        })
    })

    const packagePerformance = packagePerformanceData?.items || []
    const totalPackages = packagePerformanceData?.total || 0
    const totalPages = Math.ceil(totalPackages / limit)

    const maxRevenue = useMemo(() => {
        if (!packagePerformance || packagePerformance.length === 0) return 0
        // We might need the global max revenue for accurate bars across pages, 
        // but for now let's use the current page's max to keep it simple or 
        // handle it if the backend returns global max.
        return Math.max(...packagePerformance.map((p: any) => p.revenue))
    }, [packagePerformance])

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }))
        setPage(1) // Reset to first page on sort
    }

    useEffect(() => {
        setRecentBookingsPage(1)
    }, [bookingListStatus, bookingListRefundStatus])

    const { data: recentBookingsData, isLoading: isRecentBookingsLoading } = useQuery({
        queryKey: ['agentRecentBookings', bookingListStatus, bookingListRefundStatus, recentBookingsPage],
        queryFn: () => bookingsAPI.getAgentBookings({
            status: bookingListStatus !== 'all' ? bookingListStatus : undefined,
            refund_status: bookingListRefundStatus !== 'all' ? bookingListRefundStatus : undefined,
            skip: (recentBookingsPage - 1) * recentBookingsLimit,
            limit: recentBookingsLimit
        })
    })

    const recentBookings = recentBookingsData?.items || []
    const totalRecentBookings = recentBookingsData?.total || 0
    const totalRecentBookingsPages = Math.ceil(totalRecentBookings / recentBookingsLimit)

    const accentColor = theme === 'orange' ? '#f97316' : '#2563eb'

    // Export CSV logic
    const exportToCSV = () => {
        if (!chartData) return
        const labels = chartData.labels
        const rev = chartData.revenue
        const book = chartData.bookings
        const cancel = chartData.cancellations
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + "Period,Revenue,Bookings,Cancellations\n"
            + labels.map((l: string, i: number) => `${l},${rev[i] || 0},${book[i] || 0},${cancel[i] || 0}`).join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `report_${activePeriod}_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Chart Options
    const lineChartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(255,255,255,0.88)',
                titleColor: '#1a1a1a',
                bodyColor: '#555555',
                borderColor: 'rgba(255,255,255,0.5)',
                borderWidth: 1,
                padding: 8,
                cornerRadius: 8,
                bodyFont: { size: 12 },
                titleFont: { weight: 'bold' }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: 'rgba(0,0,0,0.4)', font: { size: 11 } }
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.15)' },
                ticks: {
                    color: 'rgba(0,0,0,0.4)',
                    callback: (value) => '₹' + (Number(value) / 1000).toFixed(0) + 'k'
                }
            },
            y2: {
                display: false,
                position: 'right' as const,
                grid: { display: false }
            }
        }
    }

    const barChartOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { 
                backgroundColor: 'rgba(255,255,255,0.88)', 
                titleColor: '#1a1a1a', 
                bodyColor: '#555555',
                borderColor: 'rgba(255,255,255,0.5)',
                borderWidth: 1,
                padding: 8,
                cornerRadius: 8
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: 'rgba(0,0,0,0.4)', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.15)' }, ticks: { color: 'rgba(0,0,0,0.4)', stepSize: 2 } }
        },
        datasets: {
            bar: {
                barPercentage: 0.6,
                categoryPercentage: 0.7
            }
        }
    }

    const horizontalBarOptions: ChartOptions<'bar'> = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(255,255,255,0.88)',
                titleColor: '#1a1a1a',
                bodyColor: '#555555',
                borderColor: 'rgba(255,255,255,0.5)',
                borderWidth: 1,
                padding: 8,
                cornerRadius: 8,
                callbacks: {
                    label: (context) => '₹' + context.raw?.toLocaleString()
                }
            }
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.15)' }, ticks: { color: 'rgba(0,0,0,0.4)', callback: (v) => '₹' + (Number(v) / 1000).toFixed(0) + 'k' } },
            y: { grid: { display: false }, ticks: { color: 'rgba(0,0,0,0.4)', font: { size: 11 } } }
        }
    }

    // Chart Data
    const lineChartData = useMemo(() => ({
        labels: chartData?.labels || [],
        datasets: [
            {
                label: 'Revenue',
                data: chartData?.revenue || [],
                borderColor: accentColor,
                backgroundColor: theme === 'orange' ? 'rgba(249, 115, 22, 0.08)' : 'rgba(37, 99, 235, 0.08)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: accentColor,
                pointBorderColor: 'white',
                pointBorderWidth: 2,
            },
            {
                label: 'Bookings',
                data: chartData?.bookings || [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.06)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#3b82f6',
                yAxisID: 'y2',
            }
        ]
    }), [chartData, accentColor, theme])

    const bookingVsCancelData = useMemo(() => ({
        labels: chartData?.labels || [],
        datasets: [
            {
                label: 'Bookings',
                data: chartData?.bookings || [],
                backgroundColor: 'rgba(59, 130, 246, 0.75)',
                borderRadius: 6,
                borderSkipped: false,
            },
            {
                label: 'Cancellations',
                data: chartData?.cancellations || [],
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderRadius: 6,
                borderSkipped: false,
            }
        ]
    }), [chartData])

    const revByPackageData = useMemo(() => ({
        labels: chartData?.packages?.map((p: any) => p.name) || [],
        datasets: [
            {
                data: chartData?.packages?.map((p: any) => p.value) || [],
                backgroundColor: theme === 'orange' 
                    ? ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#fde8d0']
                    : ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe'],
                borderRadius: 6,
            }
        ]
    }), [chartData, theme])

    return (
        <div className="p-6 min-h-screen">
            {/* Header Card */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[20px] p-5 mb-5 flex justify-between items-center"
                style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.35)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-orange-500/15 border border-orange-500/20">
                        <BarChart2 className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-[18px] font-medium text-slate-800">Reports & Analytics</h1>
                        <p className="text-[13px] text-slate-500">Track revenue, bookings and performance</p>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    onClick={exportToCSV}
                    className="gap-2 bg-white/40 border border-white/50 hover:bg-white/60 rounded-[10px] px-4 py-2 text-[13px]"
                >
                    <Download className="h-4 w-4" /> Export CSV
                </Button>
            </motion.div>

            {/* Filter Bar */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-[20px] p-3 px-5 mb-5 flex items-center gap-4 flex-wrap"
                style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.35)' }}
            >
                <div className="flex items-center gap-3">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Period</span>
                    <div className="flex gap-2">
                        {['today', 'week', 'month', 'all'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setActivePeriod(p as any)}
                                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                                    activePeriod === p 
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                                    : 'bg-white/30 text-slate-600 hover:bg-white/50 border border-white/40'
                                }`}
                                style={activePeriod === p ? { background: accentColor } : {}}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-px h-6 bg-white/40 mx-2" />

                <div className="flex items-center gap-3">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Custom Range</span>
                    <div className="flex items-center gap-2">
                        <input 
                            type="date" 
                            className="bg-white/40 border border-white/50 rounded-[10px] px-3 py-1.5 text-[12px] focus:outline-none focus:border-orange-500/50" 
                            onChange={(e) => setCustomRange({...customRange, from: e.target.value})}
                        />
                        <span className="text-[12px] text-slate-400">to</span>
                        <input 
                            type="date" 
                            className="bg-white/40 border border-white/50 rounded-[10px] px-3 py-1.5 text-[12px] focus:outline-none focus:border-orange-500/50"
                            onChange={(e) => setCustomRange({...customRange, to: e.target.value})}
                        />
                        <Button 
                            className="h-8 bg-orange-500/90 hover:bg-orange-500 text-white text-[12px] px-4 rounded-[8px]" 
                            style={{ background: accentColor }}
                            onClick={() => setActivePeriod('custom')}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                {[
                    { title: 'Total Revenue', value: isSummaryLoading ? '...' : `₹${summary?.totalRevenue?.toLocaleString()}`, change: summary?.revChange, up: summary?.revUp, icon: TrendingUp, accent: '#10b981', bg: 'rgba(16,185,129,0.15)', iconColor: '#059669' },
                    { title: 'Total Bookings', value: isSummaryLoading ? '...' : summary?.totalBookings, change: summary?.bookChange, up: summary?.bookUp, icon: UsersIcon, accent: '#3b82f6', bg: 'rgba(59,130,246,0.15)', iconColor: '#2563eb' },
                    { title: 'Cancellations', value: isSummaryLoading ? '...' : summary?.totalCancellations, change: summary?.cancelChange, up: summary?.cancelUp, icon: XCircle, accent: '#ef4444', bg: 'rgba(239,68,68,0.15)', iconColor: '#dc2626' },
                    { title: 'Total Refunds', value: isSummaryLoading ? '...' : `₹${summary?.totalRefunds?.toLocaleString()}`, change: summary?.refundChange, up: summary?.refundUp, icon: FileText, accent: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', iconColor: '#7c3aed' }
                ].map((stat, i) => (stat &&
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + (i * 0.05) }}
                        className="rounded-[20px] p-5 relative overflow-hidden group hover:shadow-xl transition-all duration-300"
                        style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.35)' }}
                    >
                        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: stat.accent }} />
                        
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">{stat.title}</span>
                            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: stat.bg }}>
                                <stat.icon className="h-[18px] w-[18px]" style={{ color: stat.iconColor }} />
                            </div>
                        </div>
                        
                        <div className="mb-2">
                            <span className="text-[26px] font-bold text-slate-800">{stat.value}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-0.5 ${stat.up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {stat.change}
                            </span>
                            <span className="text-[11px] text-slate-400">vs previous period</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Content Rows */}
            <div className="space-y-4">
                {/* Row 1: Revenue Trend */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-[20px] p-6"
                    style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.35)' }}
                >
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-[14px] font-medium text-slate-800">Revenue Trend</h3>
                            <p className="text-[11px] text-slate-400 uppercase mt-1">Daily revenue peaks and valleys</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-[2px]" style={{ background: accentColor }} />
                                <span className="text-[11px] text-slate-500">Revenue</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-[2px] bg-blue-500" />
                                <span className="text-[11px] text-slate-500">Bookings</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[240px] w-full">
                        <Line data={lineChartData} options={lineChartOptions} />
                    </div>
                </motion.div>

                {/* Row 2: Two Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="rounded-[20px] p-6"
                        style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.35)' }}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-[14px] font-medium text-slate-800">Bookings vs Cancellations</h3>
                                <p className="text-[11px] text-slate-400 uppercase mt-1">Comparison status breakdown</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-[2px] bg-blue-500" />
                                    <span className="text-[11px] text-slate-500">Bookings</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-[2px] bg-red-500" />
                                    <span className="text-[11px] text-slate-500">Cancelled</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[220px] w-full">
                            <Bar data={bookingVsCancelData} options={barChartOptions} />
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="rounded-[20px] p-6"
                        style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.35)' }}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-[14px] font-medium text-slate-800">Revenue by Package</h3>
                                <p className="text-[11px] text-slate-400 uppercase mt-1">Top performing tour packages</p>
                            </div>
                        </div>
                        <div className="h-[220px] w-full">
                            <Bar data={revByPackageData} options={horizontalBarOptions} />
                        </div>
                    </motion.div>
                </div>

                {/* Row 3: Package Performance Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="rounded-[20px] p-6 overflow-hidden"
                    style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.35)' }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-[14px] font-medium text-slate-800">Package Performance</h3>
                            <p className="text-[11px] text-slate-400 uppercase mt-1">Detailed metrics per tour package</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto relative min-h-[300px]">
                        {isPackageLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/10 animate-pulse rounded-[10px]">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                                    <span className="text-[12px] text-slate-400 font-medium">Loading performance data...</span>
                                </div>
                            </div>
                        ) : packagePerformance.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <HelpCircle className="h-8 w-8 opacity-20" />
                                <span className="text-[13px] font-medium">No package data found for this period</span>
                            </div>
                        ) : (
                            <>
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr>
                                            {[
                                                { label: 'Package', key: 'name' },
                                                { label: 'Status', key: 'status' },
                                                { label: 'Views', key: 'views' },
                                                { label: 'Bookings', key: 'bookings' },
                                                { label: 'Revenue', key: 'revenue' },
                                                { label: 'Cancel %', key: 'cancel_pct' },
                                                { label: 'Conversion %', key: 'conversion' },
                                                { label: 'Revenue Bar', key: null }
                                            ].map((col, idx) => (
                                                <th 
                                                    key={idx} 
                                                    onClick={() => col.key && handleSort(col.key)}
                                                    className={`text-[10px] uppercase tracking-[0.06em] text-slate-400 font-bold pb-3 px-2 ${col.key ? 'cursor-pointer hover:text-slate-600 transition-colors' : ''}`}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        {col.label}
                                                        {sortConfig.key === col.key && (
                                                            <ArrowUpDown className={`h-3 w-3 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {packagePerformance.map((pkg: any) => (
                                            <tr 
                                                key={pkg.id} 
                                                className="group hover:bg-white/15 transition-colors border-t border-white/20"
                                            >
                                                <td className="py-3 px-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-bold text-slate-800">{pkg.name}</span>
                                                        <span className="text-[10px] text-slate-400">{pkg.sublabel}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        pkg.status === 'published' 
                                                        ? 'bg-emerald-500/15 text-emerald-700' 
                                                        : 'bg-gray-400/20 text-gray-600'
                                                    }`}>
                                                        {pkg.status === 'published' ? 'Published' : 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-[12px] text-slate-600 font-medium">{pkg.views.toLocaleString()}</td>
                                                <td className="py-3 px-2 text-[12px] text-[#2563eb] font-medium">{pkg.bookings.toLocaleString()}</td>
                                                <td className="py-3 px-2 text-[12px] text-slate-800 font-medium">₹{pkg.revenue.toLocaleString()}</td>
                                                <td className={`py-3 px-2 text-[12px] font-medium ${pkg.cancel_pct > 15 ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {pkg.cancel_pct}%
                                                </td>
                                                <td className={`py-3 px-2 text-[12px] font-medium ${pkg.conversion > 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                    {pkg.conversion}%
                                                </td>
                                                <td className="py-3 px-2">
                                                    <div className="w-[80px] h-[5px] bg-white/25 rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(pkg.revenue / (maxRevenue || 1)) * 100}%` }}
                                                            className="h-full rounded-full"
                                                            style={{ background: accentColor }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Pagination Controls */}
                                <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4">
                                    <div className="text-[12px] text-slate-400">
                                        Showing <span className="font-bold text-slate-600">{((page - 1) * limit) + 1}</span> to <span className="font-bold text-slate-600">{Math.min(page * limit, totalPackages)}</span> of <span className="font-bold text-slate-600">{totalPackages}</span> packages
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={page === 1}
                                            onClick={() => setPage(p => p - 1)}
                                            className="h-8 px-3 text-[12px] bg-white/30 hover:bg-white/50 border border-white/40 rounded-[8px] disabled:opacity-50"
                                        >
                                            Previous
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                // Simple pagination logic for now
                                                let pageNum = i + 1
                                                if (totalPages > 5 && page > 3) {
                                                    pageNum = page - 3 + i + 1
                                                    if (pageNum > totalPages) pageNum = totalPages - (4 - i)
                                                }
                                                if (pageNum <= 0) return null
                                                if (pageNum > totalPages) return null
                                                
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setPage(pageNum)}
                                                        className={`w-8 h-8 rounded-[8px] text-[12px] font-bold transition-all ${
                                                            page === pageNum
                                                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                            : 'bg-white/30 text-slate-600 hover:bg-white/50 border border-white/40'
                                                        }`}
                                                        style={page === pageNum ? { background: accentColor } : {}}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={page === totalPages || totalPages === 0}
                                            onClick={() => setPage(p => p + 1)}
                                            className="h-8 px-3 text-[12px] bg-white/30 hover:bg-white/50 border border-white/40 rounded-[8px] disabled:opacity-50"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
                
                {/* Row 4: Recent Bookings with Refund Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="rounded-[20px] p-6 overflow-hidden mt-8"
                    style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.35)' }}
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-[14px] font-medium text-slate-800">Recent Bookings (Refund Filters)</h3>
                            <p className="text-[11px] text-slate-400 uppercase mt-1">Track booking statuses and refund progress</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                value={bookingListStatus}
                                onChange={(e) => setBookingListStatus(e.target.value)}
                                className="h-9 px-3 text-[12px] bg-white/40 border border-white/40 rounded-[8px] outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                            >
                                <option value="all">All Statuses</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            
                            <select
                                value={bookingListRefundStatus}
                                onChange={(e) => setBookingListRefundStatus(e.target.value)}
                                className="h-9 px-3 text-[12px] bg-white/40 border border-white/40 rounded-[8px] outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                                disabled={bookingListStatus !== 'all' && bookingListStatus !== 'cancelled'}
                            >
                                <option value="all">Refund Filter: All</option>
                                <option value="pending">Refund Pending</option>
                                <option value="succeeded">Refund Completed</option>
                                <option value="failed">Refund Failed</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto relative min-h-[250px]">
                        {isRecentBookingsLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/10 animate-pulse rounded-[10px]">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                                </div>
                            </div>
                        ) : !recentBookings || recentBookings.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <HelpCircle className="h-8 w-8 opacity-20" />
                                <span className="text-[13px] font-medium">No bookings match the selected filters</span>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr>
                                        <th className="text-[10px] uppercase tracking-[0.06em] text-slate-400 font-bold pb-3 px-2">Ref & Package</th>
                                        <th className="text-[10px] uppercase tracking-[0.06em] text-slate-400 font-bold pb-3 px-2">Customer</th>
                                        <th className="text-[10px] uppercase tracking-[0.06em] text-slate-400 font-bold pb-3 px-2">Amount</th>
                                        <th className="text-[10px] uppercase tracking-[0.06em] text-slate-400 font-bold pb-3 px-2">Booking Status</th>
                                        <th className="text-[10px] uppercase tracking-[0.06em] text-slate-400 font-bold pb-3 px-2">Refund Status</th>
                                        <th className="text-[10px] uppercase tracking-[0.06em] text-slate-400 font-bold pb-3 px-2">Refund Amt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentBookings.map((bk: any) => (
                                        <tr key={bk.id} className="group hover:bg-white/15 transition-colors border-t border-white/20">
                                            <td className="py-3 px-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-bold text-slate-800">{bk.booking_reference}</span>
                                                    <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{bk.package?.title}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-medium text-slate-800">{bk.user?.first_name} {bk.user?.last_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-[12px] font-bold text-slate-800">
                                                ₹{bk.total_amount.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    bk.status === 'confirmed' || bk.status === 'completed' ? 'bg-emerald-500/15 text-emerald-700' :
                                                    bk.status === 'cancelled' ? 'bg-red-500/15 text-red-700' :
                                                    'bg-amber-500/15 text-amber-700'
                                                }`}>
                                                    {bk.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2">
                                                {bk.status === 'cancelled' && bk.refund ? (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        bk.refund.status === 'succeeded' ? 'bg-emerald-500/15 text-emerald-700' :
                                                        bk.refund.status === 'failed' ? 'bg-red-500/15 text-red-700' :
                                                        'bg-amber-500/15 text-amber-700'
                                                    }`}>
                                                        {bk.refund.status === 'succeeded' ? 'REFUND SUCCESS' : bk.refund.status.toUpperCase()}
                                                    </span>
                                                ) : bk.status === 'cancelled' ? (
                                                    <span className="text-[10px] text-slate-400 italic">No Refund</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-2 text-[12px] text-slate-600 font-medium">
                                                {bk.refund_amount > 0 ? `₹${bk.refund_amount.toLocaleString()}` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        
                        {/* Pagination Controls for Recent Bookings */}
                        {!isRecentBookingsLoading && recentBookings.length > 0 && (
                            <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4">
                                <div className="text-[12px] text-slate-400">
                                    Showing <span className="font-bold text-slate-600">{((recentBookingsPage - 1) * recentBookingsLimit) + 1}</span> to <span className="font-bold text-slate-600">{Math.min(recentBookingsPage * recentBookingsLimit, totalRecentBookings)}</span> of <span className="font-bold text-slate-600">{totalRecentBookings}</span> bookings
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={recentBookingsPage === 1}
                                        onClick={() => setRecentBookingsPage(p => p - 1)}
                                        className="h-8 px-3 text-[12px] bg-white/30 hover:bg-white/50 border border-white/40 rounded-[8px] disabled:opacity-50"
                                    >
                                        Previous
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalRecentBookingsPages) }, (_, i) => {
                                            let pageNum = i + 1
                                            if (totalRecentBookingsPages > 5 && recentBookingsPage > 3) {
                                                pageNum = recentBookingsPage - 3 + i + 1
                                                if (pageNum > totalRecentBookingsPages) pageNum = totalRecentBookingsPages - (4 - i)
                                            }
                                            if (pageNum <= 0) return null
                                            if (pageNum > totalRecentBookingsPages) return null
                                            
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setRecentBookingsPage(pageNum)}
                                                    className={`w-8 h-8 rounded-[8px] text-[12px] font-bold transition-all ${
                                                        recentBookingsPage === pageNum
                                                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                        : 'bg-white/30 text-slate-600 hover:bg-white/50 border border-white/40'
                                                    }`}
                                                    style={recentBookingsPage === pageNum ? { background: accentColor } : {}}
                                                >
                                                    {pageNum}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={recentBookingsPage === totalRecentBookingsPages || totalRecentBookingsPages === 0}
                                        onClick={() => setRecentBookingsPage(p => p + 1)}
                                        className="h-8 px-3 text-[12px] bg-white/30 hover:bg-white/50 border border-white/40 rounded-[8px] disabled:opacity-50"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
