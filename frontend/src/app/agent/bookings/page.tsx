'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
    Calendar,
    MapPin,
    Users,
    Clock,
    ChevronRight,
    Search,
    Filter,
    ArrowLeft,
    MoreHorizontal,
    Download,
    CreditCard,
    CheckCircle,
    XCircle,
    AlertCircle,
    Mail,
    Phone,
    User,
    Info,
    FileText,
    Share,
    Edit,
    Trash2,
    FileSpreadsheet,
    FileDown,
    Printer,
    Share2,
    ExternalLink,
    ShieldCheck
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter } from "@/components/ui/dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger } from "@/components/ui/popover"
import { PremiumCalendar } from "@/components/ui/premium-calendar"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { bookingsAPI } from '@/lib/api'
import { Booking } from '@/types'

export default function AgentBookingsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState('upcoming')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isFromOpen, setIsFromOpen] = useState(false)
    const [isToOpen, setIsToOpen] = useState(false)
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    const { data: bookingsData, isLoading: loading, refetch: loadBookings } = useQuery({
        queryKey: ['agent-bookings'],
        queryFn: async () => {
            const data = await bookingsAPI.getAgentBookings()
            if (Array.isArray(data)) return data
            if (data.items && Array.isArray(data.items)) return data.items
            if (data.bookings && Array.isArray(data.bookings)) return data.bookings
            return []
        }
    })

    const bookings = bookingsData || []

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
            case 'completed': return 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30'
            case 'pending': return 'bg-amber-500/15 text-amber-600 border-amber-500/30'
            case 'cancelled': return 'bg-red-500/15 text-red-600 border-red-500/30'
            default: return 'bg-slate-500/15 text-slate-600 border-slate-500/30'
        }
    }

    const getPaymentStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'succeeded': return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
            case 'pending': return <Clock className="h-4 w-4 text-amber-500" />
            default: return <AlertCircle className="h-4 w-4 text-slate-400" />
        }
    }

    // Filter Logic
    // Auto-reset dates on tab switch
    useEffect(() => {
        setStartDate('')
        setEndDate('')
    }, [activeTab])

    const filterBookings = (tabType: 'upcoming' | 'completed') => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        return bookings.filter((booking: Booking) => {
            // Search filter
            const matchesSearch = !searchQuery ||
                booking.booking_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.package?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (booking.package?.destination && booking.package.destination.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (booking.travelers && booking.travelers.some((t: any) =>
                    `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
                ));

            if (!matchesSearch) return false

            // Date Range Filter
            const travelDateStr = booking.travel_date
            if (startDate && travelDateStr < startDate) return false
            if (endDate && travelDateStr > endDate) return false

            const travelDate = new Date(booking.travel_date)
            const isValues = tabType === 'upcoming'
                ? (travelDate >= today && booking.status !== 'cancelled' && booking.status !== 'completed')
                : (travelDate < today || booking.status === 'cancelled' || booking.status === 'completed')

            return isValues
        }).sort((a: Booking, b: Booking) => {
            return new Date(b.travel_date).getTime() - new Date(a.travel_date).getTime()
        })
    }

    const filteredBookings = filterBookings(activeTab as 'upcoming' | 'completed')

    // Grouping Logic
    const groupBookingsByDate = (bookingsList: Booking[]) => {
        const groups: { [key: string]: Booking[] } = {}
        bookingsList.forEach(booking => {
            const dateKey = format(new Date(booking.travel_date), 'yyyy-MM-dd')
            if (!groups[dateKey]) groups[dateKey] = []
            groups[dateKey].push(booking)
        })
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
    }

    const groupedBookings = groupBookingsByDate(filteredBookings)

    // Mutations
    const cancelMutation = useMutation({
        mutationFn: (bookingId: string) => bookingsAPI.cancel(bookingId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-bookings'] })
            toast.success('Booking cancelled successfully')
            setIsDetailsOpen(false)
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to cancel booking')
        }
    })

    const handleCancelBooking = (bookingId: string) => {
        if (window.confirm('Are you sure you want to cancel this booking?')) {
            cancelMutation.mutate(bookingId)
        }
    }

    return (
        <div className="min-h-screen pb-20">
            <style jsx global>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .stagger-item {
                    opacity: 0;
                    animation: fadeUp 0.6s ease-out forwards;
                }
                .stagger-item:nth-child(1) { animation-delay: 0.1s; }
                .stagger-item:nth-child(2) { animation-delay: 0.2s; }
                .stagger-item:nth-child(3) { animation-delay: 0.3s; }
                .stagger-item:nth-child(4) { animation-delay: 0.4s; }
                .stagger-item:nth-child(5) { animation-delay: 0.5s; }
            `}</style>
            {/* Header */}
            <div className="container mx-auto px-4 pt-10 pb-6 max-w-5xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/agent/dashboard">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/20 backdrop-blur-md border border-white/30">
                                    <ArrowLeft className="h-5 w-5 text-[#3A1A08]" />
                                </Button>
                            </Link>
                            <nav className="text-xs font-bold text-[#B4501E]/60 uppercase tracking-widest flex items-center gap-2">
                                Agent Portal <ChevronRight className="h-3 w-3" /> Bookings
                            </nav>
                        </div>
                        <h1 className="text-4xl font-bold text-[#2D1A0E]" style={{ fontFamily: "'Playfair Display', serif" }}>
                            My Bookings
                        </h1>

                        {/* Status Strip */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                            <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-sm flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#B4501E]/60">Total:</span>
                                <span className="text-xs font-black text-[#2D1A0E]">{bookings.length}</span>
                            </div>
                            <div className="px-3 py-1.5 rounded-full bg-[var(--primary)]/10 backdrop-blur-md border border-[var(--primary)]/20 shadow-sm flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]/70">Upcoming:</span>
                                <span className="text-xs font-black text-[var(--primary)]">{filterBookings('upcoming').length}</span>
                            </div>
                            <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-sm flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#B4501E]/60">Completed:</span>
                                <span className="text-xs font-black text-[#2D1A0E]">{filterBookings('completed').length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="h-12 px-6 rounded-2xl bg-white/30 backdrop-blur-xl border border-white/50 text-[#3A1A08] font-bold hover:bg-white/40 transition-all flex items-center gap-2 shadow-sm">
                                    <FileDown className="h-5 w-5 opacity-70" />
                                    Export Records
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 glass-popover">
                                <DropdownMenuLabel className="text-[10px] uppercase font-black text-slate-400 px-3 py-2">Choose Format</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem className="cursor-pointer rounded-xl h-11 glass-popover-item">
                                    <FileText className="h-4 w-4 mr-3 text-red-500" />
                                    <span className="font-bold">Export as PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer rounded-xl h-11 glass-popover-item">
                                    <FileSpreadsheet className="h-4 w-4 mr-3 text-green-600" />
                                    <span className="font-bold">Export for Excel</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-10">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--primary)] opacity-60 group-focus-within:opacity-100 transition-opacity" />
                        <Input
                            placeholder="Search booking reference, destination, or traveler names..."
                            className="w-full h-[52px] pl-14 pr-6 rounded-full bg-white/25 backdrop-blur-[16px] border-white/40 text-[#2D1A0E] font-semibold placeholder:text-[#B4501E]/40 focus:bg-white/35 focus:border-[var(--primary)]/50 transition-all shadow-sm"
                            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={(e) => {
                                e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-glow)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)';
                            }}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="h-[52px] px-6 rounded-full bg-white/25 backdrop-blur-[16px] border border-white/40 flex items-center gap-4 group shadow-sm transition-all hover:bg-white/30">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-[var(--primary)] opacity-60" />

                                <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
                                    <PopoverTrigger asChild>
                                        <button className="flex flex-col items-start hover:opacity-80 transition-opacity" onClick={() => setIsFromOpen(true)}>
                                            <span className="text-[9px] uppercase font-black text-[#B4501E]/50 leading-none mb-0.5">From</span>
                                            <span className="text-xs font-bold text-[#2D1A0E]">
                                                {startDate ? format(new Date(startDate), 'dd MMM yyyy') : 'Pick Date'}
                                            </span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-0 bg-transparent shadow-none" align="start">
                                        <PremiumCalendar
                                            mode="single"
                                            mode_type={activeTab as "upcoming" | "completed"}
                                            selected={startDate ? new Date(startDate) : undefined}
                                            onSelect={(date) => {
                                                setStartDate(date ? format(date, 'yyyy-MM-dd') : '')
                                                setIsFromOpen(false)
                                            }}
                                            onClear={() => {
                                                setStartDate('')
                                                setIsFromOpen(false)
                                            }}
                                            onToday={() => {
                                                setStartDate(format(new Date(), 'yyyy-MM-dd'))
                                                setIsFromOpen(false)
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="h-6 w-px bg-[var(--primary)]/20" />

                            <Popover open={isToOpen} onOpenChange={setIsToOpen}>
                                <PopoverTrigger asChild>
                                    <button className="flex flex-col items-start hover:opacity-80 transition-opacity" onClick={() => setIsToOpen(true)}>
                                        <span className="text-[9px] uppercase font-black text-[#B4501E]/50 leading-none mb-0.5">To</span>
                                        <span className="text-xs font-bold text-[#2D1A0E]">
                                            {endDate ? format(new Date(endDate), 'dd MMM yyyy') : 'Pick Date'}
                                        </span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-0 bg-transparent shadow-none" align="start">
                                    <PremiumCalendar
                                        mode="single"
                                        mode_type={activeTab as "upcoming" | "completed"}
                                        selected={endDate ? new Date(endDate) : undefined}
                                        onSelect={(date) => {
                                            setEndDate(date ? format(date, 'yyyy-MM-dd') : '')
                                            setIsToOpen(false)
                                        }}
                                        onClear={() => {
                                            setEndDate('')
                                            setIsToOpen(false)
                                        }}
                                        onToday={() => {
                                            setEndDate(format(new Date(), 'yyyy-MM-dd'))
                                            setIsToOpen(false)
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            {(startDate || endDate) && (
                                <button
                                    onClick={() => { setStartDate(''); setEndDate(''); }}
                                    className="ml-2 text-[#B4501E]/40 hover:text-[var(--primary)] transition-colors"
                                    title="Clear All Dates"
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <Button
                            className="h-[52px] px-8 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white font-black rounded-full shadow-lg shadow-[var(--primary-glow)] hover:shadow-[var(--primary-glow)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 shrink-0"
                            onClick={() => loadBookings()}
                        >
                            <Filter className="h-4 w-4" />
                            Apply Filters
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="space-y-10">
                    <div className="flex justify-center stagger-item">
                        <TabsList className="h-[52px] bg-white/15 backdrop-blur-xl p-1.5 rounded-full border border-white/30 shadow-sm inline-flex relative overflow-hidden">
                            <TabsTrigger
                                value="upcoming"
                                className="relative z-10 px-10 rounded-full h-full text-sm font-bold text-[#B4501E]/60 data-[state=active]:text-white transition-all duration-300 data-[state=active]:bg-[var(--primary)] data-[state=active]:shadow-[0_4px_12px_var(--primary-glow)]"
                            >
                                Upcoming Trips
                            </TabsTrigger>
                            <TabsTrigger
                                value="completed"
                                className="relative z-10 px-10 rounded-full h-full text-sm font-bold text-[#B4501E]/60 data-[state=active]:text-white transition-all duration-300 data-[state=active]:bg-[var(--primary)] data-[state=active]:shadow-[0_4px_12px_var(--primary-glow)]"
                            >
                                Past Travels
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="upcoming" className="mt-0">
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out fill-mode-both">
                            {loading ? <LoadingSkeleton /> : (
                                groupedBookings.length > 0 ? (
                                    <div className="space-y-12">
                                        {groupedBookings.map(([date, bookingsInGroup]) => (
                                            <div key={date} className="space-y-8 stagger-item">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
                                                    <div className="bg-white/25 backdrop-blur-xl px-6 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-3">
                                                        <Calendar className="h-4 w-4 text-[var(--primary)]" />
                                                        <span className="text-sm font-black text-[#2D1A0E]">
                                                            {format(new Date(date), 'EEEE, dd MMM yyyy')}
                                                        </span>
                                                    </div>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
                                                </div>
                                                <div className="grid gap-6">
                                                    {bookingsInGroup.map(booking => (
                                                        <BookingCard key={booking.id} booking={booking} />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        searchQuery={searchQuery}
                                        activeTab={activeTab}
                                        setSearchQuery={setSearchQuery}
                                        setStartDate={setStartDate}
                                        setEndDate={setEndDate}
                                        router={router}
                                    />
                                )
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="completed" className="mt-0">
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out fill-mode-both">
                            {loading ? <LoadingSkeleton /> : (
                                groupedBookings.length > 0 ? (
                                    <div className="space-y-12">
                                        {groupedBookings.map(([date, bookingsInGroup]) => (
                                            <div key={date} className="space-y-8 stagger-item">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
                                                    <div className="bg-white/25 backdrop-blur-xl px-6 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-3">
                                                        <Calendar className="h-4 w-4 text-[var(--primary)]" />
                                                        <span className="text-sm font-black text-[#2D1A0E]">
                                                            {format(new Date(date), 'EEEE, dd MMM yyyy')}
                                                        </span>
                                                    </div>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
                                                </div>
                                                <div className="grid gap-6">
                                                    {bookingsInGroup.map(booking => (
                                                        <BookingCard key={booking.id} booking={booking} />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        searchQuery={searchQuery}
                                        activeTab={activeTab}
                                        setSearchQuery={setSearchQuery}
                                        setStartDate={setStartDate}
                                        setEndDate={setEndDate}
                                        router={router}
                                    />
                                )
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Booking Details Modal */}
            <BookingDetailsModal
                booking={selectedBooking}
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
            />
        </div>
    )

    function BookingCard({ booking }: { booking: Booking }) {
        const travelerCount = booking.number_of_travelers ||
            (booking.travelers ? booking.travelers.length : 0);

        const primaryTraveler = booking.travelers?.find(t => t.is_primary) || booking.travelers?.[0];
        const travelerName = primaryTraveler ? `${primaryTraveler.first_name} ${primaryTraveler.last_name}` : 'Guest';

        return (
            <Card className="relative overflow-hidden transition-all duration-500 hover:-translate-y-1 group border-white/40 shadow-[0_16px_48px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_var(--primary-glow)]"
                style={{
                    background: 'rgba(255, 255, 255, 0.18)',
                    backdropFilter: 'blur(24px)',
                    borderRadius: '24px'
                }}>
                <div className="flex flex-col md:flex-row min-h-[180px]">
                    {/* Left: Enhanced Thumbnail */}
                    <div className="w-full md:w-64 relative shrink-0 overflow-hidden">
                        {booking.package?.images?.[0]?.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={booking.package.images[0].image_url}
                                alt={booking.package?.title}
                                className="w-full h-48 md:h-full object-cover group-hover:scale-110 transition-transform duration-700 group-hover:brightness-110"
                            />
                        ) : (
                            <div className="w-full h-48 md:h-full flex flex-col items-center justify-center bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary-light)]/10 text-[var(--primary)]/40">
                                <MapPin className="h-10 w-10 mb-2 opacity-40 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Location Preview</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#2D1A0E]/20 to-transparent pointer-events-none" />
                        <div className="absolute top-4 left-4">
                            <Badge className="bg-[#2D1A0E]/80 backdrop-blur-md text-white border-0 font-mono text-[9px] px-3 py-1 uppercase tracking-[0.2em] rounded-md shadow-lg">
                                REF: {booking.booking_reference}
                            </Badge>
                        </div>
                    </div>

                    {/* Right: Content Architecture */}
                    <div className="flex-1 p-8 flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-bold text-[#2D1A0E] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                                        {booking.package?.title || 'Bespoke Tour Experience'}
                                    </h3>
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(booking.status)} backdrop-blur-md shadow-sm ring-4 ring-white/10`}>
                                        <div className={`h-1.5 w-1.5 rounded-full ${booking.status === 'confirmed' ? 'bg-emerald-500 animate-pulse' : 'bg-current opacity-40'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{booking.status}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="px-3 py-1.5 rounded-full bg-white/30 backdrop-blur-md border border-white/40 flex items-center gap-2 text-[#2D1A0E]/70 shadow-sm">
                                        <MapPin className="h-3.5 w-3.5 text-[var(--primary)]" />
                                        <span className="text-[11px] font-bold">{booking.package?.destination || 'Global Discovery'}</span>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-full bg-white/30 backdrop-blur-md border border-white/40 flex items-center gap-2 text-[#2D1A0E]/70 shadow-sm">
                                        <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
                                        <span className="text-[11px] font-bold">{booking.package?.duration_days}D / {booking.package?.duration_nights || (booking.package?.duration_days ?? 0) - 1}N</span>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-full bg-white/30 backdrop-blur-md border border-white/40 flex items-center gap-2 text-[#2D1A0E]/70 shadow-sm">
                                        <Users className="h-3.5 w-3.5 text-[var(--primary)]" />
                                        <span className="text-[11px] font-bold">{travelerCount} Guest{travelerCount > 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-start">
                                <Button variant="ghost" size="icon" className="h-[42px] w-[42px] rounded-full bg-white/20 border border-white/40 text-[#2D1A0E] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] hover:border-[var(--primary)]/30 backdrop-blur-md transition-all">
                                    <Share2 className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-[42px] w-[42px] rounded-full bg-white/20 border border-white/40 text-[#2D1A0E] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] hover:border-[var(--primary)]/30 backdrop-blur-md transition-all">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52 p-2 glass-popover">
                                        <DropdownMenuItem onClick={() => { setSelectedBooking(booking); setIsDetailsOpen(true); }} className="cursor-pointer rounded-xl h-11 glass-popover-item">
                                            <Info className="h-4 w-4 mr-3" /> <span className="font-bold">View Full Details</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="cursor-pointer rounded-xl h-11 glass-popover-item">
                                            <Share className="h-4 w-4 mr-3" /> <span className="font-bold">Share Itinerary</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-white/10" />
                                        <DropdownMenuItem className="cursor-pointer rounded-xl h-11 text-red-600 focus:text-red-400 glass-popover-item">
                                            <Trash2 className="h-4 w-4 mr-3" /> <span className="font-bold">Request Cancellation</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        <div className="h-px w-full bg-white/40 mb-6" />

                        <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Avatar className="h-11 w-11 border-2 border-white shadow-md ring-1 ring-white/40">
                                        <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] text-white font-black text-xs">
                                            {travelerName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-[#2D1A0E] leading-none mb-1.5">{travelerName}</p>
                                    <div className="px-2 py-0.5 rounded-full bg-[#B4501E]/10 border border-[#B4501E]/10 inline-block">
                                        <p className="text-[10px] font-black text-[#B4501E]/60 uppercase tracking-tighter">
                                            +{travelerCount - 1} Accompaniment
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#B4501E]/50 mb-1">Total Payment</p>
                                    <p className="text-2xl font-black text-[var(--primary)]">₹{booking.total_amount.toLocaleString()}</p>
                                </div>
                                <Button
                                    className="h-12 px-8 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white font-black rounded-full shadow-lg shadow-[var(--primary-glow)] hover:shadow-[var(--primary-glow)] transition-all flex items-center gap-3"
                                    onClick={() => { setSelectedBooking(booking); setIsDetailsOpen(true); }}
                                >
                                    Details <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        )
    }

    function BookingDetailsModal({ booking, isOpen, onClose }: { booking: Booking | null, isOpen: boolean, onClose: () => void }) {
        if (!booking) return null;

        const travelerCount = booking.number_of_travelers || (booking.travelers ? booking.travelers.length : 0);

        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent
                    className="w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-white/40 shadow-2xl rounded-3xl bg-white/20 backdrop-blur-3xl animate-in zoom-in-95 duration-300"
                    hideClose
                >
                    {/* Header Section: Reduced height, more purposeful actions */}
                    <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] px-8 py-8 text-white relative shrink-0">
                        <div className="absolute top-6 right-6">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-10 w-10 rounded-full bg-white/20 border border-white/40 text-white hover:bg-white/30 backdrop-blur-md transition-all"
                            >
                                <XCircle className="h-6 w-6" />
                            </Button>
                        </div>

                        <div className="relative z-10 flex flex-col gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-white/80 uppercase tracking-widest text-[10px] font-black">
                                    <span>Reference ID</span>
                                    <span>•</span>
                                    <span className="font-mono bg-white/20 px-2 py-0.5 rounded tracking-tighter">{booking.booking_reference}</span>
                                </div>
                                <h2 className="text-3xl font-bold mb-4 leading-tight flex items-center gap-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                                    {booking.package?.title || 'Tour Experience'}
                                    <Badge className={`${booking.status === 'confirmed' ? 'bg-emerald-500 border-emerald-400' : 'bg-amber-500 border-amber-400'
                                        } text-white border shadow-lg px-4 py-1.5 font-black text-[10px] uppercase tracking-widest rounded-full ring-4 ring-white/10`}>
                                        {booking.status}
                                    </Badge>
                                </h2>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full border border-white/30 backdrop-blur-md">
                                        <Calendar className="h-3.5 w-3.5 opacity-80" />
                                        {format(new Date(booking.travel_date), 'dd MMM yyyy')}
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full border border-white/30 backdrop-blur-md">
                                        <Users className="h-3.5 w-3.5 opacity-80" />
                                        {travelerCount} Registered Guests
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full border border-white/30 backdrop-blur-md">
                                        <Clock className="h-3.5 w-3.5 opacity-80" />
                                        {booking.package?.duration_days} Days / {booking.package?.duration_nights || (booking.package?.duration_days ?? 0) - 1} Nights
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white/5">
                        <div className="p-8 space-y-10 pb-16">

                            {/* Main Info Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Booking Contact Card */}
                                <section className="bg-white/40 backdrop-blur-xl rounded-[32px] p-8 border border-white/50 shadow-sm flex flex-col h-full">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="bg-[var(--primary)]/10 p-3 rounded-2xl">
                                            <User className="h-6 w-6 text-[var(--primary)]" />
                                        </div>
                                        <h3 className="text-xl font-bold text-[#2D1A0E]" style={{ fontFamily: "'Playfair Display', serif" }}>Booking Contact</h3>
                                    </div>
                                    <div className="space-y-6 flex-1">
                                        <div className="flex items-center gap-5 p-6 bg-white/40 rounded-3xl border border-white/60">
                                            <Avatar className="h-12 w-12 border-2 border-white shadow-md ring-1 ring-white/40">
                                                <AvatarFallback className="bg-[var(--primary)] text-white font-black text-sm">
                                                    {booking.user?.first_name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-[#B4501E]/50 uppercase tracking-[0.2em] mb-1">Contact Name</p>
                                                <p className="font-bold text-[#2D1A0E] text-lg truncate">{booking.user?.first_name} {booking.user?.last_name}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <a href={`mailto:${booking.user?.email}`} className="flex items-start gap-4 p-5 bg-white/40 rounded-2xl border border-white/60 hover:border-[var(--primary)]/40 transition-all group overflow-hidden">
                                                <div className="bg-white/60 p-2.5 rounded-xl group-hover:bg-[var(--primary)]/10">
                                                    <Mail className="h-4 w-4 text-[var(--primary)]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-[#B4501E]/50 uppercase tracking-[0.2em] mb-0.5">Email Address</p>
                                                    <span className="truncate text-sm font-bold text-[#2D1A0E] block">{booking.user?.email}</span>
                                                </div>
                                            </a>
                                            <a href={`tel:${booking.user?.phone}`} className="flex items-start gap-4 p-5 bg-white/40 rounded-2xl border border-white/60 hover:border-[var(--primary)]/40 transition-all group overflow-hidden">
                                                <div className="bg-white/60 p-2.5 rounded-xl group-hover:bg-[var(--primary)]/10">
                                                    <Phone className="h-4 w-4 text-[var(--primary)]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-[#B4501E]/50 uppercase tracking-[0.2em] mb-0.5">Phone Number</p>
                                                    <span className="truncate text-sm font-bold text-[#2D1A0E] block">{booking.user?.phone || 'Not provided'}</span>
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                </section>

                                {/* Tour Logistics Card */}
                                <section className="bg-white/40 backdrop-blur-xl rounded-[32px] p-8 border border-white/50 shadow-sm flex flex-col h-full">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="bg-[var(--primary)]/10 p-3 rounded-2xl">
                                            <MapPin className="h-6 w-6 text-[var(--primary)]" />
                                        </div>
                                        <h3 className="text-xl font-bold text-[#2D1A0E]" style={{ fontFamily: "'Playfair Display', serif" }}>Tour Logistics</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 flex-1">
                                        <div className="p-5 bg-white/40 rounded-2xl border border-white/60">
                                            <p className="text-[9px] font-black text-[#B4501E]/50 uppercase tracking-[0.2em] mb-2 leading-none">Meeting Point</p>
                                            <p className="font-bold text-[#2D1A0E] text-sm">{booking.package?.destination || 'Primary Hub'}</p>
                                        </div>
                                        <div className="p-5 bg-white/40 rounded-2xl border border-white/60">
                                            <p className="text-[9px] font-black text-[#B4501E]/50 uppercase tracking-[0.2em] mb-2 leading-none">Check-in Time</p>
                                            <p className="font-bold text-[#2D1A0E] text-sm">09:00 AM</p>
                                        </div>
                                        <div className="p-5 bg-white/40 rounded-2xl border border-white/60 flex flex-col justify-between">
                                            <p className="text-[9px] font-black text-[#B4501E]/50 uppercase tracking-[0.2em] leading-none mb-2">Category</p>
                                            <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 font-black uppercase py-0.5 px-3 text-[9px] rounded-full w-fit">
                                                {booking.package?.category || 'Standard'}
                                            </Badge>
                                        </div>
                                        <div className="p-5 bg-white/40 rounded-2xl border border-white/60">
                                            <p className="text-[9px] font-black text-[#B4501E]/50 uppercase tracking-[0.2em] mb-2 leading-none">Duration</p>
                                            <p className="font-bold text-[#2D1A0E] text-sm">{booking.package?.duration_days}D / {booking.package?.duration_nights || (booking.package?.duration_days ?? 0) - 1}N</p>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Travelers List */}
                            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm ring-1 ring-slate-900/5">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[var(--primary)]/10 p-2.5 rounded-xl">
                                            <Users className="h-5 w-5 text-[var(--primary)]" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Traveler Details</h3>
                                    </div>
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 font-black px-4 py-1 rounded-full uppercase text-[10px] tracking-widest">
                                        {booking.travelers?.length || 0} Registered
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {booking.travelers?.map((traveler, index) => (
                                        <div className="group bg-white/5 rounded-2xl p-5 border border-slate-100 hover:border-[var(--primary)]/20 hover:bg-white hover:shadow-xl hover:shadow-[var(--primary-glow)] transition-all duration-500">
                                            <div className="flex items-start gap-4">
                                                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-400 shrink-0 border border-slate-100 group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                                                    {String(index + 1).padStart(2, '0')}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-black text-slate-900 truncate tracking-tight">{traveler.first_name} {traveler.last_name}</p>
                                                        {traveler.is_primary && <Badge className="bg-[var(--primary)] text-[8px] py-0 px-1.5 h-4 uppercase font-black">Primary</Badge>}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 uppercase text-[9px] font-black tracking-widest">
                                                        <div>
                                                            <p className="text-slate-400 mb-0.5">Gender</p>
                                                            <p className="text-slate-700">{traveler.gender}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 mb-0.5">Nationality</p>
                                                            <p className="text-slate-700 truncate">{traveler.nationality}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 mb-0.5">Date of Birth</p>
                                                            <p className="text-slate-700">{format(new Date(traveler.date_of_birth), 'dd MMM yyyy')}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 mb-0.5">Passport / ID</p>
                                                            <p className="text-slate-700 font-mono text-[10px]">{traveler.passport_number || 'NOT PROVIDED'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Tour Features & Cancellation Policy */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="bg-emerald-50 p-2.5 rounded-xl">
                                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900">What's Included</h3>
                                    </div>
                                    <div className="space-y-2.5">
                                        {(booking.package?.included_items || ['Expert Professional Guide', 'Premium Accommodation (4*)', 'All Local Transportation', 'Entrance Fees to Major Sights', 'Buffet Breakfast & Welcome Dinner']).map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2.5">
                                                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                                <span className="text-sm font-bold text-slate-600 leading-tight">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="bg-red-50 p-2.5 rounded-xl">
                                            <AlertCircle className="h-5 w-5 text-red-600" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900">Cancellation Policy</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-2.5 bg-transparent p-3 rounded-2xl border border-slate-100">
                                            <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-black text-slate-900 mb-0.5 uppercase tracking-tighter">Full Refund</p>
                                                <p className="text-[11px] font-bold text-slate-500 leading-normal">Cancellations made 15+ days before travel date. Processing fee applies.</p>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-2.5 bg-transparent p-3 rounded-2xl border border-slate-100">
                                            <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-black text-slate-900 mb-0.5 uppercase tracking-tighter">Partial Refund (50%)</p>
                                                <p className="text-[11px] font-bold text-slate-500 leading-normal">Cancellations made between 7-14 days before travel date.</p>
                                            </div>
                                        </li>
                                    </ul>
                                </section>
                            </div>

                            {/* Location & Secondary Contact Data (Redesigned Special Requests) */}
                            {booking.special_requests && (
                                <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm ring-1 ring-slate-900/5">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-indigo-50 p-3 rounded-2xl">
                                            <Info className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-black text-slate-900 mb-6">Additional Info & Location Data</h3>
                                            <div className="text-sm text-slate-600 leading-relaxed font-bold">
                                                {(() => {
                                                    try {
                                                        const parsed = JSON.parse(booking.special_requests);
                                                        if (typeof parsed !== 'object' || parsed === null) return <p className="italic text-slate-400">"{booking.special_requests}"</p>;

                                                        return (
                                                            <div className="space-y-8">
                                                                {parsed.contact_info && (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-transparent p-6 rounded-3xl border border-slate-100 shadow-inner">
                                                                        <div className="col-span-full mb-2">
                                                                            <p className="text-[10px] uppercase font-black text-indigo-600 tracking-widest flex items-center gap-2">
                                                                                <MapPin className="h-3 w-3" /> Address & Location Data
                                                                            </p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Street / Landmark</p>
                                                                            <p className="text-slate-900">{parsed.contact_info.address || 'Not specified'}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">City/State</p>
                                                                            <p className="text-slate-900">{parsed.contact_info.city}{parsed.contact_info.state ? `, ${parsed.contact_info.state}` : ''}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Country/Pincode</p>
                                                                            <p className="text-slate-900">{parsed.contact_info.country || 'Not specified'} · {parsed.contact_info.pincode || 'N/A'}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Backup Contact</p>
                                                                            <p className="text-slate-900">
                                                                                {parsed.contact_info.phone ? (
                                                                                    <a href={`tel:${parsed.contact_info.phone}`} className="hover:text-indigo-600 underline underline-offset-4 decoration-slate-200">
                                                                                        {parsed.contact_info.phone}
                                                                                    </a>
                                                                                ) : 'Not provided'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {parsed.flight_details && Object.keys(parsed.flight_details).length > 0 && (
                                                                    <div className="bg-slate-900 text-slate-50 p-6 rounded-3xl border border-slate-800 shadow-2xl">
                                                                        <p className="text-[10px] uppercase font-black text-indigo-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                                                                            <ShieldCheck className="h-4 w-4" /> Flight Itinerary Data
                                                                        </p>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
                                                                            {Object.entries(parsed.flight_details).map(([key, value]) => (
                                                                                <div key={key} className="space-y-0.5">
                                                                                    <p className="text-[9px] uppercase font-bold text-slate-500">{key.replace(/_/g, ' ')}</p>
                                                                                    <p className="font-mono text-xs">{String(value)}</p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {parsed.requests && (
                                                                    <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50 relative overflow-hidden group">
                                                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                                                            <Info className="h-12 w-12" />
                                                                        </div>
                                                                        <p className="text-[11px] uppercase font-black text-indigo-700 tracking-widest mb-3">Special Requests Notes</p>
                                                                        <p className="text-slate-700 leading-relaxed italic text-base">"{parsed.requests}"</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    } catch (e) {
                                                        return <p className="italic bg-transparent p-6 rounded-3xl border border-slate-100">"{booking.special_requests}"</p>;
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Payment Breakdown Overhaul */}
                            <section className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                                <div className="absolute top-0 right-0 p-10 opacity-5">
                                    <CreditCard className="h-32 w-32" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-10">
                                        <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                                            <CreditCard className="h-6 w-6 text-indigo-400" />
                                        </div>
                                        <h3 className="text-2xl font-black tracking-tight">Payment Settlement</h3>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        <div className="lg:col-span-12">
                                            <div className="space-y-5">
                                                <div className="flex justify-between items-center text-slate-400 text-xs font-black uppercase tracking-widest">
                                                    <span>Description</span>
                                                    <span>Amount</span>
                                                </div>
                                                <div className="h-px bg-white/10" />
                                                <div className="flex justify-between items-center font-bold">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                                        <span className="text-sm text-slate-300">Base Price (Per Person x {travelerCount})</span>
                                                    </div>
                                                    <span className="text-slate-100 font-mono">₹{((booking.total_amount / 1.18) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between items-center font-bold">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                                        <span className="text-sm text-slate-300">Taxes & Service Fees (18%)</span>
                                                    </div>
                                                    <span className="text-slate-100 font-mono">₹{(booking.total_amount - (booking.total_amount / 1.18) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between items-center font-bold text-emerald-400">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                        <span className="text-sm">Agent Discounts Applied</span>
                                                    </div>
                                                    <span className="font-mono">-₹0.00</span>
                                                </div>

                                                <div className="pt-6 mt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6">
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Status</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                                                <span className="text-sm font-black uppercase text-emerald-400 tracking-tighter">{booking.payment_status || 'Paid'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Method</p>
                                                            <p className="text-sm font-black uppercase text-slate-300 tracking-tighter">Razorpay Virtual Account</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 leading-none">Final Amount Paid</p>
                                                        <p className="text-5xl font-black text-white tracking-tighter">₹{booking.total_amount.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <DialogFooter className="p-6 sm:p-8 bg-white border-t border-slate-200 shrink-0 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="w-full sm:w-auto px-10 h-12 font-black border-slate-200 text-slate-500 rounded-2xl hover:bg-transparent hover:text-slate-900 transition-all uppercase text-[11px] tracking-widest"
                            >
                                Close View
                            </Button>

                            <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
                                <Button
                                    variant="ghost"
                                    onClick={() => handleCancelBooking(booking.id)}
                                    disabled={cancelMutation.isPending}
                                    className="h-12 px-6 font-black text-red-600 hover:bg-red-50 hover:text-red-700 rounded-2xl text-[11px] uppercase tracking-widest"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
                                </Button>
                                <Button variant="outline" className="h-12 px-6 font-black border-slate-200 text-slate-700 hover:bg-transparent rounded-2xl text-[11px] uppercase tracking-widest">
                                    <Edit className="h-4 w-4 mr-2" /> Modify Trip
                                </Button>
                                <Button className="h-12 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all text-[11px] uppercase tracking-widest gap-2">
                                    <Download className="h-4 w-4" /> Download Full Invoice
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }
}

const LoadingSkeleton = () => (
    <div className="space-y-6 stagger-item">
        {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 shadow-xl animate-pulse flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-64 h-48 bg-white/10 rounded-2xl"></div>
                <div className="flex-1 space-y-4 py-2">
                    <div className="h-8 w-2/3 bg-white/10 rounded-lg"></div>
                    <div className="h-6 w-1/3 bg-white/10 rounded-lg"></div>
                    <div className="mt-auto h-12 w-1/4 bg-white/10 rounded-full ml-auto"></div>
                </div>
            </div>
        ))}
    </div>
)

const EmptyState = ({ searchQuery, activeTab, setSearchQuery, setStartDate, setEndDate, router }: any) => (
    <div className="text-center py-24 bg-white/10 backdrop-blur-xl rounded-[32px] border border-white/20 shadow-xl max-w-2xl mx-auto stagger-item">
        <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] p-8 rounded-full shadow-lg shadow-orange-500/20 w-fit mx-auto mb-8 ring-8 ring-white/10">
            <Calendar className="h-12 w-12 text-white" />
        </div>
        <h3 className="text-3xl font-bold text-[#2D1A0E] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            {searchQuery ? "No matches found" : `No ${activeTab} bookings`}
        </h3>
        <p className="text-[#B4501E]/70 font-bold max-w-xs mx-auto mb-10 leading-relaxed text-sm">
            {searchQuery
                ? `We couldn't find any bookings matching "${searchQuery}". Try a different search term or clear filters.`
                : `Your ${activeTab} trip list is currently empty. Start by exploring our premium tour packages.`
            }
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {searchQuery ? (
                <Button
                    onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
                    className="h-14 px-10 bg-white/30 backdrop-blur-md border border-white/40 text-[#2D1A0E] font-black rounded-full hover:bg-white/40 transition-all"
                >
                    Clear All Filters
                </Button>
            ) : (
                activeTab === 'upcoming' && (
                    <Button
                        onClick={() => router.push('/agent/packages')}
                        className="h-14 px-10 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white font-black rounded-full shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-1 transition-all"
                    >
                        Browse Packages
                    </Button>
                )
            )}
        </div>
    </div>
)
