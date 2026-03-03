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
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

import { bookingsAPI } from '@/lib/api'
import { Booking } from '@/types'

export default function AgentBookingsPage() {
    const router = useRouter()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState('upcoming')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    useEffect(() => {
        loadBookings()
    }, [])

    const loadBookings = async () => {
        setLoading(true)
        try {
            const data = await bookingsAPI.getAgentBookings()
            if (Array.isArray(data)) {
                setBookings(data)
            } else if (data.bookings && Array.isArray(data.bookings)) {
                // Handle potential paginated response structure
                setBookings(data.bookings)
            } else {
                console.error("Unexpected booking data format", data)
                setBookings([])
            }
        } catch (error) {
            console.error("Failed to load bookings:", error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'bg-green-100 text-green-700 border-green-200'
            case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200'
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
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
    const filterBookings = (statusType: 'upcoming' | 'completed') => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        return bookings.filter(booking => {
            // Search Filter
            const matchesSearch =
                booking.booking_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.package?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (booking.package?.destination && booking.package.destination.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (booking.travelers && booking.travelers.some(t =>
                    `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
                ));

            if (!matchesSearch) return false

            // Date Range Filter (Created Date or Travel Date? User said "Date filter should still apply")
            // Usually dashboard filter is for "Bookings Made", but here it makes sense for Travel Date too.
            // Let's filter by travel_date if either is set.
            const travelDateStr = booking.travel_date
            if (startDate && travelDateStr < startDate) return false
            if (endDate && travelDateStr > endDate) return false

            const travelDate = new Date(booking.travel_date)
            const isValues = statusType === 'upcoming'
                ? (travelDate >= today && booking.status !== 'cancelled' && booking.status !== 'completed')
                : (travelDate < today || booking.status === 'cancelled' || booking.status === 'completed')

            return isValues
        }).sort((a, b) => {
            // Sort by Date Descending
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

    const LoadingSkeleton = () => (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm animate-pulse">
                    <div className="flex justify-between mb-4">
                        <div className="h-5 w-1/3 bg-slate-200 rounded"></div>
                        <div className="h-5 w-20 bg-slate-200 rounded"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                        <div className="h-4 w-1/4 bg-slate-200 rounded"></div>
                    </div>
                </div>
            ))}
        </div>
    )

    const EmptyState = () => (
        <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm ring-1 ring-slate-900/5 max-w-2xl mx-auto">
            <div className="bg-indigo-50 p-6 rounded-full shadow-sm w-fit mx-auto mb-6 ring-8 ring-indigo-50/50">
                <Calendar className="h-10 w-10 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">
                {searchQuery ? "No matches found" : `No ${activeTab} bookings`}
            </h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto mb-8 leading-relaxed">
                {searchQuery
                    ? `We couldn't find any bookings matching "${searchQuery}". Try a different search term or clear filters.`
                    : `Your ${activeTab} trip list is currently empty. Start by exploring our premium tour packages.`
                }
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {searchQuery ? (
                    <Button
                        variant="outline"
                        onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
                        className="h-12 px-8 font-bold rounded-xl border-slate-200"
                    >
                        Clear All Filters
                    </Button>
                ) : (
                    activeTab === 'upcoming' && (
                        <Button
                            onClick={() => router.push('/agent/packages')}
                            className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl shadow-lg shadow-indigo-100"
                        >
                            Browse Packages
                        </Button>
                    )
                )}
                {activeTab === 'completed' && !searchQuery && (
                    <Button
                        variant="outline"
                        onClick={() => setActiveTab('upcoming')}
                        className="h-12 px-8 font-bold rounded-xl border-slate-200"
                    >
                        View Upcoming
                    </Button>
                )}
            </div>
        </div>
    )

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <header className="glass-navbar sticky top-0 z-30 shadow-sm mb-6">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/agent/dashboard">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <h1 className="text-lg font-bold text-slate-900">My Bookings</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="hidden md:flex bg-white border-slate-200 shadow-sm hover:bg-transparent font-bold">
                                    <FileDown className="h-4 w-4 mr-2" />
                                    Export Bookings
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Choose Format</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer">
                                    <FileText className="h-4 w-4 mr-2 text-red-500" />
                                    Export as PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                                    Export as CSV (Excel)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 max-w-5xl">

                {/* Search & Filter Bar */}
                <div className="glass-panel p-6 rounded-2xl shadow-sm mb-8 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="relative flex-1 max-w-xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input
                                placeholder="Search by booking reference, destination, or traveler names..."
                                className="glass-input pl-12 h-12 rounded-xl text-base"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-white/40 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/50">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Travel Period:</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 ml-1">From</label>
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm font-semibold text-slate-700 min-w-[120px]"
                                        />
                                    </div>
                                    <span className="text-slate-300 mx-1 mt-4">→</span>
                                    <div className="flex flex-col">
                                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 ml-1">To</label>
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm font-semibold text-slate-700 min-w-[120px]"
                                        />
                                    </div>
                                </div>
                                {(startDate || endDate) && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                        onClick={() => { setStartDate(''); setEndDate(''); }}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <Button
                                className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                                onClick={loadBookings}
                            >
                                <Filter className="h-4 w-4" />
                                Apply Filters
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-white/20 backdrop-blur-md p-1 rounded-full border border-white/30 shadow-sm w-full md:w-auto inline-flex">
                        <TabsTrigger
                            value="upcoming"
                            className="flex-1 md:flex-none px-6 rounded-full data-[state=active]:bg-white/60 data-[state=active]:text-violet-800 data-[state=active]:shadow-sm data-[state=active]:font-bold transition-all"
                        >
                            Upcoming
                        </TabsTrigger>
                        <TabsTrigger
                            value="completed"
                            className="flex-1 md:flex-none px-6 rounded-full data-[state=active]:bg-white/60 data-[state=active]:text-violet-800 data-[state=active]:shadow-sm data-[state=active]:font-bold transition-all"
                        >
                            Completed
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming" className="mt-0">
                        {loading ? <LoadingSkeleton /> : (
                            groupedBookings.length > 0 ? (
                                <div className="space-y-12">
                                    {groupedBookings.map(([date, bookingsInGroup]) => (
                                        <div key={date} className="space-y-6">
                                            <div className="sticky top-[64px] z-20 py-3 backdrop-blur-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                    <div className="bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/60 shadow-sm flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-indigo-600" />
                                                        <span className="text-sm font-bold text-slate-800">
                                                            {format(new Date(date), 'EEEE, dd MMM yyyy')}
                                                        </span>
                                                    </div>
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                </div>
                                            </div>
                                            <div className="grid gap-6">
                                                {bookingsInGroup.map(booking => (
                                                    <BookingCard key={booking.id} booking={booking} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <EmptyState />
                        )}
                    </TabsContent>

                    <TabsContent value="completed" className="mt-0">
                        {loading ? <LoadingSkeleton /> : (
                            groupedBookings.length > 0 ? (
                                <div className="space-y-12">
                                    {groupedBookings.map(([date, bookingsInGroup]) => (
                                        <div key={date} className="space-y-6">
                                            <div className="sticky top-[64px] z-20 py-3 bg-[#F8FAFC]/95 backdrop-blur-md">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                    <div className="bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-indigo-600" />
                                                        <span className="text-sm font-bold text-slate-800">
                                                            {format(new Date(date), 'EEEE, dd MMM yyyy')}
                                                        </span>
                                                    </div>
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                </div>
                                            </div>
                                            <div className="grid gap-6">
                                                {bookingsInGroup.map(booking => (
                                                    <BookingCard key={booking.id} booking={booking} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <EmptyState />
                        )}
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
            <Card className="glass-panel overflow-hidden border-white/50 hover:border-violet-200/50 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-purple-500/5 group rounded-2xl ring-1 ring-white/50">
                <div className="flex flex-col md:flex-row min-h-[160px]">
                    {/* Left: Enhanced Thumbnail */}
                    <div className="w-full md:w-56 bg-slate-100 relative shrink-0 overflow-hidden">
                        {booking.package?.images?.[0]?.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={booking.package.images[0].image_url}
                                alt={booking.package?.title}
                                className="w-full h-40 md:h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-40 md:h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300">
                                <MapPin className="h-10 w-10 mb-2 opacity-20" />
                                <span className="text-[10px] uppercase font-black tracking-tighter opacity-20">No Map Preview</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />
                        <div className="absolute bottom-3 left-4 md:hidden">
                            <Badge className="bg-white/90 backdrop-blur text-slate-900 border-none font-bold">
                                {format(new Date(booking.travel_date), 'dd MMM yyyy')}
                            </Badge>
                        </div>
                    </div>

                    {/* Right: Content Architecture */}
                    <div className="flex-1 p-6 flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <Badge variant="outline" className="font-mono text-[10px] bg-slate-900 text-white border-slate-900 px-2 uppercase tracking-widest py-0.5 shadow-sm">
                                        REF: {booking.booking_reference}
                                    </Badge>
                                    <Badge className={`${getStatusColor(booking.status)} border shadow-sm px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider rounded-full ring-2 ring-white`}>
                                        {booking.status}
                                    </Badge>
                                    {booking.package?.category && (
                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-bold uppercase py-0.5">
                                            {booking.package.category}
                                        </Badge>
                                    )}
                                </div>
                                <h3 className="font-black text-xl text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                                    {booking.package?.title || 'Custom Tour Package'}
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm font-medium text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4 text-slate-400" />
                                        {booking.package?.destination || 'Destination'}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        {booking.package?.duration_days}D/{booking.package?.duration_nights || (booking.package?.duration_days ?? 0) - 1}N
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Users className="h-4 w-4 text-slate-400" />
                                        {travelerCount} Guests
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 ml-auto sm:ml-0 self-end sm:self-start">
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl" title="Share Booking">
                                    <Share className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:bg-slate-100 rounded-xl">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-200 p-2">
                                        <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 font-bold px-2 py-1.5">Quick Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => { setSelectedBooking(booking); setIsDetailsOpen(true); }} className="rounded-lg cursor-pointer py-2">
                                            <Info className="h-4 w-4 mr-2 text-indigo-500" /> View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-lg cursor-pointer py-2">
                                            <Edit className="h-4 w-4 mr-2 text-amber-500" /> Modify Booking
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-lg cursor-pointer py-2">
                                            <FileText className="h-4 w-4 mr-2 text-slate-500" /> Get Invoice
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1 shrink-0" />
                                        <DropdownMenuItem className="rounded-lg cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50">
                                            <Trash2 className="h-4 w-4 mr-2" /> Cancel Booking
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-auto">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                    <AvatarFallback className="text-xs bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">
                                        {travelerName.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 leading-none mb-1">{travelerName}</p>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                                        +{travelerCount - 1} Travelers
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Payment</p>
                                    <p className="text-lg font-black text-slate-900">₹{booking.total_amount.toLocaleString()}</p>
                                </div>
                                <Button
                                    size="sm"
                                    className="hidden sm:flex h-11 px-6 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-bold rounded-full shadow-lg shadow-purple-400/30 transition-all gap-2"
                                    onClick={() => { setSelectedBooking(booking); setIsDetailsOpen(true); }}
                                >
                                    Details <ChevronRight className="h-4 w-4" />
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
                <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl rounded-3xl bg-transparent">
                    {/* Header Section: Reduced height, more purposeful actions */}
                    <div className="bg-indigo-600 px-6 py-4 sm:px-8 sm:py-6 text-white relative shrink-0">
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1 text-indigo-100 uppercase tracking-widest text-[10px] font-black">
                                    <span>Booking ID</span>
                                    <span>•</span>
                                    <span className="font-mono">{booking.booking_reference}</span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black mb-2 leading-tight flex items-center gap-3">
                                    {booking.package?.title || 'Tour Package'}
                                    <Badge className={`${booking.status === 'confirmed' ? 'bg-emerald-500 border-emerald-400' : 'bg-amber-500 border-amber-400'
                                        } text-white border shadow-lg px-3 py-0.5 font-black text-[9px] uppercase tracking-wider rounded-full ring-4 ring-indigo-600/50`}>
                                        {booking.status}
                                    </Badge>
                                </h2>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-indigo-50">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-lg backdrop-blur-sm">
                                        <Calendar className="h-3.5 w-3.5 opacity-70" />
                                        {format(new Date(booking.travel_date), 'dd MMM yyyy')}
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-lg backdrop-blur-sm">
                                        <Users className="h-3.5 w-3.5 opacity-70" />
                                        {travelerCount} Guests
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-lg backdrop-blur-sm">
                                        <Clock className="h-3.5 w-3.5 opacity-70" />
                                        {booking.package?.duration_days} Days
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-indigo-100 hover:bg-white/10 hover:text-white rounded-xl">
                                    <Printer className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-indigo-100 hover:bg-white/10 hover:text-white rounded-xl">
                                    <Share2 className="h-4 w-4" />
                                </Button>
                                <Button className="bg-white hover:bg-transparent text-indigo-600 font-black text-xs h-9 px-4 rounded-xl shadow-lg shadow-indigo-900/20 gap-2">
                                    <FileDown className="h-3.5 w-3.5" />
                                    Download Voucher
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                        <div className="p-6 sm:p-8 space-y-8 pb-12">

                            {/* Main Info Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Booking Contact Card */}
                                <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm ring-1 ring-slate-900/5 h-full">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="bg-indigo-50 p-2.5 rounded-xl">
                                            <User className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900">Booking Contact</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-slate-100">
                                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                                <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
                                                    {booking.user?.first_name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contact Name</p>
                                                <p className="font-bold text-slate-900 truncate">{booking.user?.first_name} {booking.user?.last_name}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <a href={`mailto:${booking.user?.email}`} className="flex flex-col p-4 bg-white/5 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group overflow-hidden">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600">Email Address</p>
                                                <div className="flex items-center gap-2 font-bold text-slate-900 truncate">
                                                    <Mail className="h-3 w-3 text-slate-400 shrink-0 group-hover:text-indigo-500" />
                                                    <span className="truncate text-sm">{booking.user?.email}</span>
                                                </div>
                                            </a>
                                            <a href={`tel:${booking.user?.phone}`} className="flex flex-col p-4 bg-white/5 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all group">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600">Phone Number</p>
                                                <div className="flex items-center gap-2 font-bold text-slate-900">
                                                    <Phone className="h-3 w-3 text-slate-400 shrink-0 group-hover:text-emerald-500" />
                                                    <span className="text-sm">{booking.user?.phone || 'Not provided'}</span>
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                </section>

                                {/* Tour Logistics Card */}
                                <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm ring-1 ring-slate-900/5 h-full">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="bg-amber-50 p-2.5 rounded-xl">
                                            <MapPin className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900">Tour Logistics</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Meeting Point</p>
                                            <p className="font-bold text-slate-900 text-sm mt-2">{booking.package?.destination || 'Primary Hub'}</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Check-in Time</p>
                                            <p className="font-bold text-slate-900 text-sm mt-2">09:00 AM</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Tour Category</p>
                                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold uppercase py-0.5 mt-1.5 text-[9px]">
                                                {booking.package?.category || 'Standard'}
                                            </Badge>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Duration Info</p>
                                            <p className="font-bold text-slate-900 text-sm mt-2">{booking.package?.duration_days}D / {booking.package?.duration_nights || (booking.package?.duration_days ?? 0) - 1}N</p>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Travelers List */}
                            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm ring-1 ring-slate-900/5">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-50 p-2.5 rounded-xl">
                                            <Users className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Traveler Details</h3>
                                    </div>
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 font-black px-4 py-1 rounded-full uppercase text-[10px] tracking-widest">
                                        {booking.travelers?.length || 0} Registered
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {booking.travelers?.map((traveler, index) => (
                                        <div key={traveler.id} className="group bg-white/5 rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500">
                                            <div className="flex items-start gap-4">
                                                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-400 shrink-0 border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    {String(index + 1).padStart(2, '0')}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-black text-slate-900 truncate tracking-tight">{traveler.first_name} {traveler.last_name}</p>
                                                        {traveler.is_primary && <Badge className="bg-indigo-600 text-[8px] py-0 px-1.5 h-4 uppercase font-black">Primary</Badge>}
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
                                <Button variant="ghost" className="h-12 px-6 font-black text-red-600 hover:bg-red-50 hover:text-red-700 rounded-2xl text-[11px] uppercase tracking-widest">
                                    <Trash2 className="h-4 w-4 mr-2" /> Cancel Booking
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
