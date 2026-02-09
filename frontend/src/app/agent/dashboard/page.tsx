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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Bot, Send, User } from 'lucide-react'

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"


import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform, useScroll, useSpring } from 'framer-motion'
import { Home, Zap, Menu } from 'lucide-react'

import { ChevronDown, Sparkles } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"

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

// Mock data for sparklines
const revenueData = [
    { value: 4000 }, { value: 3000 }, { value: 5000 }, { value: 2780 },
    { value: 1890 }, { value: 2390 }, { value: 3490 }, { value: 4200 },
    { value: 6500 }, { value: 5800 }, { value: 7200 }, { value: 10159 }
]

const bookingsData = [
    { value: 10 }, { value: 15 }, { value: 8 }, { value: 12 },
    { value: 20 }, { value: 18 }, { value: 25 }, { value: 22 },
    { value: 30 }, { value: 28 }, { value: 35 }, { value: 42 }
]

const packagesData = [
    { value: 5 }, { value: 8 }, { value: 12 }, { value: 15 },
    { value: 20 }, { value: 18 }, { value: 24 }
]

const totalBookingsData = [
    { value: 100 }, { value: 120 }, { value: 140 }, { value: 130 },
    { value: 160 }, { value: 180 }, { value: 200 }
]

// Animated Counter Component
const CountUp = ({ end, prefix = "", suffix = "", duration = 2000 }: { end: number, prefix?: string, suffix?: string, duration?: number }) => {
    const [count, setCount] = useState(0)

    useEffect(() => {
        let startTime: number | null = null;
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Ease out quart
            const ease = 1 - Math.pow(1 - percentage, 4);

            setCount(Math.floor(ease * end));

            if (percentage < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [end, duration]);

    return <span>{prefix}{count.toLocaleString()}{suffix}</span>
}

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

const TiltCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [5, -5]);
    const rotateY = useTransform(x, [-100, 100], [-5, 5]);

    function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct * width);
        y.set(yPct * height);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={className}
        >
            {children}
        </motion.div>
    );
};



