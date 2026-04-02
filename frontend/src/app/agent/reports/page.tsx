'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
    HelpCircle,
    History as HistoryIcon,
    PieChart,
    Package,
    Search
} from 'lucide-react'
import { debounce } from 'lodash'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, isBefore, startOfToday } from 'date-fns'
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
import dynamic from 'next/dynamic'
const Line = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), { ssr: false, loading: () => <div className="h-[300px] w-full flex items-center justify-center bg-gray-50/50 rounded-xl"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div> })
const Bar = dynamic(() => import('react-chartjs-2').then((mod) => mod.Bar), { ssr: false, loading: () => <div className="h-[300px] w-full flex items-center justify-center bg-gray-50/50 rounded-xl"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div> })
import { cn } from "@/lib/utils"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTheme } from "next-themes"
import { useQuery } from '@tanstack/react-query'
import { agentReportsAPI, bookingsAPI } from '@/lib/api'
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from '@/context/AuthContext'
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from "@/components/ui/popover"
import { PremiumCalendar } from "@/components/ui/premium-calendar"

import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select"
import ReportSection from './components/ReportSection'
import DataTable from './components/DataTable'
import ExportCSVButton from './components/ExportCSVButton'

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
    const router = useRouter()
    const { hasPermission, isSubUser } = useAuth()
    const { theme } = useTheme()

    useEffect(() => {
        if (isSubUser && !hasPermission('reports', 'view')) {
            router.push('/agent/dashboard')
        }
    }, [isSubUser, hasPermission, router])
    const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('month')
    const [customRange, setCustomRange] = useState<{from: Date | undefined, to: Date | undefined}>({ from: undefined, to: undefined })
    const [bookingListStatus, setBookingListStatus] = useState<string>('all')
    const [bookingListRefundStatus, setBookingListRefundStatus] = useState<string>('all')
    const [bookingSearch, setBookingSearch] = useState<string>('')
    const [debouncedSearch, setDebouncedSearch] = useState<string>('')
    const [recentBookingsPage, setRecentBookingsPage] = useState(1)
    const [recentBookingsLimit] = useState(5)
    const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'bookings' | 'financial'>('overview')

    // Permission Guard
    useEffect(() => {
        if (!hasPermission('finance_reports', 'view')) {
            router.push('/agent/dashboard')
        }
    }, [hasPermission, router])

    const { data: summary, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['agentReportSummary', activePeriod, customRange],
        queryFn: () => {
            const fromStr = customRange.from ? format(customRange.from, 'yyyy-MM-dd') : ''
            const toStr = customRange.to ? format(customRange.to, 'yyyy-MM-dd') : ''
            return agentReportsAPI.getSummary({ period: activePeriod, start_date: fromStr, end_date: toStr })
        },
        enabled: !!activePeriod,
    })

    const { data: chartData, isLoading: isChartLoading } = useQuery({
        queryKey: ['agentReportCharts', activePeriod, customRange],
        queryFn: () => {
            const fromStr = customRange.from ? format(customRange.from, 'yyyy-MM-dd') : ''
            const toStr = customRange.to ? format(customRange.to, 'yyyy-MM-dd') : ''
            return agentReportsAPI.getCharts({ period: activePeriod, start_date: fromStr, end_date: toStr })
        },
        enabled: !!activePeriod,
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
        queryFn: () => {
            const fromStr = customRange.from ? format(customRange.from, 'yyyy-MM-dd') : ''
            const toStr = customRange.to ? format(customRange.to, 'yyyy-MM-dd') : ''
            return agentReportsAPI.getPackagePerformance({
                period: activePeriod,
                start_date: fromStr,
                end_date: toStr,
                page,
                limit,
                sort_by: sortConfig.key,
                sort_dir: sortConfig.direction
            })
        },
        enabled: !!activePeriod,
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

    // Debounced search handler
    const debouncedSetSearch = useMemo(
        () => debounce((value: string) => {
            setDebouncedSearch(value)
            setRecentBookingsPage(1)
        }, 500),
        []
    )

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            debouncedSetSearch.cancel()
        }
    }, [debouncedSetSearch])

    useEffect(() => {
        setRecentBookingsPage(1)
    }, [bookingListStatus, bookingListRefundStatus])

    const { data: recentBookingsData, isLoading: isRecentBookingsLoading } = useQuery({
        queryKey: ['agentRecentBookings', activePeriod, customRange, recentBookingsPage, bookingListStatus, bookingListRefundStatus, debouncedSearch],
        queryFn: () => {
            const fromStr = customRange.from ? format(customRange.from, 'yyyy-MM-dd') : ''
            const toStr = customRange.to ? format(customRange.to, 'yyyy-MM-dd') : ''
            return bookingsAPI.getAgentBookings({
                period: activePeriod,
                from_date: fromStr || undefined,
                to_date: toStr || undefined,
                status: bookingListStatus !== 'all' ? bookingListStatus : undefined,
                refund_status: bookingListRefundStatus !== 'all' ? bookingListRefundStatus : undefined,
                booking_reference: debouncedSearch || undefined,
                skip: (recentBookingsPage - 1) * recentBookingsLimit,
                limit: recentBookingsLimit
            })
        },
        enabled: !!activePeriod,
    })

    const { data: financialReports, isLoading: isFinancialLoading } = useQuery({
        queryKey: ['agentFinancialReports', activePeriod, customRange],
        queryFn: () => {
            const fromStr = customRange.from ? format(customRange.from, 'yyyy-MM-dd') : ''
            const toStr = customRange.to ? format(customRange.to, 'yyyy-MM-dd') : ''
            return agentReportsAPI.getFinancialReports({
                period: activePeriod,
                start_date: fromStr,
                end_date: toStr
            })
        },
        enabled: !!activePeriod,
    })

    const recentBookings = recentBookingsData?.items || []
    const totalRecentBookings = recentBookingsData?.total || 0
    const totalRecentBookingsPages = Math.ceil(totalRecentBookings / recentBookingsLimit)

    const accentColor = theme === 'orange' ? '#f97316' : '#2563eb'

    // CSV Data Fetching Functions
    const handleFetchAllPackages = async () => {
        const fromStr = customRange.from ? format(customRange.from, 'yyyy-MM-dd') : ''
        const toStr = customRange.to ? format(customRange.to, 'yyyy-MM-dd') : ''
        const response = await agentReportsAPI.getPackagePerformance({
            period: activePeriod,
            start_date: fromStr,
            end_date: toStr,
            page: 1,
            limit: 1000, // Large enough for all packages
            sort_by: sortConfig.key,
            sort_dir: sortConfig.direction
        })
        return response.items.map((pkg: any) => ({
            "Package Name": pkg.name,
            "Duration": pkg.sublabel.split(' • ')[0],
            "Location": pkg.sublabel.split(' • ')[1],
            "Visibility": pkg.status,
            "Sales": pkg.bookings,
            "Total Revenue": pkg.revenue,
            "Cancel %": pkg.cancel_pct,
            "Conversion %": pkg.conversion
        }))
    }

    const handleFetchAllRecentBookings = async () => {
        const fromStr = customRange.from ? format(customRange.from, 'yyyy-MM-dd') : ''
        const toStr = customRange.to ? format(customRange.to, 'yyyy-MM-dd') : ''
        const response = await bookingsAPI.getAgentBookings({
            period: activePeriod,
            from_date: fromStr || undefined,
            to_date: toStr || undefined,
            status: bookingListStatus !== 'all' ? bookingListStatus : undefined,
            refund_status: bookingListRefundStatus !== 'all' ? bookingListRefundStatus : undefined,
            booking_reference: debouncedSearch || undefined,
            skip: 0,
            limit: 1000 // Large enough for all bookings
        })
        return response.items.map((bk: any) => ({
            "Reference ID": bk.booking_reference,
            "Package Name": bk.package?.title,
            "Customer Name": `${bk.user?.first_name} ${bk.user?.last_name}`,
            "Travel Date": bk.travel_date,
            "Investment": bk.total_amount,
            "Booking Status": bk.status,
            "Refund Status": bk.refund?.status || 'None',
            "Refund Amount": bk.refund_amount || 0,
            "Created Date": format(new Date(bk.created_at), 'yyyy-MM-dd')
        }))
    }

    const financialReportsCSV = useMemo(() => {
        if (!financialReports) return []
        return financialReports.map((f: any) => ({
            "Date": f.date,
            "Total Bookings": f.total_bookings,
            "Gross Revenue": f.gross_revenue,
            "Discounts": f.discounts,
            "Net Revenue": f.net_revenue,
            "Refund Amount": f.refund_amount,
            "Taxes": f.taxes,
            "Final Earnings": f.final_earnings
        }))
    }, [financialReports])

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
                borderColor: '#FF8C5A',
                backgroundColor: 'rgba(255, 140, 90, 0.12)',
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#FF8C5A',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointHoverRadius: 7,
                pointHoverBorderWidth: 3,
            },
            {
                label: 'Bookings',
                data: chartData?.bookings || [],
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139, 92, 246, 0.08)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#8B5CF6',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                yAxisID: 'y2',
            }
        ]
    }), [chartData])

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
                style={{ 
                    background: 'rgba(255, 255, 255, 0.45)', 
                    backdropFilter: 'blur(20px)', 
                    WebkitBackdropFilter: 'blur(20px)', 
                    border: '1px solid rgba(255, 255, 255, 0.4)', 
                    boxShadow: '0 8px 32px rgba(200,80,30,0.12), inset 0 1px 0 rgba(255,255,255,0.9)' 
                }}
            >
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #FF8C5A, #E06830)', boxShadow: '0 4px 12px rgba(224, 104, 48, 0.3)' }}>
                        <BarChart2 className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-[17px] font-bold text-slate-800 tracking-tight">Finance Reports</h1>
                        <p className="text-[12px] text-slate-500 font-medium">Track revenue, bookings and performance</p>
                    </div>
                </div>
            </motion.div>

            {/* Tabs Navigation */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex p-1.5 bg-white/40 backdrop-blur-xl border border-white/40 rounded-[22px] shadow-sm mb-8 overflow-x-auto scrollbar-hide"
            >
                {[
                    { id: 'overview', label: 'Overview & Revenue', icon: BarChart2 },
                    { id: 'packages', label: 'Package Performance', icon: Package },
                    { id: 'financial', label: 'Financial Reports', icon: PieChart },
                    { id: 'bookings', label: 'Recent Bookings', icon: HistoryIcon }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-6 rounded-[18px] text-[13.5px] font-black tracking-tight whitespace-nowrap transition-all duration-500 relative ${
                            activeTab === tab.id 
                            ? 'text-orange-600' 
                            : 'text-slate-700 hover:text-slate-600'
                        }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div 
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white shadow-[0_4px_16px_rgba(224,104,48,0.12)] border border-orange-100/50 rounded-[18px]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <tab.icon className={`h-4.5 w-4.5 relative z-10 transition-colors duration-500 ${activeTab === tab.id ? 'text-orange-500' : 'text-slate-700'}`} />
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </motion.div>

            {/* Filter Bar */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-[20px] p-3 px-5 mb-8 flex items-center gap-4 flex-wrap"
                style={{ 
                    background: 'rgba(255, 255, 255, 0.45)', 
                    backdropFilter: 'blur(20px)', 
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    boxShadow: '0 8px 32px rgba(200,80,30,0.12), inset 0 1px 0 rgba(255,255,255,0.9)'
                }}
            >
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] uppercase tracking-[0.1em] text-slate-700 font-black">Period</span>
                        <div className="flex p-1.5 bg-white/20 backdrop-blur-xl border border-white/50 rounded-2xl shadow-inner relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                            {['today', 'week', 'month', 'all'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setActivePeriod(p as any)}
                                    className={`px-5 py-2 rounded-xl text-[12.5px] font-black transition-all duration-500 relative z-10 ${
                                        activePeriod === p 
                                        ? 'text-white shadow-lg' 
                                        : 'text-slate-500 hover:text-orange-600'
                                    }`}
                                    style={activePeriod === p ? { 
                                        background: 'linear-gradient(135deg, #FF8C5A, #E06830)',
                                        boxShadow: '0 4px 15px rgba(224, 104, 48, 0.4)'
                                    } : {}}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-px h-6 bg-slate-300/30 mx-2" />

                    <div className="flex items-center gap-3">
                        <span className="text-[11px] uppercase tracking-[0.1em] text-slate-700 font-black">Custom Range</span>
                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "min-w-[140px] justify-start text-left font-bold text-[12.5px] bg-white/40 border border-white/60 hover:border-orange-400/50 rounded-xl px-4 py-2 transition-all backdrop-blur-xl shadow-[0_4px_12px_rgba(224,104,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]",
                                            !customRange.from && "text-slate-700"
                                        )}
                                    >
                                        <Calendar className="mr-2 h-4 w-4 text-orange-500" />
                                        {customRange.from ? format(customRange.from, "PPP") : <span>From Date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none" align="start">
                                    <PremiumCalendar
                                        mode="single"
                                        selected={customRange.from}
                                        onSelect={(date) => setCustomRange({ ...customRange, from: date as Date })}
                                        onClear={() => setCustomRange({ ...customRange, from: undefined })}
                                        onToday={() => setCustomRange({ ...customRange, from: new Date() })}
                                        initialFocus
                                        mode_type="completed"
                                    />
                                </PopoverContent>
                            </Popover>

                            <span className="text-[12px] text-slate-700 font-black uppercase tracking-widest">to</span>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={!customRange.from}
                                        className={cn(
                                            "min-w-[140px] justify-start text-left font-bold text-[12.5px] bg-white/40 border border-white/60 hover:border-orange-400/50 rounded-xl px-4 py-2 transition-all backdrop-blur-xl shadow-[0_4px_12px_rgba(224,104,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]",
                                            !customRange.to && "text-slate-700"
                                        )}
                                    >
                                        <Calendar className="mr-2 h-4 w-4 text-orange-500" />
                                        {customRange.to ? format(customRange.to, "PPP") : <span>To Date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none" align="start">
                                    <PremiumCalendar
                                        mode="single"
                                        selected={customRange.to}
                                        onSelect={(date) => setCustomRange({ ...customRange, to: date as Date })}
                                        onClear={() => setCustomRange({ ...customRange, to: undefined })}
                                        onToday={() => setCustomRange({ ...customRange, to: new Date() })}
                                        disabled={(date) => customRange.from ? isBefore(date, customRange.from) : false}
                                        initialFocus
                                        mode_type="completed"
                                    />
                                </PopoverContent>
                            </Popover>

                            <Button 
                                className="h-10 hover:scale-[1.03] active:scale-95 text-white text-[12.5px] font-black px-6 rounded-xl shadow-xl transition-all relative group overflow-hidden" 
                                style={{ background: 'linear-gradient(135deg, #FF8C5A, #E06830)', boxShadow: '0 8px 20px rgba(224, 104, 48, 0.3)' }}
                                onClick={() => setActivePeriod('custom')}
                            >
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="relative z-10">Apply Filter</span>
                            </Button>
                        </div>
                    </div>
                </motion.div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-8"
                    >

            {/* Section 1: Overview Metrics */}
            <ReportSection 
                title="Overview Metrics" 
                description="General performance summary"
                icon={TrendingUp}
            >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { title: 'Total Revenue', value: isSummaryLoading ? '...' : `₹${summary?.totalRevenue?.toLocaleString()}`, change: summary?.revChange, up: summary?.revUp, icon: TrendingUp, accent: '#f97316', bg: 'rgba(249,115,22,0.1)', iconColor: '#f97316' },
                        { title: 'Total Bookings', value: isSummaryLoading ? '...' : summary?.totalBookings, change: summary?.bookChange, up: summary?.bookUp, icon: UsersIcon, accent: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', iconColor: '#8b5cf6' },
                        { title: 'Cancellations', value: isSummaryLoading ? '...' : summary?.totalCancellations, change: summary?.cancelChange, up: summary?.cancelUp, icon: XCircle, accent: '#ef4444', bg: 'rgba(239,68,68,0.1)', iconColor: '#ef4444' },
                        { title: 'Total Refunds', value: isSummaryLoading ? '...' : `₹${summary?.totalRefunds?.toLocaleString()}`, change: summary?.refundChange, up: summary?.refundUp, icon: FileText, accent: '#f59e0b', bg: 'rgba(245,158,11,0.1)', iconColor: '#f59e0b' }
                    ].map((stat, i) => (stat &&
                        <div 
                            key={i}
                            className="rounded-[20px] p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300 border border-slate-100 bg-white/50"
                        >
                            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: stat.accent }} />
                            
                            <div className="flex justify-between items-start mb-5">
                                <div>
                                    <span className="text-[11px] font-black tracking-[0.15em] text-slate-700/80 uppercase block mb-1">{stat.title}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[26px] font-black text-slate-800 tracking-tight leading-none">{stat.value}</span>
                                    </div>
                                </div>
                                <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center shrink-0 border border-white/60 shadow-inner group-hover:scale-110 transition-transform duration-500" style={{ background: stat.bg }}>
                                    <stat.icon className="h-[18px] w-[18px]" style={{ color: stat.iconColor }} />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className={`px-3 py-1.5 rounded-full text-[11px] font-black flex items-center gap-1.5 shadow-sm ${
                                    stat.up ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                }`}>
                                    {stat.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                                    {stat.change}
                                </div>
                                <span className="text-[10px] text-slate-700 font-bold uppercase tracking-widest opacity-60">vs prev. period</span>
                            </div>
                        </div>
                    ))}
                </div>
            </ReportSection>

            {/* Section 2: Revenue Analytics */}
            <ReportSection 
                title="Revenue Analytics" 
                description={activePeriod === 'today' ? 'Hourly Performance' : 
                             activePeriod === 'week' ? 'Past 7 Days Growth' :
                             activePeriod === 'month' ? '30-Day Revenue Outlook' :
                             activePeriod === 'all' ? 'Full Historical Trend' : 'Custom Period Performance'}
                icon={BarChart2}
            >
                <div className="space-y-8">
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-[14px] font-bold text-slate-700">Revenue & Booking Trends</h4>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#FF8C5A]" />
                                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Revenue</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Bookings</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[280px] w-full">
                            <Line data={lineChartData} options={lineChartOptions} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                        <div>
                            <h4 className="text-[14px] font-bold text-slate-700 mb-6">Bookings vs Cancellations</h4>
                            <div className="h-[220px] w-full">
                                <Bar data={bookingVsCancelData} options={barChartOptions} />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[14px] font-bold text-slate-700 mb-6">Revenue by Package</h4>
                            <div className="h-[220px] w-full">
                                <Bar data={revByPackageData} options={horizontalBarOptions} />
                            </div>
                        </div>
                    </div>
                </div>
            </ReportSection>
        </motion.div>
    )}

    {activeTab === 'packages' && (
        <motion.div
            key="packages"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
        >

            {/* Section 3: Package Performance */}
            <ReportSection 
                title="Package Performance" 
                description="Metric aggregation per tour offer"
                icon={Package}
                onExportFetch={handleFetchAllPackages}
                exportFilename="package_performance"
            >
                <DataTable 
                    isLoading={isPackageLoading}
                    data={packagePerformance || []}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    columns={[
                        { header: 'Package Name', sortKey: 'name', accessor: (pkg) => (
                            <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-slate-800">{pkg.name}</span>
                                <span className="text-[10px] text-slate-700 font-medium uppercase tracking-wider">{pkg.sublabel}</span>
                            </div>
                        )},
                        { header: 'Visibility', sortKey: 'status', accessor: (pkg) => (
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                pkg.status === 'published' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600'
                            }`}>
                                {pkg.status}
                            </span>
                        )},
                        { header: 'Sales', accessor: 'bookings', className: 'text-center' },
                        { header: 'Total Revenue', accessor: (pkg) => `₹${pkg.revenue.toLocaleString()}`, sortKey: 'revenue', className: 'text-right font-black' },
                        { header: 'Cancel %', sortKey: 'cancel_pct', accessor: (pkg) => (
                            <div className="flex items-center gap-2">
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-500" style={{ width: `${pkg.cancel_pct}%` }} />
                                </div>
                                <span className="text-[11px] font-bold text-slate-500">{pkg.cancel_pct}%</span>
                            </div>
                        )},
                        { header: 'Conversion %', sortKey: 'conversion', accessor: (pkg) => (
                            <div className="flex items-center gap-2">
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${pkg.conversion}%` }} />
                                </div>
                                <span className="text-[11px] font-bold text-slate-500">{pkg.conversion}%</span>
                            </div>
                        )}
                    ]}
                />
            </ReportSection>
        </motion.div>
    )}

    {activeTab === 'bookings' && (
        <motion.div
            key="bookings"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
        >
            <ReportSection 
                title="Recent Bookings" 
                description="Status tracking & refund monitoring"
                icon={HistoryIcon}
                onExportFetch={handleFetchAllRecentBookings}
                exportFilename="recent_bookings"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Select
                            value={bookingListStatus}
                            onValueChange={setBookingListStatus}
                        >
                            <SelectTrigger className="h-10 px-5 w-[140px] text-[12.5px] font-bold bg-white/50 backdrop-blur-xl border border-white/60 rounded-xl outline-none focus:ring-4 focus:ring-orange-500/10 text-slate-700 shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all hover:bg-white/60">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent className="bg-white/70 backdrop-blur-2xl border border-white/50 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <Select
                            value={bookingListRefundStatus}
                            onValueChange={setBookingListRefundStatus}
                            disabled={bookingListStatus !== 'all' && bookingListStatus !== 'cancelled'}
                        >
                            <SelectTrigger className="h-10 px-5 w-[180px] text-[12.5px] font-bold bg-white/50 backdrop-blur-xl border border-white/60 rounded-xl outline-none focus:ring-4 focus:ring-orange-500/10 text-slate-700 shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all hover:bg-white/60">
                                <SelectValue placeholder="Refund Filter: All" />
                            </SelectTrigger>
                            <SelectContent className="bg-white/70 backdrop-blur-2xl border border-white/50 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                                <SelectItem value="all">Refund Filter: All</SelectItem>
                                <SelectItem value="pending">Refund Pending</SelectItem>
                                <SelectItem value="succeeded">Refund Completed</SelectItem>
                                <SelectItem value="failed">Refund Failed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative w-full md:w-[280px] group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-700 group-focus-within:text-orange-500 transition-colors" />
                        </div>
                        <Input
                            type="text"
                            placeholder="Search Reference #..."
                            value={bookingSearch}
                            onChange={(e) => {
                                setBookingSearch(e.target.value)
                                debouncedSetSearch(e.target.value)
                            }}
                            className="h-10 pl-11 pr-4 w-full text-[12.5px] font-bold bg-white/50 backdrop-blur-xl border border-white/60 rounded-xl outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/30 text-slate-700 shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all hover:bg-white/60 placeholder:text-slate-700 placeholder:font-medium"
                        />
                    </div>
                </div>

                <DataTable 
                    isLoading={isRecentBookingsLoading}
                    data={recentBookings || []}
                    columns={[
                        { header: 'Reference', accessor: (bk) => (
                            <div className="flex flex-col">
                                <span className="text-[12.5px] font-mono font-black text-[#E06830] tracking-tighter">#{bk.booking_reference}</span>
                            </div>
                        )},
                        { header: 'Package Name', accessor: (bk) => (
                            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[200px]">{bk.package?.title || '-'}</span>
                        )},
                        { header: 'Guest Profile', accessor: (bk) => (
                            <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-slate-800">{bk.user?.first_name} {bk.user?.last_name}</span>
                                <span className="text-[10px] text-slate-700">{bk.user?.email}</span>
                            </div>
                        )},
                        { header: 'Booking Date', accessor: (bk) => (
                            <div className="flex flex-col">
                                <span className="text-[12.5px] font-bold text-slate-700">{format(new Date(bk.created_at), 'dd MMM yyyy')}</span>
                                <span className="text-[10px] text-slate-700 font-medium uppercase tracking-tighter">{format(new Date(bk.created_at), 'HH:mm')}</span>
                            </div>
                        )},
                        { header: 'Investment', accessor: (bk) => `₹${bk.total_amount.toLocaleString()}`, className: 'text-right font-black' },
                        { header: 'Booking Status', accessor: (bk) => (
                            <span className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-[0.1em] border shadow-sm ${
                                bk.status === 'confirmed' || bk.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                                bk.status === 'cancelled' ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' :
                                'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            }`}>
                                {bk.status}
                            </span>
                        )},
                        { header: 'Refund Status', accessor: (bk) => (
                            bk.status === 'cancelled' ? (
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                                    bk.refund?.status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-600' :
                                    bk.refund?.status === 'failed' ? 'bg-rose-500/10 text-rose-600' :
                                    'bg-amber-500/10 text-amber-600'
                                }`}>
                                    {bk.refund?.status || 'PENDING'}
                                </span>
                            ) : <span className="text-slate-300">-</span>
                        )},
                        { header: 'Refund Amt', accessor: (bk) => bk.refund_amount > 0 ? `₹${bk.refund_amount.toLocaleString()}` : '-', className: 'text-right' }
                    ]}
                />

                {!isRecentBookingsLoading && recentBookings.length > 0 && (
                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
                        <div className="text-[12px] text-slate-700 font-medium">
                            Showing <span className="font-bold text-slate-800">{((recentBookingsPage - 1) * recentBookingsLimit) + 1}</span> to <span className="font-bold text-slate-800">{Math.min(recentBookingsPage * recentBookingsLimit, totalRecentBookings)}</span> of <span className="font-bold text-slate-800">{totalRecentBookings}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={recentBookingsPage === 1}
                                onClick={() => setRecentBookingsPage(p => p - 1)}
                                className="h-8 rounded-lg text-[12px] font-bold"
                            >
                                Prev
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={recentBookingsPage === totalRecentBookingsPages}
                                onClick={() => setRecentBookingsPage(p => p + 1)}
                                className="h-8 rounded-lg text-[12px] font-bold"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </ReportSection>
        </motion.div>
    )}

    {activeTab === 'financial' && (
        <motion.div
            key="financial"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
        >

            {/* Section 5: Financial Reports */}
            <ReportSection 
                title="Financial Reports" 
                description="Revenue breakdown & tax summary"
                icon={PieChart}
                exportData={financialReportsCSV}
                exportFilename="financial_report"
            >
                <DataTable 
                    isLoading={isFinancialLoading}
                    data={financialReports || []}
                    columns={[
                        { header: 'Date', accessor: 'date', className: 'font-mono' },
                        { header: 'Bookings', accessor: 'total_bookings', className: 'text-center font-bold' },
                        { header: 'Gross Revenue', accessor: (f) => `₹${Math.round(f.gross_revenue).toLocaleString()}`, className: 'text-right text-slate-800' },
                        { header: 'Discounts', accessor: (f) => `₹${f.discounts.toLocaleString()}`, className: 'text-right text-rose-500' },
                        { header: 'Net Revenue', accessor: (f) => `₹${Math.round(f.net_revenue).toLocaleString()}`, className: 'text-right font-bold text-slate-800' },
                        { header: 'Refunds', accessor: (f) => `₹${f.refund_amount.toLocaleString()}`, className: 'text-right text-amber-600' },
                        { header: 'Taxes (GST)', accessor: (f) => `₹${Math.round(f.taxes).toLocaleString()}`, className: 'text-right text-slate-500' },
                        { header: 'Final Earnings', accessor: (f) => `₹${Math.round(f.final_earnings).toLocaleString()}`, className: 'text-right font-black text-emerald-600 text-[14px]' }
                    ]}
                    emptyMessage="No financial data for the selected period"
                />
            </ReportSection>
        </motion.div>
    )}
</AnimatePresence>
        </div>
    )
}
