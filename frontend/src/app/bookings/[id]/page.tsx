'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { bookingsAPI } from '@/lib/api'
import { Booking } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Loader2,
    Calendar,
    MapPin,
    Users,
    Plane,
    CreditCard,
    ArrowLeft,
    CheckCircle,
    Clock,
    XCircle,
    User,
    Mail,
    Phone,
    Check,
    X,
    Receipt,
    Hotel,
    Info,
    Share2,
    Download,
    Edit,
    MoreHorizontal,
    Copy,
    AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export default function BookingDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [booking, setBooking] = useState<Booking | null>(null)
    const [loading, setLoading] = useState(true)
    const [showFullItinerary, setShowFullItinerary] = useState(false)

    // Cancellation States
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [isFetchingPreview, setIsFetchingPreview] = useState(false)
    const [cancelPreview, setCancelPreview] = useState<{
        cancellation_enabled: boolean;
        days_before: number;
        paid_amount: number;
        refund_amount: number;
        refund_percentage: number;
        message: string;
    } | null>(null)

    useEffect(() => {
        if (params.id) {
            loadBooking(params.id as string)
        }
    }, [params.id])

    const loadBooking = async (id: string) => {
        try {
            const data = await bookingsAPI.getById(id)
            setBooking(data)
        } catch (error) {
            console.error("Failed to load booking details", error)
            toast.error("Failed to load booking details")
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
            toast.success("Booking reference copied!")
        } else {
            // Fallback for non-secure contexts
            const textArea = document.createElement("textarea")
            textArea.value = text
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            try {
                document.execCommand('copy')
                toast.success("Booking reference copied!")
            } catch (err) {
                console.error('Unable to copy to clipboard', err)
                toast.error('Failed to copy refernece')
            }
            document.body.removeChild(textArea)
        }
    }

    const handleDownloadInvoice = async () => {
        try {
            if (!booking) return
            const blob = await bookingsAPI.downloadInvoice(booking.id)
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `Invoice_${booking.booking_reference}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error("Failed to download invoice", error)
            toast.error("Failed to download invoice")
        }
    }

    const fetchCancelPreview = async () => {
        if (!booking) return
        setIsFetchingPreview(true)
        try {
            const data = await bookingsAPI.getCancelPreview(booking.id)
            setCancelPreview(data)
            setIsCancelDialogOpen(true)
        } catch (error: any) {
            console.error("Failed to fetch cancel preview", error)
            toast.error(error.response?.data?.detail || "Failed to fetch cancellation details")
        } finally {
            setIsFetchingPreview(false)
        }
    }

    const handleCancelBooking = async () => {
        if (!booking) return
        setIsCancelling(true)
        try {
            const response = await bookingsAPI.cancel(booking.id)
            toast.success(response.message || "Booking cancelled successfully")
            setIsCancelDialogOpen(false)
            // Reload booking to show cancelled state
            loadBooking(booking.id)
        } catch (error: any) {
            console.error("Cancellation failed", error)
            toast.error(error.response?.data?.detail || "Failed to cancel booking")
        } finally {
            setIsCancelling(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // ... (rest of the file until the button) ...

    <Button
        variant="outline"
        className="w-full gap-2 border-white/20 text-gray-700 hover:bg-white/20 hover:text-gray-900"
        onClick={handleDownloadInvoice}
    >
        <Download className="h-4 w-4" /> Download Invoice
    </Button>

    if (!booking) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Booking Not Found</h1>
                <Button onClick={() => router.push('/bookings')} className="mt-4">
                    Back to My Bookings
                </Button>
            </div>
        )
    }

    // Parse Special Requests / Flight Details
    let flightDetails = null
    let flightConfirmation = null
    let contactInfo = null

    if (booking.special_requests) {
        try {
            const req = JSON.parse(booking.special_requests)
            flightDetails = req.flight_details
            flightConfirmation = req.flight_booking_confirmation
            if (req.contact_info) {
                contactInfo = req.contact_info
            }
        } catch (e) {
            console.error("Error parsing special requests", e)
        }
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'confirmed':
                return {
                    bg: 'bg-emerald-50',
                    text: 'text-emerald-700',
                    border: 'border-emerald-200',
                    icon: <CheckCircle className="h-4 w-4" />,
                    gradient: 'bg-gradient-to-r from-emerald-500 to-green-500',
                    label: 'CONFIRMED'
                }
            case 'pending':
                return {
                    bg: 'bg-amber-50',
                    text: 'text-amber-700',
                    border: 'border-amber-200',
                    icon: <Clock className="h-4 w-4" />,
                    gradient: 'bg-gradient-to-r from-amber-500 to-[var(--gradient-end)]',
                    label: 'PENDING'
                }
            case 'cancelled':
                return {
                    bg: 'bg-red-50',
                    text: 'text-red-700',
                    border: 'border-red-200',
                    icon: <XCircle className="h-4 w-4" />,
                    gradient: 'bg-gradient-to-r from-red-500 to-rose-500',
                    label: 'CANCELLED'
                }
            case 'completed':
                return {
                    bg: 'bg-blue-50',
                    text: 'text-blue-700',
                    border: 'border-blue-200',
                    icon: <CheckCircle className="h-4 w-4" />,
                    gradient: 'bg-gradient-to-r from-blue-500 to-indigo-500',
                    label: 'COMPLETED'
                }
            default:
                return {
                    bg: 'bg-white/5',
                    text: 'text-gray-700',
                    border: 'border-gray-200',
                    icon: <Info className="h-4 w-4" />,
                    gradient: 'bg-transparent0',
                    label: status.toUpperCase()
                }
        }
    }

    const statusConfig = getStatusConfig(booking.status)

    // Determine contact info (Booking User)
    const userEmail = contactInfo?.email || booking.user?.email || 'N/A'
    const userPhone = contactInfo?.phone || booking.user?.phone || 'N/A'
    const userName = booking.user ? `${booking.user.first_name} ${booking.user.last_name}` : 'N/A'

    const heroImage = booking.package?.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1582510003544-4d00b7f0bd44?q=80&w=2969&auto=format&fit=crop'

    return (
        <div className="min-h-screen overflow-x-hidden">

            {/* Header & Hero Section */}
            <div className="relative min-h-[350px] w-full bg-gray-900 group">
                <div className="absolute inset-0">
                    <img
                        src={heroImage}
                        alt={booking.package?.destination || 'Destination'}
                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                </div>

                <div className="container mx-auto px-4 h-full relative flex flex-col justify-between py-6">
                    {/* Top Navigation Row */}
                    <div className="flex justify-between items-center animate-fade-in">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/bookings')}
                            className="bg-black/20 backdrop-blur-md text-white hover:bg-white/20 pl-2 rounded-full border border-white/10"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Bookings
                        </Button>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                <span className="text-xs text-blue-200 font-medium">REF:</span>
                                <span className="font-mono font-bold text-sm text-white">{booking.booking_reference}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-1 hover:bg-white/20 rounded text-gray-300 hover:text-white"
                                    onClick={() => copyToClipboard(booking.booking_reference)}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                            <Badge className={`${statusConfig.gradient} text-white border-0 px-4 py-1.5 shadow-lg rounded-full`}>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                    {statusConfig.label}
                                </div>
                            </Badge>
                        </div>
                    </div>

                    {/* Title and Metadata */}
                    <div className="max-w-4xl mt-auto pb-12">
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-lg">
                            {booking.package?.title || 'Custom Trip Package'}
                        </h1>

                        <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-blue-50 text-sm md:text-base font-medium">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-blue-300" />
                                <span>{booking.package?.destination || 'Destination'}</span>
                            </div>
                            <div className="hidden md:block h-1 w-1 rounded-full bg-white/20" />
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-300" />
                                <span>{formatDate(booking.travel_date)}</span>
                            </div>
                            <div className="hidden md:block h-1 w-1 rounded-full bg-white/20" />
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-300" />
                                <span>{booking.package?.duration_days} Days / {booking.package?.duration_nights} Nights</span>
                            </div>
                            <div className="hidden md:block h-1 w-1 rounded-full bg-white/20" />
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-300" />
                                <span>{booking.number_of_travelers} Traveler{booking.number_of_travelers > 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-10 relative z-10 pb-16">

                {/* Quick Actions Bar */}
                <div className="glass-panel grid grid-cols-2 md:flex md:flex-row justify-center items-center gap-2 md:gap-4 mb-8 p-3 rounded-2xl shadow-xl border border-white/30 backdrop-blur-xl">
                    <Button
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-500/20 order-1"
                        onClick={handleDownloadInvoice}
                    >
                        <Download className="h-4 w-4" /> Download Invoice
                    </Button>

                    <Button
                        variant="ghost"
                        className="text-gray-700 hover:bg-gray-100/50 gap-2 h-11 px-6 rounded-xl border border-dashed border-gray-200 order-2 md:order-2"
                        disabled
                    >
                        <Edit className="h-4 w-4" /> Modify Booking
                    </Button>

                    <Button
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 gap-2 h-11 px-6 rounded-xl border border-dashed border-red-100 order-4 md:order-3"
                        disabled={booking.status === 'cancelled' || booking.status === 'completed' || isFetchingPreview}
                        onClick={fetchCancelPreview}
                    >
                        {isFetchingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Cancel
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 h-11 px-6 rounded-xl border-gray-200 hover:bg-white order-3 md:order-4">
                                <Share2 className="h-4 w-4" /> Share
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                            <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer">
                                <Mail className="h-4 w-4" /> Share via Email
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer" onClick={() => copyToClipboard(window.location.href)}>
                                <Copy className="h-4 w-4" /> Copy Link
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Main Content Grid 60/40 */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* LEFT COLUMN (Main Details) - spans 3 columns (60%) */}
                    <div className="lg:col-span-3 space-y-8">

                        {/* Package Details Card */}
                        <Card className="glass-panel shadow-sm border-0 overflow-hidden">
                            <div className="relative h-40 w-full md:hidden">
                                <img src={heroImage} className="w-full h-full object-cover" alt="Destination" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                    <h3 className="text-white font-bold text-lg">{booking.package?.destination}</h3>
                                </div>
                            </div>

                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-gray-100 pb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Package Overview</h2>
                                        <p className="text-gray-500 text-sm flex items-center gap-2">
                                            <Calendar className="h-4 w-4" /> {formatDate(booking.travel_date)}
                                        </p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="bg-blue-50 px-4 py-2 rounded-xl text-center">
                                            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Duration</p>
                                            <p className="font-bold text-gray-900">{booking.package?.duration_days}D / {booking.package?.duration_nights}N</p>
                                        </div>
                                        <div className="bg-pink-50 px-4 py-2 rounded-xl text-center">
                                            <p className="text-xs text-pink-600 font-bold uppercase tracking-wider">Travelers</p>
                                            <p className="font-bold text-gray-900">{booking.number_of_travelers}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                                        <CheckCircle className="h-4 w-4 text-emerald-500" /> Package Inclusions
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {booking.package?.included_items?.map((item, i) => (
                                            <div key={i} className="flex items-center gap-2.5 text-sm text-gray-700 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
                                                <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                                    <Check className="h-3 w-3" />
                                                </div>
                                                <span className="font-medium">{item}</span>
                                            </div>
                                        )) || (
                                                <>
                                                    <div className="flex items-center gap-2.5 text-sm text-gray-700 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
                                                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                                            <Check className="h-3 w-3" />
                                                        </div>
                                                        <span className="font-medium">Hotel stay (3 nights)</span>
                                                    </div>
                                                    <div className="flex items-center gap-2.5 text-sm text-gray-700 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
                                                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                                            <Check className="h-3 w-3" />
                                                        </div>
                                                        <span className="font-medium">Airport transfers</span>
                                                    </div>
                                                    <div className="flex items-center gap-2.5 text-sm text-gray-700 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
                                                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                                            <Check className="h-3 w-3" />
                                                        </div>
                                                        <span className="font-medium">Daily breakfast</span>
                                                    </div>
                                                </>
                                            )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>



                        {/* Itinerary Preview */}
                        <Card className="glass-panel shadow-sm border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <MapPin className="h-5 w-5 text-indigo-500" /> Itinerary Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {booking.package?.itinerary_items && booking.package.itinerary_items.length > 0 ? (
                                    <div className="space-y-4">
                                        {Object.entries(
                                            booking.package.itinerary_items.reduce((acc, item) => {
                                                const day = item.day_number;
                                                if (!acc[day]) acc[day] = [];
                                                acc[day].push(item);
                                                return acc;
                                            }, {} as Record<number, typeof booking.package.itinerary_items>)
                                        ).sort(([a], [b]) => Number(a) - Number(b)).map(([day, items], idx) => (
                                            <details key={day} className="group border border-gray-100 rounded-2xl overflow-hidden bg-white/30" open={idx === 0}>
                                                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors list-none">
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-indigo-600 text-white h-10 w-24 rounded-xl flex flex-col items-center justify-center shadow-md shadow-indigo-200">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Day</span>
                                                            <span className="text-xl font-black leading-none">{day}</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">{items[0].title}</h4>
                                                            <p className="text-xs text-gray-500">{items.length} Activities</p>
                                                        </div>
                                                    </div>
                                                    <div className="h-8 w-8 rounded-full flex items-center justify-center border border-gray-200 group-open:rotate-180 transition-transform">
                                                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                </summary>
                                                <div className="px-4 pb-4 pt-2 border-t border-gray-50 space-y-4">
                                                    {items.map((item, i) => (
                                                        <div key={item.id} className="relative pl-6">
                                                            <div className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-indigo-400" />
                                                            {i < items.length - 1 && <div className="absolute left-[3.5px] top-4 w-px h-full bg-indigo-100" />}
                                                            <h5 className="text-sm font-bold text-gray-800 mb-1">{item.title}</h5>
                                                            <p className="text-sm text-gray-600">{item.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-white/20 rounded-2xl border-2 border-dashed border-gray-200">
                                        <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">Detailed itinerary will be available 48 hours before departure.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Flight Information */}
                        {booking.package?.flights_enabled && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Plane className="h-5 w-5 text-blue-600" /> Flight Information
                                </h3>

                                {flightConfirmation ? (
                                    <div className="glass-panel rounded-2xl border border-blue-100 shadow-sm overflow-hidden bg-white/40">
                                        <div className="bg-blue-600 px-6 py-3 flex justify-between items-center text-white">
                                            <div className="flex items-center gap-2">
                                                <Plane className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase tracking-wider">Confirmed Flight Details</span>
                                            </div>
                                            <Badge variant="outline" className="text-white border-white/40 bg-white/10">PNR: {flightConfirmation.pnr || 'GENERATED'}</Badge>
                                        </div>
                                        <div className="p-6">
                                            <div className="space-y-6">
                                                {/* Outbound */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Outbound</span>
                                                        <span className="text-sm font-bold text-gray-500">{formatDate(booking.travel_date)}</span>
                                                    </div>
                                                    <div className="flex flex-col md:flex-row justify-between items-center bg-blue-50/50 rounded-2xl p-5 border border-blue-100/50">
                                                        <div className="text-center md:text-left mb-4 md:mb-0">
                                                            <p className="text-3xl font-black text-blue-900">{flightConfirmation.from_code || 'MAA'}</p>
                                                            <p className="text-xs font-bold text-blue-600/60 uppercase">{flightConfirmation.from_city || 'Chennai'}</p>
                                                            <p className="text-sm font-bold text-gray-700 mt-1">{flightConfirmation.departure_time || '10:30 AM'}</p>
                                                        </div>
                                                        <div className="flex-1 px-8 flex flex-col items-center max-w-[200px]">
                                                            <div className="w-full flex items-center justify-between relative">
                                                                <div className="h-2 w-2 rounded-full bg-blue-600" />
                                                                <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 mx-1 border-t-2 border-dashed border-white/0" />
                                                                <Plane className="h-5 w-5 text-blue-600 mx-2" />
                                                                <div className="flex-1 h-0.5 bg-indigo-600 mx-1" />
                                                                <div className="h-2 w-2 rounded-full bg-indigo-600" />
                                                            </div>
                                                            <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">{flightConfirmation.duration || '2h 45m'}</p>
                                                        </div>
                                                        <div className="text-center md:text-right mt-4 md:mt-0">
                                                            <p className="text-3xl font-black text-indigo-900">{flightConfirmation.to_code || 'DEL'}</p>
                                                            <p className="text-xs font-bold text-indigo-600/60 uppercase">{flightConfirmation.to_city || 'Delhi'}</p>
                                                            <p className="text-sm font-bold text-gray-700 mt-1">{flightConfirmation.arrival_time || '1:15 PM'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <Card className="border-0 shadow-lg bg-white/40 overflow-hidden rounded-2xl">
                                        <div className="p-8">
                                            <div className="flex flex-col items-center mb-8">
                                                <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                                    <Plane className="h-8 w-8 text-blue-600 animate-pulse" />
                                                </div>
                                                <h4 className="text-xl font-black text-gray-900 tracking-tight">Flight Booking Status</h4>
                                                <p className="text-sm text-gray-500 mt-1">We are finalizing your flight arrangements</p>
                                            </div>

                                            {/* Progress Steps */}
                                            <div className="relative flex justify-between items-start max-w-md mx-auto mb-10">
                                                {/* Line */}
                                                <div className="absolute top-5 left-0 w-full h-[2px] bg-gray-100 z-0" />
                                                <div className="absolute top-5 left-0 w-1/2 h-[2px] bg-emerald-500 z-0" />

                                                {/* Step 1 */}
                                                <div className="flex flex-col items-center z-10 w-1/3">
                                                    <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 border-4 border-white">
                                                        <Check className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mt-3">Received</span>
                                                </div>

                                                {/* Step 2 */}
                                                <div className="flex flex-col items-center z-10 w-1/3">
                                                    <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/20 border-4 border-white animate-pulse">
                                                        <Clock className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mt-3">Confirming</span>
                                                </div>

                                                {/* Step 3 */}
                                                <div className="flex flex-col items-center z-10 w-1/3">
                                                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border-4 border-white">
                                                        <div className="h-2 w-2 rounded-full bg-gray-300" />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-3">Sent</span>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 text-center">
                                                <p className="text-xs text-gray-500 mb-1">Expected Confirmation:</p>
                                                <p className="text-sm font-bold text-gray-900 mb-3">Within 24 hours</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-loose">
                                                    Updates will be sent to:<br />
                                                    <span className="text-blue-600 font-black">{userEmail}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* Traveler Details Cards */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Users className="h-5 w-5 text-purple-600" /> Traveler Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {booking.travelers?.map((traveler, index) => (
                                    <div key={traveler.id} className="glass-panel p-4 rounded-xl border-0 shadow-sm flex items-start gap-4">
                                        <div className="bg-white/30 h-10 w-10 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm">
                                            {traveler.first_name[0]}{traveler.last_name[0]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-900">{traveler.first_name} {traveler.last_name}</h4>
                                                {traveler.is_primary && <Badge className="text-[10px] bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">Primary</Badge>}
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <span className="w-16 text-gray-400">Type:</span> {traveler.date_of_birth ? 'Adult' : 'Child'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <span className="w-16 text-gray-400">Gender:</span>  <span className="capitalize">{traveler.gender?.toLowerCase()}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <span className="w-16 text-gray-400">Nationality:</span> {traveler.nationality}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>


                    </div>


                    {/* RIGHT COLUMN (Sidebar) - spans 2 columns (40%) */}
                    <div className="lg:col-span-2 space-y-6">

                        <Card className="glass-panel shadow-md border-0 overflow-hidden rounded-2xl">
                            <CardHeader className="bg-gray-900 border-b border-white/10 pb-4">
                                <CardTitle className="text-lg flex items-center gap-2 text-white">
                                    <CreditCard className="h-5 w-5 text-blue-400" /> Payment Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 font-medium">Package Cost</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(booking.total_amount)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 font-medium">Taxes & Fees</span>
                                    <span className="font-bold text-emerald-600">Included</span>
                                </div>
                                <Separator className="bg-gray-100" />
                                <div className="flex justify-between items-baseline">
                                    <span className="font-bold text-gray-900">Total Amount</span>
                                    <span className="font-black text-3xl text-blue-600">{formatCurrency(booking.total_amount)}</span>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Payment Status</span>
                                        <Badge className={`${booking.payment_status === 'succeeded' ? 'bg-emerald-500' : 'bg-amber-500'} text-white border-0 px-2 py-0.5 rounded text-[10px] uppercase font-black`}>
                                            {booking.payment_status === 'succeeded' ? '✅ SUCCEEDED' : booking.payment_status}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Payment Date</span>
                                        <span className="text-xs font-bold text-gray-700">{formatDate(booking.created_at)}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <Button variant="outline" className="gap-2 border-gray-200 rounded-xl hover:bg-gray-50 font-bold text-xs" onClick={handleDownloadInvoice}>
                                        <Download className="h-3 w-3" /> Download Invoice
                                    </Button>
                                    <Button variant="outline" className="gap-2 border-gray-200 rounded-xl hover:bg-gray-50 font-bold text-xs" onClick={() => copyToClipboard(window.location.href)}>
                                        <Share2 className="h-3 w-3" /> Share Booking
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        {/* Refund Info Card — only shown for cancelled bookings */}
                        {booking.status === 'cancelled' && (booking.refund_amount || 0) > 0 && (() => {
                            const refund = booking.refund
                            const refundStatus: string = refund?.status || 'pending'
                            const refundId: string | null = refund?.razorpay_refund_id || null
                            const refundAmount: number = Number(booking.refund_amount || 0)

                            const statusStyles: Record<string, { bg: string; text: string; border: string; label: string; icon: string }> = {
                                succeeded: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Refund Success', icon: '✅' },
                                failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Refund Failed', icon: '❌' },
                                pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Refund Processing', icon: '🕐' },
                                initiated: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Processing Refund', icon: '🔄' },
                            }
                            const s = statusStyles[refundStatus] || statusStyles.pending

                            return (
                                <Card className={`glass-panel border shadow-sm overflow-hidden ${s.border}`}>
                                    <CardHeader className={`${s.bg} border-b ${s.border} pb-4`}>
                                        <CardTitle className={`text-base flex items-center gap-2 ${s.text}`}>
                                            <Receipt className="h-4 w-4" /> Refund Status
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-5 space-y-4">
                                        {/* Status Badge */}
                                        <div className={`flex items-center justify-between p-3 rounded-xl ${s.bg} border ${s.border}`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{s.icon}</span>
                                                <div>
                                                    <p className={`text-sm font-bold ${s.text}`}>{s.label}</p>
                                                    <p className="text-xs text-gray-500">Booking Reference: {booking.booking_reference}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">Amount</p>
                                                <p className={`text-lg font-bold ${s.text}`}>₹{refundAmount.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>

                                        {/* Razorpay Refund ID */}
                                        {refundId && (
                                            <div className="flex justify-between items-center text-xs bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                                                <span className="text-gray-500 font-medium">Refund ID</span>
                                                <span className="font-mono text-gray-700 text-[11px] bg-white px-1.5 py-0.5 rounded border border-gray-200">{refundId}</span>
                                            </div>
                                        )}

                                        {/* Timeline Note */}
                                        {refundStatus !== 'failed' && (
                                            <div className="flex gap-2 p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-blue-700">
                                                <span className="mt-0.5">📅</span>
                                                <span>
                                                    {refundStatus === 'succeeded'
                                                        ? "Refund processed successfully. Amount will be credited within 5–7 business days."
                                                        : 'Refund will be credited to your original payment method within 5–7 business days.'}
                                                </span>
                                            </div>
                                        )}
                                        {refundStatus === 'failed' && (
                                            <div className="flex gap-2 p-3 bg-red-50 rounded-lg border border-red-100 text-xs text-red-700">
                                                <span className="mt-0.5">⚠️</span>
                                                <span>Refund processing failed. Please contact support with your booking reference for assistance.</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })()}



                        {/* Cancellation Policy */}
                        <Card className="glass-panel border-0 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/10 border-b border-white/10 pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-500" /> Cancellation Policy
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                {booking.package?.cancellation_enabled ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Cancellable Package</span>
                                        </div>
                                        {booking.package.cancellation_rules?.map((rule, idx) => {
                                            const refundAmount = (rule.refundPercentage / 100) * booking.total_amount;
                                            return (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-white/40 rounded-lg border border-white/10">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">If cancelled</span>
                                                        <span className="text-sm font-bold text-gray-800">{rule.daysBefore}+ Days Before</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-black text-emerald-700">{rule.refundPercentage}% Refund</span>
                                                        <p className="text-[10px] text-emerald-600 font-bold">≈ {formatCurrency(refundAmount)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {booking.package.cancellation_rules && booking.package.cancellation_rules.length > 0 &&
                                            booking.package.cancellation_rules[booking.package.cancellation_rules.length - 1].daysBefore > 0 && (
                                                <div className="flex justify-between items-center p-3 bg-red-50/50 rounded-lg border border-red-100/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-tighter">If cancelled</span>
                                                        <span className="text-sm font-bold text-red-800">Less than {booking.package.cancellation_rules[booking.package.cancellation_rules.length - 1].daysBefore} Days</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-black text-red-700">No Refund</span>
                                                        <p className="text-[10px] text-red-600 font-bold">Non-refundable</p>
                                                    </div>
                                                </div>
                                            )}
                                        <p className="text-[10px] text-gray-400 italic mt-2">
                                            * Refund amounts are calculated based on your total booking value of {formatCurrency(booking.total_amount)}.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 text-center">
                                        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                                        <h4 className="font-bold text-red-900 text-sm">Non-Cancellable</h4>
                                        <p className="text-xs text-red-700 mt-1">This package is non-refundable once booked.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Need Help Section - Inline Strip */}
                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                    <Phone className="h-5 w-5" />
                                </div>
                                <div className="text-center sm:text-left">
                                    <p className="text-sm font-black text-blue-900">Need Help?</p>
                                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">24/7 Priority Support</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 text-sm font-bold text-gray-700">
                                <a href="tel:+9118001234567" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                                    <Phone className="h-4 w-4 text-blue-400" /> +91 1800-123-4567
                                </a>
                                <div className="hidden sm:block w-px h-4 bg-blue-200" />
                                <a href="mailto:support@toursaas.com" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                                    <Mail className="h-4 w-4 text-blue-400" /> support@toursaas.com
                                </a>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-700 hover:bg-red-100 font-bold rounded-xl gap-2"
                                onClick={fetchCancelPreview}
                                disabled={booking.status === 'cancelled' || booking.status === 'completed' || isFetchingPreview}
                            >
                                {isFetchingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Cancel Booking
                            </Button>
                        </div>

                        {/* Important Info - Urgency Checklist */}
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden rounded-2xl border-l-4 border-amber-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-black flex items-center gap-2 text-amber-900 uppercase tracking-widest">
                                    <AlertCircle className="h-4 w-4 text-amber-600" /> Before You Go — Checklist
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/40 transition-colors cursor-pointer group">
                                    <div className="h-5 w-5 rounded border-2 border-amber-200 flex-shrink-0 mt-0.5 group-hover:border-amber-500 transition-colors" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-900">Valid Passport</p>
                                        <p className="text-[10px] text-amber-700/70 font-medium">Ensure at least 6 months validity remaining</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/40 transition-colors cursor-pointer group">
                                    <div className="h-5 w-5 rounded border-2 border-amber-200 flex-shrink-0 mt-0.5 group-hover:border-amber-500 transition-colors" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-900">Airport Arrival</p>
                                        <p className="text-[10px] text-amber-700/70 font-medium">Arrive at least 3 hours before your flight</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/40 transition-colors cursor-pointer group">
                                    <div className="h-5 w-5 rounded border-2 border-amber-200 flex-shrink-0 mt-0.5 group-hover:border-amber-500 transition-colors" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-900">Check Destination Weather</p>
                                        <p className="text-[10px] text-amber-700/70 font-medium">Check local forecasts for appropriate packing</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                                    <p className="text-[10px] font-bold text-amber-800 leading-relaxed italic">
                                        * Flight details will arrive via email within 24 hours.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>

            {/* Cancellation Confirmation Dialog - Rendered at root level for backdrop coverage */}
            {isCancelDialogOpen && cancelPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => !isCancelling && setIsCancelDialogOpen(false)}
                    />

                    {/* Dialog Content */}
                    <div className="relative w-full max-w-md glass-panel shadow-2xl border border-white/40 rounded-[32px] overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Close button */}
                        <button
                            disabled={isCancelling}
                            onClick={() => setIsCancelDialogOpen(false)}
                            className="absolute right-6 top-6 h-8 w-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-black/5 hover:text-gray-900 transition-colors z-10"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="p-6">
                            {/* Header */}
                            <div className="flex gap-4 mb-4">
                                <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Cancel Booking</h3>
                                    <p className="text-xs text-blue-600 font-medium tracking-tight">
                                        {booking.package?.title} — {booking.booking_reference}
                                    </p>
                                </div>
                            </div>

                            {/* Refund Status Banner */}
                            <div className={`relative overflow-hidden rounded-[20px] p-5 text-center mb-4 transition-all duration-500 ${cancelPreview.refund_amount > 0
                                    ? 'bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200'
                                    : 'bg-gradient-to-br from-red-50 to-rose-100 border border-red-200'
                                }`}>
                                <div className={`h-10 w-10 mx-auto rounded-full flex items-center justify-center mb-2 ${cancelPreview.refund_amount > 0 ? 'bg-emerald-500' : 'bg-red-500'
                                    }`}>
                                    {cancelPreview.refund_amount > 0 ? (
                                        <Check className="h-5 w-5 text-white" />
                                    ) : (
                                        <X className="h-5 w-5 text-white" />
                                    )}
                                </div>

                                <h4 className={`text-xl font-black mb-0.5 ${cancelPreview.refund_amount > 0 ? 'text-emerald-900' : 'text-red-900'
                                    }`}>
                                    {cancelPreview.refund_amount > 0
                                        ? `₹${cancelPreview.refund_amount.toLocaleString()} Refund`
                                        : 'No Refund'}
                                </h4>
                                <p className={`text-[9px] font-black uppercase tracking-[0.2em] opacity-60 ${cancelPreview.refund_amount > 0 ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                    {cancelPreview.refund_amount > 0
                                        ? `${cancelPreview.refund_percentage}% REFUND APPLICABLE`
                                        : 'NON-REFUNDABLE POLICY'}
                                </p>
                            </div>

                            {/* Policy Message */}
                            <div className="bg-gray-100/50 backdrop-blur-md rounded-2xl p-4 mb-4 border border-gray-200/50">
                                <p className="text-xs text-gray-700 leading-relaxed text-center font-medium">
                                    {cancelPreview.message}
                                </p>
                            </div>

                            {/* Meta Info */}
                            <div className="flex items-center justify-center gap-5 mb-4 text-[10px] font-bold text-gray-400 border-b border-gray-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    <span>Travel is {cancelPreview.days_before} day(s) away</span>
                                </div>
                                <div className="h-1 w-1 rounded-full bg-gray-200" />
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-3 w-3" />
                                    <span>Amount paid: ₹{cancelPreview.paid_amount.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Warning Note */}
                            {!cancelPreview.cancellation_enabled && (
                                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 mb-6 flex gap-2.5 text-amber-800">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-bold leading-tight">This package does not have a cancellation policy configured.</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="ghost"
                                    disabled={isCancelling}
                                    onClick={() => setIsCancelDialogOpen(false)}
                                    className="h-11 rounded-xl font-bold bg-gray-100/50 hover:bg-gray-200 text-gray-700 border-0 text-sm"
                                >
                                    Keep Booking
                                </Button>
                                <Button
                                    disabled={isCancelling}
                                    onClick={handleCancelBooking}
                                    className="h-11 rounded-xl font-black bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/20 border-0 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    {isCancelling ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Cancelling...
                                        </>
                                    ) : (
                                        <>
                                            <X className="h-4 w-4" />
                                            Confirm Cancel
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