export default function AgentDashboard() {
    const router = useRouter()
    const [agentName, setAgentName] = useState('')
    const [dateFilter, setDateFilter] = useState('ALL')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')
    const [isAIOpen, setIsAIOpen] = useState(false)
    const [chatMessage, setChatMessage] = useState("")

    const handleTourPackageClick = () => {
        router.push('/agent/packages/new')
    }

    const handleCustomerProfileClick = () => {
        router.push('/agent/customers')
    }

    const handleAIItineraryClick = () => {
        setIsAIOpen(true)
    }

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

    // Mobile Optimizations State
    // Parallax & Visual Effects Hooks
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const y2 = useTransform(scrollY, [0, 500], [0, -150]);
    const opacity = useTransform(scrollY, [0, 300], [1, 0]);

    // Spring physics for smoother parallax
    const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
    const springY1 = useSpring(y1, springConfig);
    const springY2 = useSpring(y2, springConfig);

    // Mobile Optimizations State
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [pullStartY, setPullStartY] = useState(0)
    const [pullMoveY, setPullMoveY] = useState(0)
    const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({
        highlights: false,
        quickActions: false
    })

    const toggleSection = (section: string) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY === 0) {
            setPullStartY(e.touches[0].clientY)
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (pullStartY > 0 && window.scrollY === 0) {
            const touchY = e.touches[0].clientY
            const diff = touchY - pullStartY
            if (diff > 0) {
                setPullMoveY(diff > 100 ? 100 : diff) // Cap at 100px
            }
        }
    }

    const handleTouchEnd = () => {
        if (pullMoveY > 60) {
            handleRefresh()
        }
        setPullStartY(0)
        setPullMoveY(0)
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        const token = localStorage.getItem('token')
        if (token) await loadDashboardData(token)
        setIsRefreshing(false)
    }

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

    const statCards = [
        {
            title: "Total Revenue",
            value: `₹${stats.totalRevenue.toLocaleString()}`,
            subtext: "From confirmed bookings",
            icon: RupeeIcon,
            color: "text-green-600",
            bgColor: "bg-green-50",
            gradientFrom: "from-green-500",
            gradientTo: "to-emerald-600",
            bgGradient: "from-green-500/5 to-emerald-500/5",
            shadowColor: "shadow-green-500/20"
        },
        {
            title: "Active Bookings",
            value: stats.activeBookings,
            subtext: `${stats.pendingBookings} Pending confirmation`,
            icon: Users,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            gradientFrom: "from-blue-500",
            gradientTo: "to-indigo-600",
            bgGradient: "from-blue-500/5 to-indigo-500/5",
            shadowColor: "shadow-blue-500/20"
        },
        {
            title: "Packages",
            value: stats.totalPackages,
            subtext: `${stats.publishedPackages} Published, ${stats.draftPackages} Drafts`,
            icon: Package,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            gradientFrom: "from-purple-500",
            gradientTo: "to-violet-600",
            bgGradient: "from-purple-500/5 to-violet-500/5",
            shadowColor: "shadow-purple-500/20"
        },
        {
            title: "Total Bookings",
            value: stats.totalBookings,
            subtext: "Lifetime booking count",
            icon: FileText,
            color: "text-orange-600",
            bgColor: "bg-orange-50",
            gradientFrom: "from-orange-500",
            gradientTo: "to-amber-600",
            bgGradient: "from-orange-500/5 to-amber-500/5",
            shadowColor: "shadow-orange-500/20"
        }
    ]

    return (
        <div
            className="min-h-screen bg-[#F8FAFC] relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Parallax Background Elements */}
            <motion.div style={{ y: springY1, opacity }} className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-blue-200/20 to-emerald-200/20 rounded-full blur-[120px]" />
            </motion.div>

            <motion.div style={{ y: springY2 }} className="fixed top-20 right-20 w-80 h-80 bg-yellow-100/10 rounded-full blur-[80px] pointer-events-none z-0 mix-blend-multiply" />

            {/* Gradient Mesh Overlay */}
            <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-[0.02] pointer-events-none z-0" />

            {/* Pull to Refresh Indicator */}
            <div
                className="fixed top-24 left-0 right-0 z-50 flex justify-center pointer-events-none transition-transform duration-200"
                style={{ transform: `translateY(${pullMoveY}px)` }}
            >
                {pullMoveY > 0 && (
                    <div className="bg-white/80 backdrop-blur-md rounded-full p-3 shadow-xl border border-indigo-100/50 flex items-center justify-center animate-in fade-in zoom-in duration-200">
                        {isRefreshing ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
                        ) : (
                            <TrendingDown className="h-5 w-5 text-indigo-600 transform rotate-180" />
                        )}
                    </div>
                )}
            </div>



            {/* Soft Background Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {[...Array(4)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full opacity-30 blur-3xl mix-blend-screen"
                        style={{
                            backgroundColor: ['#E0E7FF', '#DBEAFE', '#FAE8FF', '#FEF3C7'][i],
                            width: Math.random() * 400 + 300,
                            height: Math.random() * 400 + 300,
                            top: `${Math.random() * 80}%`,
                            left: `${Math.random() * 80}%`,
                        }}
                        animate={{
                            y: [0, Math.random() * 100 - 50, 0],
                            x: [0, Math.random() * 100 - 50, 0],
                            scale: [1, 1.05, 1],
                        }}
                        transition={{
                            duration: Math.random() * 10 + 15,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10">
                {/* Navbar (Agent Specific) */}
                <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm supports-[backdrop-filter]:bg-white/60">
                    <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-3 group">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
                                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 relative group-hover:scale-105 transition-transform duration-300">
                                    <LayoutDashboard className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <h1 className="text-2xl font-jakarta font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">
                                Agent<span className="text-indigo-600">Portal</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Add desktop navigation here if needed, or keep it simple */}
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="container mx-auto px-6 py-8 space-y-10">
                    {/* Welcome Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-300"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-50 animate-pulse"></div>
                                <Avatar className="h-16 w-16 border-2 border-white shadow-lg relative ring-4 ring-indigo-50/50 group-hover:scale-105 transition-transform duration-300">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${agentName}`} alt={agentName} />
                                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl">
                                        {agentName.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 h-5 w-5 bg-emerald-400 border-[3px] border-white rounded-full shadow-md animate-bounce" title="Online" />
                            </div>

                            <div>
                                <h1 className="text-3xl font-jakarta font-bold flex items-center gap-2 tracking-tight">
                                    <span className="text-slate-800">Welcome back,</span>
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#EC4899] animate-gradient-x bg-[length:200%_auto]">
                                        {agentName}
                                    </span>
                                </h1>
                                <div className="flex items-center gap-3 mt-1.5 text-sm font-medium">
                                    <span className="text-slate-500">Here's what's happening today:</span>
                                    <div className="hidden sm:flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-[#F59E0B] border border-orange-100 shadow-sm text-xs font-semibold">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                            </span>
                                            3 new bookings
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-[#10B981] border border-green-100 shadow-sm text-xs font-semibold">
                                            <TrendingUp className="h-3 w-3" />
                                            15% vs last week
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] text-white border-0 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.05] transition-all duration-300 rounded-full px-6">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create New
                                        <ChevronDown className="ml-2 h-3 w-3 opacity-70" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-white/80 backdrop-blur-xl border-white/50 shadow-xl rounded-xl p-2 z-[100]">
                                    <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 py-1.5">Create New</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={handleTourPackageClick}
                                        className="focus:bg-indigo-50 text-slate-700 font-medium rounded-lg cursor-pointer py-2.5"
                                    >
                                        <div className="bg-indigo-100 p-1.5 rounded-md mr-3 text-[#4F46E5] group-hover:bg-[#4F46E5] group-hover:text-white transition-colors">
                                            <Package className="h-4 w-4" />
                                        </div>
                                        Tour Package
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleAIItineraryClick}
                                        className="focus:bg-pink-50 text-slate-700 font-medium rounded-lg cursor-pointer py-2.5"
                                    >
                                        <div className="bg-pink-100 p-1.5 rounded-md mr-3 text-[#EC4899] group-hover:bg-[#EC4899] group-hover:text-white transition-colors">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                        AI Itinerary
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                    <DropdownMenuItem
                                        onClick={handleCustomerProfileClick}
                                        className="focus:bg-emerald-50 text-slate-700 font-medium rounded-lg cursor-pointer py-2.5"
                                    >
                                        <div className="bg-emerald-100 p-1.5 rounded-md mr-3 text-[#10B981] group-hover:bg-[#10B981] group-hover:text-white transition-colors">
                                            <Users className="h-4 w-4" />
                                        </div>
                                        Customer Profile
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Link href="/agent/settings">
                                <Button variant="ghost" className="hover:bg-slate-100/50 text-slate-600 rounded-full h-10 w-10 p-0 border border-slate-200/50 shadow-sm bg-white/50 backdrop-blur-sm">
                                    <Settings className="h-5 w-5" />
                                </Button>
                            </Link>

                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-slate-200 text-slate-600 rounded-full h-10 w-10 p-0 shadow-sm bg-white/50 backdrop-blur-sm"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
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

                {/* Stats Grid */}
                {/* Stats Grid - Mobile Carousel / Desktop Grid */}
                <div className="mb-12">
                    {/* Mobile View */}
                    <div className="md:hidden -mx-6 px-6">
                        <Carousel opts={{ align: "start", loop: true }} className="w-full">
                            <CarouselContent>
                                {statCards.map((card, index) => (
                                    <CarouselItem key={index} className="basis-10/12 pl-4">
                                        <Card className="relative overflow-hidden border-0 bg-white/60 backdrop-blur-xl shadow-sm h-full rounded-2xl">
                                            <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-50`} />
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest font-jakarta">{card.title}</CardTitle>
                                                <div className={`bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} p-2 rounded-xl shadow-md ${card.shadowColor}`}>
                                                    <card.icon className="h-4 w-4 text-white" />
                                                </div>
                                            </CardHeader>
                                            <CardContent className="relative z-10 pt-1">
                                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-jakarta">{card.value}</div>
                                                <p className={`text-xs font-semibold ${card.color} ${card.bgColor} w-fit px-2.5 py-1 rounded-full mt-3 border border-current/10`}>{card.subtext}</p>
                                            </CardContent>
                                        </Card>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {statCards.map((card, index) => (
                            <TiltCard key={index} className="h-full">
                                <Card className="relative overflow-hidden border-0 bg-white/60 backdrop-blur-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group h-full rounded-2xl ring-1 ring-slate-900/5">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest font-jakarta">{card.title}</CardTitle>
                                        <div className={`bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} p-2.5 rounded-xl shadow-lg ${card.shadowColor} group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300`}>
                                            <card.icon className="h-5 w-5 text-white" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="relative z-10 pt-2">
                                        <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight font-jakarta">{card.value}</div>
                                        <p className={`text-xs font-semibold ${card.color} ${card.bgColor} w-fit px-3 py-1 rounded-full mt-3 border border-current/10`}>{card.subtext}</p>
                                    </CardContent>
                                </Card>
                            </TiltCard>
                        ))}
                    </div>
                </div>

                {/* Market Insights Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => toggleSection('highlights')}>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <TrendingUp className="h-5 w-5 text-[#4F46E5]" />
                            Performance Highlights
                        </h2>
                        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${collapsedSections.highlights ? 'rotate-180' : ''}`} />
                    </div>

                    <AnimatePresence>
                        {!collapsedSections.highlights && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Top Performer Card */}
                                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#10B981]/5 to-[#34D399]/10 backdrop-blur-xl shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/10 hover:scale-[1.02] transition-all duration-300 group">
                                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <span className="flex h-3 w-3 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                            </span>
                                        </div>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-950">
                                                <div className="bg-gradient-to-br from-amber-300 to-yellow-500 p-1.5 rounded-full shadow-sm text-white">
                                                    <Trophy className="h-4 w-4" />
                                                </div>
                                                My Top Performer
                                            </CardTitle>
                                            <CardDescription className="text-emerald-700/80 font-medium">Your #1 booked package</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {stats.highlights?.mostPopular ? (
                                                <div className="space-y-4">
                                                    <div className="bg-white/60 p-3 rounded-xl border border-emerald-100 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-lg overflow-hidden border border-emerald-200 shadow-inner">
                                                                🇯🇵
                                                            </div>
                                                            <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{stats.highlights.mostPopular.title}</h3>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-xs font-semibold text-emerald-800">
                                                                <span>Performance</span>
                                                                <span>11 bookings</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 w-[85%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-shimmer relative">
                                                                    <div className="absolute inset-0 bg-white/20 skew-x-[-20deg] animate-[shimmer_2s_infinite]"></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100">
                                                            <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-bold mb-0.5">Revenue</p>
                                                            <p className="text-sm font-extrabold text-emerald-800">₹8,234</p>
                                                        </div>
                                                        <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100">
                                                            <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-bold mb-0.5">Conversion</p>
                                                            <p className="text-sm font-extrabold text-emerald-800">45%</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-emerald-700/60 font-medium bg-emerald-50/30 rounded-xl border border-dashed border-emerald-200">
                                                    No data available
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Lowest Traction Card */}
                                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#3B82F6]/5 to-[#60A5FA]/10 backdrop-blur-xl shadow-lg shadow-blue-500/5 hover:shadow-blue-500/10 hover:scale-[1.02] transition-all duration-300">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-blue-950">
                                                <div className="bg-gradient-to-br from-slate-400 to-slate-600 p-1.5 rounded-full shadow-sm text-white">
                                                    <TrendingDown className="h-4 w-4" />
                                                </div>
                                                Lowest Traction
                                            </CardTitle>
                                            <CardDescription className="text-blue-700/80 font-medium">Needs attention</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {stats.highlights?.leastPopular ? (
                                                <div className="space-y-4">
                                                    <div className="bg-white/60 p-3 rounded-xl border border-blue-100 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 border border-blue-200 shadow-inner">
                                                                📉
                                                            </div>
                                                            <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{stats.highlights.leastPopular.title}</h3>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-xs font-semibold text-blue-800">
                                                                <span>Activity</span>
                                                                <span>Low volume</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 w-[15%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-blue-50/80 p-2.5 rounded-lg border border-blue-100">
                                                            <p className="text-[10px] uppercase tracking-wide text-blue-600 font-bold mb-0.5">Views</p>
                                                            <p className="text-sm font-extrabold text-blue-800">124</p>
                                                        </div>
                                                        <div className="bg-blue-50/80 p-2.5 rounded-lg border border-blue-100">
                                                            <p className="text-[10px] uppercase tracking-wide text-blue-600 font-bold mb-0.5">Sales</p>
                                                            <p className="text-sm font-extrabold text-blue-800">
                                                                {stats.highlights.leastPopular.agent_sales}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-blue-700/60 font-medium bg-blue-50/30 rounded-xl border border-dashed border-blue-200">
                                                    No data available
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Popular Packages List */}
                                    {/* Popular Packages List */}
                                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#8B5CF6]/5 to-[#A78BFA]/10 backdrop-blur-xl shadow-lg shadow-purple-500/5 hover:shadow-purple-500/10 hover:scale-[1.02] transition-all duration-300">
                                        <div className="absolute top-0 right-0 p-4 opacity-30">
                                            <Sparkles className="h-12 w-12 text-purple-200 rotate-12" />
                                        </div>
                                        <CardHeader className="pb-2 relative z-10">
                                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-purple-950">
                                                <div className="bg-gradient-to-br from-purple-400 to-fuchsia-500 p-1.5 rounded-full shadow-sm text-white">
                                                    <Star className="h-4 w-4" />
                                                </div>
                                                Popular Packages
                                            </CardTitle>
                                            <CardDescription className="text-purple-700/80 font-medium">Your top 5 by volume</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-2 relative z-10">
                                            {(stats.packageAnalytics?.mostBooked?.length || 0) > 0 ? (
                                                <ul className="space-y-3">
                                                    {stats.packageAnalytics?.mostBooked.map((pkg: any, index: number) => (
                                                        <li key={index} className="group flex items-center justify-between p-2.5 rounded-xl bg-white/60 border border-purple-100 hover:bg-white hover:shadow-md hover:shadow-purple-500/10 transition-all duration-200 cursor-default">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <span className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                                    index === 1 ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                                                                        index === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                                                            'bg-purple-100 text-purple-700'
                                                                    }`}>
                                                                    {index + 1}
                                                                </span>
                                                                <span className="font-semibold text-slate-700 truncate text-sm group-hover:text-purple-700 transition-colors">
                                                                    {pkg.title}
                                                                </span>
                                                            </div>
                                                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 border border-purple-200 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                                {pkg.bookings} Bookings
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="text-center py-8 text-purple-700/60 font-medium bg-purple-50/30 rounded-xl border border-dashed border-purple-200">
                                                    No data available
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* Quick Actions */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => toggleSection('quickActions')}>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <LayoutDashboard className="h-5 w-5 text-[#4F46E5]" />
                            Quick Actions
                        </h2>
                        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${collapsedSections.quickActions ? 'rotate-180' : ''}`} />
                    </div>

                    <AnimatePresence>
                        {!collapsedSections.quickActions && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* existing cards */}
                                    <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-[rgba(79,70,229,0.03)] backdrop-blur-xl group hover:scale-[1.02] duration-300">
                                        <Link href="/agent/packages">
                                            <CardHeader>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-50 p-3 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                                        <Package className="h-6 w-6 text-[#4F46E5]" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg text-slate-800">Manage Packages</CardTitle>
                                                        <CardDescription>View, edit, or create tours</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <Button className="w-full bg-white text-[#4F46E5] border border-indigo-100 hover:bg-indigo-50 shadow-sm text-sm font-semibold">
                                                    Go to Packages
                                                </Button>
                                            </CardContent>
                                        </Link>
                                    </Card>

                                    <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-[rgba(16,185,129,0.03)] backdrop-blur-xl group hover:scale-[1.02] duration-300">
                                        <Link href="/agent/customers">
                                            <CardHeader>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-emerald-50 p-3 rounded-lg group-hover:bg-emerald-100 transition-colors">
                                                        <Users className="h-6 w-6 text-[#10B981]" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg text-slate-800">Customers</CardTitle>
                                                        <CardDescription>Manage client profiles</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <Button className="w-full bg-white text-[#10B981] border border-emerald-100 hover:bg-emerald-50 shadow-sm text-sm font-semibold">
                                                    View Customers
                                                </Button>
                                            </CardContent>
                                        </Link>
                                    </Card>

                                    <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-[rgba(245,158,11,0.03)] backdrop-blur-xl group hover:scale-[1.02] duration-300">
                                        <CardHeader>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-amber-50 p-3 rounded-lg">
                                                    <FileText className="h-6 w-6 text-[#F59E0B]" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg text-slate-800">My Bookings</CardTitle>
                                                    <CardDescription>Track booking status</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <Button className="w-full bg-white text-[#F59E0B] border border-amber-100 hover:bg-amber-50 shadow-sm text-sm font-semibold" disabled>
                                                View Bookings (Soon)
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-[rgba(236,72,153,0.03)] backdrop-blur-xl group hover:scale-[1.02] duration-300">
                                        <Link href="/agent/subscription">
                                            <CardHeader>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-pink-50 p-3 rounded-lg group-hover:bg-pink-100 transition-colors">
                                                        <Star className="h-6 w-6 text-[#EC4899]" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg text-slate-800">Subscription</CardTitle>
                                                        <CardDescription>Manage plan & billing</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <Button className="w-full bg-white text-[#EC4899] border border-pink-100 hover:bg-pink-50 shadow-sm text-sm font-semibold">
                                                    Manage Plan
                                                </Button>
                                            </CardContent>
                                        </Link>
                                    </Card>

                                    <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-white/60 backdrop-blur-xl group hover:scale-[1.02] duration-300">
                                        <Link href="/agent/settings">
                                            <CardHeader>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-gray-100 p-3 rounded-lg group-hover:bg-gray-200 transition-colors">
                                                        <Settings className="h-6 w-6 text-gray-600" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg text-slate-800">Settings</CardTitle>
                                                        <CardDescription>Configure preferences</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <Button className="w-full bg-white text-gray-700 border border-gray-100 hover:bg-gray-100/80 shadow-sm text-sm font-semibold">
                                                    Configure Settings
                                                </Button>
                                            </CardContent>
                                        </Link>
                                    </Card>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {/* Floating Action Button (Mobile) */}
                <div className="fixed bottom-24 right-4 md:hidden z-50">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" className="h-14 w-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-transform duration-200">
                                <Plus className="h-6 w-6" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="mb-2 w-56">
                            <DropdownMenuItem onClick={handleTourPackageClick} className="py-3">
                                <Package className="mr-3 h-5 w-5 text-indigo-600" />
                                <span>New Package</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCustomerProfileClick} className="py-3">
                                <Users className="mr-3 h-5 w-5 text-emerald-600" />
                                <span>New Customer</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Mobile Bottom Navigation */}
                <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-indigo-50 md:hidden z-50 pb-safe">
                    <div className="flex justify-around items-center h-16">
                        <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-indigo-600 relative">
                            <Home className="h-5 w-5" />
                            <span className="text-[10px] font-medium">Home</span>
                            <span className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full" />
                        </Button>
                        <Link href="/agent/packages">
                            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-slate-500 hover:text-indigo-600 transition-colors">
                                <Package className="h-5 w-5" />
                                <span className="text-[10px] font-medium">Packages</span>
                            </Button>
                        </Link>
                        <Link href="/agent/customers">
                            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-slate-500 hover:text-indigo-600 transition-colors">
                                <Users className="h-5 w-5" />
                                <span className="text-[10px] font-medium">Clients</span>
                            </Button>
                        </Link>
                        <Link href="/agent/settings">
                            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-slate-500 hover:text-indigo-600 transition-colors">
                                <Settings className="h-5 w-5" />
                                <span className="text-[10px] font-medium">Settings</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* AI Assistant Dialog */}
                <Dialog open={isAIOpen} onOpenChange={setIsAIOpen}>
                    <DialogContent className="max-w-2xl bg-white border-0 shadow-2xl rounded-3xl p-0 overflow-hidden">
                        <div className="bg-[linear-gradient(135deg,#4F46E5_0%,#7C3AED_100%)] p-6 text-white flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                                <Bot className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">AI Itinerary Assistant</h3>
                                <p className="text-white/70 text-sm font-medium">Your personal co-pilot for curated travel plans.</p>
                            </div>
                        </div>

                        <div className="h-[450px] flex flex-col bg-slate-50/50">
                            <div className="flex-1 p-6 overflow-y-auto space-y-4">
                                {/* Message Bubble - AI */}
                                <div className="flex items-start gap-3">
                                    <div className="bg-indigo-600 rounded-full p-2 mt-1">
                                        <Bot className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="bg-white border border-slate-100 shadow-sm p-4 rounded-2xl rounded-tl-none max-w-[80%]">
                                        <p className="text-slate-700 leading-relaxed">
                                            Hello! I'm your AI Travel Assistant. I can help you create amazing itineraries for your customers. Where would you like to plan a trip today?
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 bg-white border-t border-slate-100">
                                <div className="relative">
                                    <Input
                                        placeholder="Tell me destination and duration (e.g. 5 days in Paris)..."
                                        className="pr-20 py-6 rounded-2xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                // Handle send logic
                                                setChatMessage("")
                                            }
                                        }}
                                    />
                                    <div className="absolute right-2 top-1.5 flex items-center gap-1">
                                        <Button size="icon" className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md">
                                            <Send className="h-4 w-4 text-white" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Suggestions:</span>
                                    <button className="text-[10px] font-semibold text-indigo-600 hover:underline">7 days in Japan</button>
                                    <button className="text-[10px] font-semibold text-indigo-600 hover:underline">Honeymoon in Maldives</button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
