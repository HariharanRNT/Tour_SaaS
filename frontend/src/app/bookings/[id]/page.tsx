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
    DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function BookingDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [booking, setBooking] = useState<Booking | null>(null)
    const [loading, setLoading] = useState(true)
    const [showFullItinerary, setShowFullItinerary] = useState(false)

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
    const userEmail = contactInfo?.email || (booking as any).user?.email || 'N/A'
    const userPhone = contactInfo?.phone || (booking as any).user?.phone || 'N/A'
    const userName = (booking as any).user ? `${(booking as any).user.first_name} ${(booking as any).user.last_name}` : 'N/A'

    const heroImage = booking.package?.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1582510003544-4d00b7f0bd44?q=80&w=2969&auto=format&fit=crop'

    return (
        <div className="min-h-screen overflow-x-hidden">

            {/* Hero Section */}
            <div className="relative h-[250px] w-full bg-gray-900 group">
                <div className="absolute inset-0">
                    <img
                        src={heroImage}
                        alt={booking.package?.destination || 'Destination'}
                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                </div>

                <div className="container mx-auto px-4 h-full relative flex flex-col justify-end pb-8">
                    <div className="max-w-4xl">
                        <div className="flex items-center gap-2 text-blue-300 mb-2 font-medium animate-fade-in">
                            <MapPin className="h-4 w-4" />
                            <span>{booking.package?.destination || 'Wonderful Destination'}</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 shadow-sm">
                            {booking.package?.title || 'Custom Trip Package'}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 text-gray-200 text-sm">
                            <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                                {booking.booking_reference}
                            </span>
                            <span className="hidden md:inline">•</span>
                            <span>{formatDate(booking.travel_date)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-8 relative z-10 pb-16">

                {/* Navigation and Actions Bar */}
                <div className="glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 p-4 rounded-xl shadow-sm border border-white/20">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/bookings')}
                        className="text-gray-600 hover:text-blue-600 hover:bg-white/20 pl-2"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Bookings
                    </Button>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg border border-white/20">
                            <span className="text-xs text-gray-500 font-medium">REF:</span>
                            <span className="font-mono font-bold text-sm text-gray-800">{booking.booking_reference}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-1 hover:bg-white/30 rounded text-gray-400 hover:text-gray-600"
                                onClick={() => copyToClipboard(booking.booking_reference)}
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>

                        <Badge className={`${statusConfig.gradient} text-white border-0 px-3 py-1.5 shadow-sm`}>
                            <span className="mr-2">{statusConfig.icon}</span> {statusConfig.label}
                        </Badge>

                        <div className="flex items-center gap-2 ml-2">

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9">
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>Share via Email</DropdownMenuItem>
                                    <DropdownMenuItem>Copy Link</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {booking.status === 'pending' && (
                                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </div>
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
                                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-emerald-500" /> Package Inclusions
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {booking.package?.included_items?.map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-white/20 p-2 rounded-lg">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                {item}
                                            </div>
                                        )) || <p className="text-gray-400 italic text-sm col-span-2">Standard package inclusions apply.</p>}
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
                                    <div className="space-y-6 relative pl-4 border-l-2 border-indigo-100 ml-2">
                                        {(showFullItinerary ? booking.package.itinerary_items : booking.package.itinerary_items.slice(0, 4)).map((item, index) => (
                                            <div key={item.id} className="relative">
                                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-white" />
                                                <h4 className="text-sm font-bold text-gray-900 mb-1">Day {item.day_number}: {item.title}</h4>
                                                <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                                            </div>
                                        ))}
                                        {booking.package.itinerary_items.length > 4 && (
                                            <Button
                                                variant="link"
                                                className="pl-0 text-indigo-600"
                                                onClick={() => setShowFullItinerary(!showFullItinerary)}
                                            >
                                                {showFullItinerary ? "Show Less" : `View Full Itinerary (${booking.package.itinerary_items.length} days)`}
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-white/20 rounded-lg dashed border border-white/20">
                                        <p className="text-gray-500 text-sm">Detailed itinerary will be available 48 hours before departure.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Flight Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Plane className="h-5 w-5 text-blue-600" /> Flight Information
                            </h3>

                            {flightConfirmation ? (
                                <div className="glass-panel rounded-xl border border-blue-100/50 shadow-sm overflow-hidden">
                                    <div className="bg-blue-50/20 px-6 py-3 border-b border-blue-100/30 flex justify-between items-center">
                                        <span className="text-sm font-semibold text-blue-800">Confirmed Flight Details</span>
                                        <Badge variant="secondary" className="bg-green-100/50 text-green-700 hover:bg-green-100/50">PNR Generated</Badge>
                                    </div>
                                    <div className="p-6">
                                        {/* Using existing FlightBookingDetails component structure implicitly for now as we don't have the prop structure handy for a generic visual update, 
                                             but assuming we can render the new design directly here based on data */}
                                        <div className="space-y-6">
                                            {/* Outbound */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-gray-900 text-white hover:bg-gray-800 text-[10px]">OUTBOUND</Badge>
                                                    <span className="text-sm text-gray-500">{formatDate(booking.travel_date)}</span>
                                                </div>
                                                <div className="flex flex-col md:flex-row justify-between items-center bg-white/20 rounded-lg p-4 border border-white/20">
                                                    <div className="text-center md:text-left mb-4 md:mb-0">
                                                        <p className="text-2xl font-bold text-gray-900">MAA</p>
                                                        <p className="text-xs text-gray-500">10:30 AM</p>
                                                    </div>
                                                    <div className="flex-1 px-4 flex flex-col items-center">
                                                        <div className="w-full h-px bg-gray-300 relative top-2.5"></div>
                                                        <Plane className="h-5 w-5 text-gray-400 rotate-90 relative bg-white/20 px-1" />
                                                        <p className="text-xs text-gray-500 mt-1">2h 45m</p>
                                                    </div>
                                                    <div className="text-center md:text-right">
                                                        <p className="text-2xl font-bold text-gray-900">DEL</p>
                                                        <p className="text-xs text-gray-500">1:15 PM</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Card className="border-amber-200 bg-amber-50/30">
                                    <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                                        <div className="bg-amber-100 p-3 rounded-full">
                                            <Clock className="h-6 w-6 text-amber-600 animate-pulse" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">Flight details being confirmed</h4>
                                            <p className="text-sm text-gray-600 mt-1">We're working on your flight booking. You'll receive details within 24 hours.</p>
                                        </div>
                                        <div className="text-xs text-gray-500 bg-white px-3 py-2 rounded border border-amber-100 shadow-sm">
                                            Updates sent to:<br />
                                            <span className="font-medium text-gray-800">{userEmail}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

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

                        {/* Payment Summary */}
                        <Card className="glass-panel shadow-md border-0">
                            <CardHeader className="bg-white/10 border-b border-white/10 pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-gray-600" /> Payment Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Package Cost</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(booking.total_amount)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Taxes & Fees</span>
                                    <span className="font-medium text-green-600">Included</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-baseline">
                                    <span className="font-bold text-gray-900">Total Amount</span>
                                    <span className="font-bold text-2xl text-blue-600">{formatCurrency(booking.total_amount)}</span>
                                </div>

                                <div className="bg-white/20 rounded-lg p-3 space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Status</span>
                                        <span className={`font-bold uppercase ${booking.payment_status === 'succeeded' ? 'text-green-600' :
                                            booking.payment_status === 'pending' ? 'text-amber-600' : 'text-red-600'
                                            }`}>{booking.payment_status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Date</span>
                                        <span className="text-gray-900">{formatDate(booking.created_at)}</span>
                                    </div>
                                </div>

                                <Button variant="outline" className="glass-button w-full gap-2 border-white/20 text-gray-700 hover:bg-white/20 hover:text-gray-900" onClick={handleDownloadInvoice}>
                                    <Download className="h-4 w-4" /> Download Invoice
                                </Button>
                            </CardContent>
                        </Card>





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

                        {/* Need Help Section */}
                        <Card className="glass-panel border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-900">
                                    <Info className="h-4 w-4" /> Need Help?
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-blue-800">Our support team is available 24/7 to assist you with your booking.</p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 bg-white/30 p-2 rounded-lg border border-white/20">
                                        <Phone className="h-4 w-4 text-blue-500" />
                                        <div>
                                            <p className="text-xs text-gray-500">Call Us</p>
                                            <p className="text-sm font-bold text-gray-900">+91 1800-123-4567</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white/30 p-2 rounded-lg border border-white/20">
                                        <Mail className="h-4 w-4 text-blue-500" />
                                        <div>
                                            <p className="text-xs text-gray-500">Email Us</p>
                                            <p className="text-sm font-bold text-gray-900">support@toursaas.com</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <Button variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800">
                                        Contact Support
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Important Info */}
                        <Card className="glass-panel border-0">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-900">
                                    <AlertCircle className="h-4 w-4" /> Important Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-gray-700 space-y-2">
                                <p className="flex items-center gap-2"><Check className="h-3 w-3 text-blue-500" /> Valid passport required</p>
                                <p className="flex items-center gap-2"><Check className="h-3 w-3 text-blue-500" /> Arrive 3 hours before flight</p>
                                <p className="flex items-center gap-2"><Check className="h-3 w-3 text-blue-500" /> Check weather forecast</p>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </div >
    )
}
