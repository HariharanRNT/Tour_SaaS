'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Script from 'next/script'
import { bookingsAPI, agentAPI, paymentsAPI } from '@/lib/api'
import { useTheme } from '@/context/ThemeContext'
import { Booking } from '@/types'
import { formatCurrency, formatDate, formatDuration } from '@/lib/utils'
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
    Edit,
    MoreHorizontal,
    Copy,
    AlertCircle,
    Package,
    IndianRupee,
    AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BookingDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [booking, setBooking] = useState<Booking | null>(null)
    const [loading, setLoading] = useState(true)
    const [showFullItinerary, setShowFullItinerary] = useState(false)
    const { publicSettings } = useTheme()
    const hpSettings = publicSettings?.homepage_settings || {}

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
    const [isRetrying, setIsRetrying] = useState(false)
    const [isCancelled, setIsCancelled] = useState(false)

    const [gstSettings, setGstSettings] = useState({ inclusive: false, percentage: 18 })

    // Apply agent-chosen font from theme settings
    useEffect(() => {
        try {
            const stored = localStorage.getItem('agent-ui-style')
            if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed.font_family) {
                    document.documentElement.style.setProperty('--project-font-family', parsed.font_family)
                }
            }
        } catch { }
    }, [])

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
                const settings = await agentAPI.getPublicSettings()
                setGstSettings({
                    inclusive: settings.homepage_settings?.gst_inclusive ?? false,
                    percentage: settings.homepage_settings?.gst_percentage ?? 18
                })
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
            setIsCancelled(false) // Reset state when opening
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
            setIsCancelled(true)
            toast.success(response.message || "Booking cancelled successfully")
            // Reload booking in background
            loadBooking(booking.id)
        } catch (error: any) {
            console.error("Cancellation failed", error)
            toast.error(error.response?.data?.detail || "Failed to cancel booking")
        } finally {
            setIsCancelling(false)
        }
    }

    const handleRetryPayment = async () => {
        if (!booking) return
        setIsRetrying(true)
        try {
            const orderData = await paymentsAPI.createOrder(booking.id)
            const isMock = orderData.key_id === 'rzp_test_1234567890' || orderData.key_id.includes('1234567890')

            if (isMock) {
                await paymentsAPI.verifyPayment({
                    razorpay_order_id: orderData.order_id,
                    razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(7),
                    razorpay_signature: "sig_mock_" + Math.random().toString(36).substring(7)
                })
                toast.success("Payment Received Successfully!")
                loadBooking(booking.id)
            } else {
                const options = {
                    key: orderData.key_id,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: "Tour SaaS",
                    description: `Retry Booking ${booking.booking_reference}`,
                    order_id: orderData.order_id,
                    handler: async function (response: any) {
                        try {
                            await paymentsAPI.verifyPayment({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                            toast.success("Payment Successful!")
                            loadBooking(booking.id)
                        } catch (e) {
                            console.error("Verification failed", e)
                            toast.error("Payment verification failed")
                        }
                    },
                    prefill: {
                        name: userName,
                        email: userEmail,
                        contact: userPhone
                    },
                    theme: { color: "#3B82F6" },
                    modal: {
                        ondismiss: async function () {
                            try {
                                await paymentsAPI.markFailed(booking.id)
                                loadBooking(booking.id)
                            } catch (e) {
                                console.error("Failed to mark payment as failed", e)
                            }
                        }
                    }
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.open();
            }
        } catch (error: any) {
            console.error("Retry payment failed", error)
            toast.error(error.response?.data?.detail || "Failed to initialize payment")
        } finally {
            setIsRetrying(false)
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
                <Button onClick={() => router.push('/bookings')} className="mt-4 bg-[var(--button-bg)] hover:bg-[var(--button-bg)]/90 text-white rounded-xl">
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

    const isConfirmed = booking.status === 'confirmed' && (booking.payment_status?.toLowerCase() === 'paid' || booking.payment_status?.toLowerCase() === 'succeeded');
    const isFailed = booking.payment_status?.toLowerCase() === 'failed' || booking.status === 'initiated' || booking.payment_status?.toLowerCase() === 'pending';

    return (
        <div className="min-h-screen overflow-x-hidden booking-page-root" style={{
            '--premium-bg': 'rgba(255,255,255,0.45)',
            '--premium-border': 'rgba(255,255,255,0.3)',
            '--premium-blur': '40px',
            '--premium-card-px': '24px',
            '--premium-card-py': '24px',
            '--premium-radius': '32px',
        } as any}>
            <style jsx global>{`
                .booking-page-root {
                    background: radial-gradient(circle at 50% 0%, var(--primary-soft) 0%, var(--page-bg, #f8fafc) 100%), var(--page-bg, #f8fafc);
                    color: black;
                    min-height: 100vh;
                }
                .premium-glass-card {
                    backdrop-filter: blur(var(--premium-blur)) saturate(160%);
                    background: var(--premium-bg);
                    border: 1px solid var(--premium-border);
                    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
                    border-radius: var(--premium-radius);
                    padding: var(--premium-card-py) var(--premium-card-px);
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                    overflow: hidden;
                }
                .premium-glass-card:hover {
                    background: rgba(255,255,255,0.55);
                    transform: translateY(-4px);
                    box-shadow: 0 20px 50px -15px rgba(0,0,0,0.12);
                }
                .card-accent-icon {
                    position: absolute;
                    top: 24px;
                    right: 24px;
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 20px -5px rgba(0,0,0,0.1);
                }
                .status-pulse {
                    position: relative;
                }
                .status-pulse::after {
                    content: '';
                    position: absolute;
                    inset: -4px;
                    border-radius: 999px;
                    background: currentColor;
                    opacity: 0.2;
                    animation: pulse-soft 2s infinite;
                }
                @keyframes pulse-soft {
                    0% { transform: scale(1); opacity: 0.2; }
                    50% { transform: scale(1.5); opacity: 0; }
                    100% { transform: scale(1); opacity: 0.2; }
                }
                .timeline-line {
                    position: absolute;
                    left: 22px;
                    top: 24px;
                    bottom: 24px;
                    width: 1px;
                    background: rgba(0,0,0,0.1);
                }
                
                /* Warning Icon Pulse */
                @keyframes warning-pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .warning-icon-pulse {
                    animation: warning-pulse 2s infinite;
                }

                /* Button Shake */
                @keyframes button-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-2px) rotate(-1deg); }
                    50% { transform: translateX(2px) rotate(1deg); }
                    75% { transform: translateX(-2px) rotate(-1deg); }
                }
                .hover-shake:hover:not(:disabled) {
                    animation: button-shake 0.3s ease-in-out infinite;
                }
                .timeline-dot {
                    position: absolute;
                    left: -14px;
                    top: 13px;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--button-bg, black);
                    z-index: 10;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    border: 2px solid white;
                }
                /* Typography Hierarchy Refinement — High Contrast Black */
                .page-title { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: black; }
                .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: black; opacity: 0.8; }
                .label-text { font-size: 11px; font-weight: 600; color: black; opacity: 0.7; letter-spacing: 0.02em; }
                .value-text { font-size: 15px; font-weight: 700; color: black; letter-spacing: -0.01em; }
                .meta-text { font-size: 11px; font-weight: 500; color: black; opacity: 0.6; }
                .pill-badge {
                    background: rgba(255,255,255,0.8);
                    backdrop-filter: blur(10px);
                    padding: 6px 16px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 2px 10px -2px rgba(0,0,0,0.05);
                }
                
                /* Tabs customization */
                .premium-tabs-list {
                    background: rgba(0,0,0,0.03);
                    border: 1px solid rgba(0,0,0,0.05);
                    border-radius: 12px;
                    padding: 4px;
                }
                .premium-tabs-trigger {
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    border-radius: 8px;
                    color: rgba(0,0,0,0.5);
                }
                .premium-tabs-trigger[data-state='active'] {
                    background: white;
                    color: black;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
            `}</style>
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="lazyOnload"
            />

            {/* Header Section — Compact & Sharp */}
            <div className="relative w-full border-b border-black/5 bg-black/2 pt-8 pb-6">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => router.push('/bookings')}
                                    className="h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 p-0"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center gap-2">
                                    <h1 className="page-title">{booking.package?.title || 'Custom Trip Package'}</h1>
                                    <div className={`pill-badge border-[0.5px] ${
                                        booking.status === 'confirmed' 
                                        ? 'border-emerald-500/20 text-emerald-700' 
                                        : 'border-amber-500/20 text-amber-700'
                                    }`}>
                                        <div className={`h-1.5 w-1.5 rounded-full ${booking.status === 'confirmed' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                                        {statusConfig.label}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 !text-black font-semibold">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="text-[12px]">{booking.package?.destination}</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-l border-black/10 pl-3">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span className="text-[12px]">{formatDate(booking.travel_date)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-l border-black/10 pl-3">
                                    <Users className="h-3.5 w-3.5" />
                                    <span className="text-[12px]">{booking.number_of_travelers} Traveler{booking.number_of_travelers > 1 ? 's' : ''}</span>
                                </div>
                                <div className="pill-badge border-[0.5px] border-black/20 !text-black">
                                    <span className="uppercase text-[9px] tracking-widest font-bold">Booking ID</span>
                                    <span className="font-mono text-[11px] font-bold">{booking.booking_reference}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isConfirmed && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 px-4 bg-black/5 hover:bg-black/10 border border-black/10 text-xs font-semibold gap-2"
                                        onClick={handleDownloadInvoice}
                                    >
                                        <Receipt className="h-3.5 w-3.5 opacity-60" /> Invoice
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 text-xs font-semibold gap-2"
                                        disabled={booking.status === 'cancelled' || booking.status === 'completed' || isFetchingPreview}
                                        onClick={fetchCancelPreview}
                                    >
                                        {isFetchingPreview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5 opacity-60" />} Cancel
                                    </Button>
                                </>
                            )}
                            {isFailed && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleRetryPayment}
                                    className="h-9 px-6 bg-[var(--button-bg)] hover:bg-[var(--button-bg)]/90 text-white border-0 shadow-lg shadow-[var(--button-glow)] text-xs font-bold gap-2"
                                >
                                    <CreditCard className="h-3.5 w-3.5" /> Retry Payment
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 relative z-10 pb-16">

                {/* Main Content Grid 60/40 */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* LEFT COLUMN (Main Details) - spans 3 columns (60%) */}
                    <div className="lg:col-span-3 space-y-8">

                        {/* Package Overview Card */}
                        <div className="premium-glass-card group min-h-[160px]">
                            <div className="card-accent-icon bg-black/5 text-black border border-black/10">
                                <Package className="h-7 w-7" />
                            </div>
                            
                            <div className="flex flex-col mb-8">
                                <h3 className="section-title mb-4">Package Overview</h3>
                                <h4 className="text-3xl font-extrabold tracking-tight text-black mb-1">
                                    {booking.package?.title?.split(' ')[0]} <span className="opacity-60">{booking.package?.title?.split(' ').slice(1).join(' ')}</span>
                                </h4>
                                <div className="flex gap-2 mt-4">
                                    <div className="pill-badge border-[0.5px] border-black/10">
                                        <span className="text-[10px] font-bold text-black">{formatDuration(booking.package?.duration_days || 0)}</span>
                                    </div>
                                    <div className="pill-badge border-[0.5px] border-black/10">
                                        <span className="text-[10px] font-bold text-black">{booking.number_of_travelers} Travelers</span>
                                    </div>
                                </div>
                            </div>
                            
                            {booking.package?.included_items && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {booking.package.included_items.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 p-2 bg-black/2 rounded-lg border border-black/5 hover:bg-black/10 transition-colors">
                                            <div className="h-5 w-5 rounded bg-black/5 flex items-center justify-center text-black">
                                                <Check className="h-3 w-3" />
                                            </div>
                                            <span className="label-text !text-black">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Itinerary Timeline */}
                        <div className="premium-glass-card">
                            <div className="card-accent-icon bg-black/5 text-black border border-black/10">
                                <MapPin className="h-7 w-7" />
                            </div>
                            <h3 className="section-title mb-6 flex items-center gap-2">
                                Itinerary Timeline
                            </h3>
                            
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
                                        <details key={day} className="group overflow-hidden bg-black/2 rounded-xl border border-black/5 transition-all" open={idx === 0}>
                                            <summary className="flex items-center justify-between p-3 cursor-pointer list-none hover:bg-black/5 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 text-primary value-text text-[12px]">
                                                        D{day}
                                                    </div>
                                                    <div>
                                                        <h4 className="value-text text-[13px] !text-black">{items[0].title}</h4>
                                                        <p className="label-text text-[10px] !text-black">{items.length} Activities</p>
                                                    </div>
                                                </div>
                                                <MoreHorizontal className="h-4 w-4 opacity-30 group-open:rotate-90 transition-transform" />
                                            </summary>
                                            <div className="pl-8 pr-4 pb-4 pt-2 border-t border-black/5 flex flex-col gap-3 relative">
                                                <div className="timeline-line" />
                                                {items.map((item, i) => (
                                                    <div key={item.id} className="relative pl-8 py-2">
                                                        <div className="timeline-dot" />
                                                        <div className="space-y-1">
                                                            <h5 className="value-text text-[12px] !text-black font-semibold">{item.title}</h5>
                                                            <p className="meta-text leading-relaxed line-clamp-2 hover:line-clamp-none transition-all">{item.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 opacity-30">
                                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="label-text">Itinerary available 48h before travel</p>
                                </div>
                            )}
                        </div>

                        {/* Flight Information */}
                        {booking.package?.flights_enabled && (
                            <div className="premium-glass-card">
                                <h3 className="section-title mb-6 flex items-center gap-2">
                                    <Plane className="h-4 w-4 opacity-50" /> Flight Details
                                </h3>

                                {flightConfirmation ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-3 bg-black/5 rounded-xl border border-black/10">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-black animate-pulse" />
                                                <span className="section-title !text-black">Confirmed</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="label-text">PNR:</span>
                                                <span className="value-text font-mono uppercase !text-black">{flightConfirmation.pnr || 'GENERATED'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between py-2">
                                            <div className="text-center md:text-left">
                                                <p className="text-[24px] font-bold tracking-tight text-black">{flightConfirmation.from_code || 'MAA'}</p>
                                                <p className="label-text lowercase">{flightConfirmation.from_city || 'Chennai'}</p>
                                                <p className="value-text text-[11px] mt-1 opacity-60">{flightConfirmation.departure_time || '10:30 AM'}</p>
                                            </div>

                                            <div className="flex-1 px-8 flex flex-col items-center">
                                                <div className="w-full flex items-center gap-2">
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
                                                    <Plane className="h-4 w-4 opacity-40 rotate-90" />
                                                    <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                                                </div>
                                                <p className="meta-text text-[9px] mt-1 uppercase tracking-widest">{flightConfirmation.duration || '2h 45m'}</p>
                                            </div>

                                            <div className="text-center md:text-right">
                                                <p className="text-[24px] font-bold tracking-tight text-black">{flightConfirmation.to_code || 'DEL'}</p>
                                                <p className="label-text lowercase">{flightConfirmation.to_city || 'Delhi'}</p>
                                                <p className="value-text text-[11px] mt-1 opacity-60">{flightConfirmation.arrival_time || '1:15 PM'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-black/2 rounded-xl border border-black/5">
                                        <div className="h-10 w-10 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-black/10">
                                            <Plane className="h-5 w-5 opacity-40 animate-pulse" />
                                        </div>
                                        <p className="value-text text-[13px]">Finalizing Flight Path</p>
                                        <p className="meta-text mt-1">Confirmed details within 24 hours</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Traveler Roster */}
                        <div className="premium-glass-card">
                            <div className="card-accent-icon bg-black/5 text-black border border-black/10">
                                <Users className="h-7 w-7" />
                            </div>
                            <h3 className="section-title mb-6 flex items-center gap-2">
                                Traveler Roster
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {booking.travelers?.map((traveler, index) => (
                                    <div key={traveler.id} className="p-4 bg-black/5 rounded-xl border border-black/5 hover:bg-black/10 transition-colors group">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-black/5 flex items-center justify-center text-black/40 border border-black/10 group-hover:scale-110 transition-transform">
                                                <span className="text-sm font-bold uppercase">{traveler.first_name[0]}{traveler.last_name[0]}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <h4 className="value-text text-[13px] truncate">{traveler.first_name} {traveler.last_name}</h4>
                                                    {traveler.is_primary && (
                                                        <span className="text-[8px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">Primary</span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                                    <div>
                                                        <p className="label-text text-[9px] uppercase tracking-wider">Gender</p>
                                                        <p className="value-text text-[11px]">{traveler.gender}</p>
                                                    </div>
                                                    <div>
                                                        <p className="label-text text-[9px] uppercase tracking-wider">Region</p>
                                                        <p className="value-text text-[11px]">{traveler.nationality}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>


                    </div>


                    {/* RIGHT COLUMN (Sidebar) - spans 2 columns (40%) */}
                    <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-8 self-start">
                        <div className="premium-glass-card p-4">
                            <Tabs defaultValue="summary" className="w-full">
                                <TabsList className="premium-tabs-list w-full mb-4">
                                    <TabsTrigger value="summary" className="premium-tabs-trigger flex-1">Summary</TabsTrigger>
                                    <TabsTrigger value="refund" className="premium-tabs-trigger flex-1" disabled={!booking.refund_amount && booking.status !== 'cancelled'}>Refund</TabsTrigger>
                                    <TabsTrigger value="policy" className="premium-tabs-trigger flex-1">Policy</TabsTrigger>
                                    <TabsTrigger value="support" className="premium-tabs-trigger flex-1">Support</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="summary" className="mt-0 space-y-6">
                                    <div className="relative">
                                        <div className="card-accent-icon bg-black/5 text-black border border-black/10 !w-12 !h-12 !top-0 !right-0">
                                            <IndianRupee className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="section-title">Total Cost</span>
                                            <h2 className="text-3xl font-black text-black tracking-tight">{formatCurrency(booking.total_amount)}</h2>
                                            <div className="pill-badge bg-black/5 !text-black !px-3 !py-1 !mt-2 border border-black/10">
                                                <div className="h-1.5 w-1.5 rounded-full bg-black" />
                                                <span className="text-[10px] font-bold">Payment {booking.payment_status === 'succeeded' ? 'Successful' : booking.payment_status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-6 border-t border-black/5">
                                        <div className="flex justify-between items-center text-[12px]">
                                            <span className="label-text">Base Fare</span>
                                            <span className="value-text">{formatCurrency(booking.total_amount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[12px]">
                                            <span className="label-text">GST & Platform Fee</span>
                                            <span className="text-[9px] font-bold text-black bg-black/5 px-2 py-0.5 rounded border border-black/10 uppercase tracking-widest">Included</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[12px]">
                                            <span className="label-text">Reference</span>
                                            <span className="meta-text font-mono">{booking.booking_reference}</span>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="refund" className="mt-0">
                                    {booking.status === 'cancelled' && (booking.refund_amount || 0) > 0 ? (() => {
                                        const refund = booking.refund;
                                        const refundStatus = refund?.status || 'pending';
                                        const refundAmount = Number(booking.refund_amount || 0);
                                        
                                        return (
                                            <div className="space-y-4">
                                                <div className="text-center py-6 bg-black/5 rounded-[24px] border border-black/10 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                                        <IndianRupee className="h-12 w-12" />
                                                    </div>
                                                    <p className="label-text mb-2 uppercase tracking-widest text-[10px]">Refund Estimated</p>
                                                    <h3 className="text-3xl font-black text-black">{formatCurrency(refundAmount)}</h3>
                                                    <div className="pill-badge !bg-black/10 !text-black !mt-3 !px-4 border-0">
                                                        <span className="text-[10px] uppercase tracking-widest">{refundStatus}</span>
                                                    </div>
                                                </div>
                                                <div className="meta-text leading-relaxed p-3 bg-black/2 rounded flex gap-2">
                                                    <Info className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                                    <span>Funds will reflect in your account within 5–7 business days per banking standards.</span>
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        <div className="text-center py-8 opacity-40">
                                            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                            <p className="label-text">No active refund</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="policy" className="mt-0">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-8 w-1 rounded-full bg-black/20" />
                                            <h4 className="section-title">Cancellation Rules</h4>
                                        </div>

                                        {booking.package?.cancellation_enabled ? (
                                            <div className="space-y-3">
                                                {/* Parent Container with subtle tint */}
                                                <div className="bg-emerald-500/5 border border-black/5 rounded-[24px] p-4 space-y-3">
                                                    <div className="flex items-center gap-2 mb-2 text-emerald-800/80 px-2">
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span className="font-bold text-xs uppercase tracking-widest">Cancellable Package</span>
                                                    </div>

                                                    {(() => {
                                                        const rules = [...(booking.package.cancellation_rules || [])].sort((a, b) => b.daysBefore - a.daysBefore);
                                                        const totalAmount = booking.total_amount;
                                                        const gstApplicable = true; // Bookings always have GST calculated at checkout
                                                        let gstAmount = 0;
                                                        let realBase = totalAmount;

                                                        if (gstSettings.inclusive) {
                                                            realBase = totalAmount / (1 + gstSettings.percentage / 100);
                                                            gstAmount = totalAmount - realBase;
                                                        } else {
                                                            // For exclusive, the total_amount already includes GST from checkout
                                                            // We derive the base back
                                                            realBase = totalAmount / (1 + gstSettings.percentage / 100);
                                                            gstAmount = totalAmount - realBase;
                                                        }

                                                        const renderedRules = rules.map((rule, idx) => {
                                                            const amount = calculateRefundAmount(rule, realBase, gstAmount, gstApplicable);
                                                            return (
                                                                <div key={idx} className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-black/5 shadow-sm transition-all hover:bg-white/80 gap-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-black/5 rounded-lg">
                                                                            <Clock className="h-4 w-4 opacity-40" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] text-black font-bold uppercase tracking-wider opacity-40">Timing</p>
                                                                            <span className="font-black text-black text-[13px]">{rule.daysBefore}+ Days Prior</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="text-right">
                                                                            <p className="text-[10px] text-black font-bold uppercase tracking-wider opacity-40">Refund</p>
                                                                            <span className="text-black font-black text-[13px]">{rule.refundPercentage}% back</span>
                                                                        </div>
                                                                        <div className="px-3 py-1.5 bg-black/5 text-black rounded-lg text-[11px] font-black min-w-[70px] text-center border border-black/5">
                                                                            {formatCurrency(amount)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });

                                                        // Fallback rule: Less than last rule days
                                                        const lastRule = rules[rules.length - 1];
                                                        const hasZeroPercent = rules.some(r => r.refundPercentage === 0);

                                                        if (lastRule && lastRule.daysBefore > 0 && !hasZeroPercent) {
                                                            renderedRules.push(
                                                                <div key="fallback" className="flex items-center justify-between p-4 bg-red-50/50 rounded-xl border border-red-500/10 shadow-sm gap-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-red-500/10 rounded-lg">
                                                                            <XCircle className="h-4 w-4 text-red-600 opacity-60" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] text-red-800 font-bold uppercase tracking-wider">Condition</p>
                                                                            <span className="font-black text-red-900 text-[13px]">Less than {lastRule.daysBefore} days</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="text-right">
                                                                            <p className="text-[10px] text-red-800 font-bold uppercase tracking-wider">Refund</p>
                                                                            <span className="text-red-900 font-black text-[13px]">0% back</span>
                                                                        </div>
                                                                        <div className="px-3 py-1.5 bg-red-500/10 text-red-700 rounded-lg text-[10px] font-black uppercase tracking-widest min-w-[70px] text-center border border-red-500/10">
                                                                            Non-Refundable
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        return renderedRules;
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 bg-red-500/5 rounded-[24px] border border-red-500/10">
                                                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3 opacity-40 animate-pulse" />
                                                <p className="value-text text-red-900 mb-1">Non-Refundable Package</p>
                                                <p className="meta-text text-red-800/60 px-6">This booking is under a strict non-refundable policy and cannot be cancelled for a refund.</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="support" className="mt-0 space-y-4">
                                    <div className="p-4 bg-black/5 rounded-xl border border-black/5 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-black/5 flex items-center justify-center text-black border border-black/10">
                                                <Phone className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="value-text text-[12px]">24/7 Priority Support</p>
                                                <p className="label-text text-[10px]">Dedicated Concierge</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 pt-2 border-t border-white/10">
                                            <a href={`tel:${hpSettings.priority_support_phone || '+9118001234567'}`} className="flex items-center justify-between hover:bg-black/5 p-2 rounded transition-colors group">
                                                <span className="label-text group-hover:text-black transition-colors">Call Support</span>
                                                <span className="value-text text-[12px] !text-black">{hpSettings.priority_support_phone || '+91 1800-123-4567'}</span>
                                            </a>
                                            <a href={`mailto:${hpSettings.priority_support_email || 'support@toursaas.com'}`} className="flex items-center justify-between hover:bg-black/5 p-2 rounded transition-colors group">
                                                <span className="label-text group-hover:text-black transition-colors">Email Support</span>
                                                <span className="value-text text-[12px] lowercase !text-black">{hpSettings.priority_support_email || 'support@toursaas.com'}</span>
                                            </a>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </div>            {/* Cancellation Confirmation Dialog */}
            {isCancelDialogOpen && cancelPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => !isCancelling && setIsCancelDialogOpen(false)}
                    />
                    
                    <div className="relative w-full max-w-md premium-glass-card p-6 animate-in zoom-in-95 duration-400">
                        <button
                            disabled={isCancelling}
                            onClick={() => setIsCancelDialogOpen(false)}
                            className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center text-black/20 hover:bg-black/5 hover:text-black transition-all"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {!isCancelled ? (
                            <div className="flex flex-col items-center text-center">
                                {/* 1. Icon Area */}
                                <div className="h-14 w-14 rounded-2xl bg-red-500/15 flex items-center justify-center text-red-500 border border-red-500/30 shadow-2xl shadow-red-900/10 mb-4 warning-icon-pulse">
                                    <AlertTriangle className="h-7 w-7 fill-red-500/10" />
                                </div>

                                {/* 2. Title & 3. Reference */}
                                <div className="mb-4">
                                    <h3 className="page-title !text-[#EF4444] mb-2 text-xl uppercase tracking-tight">Cancel Booking</h3>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F8F9FA] border border-[#E8E8F0] rounded-lg">
                                        <span className="text-[#A0A8C8] uppercase text-[8px] tracking-[0.1em] font-bold">Reference</span>
                                        <span className="font-mono text-[10px] font-black text-[#1A1A2E]">{booking.booking_reference}</span>
                                    </div>
                                </div>

                                {/* 4. Estimated Refund Card */}
                                <div className="w-full p-5 bg-[#FDFDFF] rounded-[24px] border border-black/5 mb-4 shadow-sm">
                                    <div className="flex flex-col items-center">
                                        <p className="text-[#A0A8C8] text-[9px] font-bold uppercase tracking-[0.15em] mb-2">Estimated Refund</p>
                                        <h4 className="text-3xl font-black tracking-tighter mb-2 text-[#22C55E]">
                                            {formatCurrency(cancelPreview.refund_amount)}
                                        </h4>
                                        <div className="px-3 py-1 bg-[#FEF9C3] border border-[#FDE68A] text-[#A16207] rounded-full text-[10px] font-bold shadow-sm">
                                            {cancelPreview.refund_percentage}% <span className="opacity-60 font-medium lowercase">of total paid</span>
                                        </div>
                                    </div>
                                    
                                    <Separator className="bg-black/5 my-4" />
                                    
                                    {/* 5. Description Text Implementation */}
                                    <p 
                                        className="text-[#6B7280] leading-relaxed text-[12px] px-1"
                                        dangerouslySetInnerHTML={{ 
                                            __html: cancelPreview.message
                                                .replace(/(₹[\d,]+\.?\d*)/g, '<strong class="text-[#1A1A2E] font-bold">$1</strong>')
                                                .replace(/(\d+%\s*refund)/g, '<strong class="text-[#1A1A2E] font-bold">$1</strong>')
                                                .replace(/(\d+\s*day\(s\))/g, '<span class="text-[#F97316] font-bold">$1</span>')
                                        }}
                                    />
                                </div>

                                {/* 7. Warning Notice Strip */}
                                <div className="w-full bg-[#FFF7ED] border-l-[3px] border-[#F97316] rounded-r-xl p-3 mb-5 flex items-start gap-3 text-left">
                                    <AlertCircle className="h-4 w-4 text-[#F97316] mt-0.5" />
                                    <div>
                                        <p className="text-[#92400E] font-bold text-[11px] leading-tight">This action cannot be undone.</p>
                                        <p className="text-[#92400E]/70 text-[10px] leading-tight">Permanent cancellation after confirmation.</p>
                                    </div>
                                </div>

                                {/* 6. Buttons */}
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <Button
                                        variant="ghost"
                                        disabled={isCancelling}
                                        onClick={() => setIsCancelDialogOpen(false)}
                                        className="h-11 rounded-xl bg-transparent hover:bg-[#F3F4F6] border-[1.5px] border-[#D1D5DB] text-[#6B7280] text-[10px] font-bold uppercase tracking-widest transition-colors"
                                    >
                                        Go Back
                                    </Button>
                                    <Button
                                        disabled={isCancelling || !cancelPreview.cancellation_enabled}
                                        onClick={handleCancelBooking}
                                        className="h-11 rounded-xl bg-[#EF4444] hover:bg-red-700 text-white border-0 shadow-[0_4px_12px_rgba(239,68,68,0.3)] text-[10px] font-bold uppercase tracking-[0.05em] gap-2 hover-shake"
                                    >
                                        {isCancelling ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                <span>Cancelling...</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-3.5 w-3.5" />
                                                <span>Confirm</span>
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {!cancelPreview.cancellation_enabled && (
                                    <p className="mt-3 meta-text text-red-600/60 text-center text-[8px] uppercase tracking-widest animate-pulse">
                                        Cancellation is currently locked
                                    </p>
                                )}
                            </div>
                        ) : (
                            /* 8. Success State Flow */
                            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 p-4">
                                <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 mb-6">
                                    <CheckCircle className="h-7 w-7" />
                                </div>
                                
                                <h3 className="text-xl font-black text-black mb-3">Booking Cancelled</h3>
                                <div className="w-full p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 mb-6">
                                    <p className="text-emerald-900 font-bold text-base mb-1">Refund of {formatCurrency(cancelPreview.refund_amount)}</p>
                                    <p className="label-text opacity-60 text-[10px]">Expected in 5-7 business days</p>
                                </div>

                                <Button
                                    onClick={() => setIsCancelDialogOpen(false)}
                                    className="w-full h-11 rounded-xl bg-[var(--button-bg)] text-white hover:bg-[var(--button-bg)]/90 text-[10px] font-bold uppercase tracking-widest"
                                >
                                    Close Dashboard
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
