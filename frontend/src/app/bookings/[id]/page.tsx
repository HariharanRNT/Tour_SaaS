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
import { calculateRefundAmount, getFareTypeLabel } from '@/utils/cancellationUtils'
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
        fare_type: string | null;
        message: string;
    } | null>(null)

    const [gstSettings, setGstSettings] = useState({ inclusive: false, percentage: 18 })

    useEffect(() => {
        if (params.id) {
            loadBooking(params.id as string)
        }
    }, [params.id])

    const loadBooking = async (id: string) => {
        try {
            const data = await bookingsAPI.getById(id)
            setBooking(data)

            // Fetch agent GST settings as fallback
            try {
                const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
                const res = await fetch('/api/v1/agent-settings/public', { headers: { 'X-Domain': domain } })
                if (res.ok) {
                    const settings = await res.json()
                    setGstSettings({ inclusive: settings.gst_inclusive, percentage: settings.gst_percentage })
                }
            } catch (e) {
                console.error("Failed to load fallback GST settings", e)
            }
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
                    text: 'text-black',
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
            <div className="relative min-h-[500px] w-full group overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={heroImage}
                        alt={booking.package?.destination || 'Destination'}
                        className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
                </div>

                <div className="container mx-auto px-4 h-full relative flex flex-col justify-between py-8">
                    {/* Top Navigation Row */}
                    <div className="flex justify-between items-center animate-fade-in mb-8">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/bookings')}
                            className="glass-pill-chip bg-black/5 hover:bg-black/10 border-black/10 text-black pl-3 pr-5 h-11 group"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
                            <span className="text-xs font-black uppercase tracking-[0.15em]">My Bookings</span>
                        </Button>
                        
                        <div className="hidden md:flex gap-3">
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl glass-pill-chip bg-white/40 border-white/60 hover:bg-white/60">
                                <Share2 className="h-4 w-4 text-black" />
                            </Button>
                            <Button variant="ghost" onClick={handleDownloadInvoice} className="h-11 px-6 rounded-2xl glass-pill-chip bg-white/40 border-white/60 hover:bg-white/60 font-black text-[10px] uppercase tracking-widest text-black">
                                <Download className="h-4 w-4 mr-2" /> Invoice
                            </Button>
                        </div>
                    </div>

                    {/* Unified Hero Card */}
                    <div className="w-full mt-auto pb-8">
                        <div className="glass-card-refinement bg-white/50 border-white/40 backdrop-blur-md shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] rounded-[48px] overflow-hidden">
                            <div className="p-8 md:p-12">
                                <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
                                    {/* Left: Title & Meta */}
                                    <div className="flex-1 space-y-10">
                                        <div>
                                            <h1 className="text-4xl md:text-7xl font-black text-[#0f172a] mb-8 tracking-tighter leading-[1.05] animate-in slide-in-from-left duration-700 capitalize">
                                                {booking.package?.title || 'Custom Trip Package'}
                                            </h1>

                                            <div className="flex flex-wrap items-center gap-y-6 gap-x-12 text-black text-sm md:text-base font-black">
                                                <div className="flex items-center gap-4 group/meta">
                                                    <div className="h-12 w-12 rounded-[20px] bg-blue-600/10 flex items-center justify-center border border-blue-600/20 shadow-sm group-hover/meta:scale-110 transition-transform">
                                                        <MapPin className="h-6 w-6 text-blue-600" />
                                                    </div>
                                                    <span className="uppercase tracking-[0.2em] text-xs font-black">{booking.package?.destination || 'Destination'}</span>
                                                </div>
                                                <div className="flex items-center gap-4 group/meta">
                                                    <div className="h-12 w-12 rounded-[20px] bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20 shadow-sm group-hover/meta:scale-110 transition-transform">
                                                        <Calendar className="h-6 w-6 text-indigo-600" />
                                                    </div>
                                                    <span className="uppercase tracking-[0.2em] text-xs font-black">{formatDate(booking.travel_date)}</span>
                                                </div>
                                                <div className="flex items-center gap-4 group/meta">
                                                    <div className="h-12 w-12 rounded-[20px] bg-purple-600/10 flex items-center justify-center border border-purple-600/20 shadow-sm group-hover/meta:scale-110 transition-transform">
                                                        <Clock className="h-6 w-6 text-purple-600" />
                                                    </div>
                                                    <span className="uppercase tracking-[0.2em] text-xs font-black">{booking.package?.duration_days}D / {booking.package?.duration_nights}N</span>
                                                </div>
                                                <div className="flex items-center gap-4 group/meta">
                                                    <div className="h-12 w-12 rounded-[20px] bg-emerald-600/10 flex items-center justify-center border border-emerald-600/20 shadow-sm group-hover/meta:scale-110 transition-transform">
                                                        <Users className="h-6 w-6 text-emerald-600" />
                                                    </div>
                                                    <span className="uppercase tracking-[0.2em] text-xs font-black">{booking.number_of_travelers} Traveler{booking.number_of_travelers > 1 ? 's' : ''}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Badges & Actions */}
                                    <div className="flex flex-col items-start lg:items-end gap-10 min-w-fit">
                                        {/* Status & REF Column */}
                                        <div className="flex flex-col gap-4 w-full">
                                            <div className={`glass-pill-chip h-14 pl-6 pr-8 shadow-md border-2 transition-all duration-500 scale-105 ${
                                                booking.status === 'confirmed' 
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 shadow-[0_0_30px_rgba(16,185,129,0.2)]' 
                                                : 'bg-white/60 border-black/10 text-black'
                                            }`}>
                                                <div className={`h-2.5 w-2.5 rounded-full mr-4 ${
                                                    booking.status === 'confirmed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-black'
                                                } animate-pulse-soft`} />
                                                <span className="text-xs font-black tracking-[0.3em] uppercase">
                                                    {statusConfig.label}
                                                </span>
                                            </div>

                                            <div className="glass-pill-chip bg-white/80 backdrop-blur-md border-black/10 h-14 pl-6 pr-8 shadow-sm group/ref">
                                                <div>
                                                    <p className="text-[9px] text-blue-600 font-black uppercase tracking-[0.3em] mb-0.5">Booking Reference</p>
                                                    <p className="font-mono font-black text-base text-black tracking-tight">{booking.booking_reference}</p>
                                                </div>
                                                <button
                                                    className="ml-6 p-2 hover:bg-blue-600/10 rounded-xl transition-all hover:scale-110"
                                                    onClick={() => copyToClipboard(booking.booking_reference)}
                                                >
                                                    <Copy className="h-4 w-4 text-blue-600" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Unified Action Footer (Internal) */}
                                        <div className="flex items-center gap-3 w-full lg:w-fit p-1.5 bg-black/5 rounded-[22px] border border-black/5">
                                            <Button
                                                variant="ghost"
                                                className="flex-1 lg:flex-none bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 border-blue-600/10 gap-2.5 h-12 px-8 rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all hover:scale-105 active:gap-1.5"
                                                disabled
                                            >
                                                <Edit className="h-3.5 w-3.5" /> Modify
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                className="flex-1 lg:flex-none bg-red-600/10 hover:bg-red-600/20 text-red-700 border-red-600/10 gap-2.5 h-12 px-8 rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all hover:scale-105 active:gap-1.5"
                                                disabled={booking.status === 'cancelled' || booking.status === 'completed' || isFetchingPreview}
                                                onClick={fetchCancelPreview}
                                            >
                                                {isFetchingPreview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-8 relative z-10 pb-16">

                {/* Main Content Grid 60/40 */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* LEFT COLUMN (Main Details) - spans 3 columns (60%) */}
                    <div className="lg:col-span-3 space-y-8">

                        {/* Package Details Card */}
                        <Card className="glass-card-refinement bg-white/40 border-black/10 overflow-hidden group shadow-lg">
                            <CardContent className="p-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 border-b border-black/5 pb-8">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">Package Overview</h2>
                                        <p className="text-black text-sm font-black flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-blue-600" /> Trip starts on {formatDate(booking.travel_date)}
                                        </p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="glass-pill-chip px-5 py-3 h-auto flex flex-col items-center min-w-[100px] border-blue-600/20 bg-blue-600/5">
                                            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-1">Duration</p>
                                            <p className="font-black text-lg text-black">{booking.package?.duration_days}D / {booking.package?.duration_nights}N</p>
                                        </div>
                                        <div className="glass-pill-chip px-5 py-3 h-auto flex flex-col items-center min-w-[100px] border-purple-600/20 bg-purple-600/5">
                                            <p className="text-[10px] text-purple-600 font-black uppercase tracking-widest mb-1">Travelers</p>
                                            <p className="font-black text-lg text-black">{booking.number_of_travelers}</p>
                                        </div>
                                    </div>
                                </div>

                                {booking.package?.included_items && booking.package.included_items.length > 0 ? (
                                    <div className="space-y-6">
                                        <h4 className="font-black text-black flex items-center gap-2 text-[10px] uppercase tracking-[0.25em]">
                                            <CheckCircle className="h-4 w-4 text-emerald-600" /> Package Inclusions
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {booking.package.included_items.map((item, i) => (
                                                <div key={i} className="flex items-center gap-4 p-4 glass-card-refinement border-white/40 bg-white/40 group/item hover:bg-white/60 transition-all rounded-2xl shadow-sm">
                                                    <div className="flex-shrink-0 h-7 w-7 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 border border-emerald-600/20 shadow-sm">
                                                        <Check className="h-4 w-4 stroke-[3]" />
                                                    </div>
                                                    <span className="font-black text-xs text-black uppercase tracking-wide">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>



                        <Card className="glass-card-refinement bg-white/40 border-black/10 overflow-hidden shadow-xl backdrop-blur-md">
                            <CardHeader className="bg-black/[0.03] border-b border-black/5 pb-6 pt-8 px-8">
                                <CardTitle className="text-xl font-black flex items-center gap-4 text-black uppercase tracking-[0.25em]">
                                    <MapPin className="h-6 w-6 text-indigo-600" /> Itinerary Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                {booking.package?.itinerary_items && booking.package.itinerary_items.length > 0 ? (
                                    <div className="space-y-5">
                                        {Object.entries(
                                            booking.package.itinerary_items.reduce((acc, item) => {
                                                const day = item.day_number;
                                                if (!acc[day]) acc[day] = [];
                                                acc[day].push(item);
                                                return acc;
                                            }, {} as Record<number, typeof booking.package.itinerary_items>)
                                        ).sort(([a], [b]) => Number(a) - Number(b)).map(([day, items], idx) => (
                                            <details key={day} className="group glass-card-refinement bg-white/10 border-white/20 overflow-hidden rounded-[32px] shadow-sm" open={idx === 0}>
                                                <summary className="flex items-center justify-between p-6 cursor-pointer list-none group-open:bg-black/[0.02] transition-colors">
                                                    <div className="flex items-center gap-6">
                                                        <div className="bg-indigo-600 text-white h-14 w-14 rounded-3xl flex flex-col items-center justify-center shadow-[0_8px_24px_rgba(79,70,229,0.3)] border border-white/30">
                                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Day</span>
                                                            <span className="text-2xl font-black leading-none">{day}</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-black text-xl tracking-tight">{items[0].title}</h4>
                                                            <div className="flex items-center gap-3 mt-1.5">
                                                                <div className="h-2 w-2 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
                                                                <p className="text-[11px] font-black text-black uppercase tracking-[0.2em]">{items.length} Planned Activities</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center p-2 glass-pill-chip group-open:rotate-180 transition-all bg-white/60 border-black/5 group-open:text-indigo-600 group-open:border-indigo-600/30 group-open:shadow-inner">
                                                        <MoreHorizontal className="h-6 w-6" />
                                                    </div>
                                                </summary>
                                                <div className="px-6 pb-8 pt-4 border-t border-black/5 space-y-8 relative overflow-hidden">
                                                    <div className="absolute left-[43px] top-8 bottom-12 w-0.5 bg-gradient-to-b from-indigo-600 via-indigo-600/20 to-transparent opacity-30" />
                                                    {items.map((item, i) => (
                                                        <div key={item.id} className="relative pl-16 group/activity">
                                                            <div className="absolute left-[39.5px] top-2 h-2.5 w-2.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)] z-10" />
                                                            <div className="p-6 glass-card-refinement border-white/40 bg-white/40 hover:bg-white/60 border-l-4 border-l-indigo-600/40 transition-all rounded-3xl shadow-sm relative">
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-2 w-2 rounded-full bg-indigo-600" />
                                                                        <h5 className="text-[11px] font-black text-black uppercase tracking-[0.25em]">
                                                                            {item.title}
                                                                        </h5>
                                                                    </div>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-indigo-600/10 mr-1">
                                                                        <MoreHorizontal className="h-4 w-4 text-black" />
                                                                    </Button>
                                                                </div>
                                                                <p className="text-sm text-black leading-relaxed font-black opacity-90">{item.description}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16 glass-card-refinement border-black/10 border-dashed bg-black/[0.01]">
                                        <MapPin className="h-12 w-12 text-blue-600/20 mx-auto mb-4" />
                                        <p className="text-black font-black uppercase tracking-[0.2em] text-sm leading-loose text-center">
                                            Detailed itinerary will be<br />available 48 hours before<br />departure.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Flight Information */}
                        {booking.package?.flights_enabled && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-black text-black flex items-center gap-3 uppercase tracking-wider">
                                    <Plane className="h-6 w-6 text-blue-600" /> Flight Information
                                </h3>

                                {flightConfirmation ? (
                                    <div className="glass-card-refinement bg-white/40 border-white/60 overflow-hidden shadow-lg">
                                        <div className="bg-blue-600/10 backdrop-blur-md px-8 py-4 flex justify-between items-center border-b border-black/5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse-soft" />
                                                <span className="text-xs font-black text-blue-700 uppercase tracking-[0.2em]">Confirmed Flight Details</span>
                                            </div>
                                            <div className="glass-pill-chip bg-blue-600/10 border-blue-600/20">
                                                <span className="text-[10px] text-blue-800 font-black">PNR:</span>
                                                <span className="text-black font-mono font-bold ml-1">{flightConfirmation.pnr || 'GENERATED'}</span>
                                            </div>
                                        </div>
                                        <div className="p-8">
                                            <div className="space-y-8">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-5">
                                                        <span className="glass-pill-chip bg-black/5 text-[10px] uppercase font-black tracking-tighter text-black">Outbound</span>
                                                        <span className="text-sm font-black text-black">{formatDate(booking.travel_date)}</span>
                                                    </div>
                                                    <div className="flex flex-col md:flex-row justify-between items-center glass-card-refinement border-black/5 bg-black/[0.02] p-8">
                                                        <div className="text-center md:text-left mb-6 md:mb-0">
                                                            <p className="text-4xl font-black text-black tracking-tighter">{flightConfirmation.from_code || 'MAA'}</p>
                                                            <p className="text-xs font-black text-blue-600 uppercase tracking-widest mt-1">{flightConfirmation.from_city || 'Chennai'}</p>
                                                            <div className="glass-pill-chip mt-3 bg-black/5 border-black/10">
                                                                <Clock className="h-3 w-3 text-blue-600" />
                                                                <span className="text-[10px] font-black text-black">{flightConfirmation.departure_time || '10:30 AM'}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex-1 px-12 flex flex-col items-center max-w-[280px]">
                                                            <div className="w-full flex items-center justify-between relative text-black">
                                                                <div className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                                                                <div className="flex-1 h-px bg-gradient-to-r from-blue-600 via-indigo-400 to-indigo-600 mx-2 opacity-30" />
                                                                <div className="p-2 glass-pill-chip bg-indigo-600/10 border-indigo-600/20">
                                                                    <Plane className="h-5 w-5 text-indigo-600 rotate-90" />
                                                                </div>
                                                                <div className="flex-1 h-px bg-gradient-to-r from-indigo-600 to-purple-400 mx-2 opacity-30" />
                                                                <div className="h-2.5 w-2.5 rounded-full bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.3)]" />
                                                            </div>
                                                            <p className="text-[10px] font-black text-black mt-4 uppercase tracking-[0.3em] opacity-80">{flightConfirmation.duration || '2h 45m'}</p>
                                                        </div>

                                                        <div className="text-center md:text-right mt-6 md:mt-0">
                                                            <p className="text-4xl font-black text-black tracking-tighter">{flightConfirmation.to_code || 'DEL'}</p>
                                                            <p className="text-xs font-black text-purple-600 uppercase tracking-widest mt-1">{flightConfirmation.to_city || 'Delhi'}</p>
                                                            <div className="glass-pill-chip mt-3 bg-black/5 border-black/10">
                                                                <Clock className="h-3 w-3 text-purple-600" />
                                                                <span className="text-[10px] font-black text-black">{flightConfirmation.arrival_time || '1:15 PM'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="glass-card-refinement bg-white/40 border-white/60 overflow-hidden shadow-lg p-10 text-center">
                                        <div className="inline-flex h-20 w-20 bg-blue-600/10 rounded-3xl items-center justify-center mb-6 border border-blue-600/20 relative group">
                                            <div className="absolute inset-0 bg-blue-600/10 blur-2xl rounded-full scale-50 group-hover:scale-100 transition-transform" />
                                            <Plane className="h-10 w-10 text-blue-600 animate-pulse-soft relative" />
                                        </div>
                                        <h4 className="text-2xl font-black text-black tracking-tight mb-2 uppercase">Flight Finalization</h4>
                                        <p className="text-black text-sm font-bold max-w-sm mx-auto leading-relaxed mb-10">We are currently securing your flight path. Final arrangements will be updated within 24 hours.</p>

                                        {/* Progress Steps */}
                                        <div className="flex justify-between items-start max-w-md mx-auto relative mb-8">
                                            <div className="absolute top-6 left-0 right-0 h-0.5 bg-black/5 z-0" />
                                            <div className="absolute top-6 left-0 w-1/2 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 z-0" />

                                            <div className="flex flex-col items-center z-10 w-1/3">
                                                <div className="h-12 w-12 glass-pill-chip bg-emerald-600/10 border-emerald-600/20 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                                    <Check className="h-6 w-6 stroke-[3]" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-4 text-center">Verified</span>
                                            </div>

                                            <div className="flex flex-col items-center z-10 w-1/3">
                                                <div className="h-12 w-12 glass-pill-chip bg-blue-600/10 border-blue-600/20 text-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.15)] animate-pulse-soft">
                                                    <Clock className="h-6 w-6" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-4 text-center">Finalizing</span>
                                            </div>

                                            <div className="flex flex-col items-center z-10 w-1/3">
                                                <div className="h-12 w-12 glass-pill-chip bg-black/5 border-black/10 text-black">
                                                    <div className="h-2.5 w-2.5 rounded-full bg-black" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-black mt-4 text-center">Dispatched</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-12 mb-6">
                            <div className="glass-card-refinement bg-black/[0.03] border-black/5 px-8 py-3 rounded-2xl backdrop-blur-md flex items-center gap-4">
                                <Users className="h-6 w-6 text-purple-600" />
                                <h3 className="text-base font-black text-black uppercase tracking-[0.25em]">Traveler Roster</h3>
                                <div className="h-1 w-16 bg-purple-600/30 rounded-full ml-6" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {booking.travelers?.map((traveler, index) => (
                                <div key={traveler.id} className={`glass-card-refinement bg-white/40 border-black/10 p-10 flex items-start gap-8 relative group hover:scale-[1.02] transition-all duration-500 rounded-[40px] shadow-lg ${booking.travelers?.length === 1 ? 'md:col-span-2' : ''}`}>
                                    <div className="flex flex-col items-start gap-6 shrink-0">
                                        <div className="h-20 w-20 rounded-[28px] bg-purple-600/10 flex items-center justify-center text-purple-600 border border-purple-600/20 group-hover:scale-110 transition-transform duration-700 shadow-sm">
                                            <span className="text-2xl font-black uppercase text-purple-800">{traveler.first_name[0]}{traveler.last_name[0]}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 pt-2">
                                        <div className="flex flex-col items-start mb-10 gap-3">
                                            <h4 className="font-black text-[#0f172a] text-2xl tracking-tight leading-tight">{traveler.first_name} {traveler.last_name}</h4>
                                            {traveler.is_primary && (
                                                <div className="glass-pill-chip bg-purple-600/10 border-purple-600/20 text-[10px] px-4 py-2 uppercase font-black text-purple-800 shadow-xs">Primary Contact</div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="flex items-center justify-between py-1.5 border-b border-black/8">
                                                <span className="text-[11px] font-black text-black uppercase tracking-[0.25em]">Category</span>
                                                <span className="text-xs font-black text-black uppercase tracking-widest">{traveler.date_of_birth ? 'Adult' : 'Child'}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-1.5 border-b border-black/8">
                                                <span className="text-[11px] font-black text-black uppercase tracking-[0.25em]">Gender</span>
                                                <span className="text-xs font-black text-black uppercase tracking-widest">{traveler.gender}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-1.5">
                                                <span className="text-[11px] font-black text-black uppercase tracking-[0.25em]">Region</span>
                                                <span className="text-xs font-black text-black uppercase tracking-widest">{traveler.nationality}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>


                    </div>


                    {/* RIGHT COLUMN (Sidebar) - spans 2 columns (40%) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Payment Summary */}
                        <Card className="glass-card-refinement bg-white/40 border-white/60 overflow-hidden shadow-lg">
                            <CardHeader className="bg-black/5 border-b border-black/5 pb-6 pt-8 px-8">
                                <CardTitle className="text-xl font-black flex items-center gap-3 text-black uppercase tracking-wider">
                                    <CreditCard className="h-6 w-6 text-blue-600" /> Payment Summary
                                </CardTitle>
                            </CardHeader>
                             <CardContent className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm font-black">
                                        <span className="text-black uppercase tracking-widest text-[10px]">Package Base Cost</span>
                                        <span className="text-black font-mono">{formatCurrency(booking.total_amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-black">
                                        <span className="text-black uppercase tracking-widest text-[10px]">Taxes & Service Fees</span>
                                        <div className="glass-pill-chip bg-emerald-600/10 border-emerald-600/20 text-emerald-700 text-[9px] uppercase font-black">Inclusive</div>
                                    </div>
                                </div>
                                
                                <div className="h-px bg-gradient-to-r from-transparent via-black/5 to-transparent" />
                                
                                <div className="flex justify-between items-baseline py-2">
                                    <span className="font-black text-xs text-slate-800 uppercase tracking-[0.2em]">Total Investment</span>
                                    <span className="font-black text-4xl tracking-tighter transition-all duration-500 hover:scale-105 inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                        {formatCurrency(booking.total_amount)}
                                    </span>
                                </div>

                                 <div className="glass-card-refinement border-black/5 bg-black/[0.02] p-5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-black font-black uppercase tracking-widest">Transaction Status</span>
                                        <div className="glass-pill-chip bg-emerald-600/10 border-emerald-600/20">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.4)]" />
                                            <span className="text-[10px] font-black text-emerald-700 uppercase ml-1">
                                                {booking.payment_status === 'succeeded' ? 'SUCCESS' : booking.payment_status?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-black font-black uppercase tracking-widest">Timestamp</span>
                                        <span className="text-[10px] font-black text-black uppercase tracking-widest">{formatDate(booking.created_at)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Refund Status Card */}
                        {booking.status === 'cancelled' && (booking.refund_amount || 0) > 0 ? (() => {
                            const refund = booking.refund
                            const refundStatus: string = refund?.status || 'pending'
                            const refundId: string | null = refund?.razorpay_refund_id || null
                            const refundAmount: number = Number(booking.refund_amount || 0)

                            const statusSpecs: Record<string, { tint: string; border: string; text: string; label: string; icon: any }> = {
                                succeeded: { tint: 'bg-emerald-600/5', border: 'border-emerald-600/20', text: 'text-emerald-700', label: 'Refund Completed', icon: CheckCircle },
                                failed: { tint: 'bg-red-600/5', border: 'border-red-600/20', text: 'text-red-700', label: 'Refund Failed', icon: XCircle },
                                pending: { tint: 'bg-amber-600/5', border: 'border-amber-600/20', text: 'text-amber-700', label: 'Processing Refund', icon: Clock },
                                initiated: { tint: 'bg-amber-600/5', border: 'border-amber-600/20', text: 'text-amber-700', label: 'Payment Initiated', icon: Clock },
                            }
                            const spec = statusSpecs[refundStatus] || statusSpecs.pending
                            const IconComp = spec.icon

                            return (
                                <Card className={`glass-card-refinement border-white/60 bg-white/40 overflow-hidden shadow-lg ${spec.tint.replace('600/5', '100/10')}`}>
                                    <CardHeader className="border-b border-black/5 pb-4 px-8">
                                        <CardTitle className={`text-sm font-black flex items-center gap-2 uppercase tracking-widest ${spec.text}`}>
                                            <Receipt className="h-4 w-4" /> Refund Logistics
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-6">
                                        {/* Main Status Block */}
                                        <div className={`p-6 glass-card-refinement border-black/5 bg-black/[0.02] flex items-center justify-between`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`h-12 w-12 rounded-2xl ${spec.tint} border ${spec.border} flex items-center justify-center ${spec.text}`}>
                                                    <IconComp className="h-6 w-6" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className={`text-sm font-black uppercase tracking-widest ${spec.text}`}>{spec.label}</p>
                                                    <p className="text-[10px] font-black text-black uppercase tracking-tighter">REF: {booking.booking_reference}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1">Return Value</p>
                                                <p className={`text-2xl font-black tracking-tighter ${spec.text}`}>₹{refundAmount.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>

                                        {refundId && (
                                            <div className="flex justify-between items-center glass-pill-chip w-full py-2.5 px-4 bg-black/5 border-black/10">
                                                <span className="text-[10px] font-black text-black uppercase tracking-widest">Gateway Refund ID</span>
                                                <span className="font-mono text-[10px] text-black font-black">{refundId}</span>
                                            </div>
                                        )}

                                        <div className={`p-4 glass-card-refinement border-black/5 bg-black/[0.01] flex gap-3 text-[11px] font-black leading-relaxed ${refundStatus === 'failed' ? 'text-red-700' : 'text-black'}`}>
                                            <span className="h-4 w-4 shrink-0 mt-0.5 opacity-60">⚠️</span>
                                            <span>
                                                {refundStatus === 'succeeded' 
                                                    ? "Funds have been released. Credit will reflect in your account within 5–7 business days per banking standards." 
                                                    : refundStatus === 'failed'
                                                    ? "An error occurred during fund release. Our recovery team has been notified. Please quote your Refund ID for support."
                                                    : "Security audit in progress. Funds will be routed to your original payment method within the next 48–72 hours."}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })() : null}


                        {/* Cancellation Policy */}
                        <Card className="glass-card-warning-red border-red-200 bg-red-50/30 overflow-hidden shadow-lg">
                            <CardHeader className="bg-red-600/5 border-b border-red-600/10 pb-6 pt-8 px-8">
                                <CardTitle className="text-xl font-black flex items-center gap-3 text-red-700 uppercase tracking-wider">
                                    <XCircle className="h-6 w-6 animate-pulse-soft" /> Cancellation Terms
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                {booking.package?.cancellation_enabled ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2.5 text-emerald-700 mb-2">
                                            <div className="h-5 w-5 rounded-full bg-emerald-600/10 flex items-center justify-center border border-emerald-600/20">
                                                <Check className="h-3 w-3 stroke-[3]" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cancellable Package</span>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {booking.package.cancellation_rules?.map((rule: any, idx: number) => {
                                                const isGstApplicable = booking.package?.gst_applicable !== null && booking.package?.gst_applicable !== undefined
                                                    ? Boolean(booking.package.gst_applicable)
                                                    : Boolean(gstSettings);
                                                const activeGstPct = booking.package?.gst_percentage || gstSettings.percentage || 0;
                                                let baseFare = Number(booking.total_amount);
                                                let gstAmount = 0;
                                                if (isGstApplicable && activeGstPct > 0) {
                                                    baseFare = Number(booking.total_amount) / (1 + (activeGstPct / 100));
                                                    gstAmount = Number(booking.total_amount) - baseFare;
                                                }
                                                const refundAmount = calculateRefundAmount(rule, baseFare, gstAmount, isGstApplicable);
                                                const fareLabel = getFareTypeLabel(rule.fareType, isGstApplicable, rule.refundPercentage);

                                                if (rule.refundPercentage === 0) {
                                                    return (
                                                        <div key={idx} className="glass-card-refinement border-black/10 bg-black/5 p-8 flex justify-between items-center group/rule rounded-[28px] opacity-60">
                                                            <div>
                                                                <p className="text-[11px] text-black font-black uppercase tracking-[0.3em] mb-2">Window</p>
                                                                <p className="text-2xl font-black text-black tracking-tight">{rule.daysBefore}+ Days Prior</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-3xl font-black text-black tracking-tighter mb-1 line-through opacity-50">₹0 Return</p>
                                                                <div className="glass-pill-chip bg-black/10 border-black/10 text-[10px] font-black text-black uppercase px-4 py-1.5 tracking-widest">No Refund Applied</div>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={idx} className="glass-card-refinement border-white/40 bg-white/20 p-8 flex justify-between items-center hover:bg-white/40 transition-all group/rule rounded-[28px] shadow-sm">
                                                        <div>
                                                            <p className="text-[11px] text-red-600 font-black uppercase tracking-[0.3em] mb-2 group-hover/rule:text-red-700 transition-colors">Window</p>
                                                            <p className="text-2xl font-black text-black tracking-tight">{rule.daysBefore}+ Days Prior</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-4xl font-black text-emerald-700 tracking-tighter mb-1">{rule.refundPercentage}% Return</p>
                                                            <div className="flex items-center justify-end gap-2 mt-1.5 font-black text-black uppercase tracking-widest text-[10px]">
                                                                <span className="opacity-60">{fareLabel}</span>
                                                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                                <span>≈ {formatCurrency(refundAmount)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            
                                            {/* Final No-Refund fallback */}
                                            {booking.package.cancellation_rules && booking.package.cancellation_rules.length > 0 &&
                                                booking.package.cancellation_rules[booking.package.cancellation_rules.length - 1].daysBefore > 0 &&
                                                !booking.package.cancellation_rules.some((r: any) => r.refundPercentage === 0) && (
                                                    <div className="glass-card-refinement border-red-600/10 bg-red-600/5 p-8 flex justify-between items-center rounded-[28px] opacity-90">
                                                        <div>
                                                            <p className="text-[11px] text-red-600/60 font-black uppercase tracking-[0.3em] mb-2">Window</p>
                                                            <p className="text-2xl font-black text-black tracking-tight">Under {booking.package.cancellation_rules[booking.package.cancellation_rules.length - 1].daysBefore} Days</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-3xl font-black text-red-700 tracking-tighter uppercase mb-1">No Refund</p>
                                                            <p className="text-[10px] font-black text-red-700/50 uppercase tracking-[0.2em]">Locked Policy</p>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>

                                        <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5">
                                            <p className="text-[10px] text-black font-black italic leading-relaxed">
                                                * Estimated refund values are calculated based on your total transaction. The final amount may vary slightly due to gateway rounding.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="glass-card-refinement border-red-600/10 bg-red-600/5 p-12 text-center rounded-[40px]">
                                        <div className="h-20 w-20 bg-red-600/10 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-8 border border-red-600/20 shadow-[0_0_30px_rgba(220,38,38,0.1)]">
                                            <AlertCircle className="h-10 w-10 animate-pulse-soft" />
                                        </div>
                                        <h4 className="text-2xl font-black text-black tracking-tight uppercase mb-4">Non-Cancellable</h4>
                                        <p className="text-xs font-black text-black max-w-[240px] mx-auto leading-relaxed uppercase tracking-[0.15em] opacity-80">
                                            Strict non-refundable policy applied to this package.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Need Help Section - Inline Strip */}
                        <div className="glass-card-refinement bg-white/40 border-black/10 p-10 flex flex-col md:flex-row items-center justify-between gap-10 rounded-[48px] shadow-lg backdrop-blur-md transition-all hover:bg-white/60 group/help overflow-hidden">
                            <div className="flex items-center gap-8 min-w-0">
                                <div className="h-20 w-20 rounded-[32px] bg-blue-600/10 flex items-center justify-center text-blue-600 border border-blue-600/20 shadow-sm group-hover/help:scale-110 transition-transform duration-500 shrink-0">
                                    <Phone className="h-9 w-9" />
                                </div>
                                <div className="text-center md:text-left min-w-0">
                                    <p className="text-xl font-black text-[#0f172a] uppercase tracking-[0.1em] truncate">Priority Support</p>
                                    <p className="text-[11px] text-blue-600 font-black uppercase tracking-[0.3em] mt-2 truncate">24/7 Dedicated Concierge</p>
                                </div>
                            </div>
                            
                            <div className="hidden md:block w-px h-16 bg-black/10 mx-4 shrink-0" />

                            <div className="flex flex-col items-center md:items-end gap-4 font-black text-black min-w-0 max-w-full md:max-w-fit">
                                <a href="tel:+9118001234567" className="flex items-center gap-4 hover:text-blue-600 transition-all text-lg tracking-tight hover:scale-105 truncate max-w-full">
                                    <Phone className="h-5 w-5 text-blue-600/60 shrink-0" /> <span className="truncate">+91 1800-123-4567</span>
                                </a>
                                <a href="mailto:support@toursaas.com" className="flex items-center gap-4 hover:text-blue-600 transition-all text-[10px] opacity-60 tracking-[0.2em] hover:scale-105 truncate max-w-full">
                                    <Mail className="h-5 w-5 text-blue-600/60 shrink-0" /> <span className="truncate">support@toursaas.com</span>
                                </a>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Cancellation Confirmation Dialog */}
            {isCancelDialogOpen && cancelPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => !isCancelling && setIsCancelDialogOpen(false)}
                    />

                    {/* Dialog Content */}
                    <div className="relative w-full max-w-lg glass-card-refinement bg-white/90 shadow-[0_32px_128px_rgba(0,0,0,0.2)] border border-white/60 rounded-[40px] overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Close button */}
                        <button
                            disabled={isCancelling}
                            onClick={() => setIsCancelDialogOpen(false)}
                            className="absolute right-8 top-8 h-10 w-10 rounded-full flex items-center justify-center text-black/40 hover:bg-black/5 hover:text-black transition-all z-10 border border-black/5"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="p-10">
                            {/* Header */}
                            <div className="flex gap-6 mb-8">
                                <div className="h-14 w-14 rounded-2xl bg-red-600/10 flex items-center justify-center text-red-600 shrink-0 border border-red-600/20">
                                    <AlertCircle className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-black tracking-tight">Initiate Cancellation</h3>
                                    <p className="text-xs text-red-600 font-black uppercase tracking-[0.2em] mt-1">
                                        REF: {booking.booking_reference}
                                    </p>
                                </div>
                            </div>

                            {/* Refund Status Banner */}
                            <div className={`relative overflow-hidden rounded-[32px] p-8 text-center mb-8 transition-all duration-700 ${cancelPreview.refund_amount > 0
                                ? 'bg-emerald-600/5 border border-emerald-600/20 shadow-[inset_0_0_40px_rgba(16,185,129,0.05)]'
                                : 'bg-red-600/5 border border-red-600/20 shadow-[inset_0_0_40px_rgba(220,38,38,0.05)]'
                                }`}>
                                <div className={`h-16 w-16 mx-auto rounded-3xl flex items-center justify-center mb-6 border ${cancelPreview.refund_amount > 0 ? 'bg-emerald-600/20 border-emerald-600/40 text-emerald-600' : 'bg-red-600/20 border-red-600/40 text-red-600'
                                    }`}>
                                    {cancelPreview.refund_amount > 0 ? (
                                        <Check className="h-8 w-8 stroke-[3]" />
                                    ) : (
                                        <X className="h-8 w-8 stroke-[3]" />
                                    )}
                                </div>

                                <h4 className={`text-5xl font-black mb-2 tracking-tighter ${cancelPreview.refund_amount > 0 ? 'text-emerald-700' : 'text-red-700'
                                    }`}>
                                    {cancelPreview.refund_amount > 0
                                        ? formatCurrency(cancelPreview.refund_amount)
                                        : 'Final Terms'}
                                </h4>
                                <p className={`text-[10px] font-black uppercase tracking-[0.4em] opacity-60 ${cancelPreview.refund_amount > 0 ? 'text-emerald-700' : 'text-red-700'
                                    }`}>
                                    {cancelPreview.refund_amount > 0
                                        ? `${cancelPreview.refund_percentage}% REFUNDABLE VALUE`
                                        : 'NON-REFUNDABLE TRANSACTION'}
                                </p>
                            </div>

                            {/* Policy Message */}
                            <div className="bg-black/5 backdrop-blur-md rounded-3xl p-6 mb-8 border border-black/5">
                                <p className="text-sm text-black leading-relaxed text-center font-black">
                                    {cancelPreview.message}
                                </p>
                            </div>

                            {/* Meta Info */}
                            <div className="flex items-center justify-center gap-8 mb-10 text-[10px] font-black text-black border-b border-black/5 pb-8">
                                <div className="flex items-center gap-2.5">
                                    <Calendar className="h-4 w-4" />
                                    <span className="uppercase tracking-widest">{cancelPreview.days_before} DAYS UNTIL TRAVEL</span>
                                </div>
                                <div className="h-1.5 w-1.5 rounded-full bg-black/10" />
                                <div className="flex items-center gap-2.5">
                                    <CreditCard className="h-4 w-4" />
                                    <span className="uppercase tracking-widest">PAID: {formatCurrency(cancelPreview.paid_amount)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    variant="ghost"
                                    disabled={isCancelling}
                                    onClick={() => setIsCancelDialogOpen(false)}
                                    className="h-14 rounded-2xl font-black bg-black/5 hover:bg-black/10 text-black border border-black/5 text-sm uppercase tracking-widest transition-all"
                                >
                                    Stay Active
                                </Button>
                                <Button
                                    disabled={isCancelling}
                                    onClick={handleCancelBooking}
                                    className="h-14 rounded-2xl font-black bg-red-600 hover:bg-red-500 text-white shadow-[0_12px_40px_rgba(220,38,38,0.2)] border-0 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                                >
                                    {isCancelling ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-5 w-5" />
                                            Confirm
                                        </>
                                    )}
                                </Button>
                            </div>
                            {!cancelPreview.cancellation_enabled && (
                                <p className="text-[10px] text-red-600 font-black text-center mt-6 uppercase tracking-[0.2em]">Note: This action is irreversible once confirmed.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
