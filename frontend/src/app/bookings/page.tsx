'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { bookingsAPI } from '@/lib/api'
import { Booking } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
    Calendar, Users, Clock, Check, X, Copy, Download,
    Share2, MoreHorizontal, MapPin, ArrowRight, CreditCard,
    AlertTriangle, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface CancelPreview {
    cancellation_enabled: boolean
    days_before: number
    paid_amount: number
    refund_amount: number
    refund_percentage: number
    message: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function isCancellable(booking: Booking): boolean {
    if (booking.status === 'cancelled' || booking.status === 'completed') return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const travel = new Date(booking.travel_date)
    return travel >= today
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────
export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)

    // Cancel modal state
    const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
    const [preview, setPreview] = useState<CancelPreview | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    useEffect(() => { loadBookings() }, [])

    const loadBookings = async () => {
        try {
            const data = await bookingsAPI.getAll()
            setBookings(data || [])
        } catch {
            toast.error('Failed to load your bookings')
        } finally {
            setLoading(false)
        }
    }

    // ── Cancel flow ─────────────────────────────────────────────────────────

    const openCancelDialog = async (booking: Booking, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setCancelTarget(booking)
        setPreview(null)
        setPreviewLoading(true)
        try {
            const data = await bookingsAPI.getCancelPreview(booking.id)
            setPreview(data)
        } catch {
            toast.error('Could not load cancellation preview. Please try again.')
            setCancelTarget(null)
        } finally {
            setPreviewLoading(false)
        }
    }

    const closeCancelDialog = () => {
        if (cancelling) return
        setCancelTarget(null)
        setPreview(null)
    }

    const confirmCancel = async () => {
        if (!cancelTarget) return
        setCancelling(true)
        try {
            const result = await bookingsAPI.cancel(cancelTarget.id)

            // Update booking status in local state
            setBookings(prev =>
                prev.map(b => b.id === cancelTarget.id ? { ...b, status: 'cancelled' } : b)
            )

            closeCancelDialog()

            if (result.refund_status === 'pending' && result.refund_amount > 0) {
                toast.warning(
                    `Booking cancelled. Refund of ${formatCurrency(result.refund_amount)} is being processed manually — you will be notified.`,
                    { duration: 8000 }
                )
            } else if (result.refund_amount > 0) {
                toast.success(
                    `Booking cancelled. ₹${result.refund_amount.toLocaleString()} refund will be credited in 5–7 business days.`,
                    { duration: 8000 }
                )
            } else {
                toast.success('Booking cancelled successfully.')
            }
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Cancellation failed. Please try again.'
            toast.error(msg)
        } finally {
            setCancelling(false)
        }
    }

    // ── Other helpers ────────────────────────────────────────────────────────

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
            toast.success('Reference copied to clipboard')
        } else {
            const ta = document.createElement('textarea')
            ta.value = text
            ta.style.position = 'fixed'
            ta.style.left = '-9999px'
            document.body.appendChild(ta)
            ta.focus(); ta.select()
            try { document.execCommand('copy'); toast.success('Reference copied') }
            catch { toast.error('Failed to copy') }
            document.body.removeChild(ta)
        }
    }

    const downloadInvoice = async (booking: Booking, e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        try {
            toast.info('Starting download...')
            const blob = await bookingsAPI.downloadInvoice(booking.id)
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `Invoice_${booking.booking_reference}.pdf`)
            document.body.appendChild(link); link.click(); link.remove()
        } catch {
            toast.error('Failed to download invoice')
        }
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'confirmed':
                return { border: 'border-l-emerald-500', bg: 'bg-emerald-50/30 hover:bg-emerald-50/50', badge: 'bg-gradient-to-r from-emerald-500 to-green-500 shadow-emerald-200 text-white', icon: <Check className="h-3 w-3" />, text: 'CONFIRMED' }
            case 'pending':
                return { border: 'border-l-amber-500', bg: 'bg-amber-50/30 hover:bg-amber-50/50', badge: 'bg-gradient-to-r from-amber-500 to-[var(--gradient-end)] shadow-amber-200 text-white animate-pulse', icon: <Clock className="h-3 w-3" />, text: 'PENDING' }
            case 'cancelled':
                return { border: 'border-l-red-500', bg: 'bg-red-50/20 hover:bg-red-50/40', badge: 'bg-gradient-to-r from-red-500 to-rose-500 shadow-red-200 text-white', icon: <X className="h-3 w-3" />, text: 'CANCELLED' }
            case 'completed':
                return { border: 'border-l-blue-500', bg: 'bg-blue-50/30 hover:bg-blue-50/50', badge: 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-200 text-white', icon: <Check className="h-3 w-3" />, text: 'COMPLETED' }
            default:
                return { border: 'border-l-gray-300', bg: 'bg-white', badge: 'bg-gray-100 text-gray-800', icon: null, text: status.toUpperCase() }
        }
    }

    // ── Loading skeleton ─────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="container mx-auto px-4 py-16 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        )
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-transparent py-12">
            <div className="container mx-auto px-4 max-w-5xl">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
                        <p className="text-gray-500 mt-1">Manage all your upcoming and past trips</p>
                    </div>
                </div>

                {bookings.length === 0 ? (
                    <Card className="border-dashed border-2 shadow-none bg-transparent">
                        <CardContent className="py-24 text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MapPin className="h-8 w-8 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                You haven't made any bookings yet. Start planning your dream vacation today!
                            </p>
                            <Link href="/plan-trip">
                                <Button className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold px-8 shadow-lg shadow-blue-200">
                                    Browse Packages <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => {
                            const statusConfig = getStatusConfig(booking.status)
                            const imageUrl = booking.package?.images?.[0]?.image_url
                                || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                            const cancellable = isCancellable(booking)

                            return (
                                <Card
                                    key={booking.id}
                                    className={`overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-l-4 ${statusConfig.border} ${statusConfig.bg}`}
                                >
                                    <div className="flex flex-col md:flex-row">
                                        {/* Image */}
                                        <div className="w-full md:w-48 h-48 md:h-auto relative flex-shrink-0">
                                            <div className="absolute inset-0 bg-gray-200">
                                                <img
                                                    src={imageUrl}
                                                    alt={booking.package?.title}
                                                    className={`w-full h-full object-cover ${booking.status === 'cancelled' ? 'grayscale opacity-70' : ''}`}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                                                    }}
                                                />
                                            </div>
                                            <div className="absolute top-2 right-2 md:hidden">
                                                <Badge className={`${statusConfig.badge} border-0 px-2 py-1`}>
                                                    <span className="mr-1">{statusConfig.icon}</span> {statusConfig.text}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 p-6 flex flex-col justify-between">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h2 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                                                            {booking.package?.destination ? `🏖️ ${booking.package.title}` : booking.package?.title || 'Custom Trip'}
                                                        </h2>
                                                        <div className="hidden md:block">
                                                            <Badge className={`${statusConfig.badge} border-0 px-2.5 py-0.5 ml-2 text-xs`}>
                                                                <span className="mr-1.5">{statusConfig.icon}</span> {statusConfig.text}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className="flex items-center gap-2 text-xs text-gray-500 group cursor-pointer w-fit"
                                                        onClick={() => copyToClipboard(booking.booking_reference)}
                                                    >
                                                        <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                                            Ref: {booking.booking_reference}
                                                        </span>
                                                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Total Amount</p>
                                                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(booking.total_amount)}</p>
                                                    {/* Refund Status Badge on cancelled bookings */}
                                                    {booking.status === 'cancelled' && (booking as any).refund_amount > 0 && (() => {
                                                        const refundStatus = (booking as any).refund?.status || 'pending'
                                                        const badgeStyles: Record<string, string> = {
                                                            succeeded: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                                                            failed: 'bg-red-100 text-red-700 border-red-300',
                                                            pending: 'bg-amber-100 text-amber-700 border-amber-300',
                                                            initiated: 'bg-amber-100 text-amber-700 border-amber-300',
                                                        }
                                                        const icons: Record<string, string> = {
                                                            succeeded: '✅', failed: '❌', pending: '🕐', initiated: '🕐'
                                                        }
                                                        const labels: Record<string, string> = {
                                                            succeeded: 'Refund Success', failed: 'Refund Failed',
                                                            pending: 'Refund Processing', initiated: 'Processing'
                                                        }
                                                        return (
                                                            <div className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeStyles[refundStatus] || badgeStyles.pending}`}>
                                                                <span>{icons[refundStatus] || '🕐'}</span>
                                                                <span>{labels[refundStatus] || 'Processing'}</span>
                                                                <span className="opacity-70">· ₹{Number((booking as any).refund_amount).toLocaleString()}</span>
                                                            </div>
                                                        )
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Info Pills */}
                                            <div className="flex flex-wrap gap-3 mb-6">
                                                <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                                                    <Calendar className="h-4 w-4 text-violet-500" />
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Travel Date</p>
                                                        <p className="text-sm font-semibold text-gray-800">{formatDate(booking.travel_date)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                                                    <Users className="h-4 w-4 text-pink-500" />
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Travelers</p>
                                                        <p className="text-sm font-semibold text-gray-800">{booking.number_of_travelers} People</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                                                    <CreditCard className="h-4 w-4 text-emerald-500" />
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Payment</p>
                                                        <p className="text-sm font-semibold text-gray-800 capitalize">{booking.payment_status}</p>
                                                    </div>
                                                </div>

                                                {/* Cancellation Policy Info Pill */}
                                                {booking.package?.cancellation_enabled ? (
                                                    <div className="flex items-center gap-2 bg-emerald-50/50 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                        <div>
                                                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">Policy</p>
                                                            <p className="text-[10px] font-bold text-emerald-800 leading-none">
                                                                {booking.package.cancellation_rules?.[0] ? `${booking.package.cancellation_rules[0].daysBefore}d (${booking.package.cancellation_rules[0].refundPercentage}%)` : 'Cancellable'}
                                                                {booking.package.cancellation_rules && booking.package.cancellation_rules.length > 1 ? '...' : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 bg-red-50/50 px-3 py-1.5 rounded-lg border border-red-100 shadow-sm">
                                                        <XCircle className="h-4 w-4 text-red-400" />
                                                        <div>
                                                            <p className="text-[10px] text-red-600 font-bold uppercase tracking-tighter">Policy</p>
                                                            <p className="text-[10px] font-bold text-red-800 leading-none">Non-Refundable</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200/60 mt-auto">
                                                <Link href={`/bookings/${booking.id}`} className="flex-1 sm:flex-none">
                                                    <Button className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-200 rounded-lg group">
                                                        View Details <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </Link>

                                                <Button
                                                    variant="outline"
                                                    className="flex-1 sm:flex-none gap-2 hover:bg-white/10 border-white/20 text-gray-700 glass-panel"
                                                    onClick={(e) => downloadInvoice(booking, e)}
                                                >
                                                    <Download className="h-4 w-4" /> Invoice
                                                </Button>

                                                {/* Cancel Button — shown only for cancellable bookings */}
                                                {cancellable && (
                                                    <Button
                                                        variant="ghost"
                                                        className="flex-1 sm:flex-none gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
                                                        onClick={(e) => openCancelDialog(booking, e)}
                                                    >
                                                        <X className="h-4 w-4" /> Cancel Booking
                                                    </Button>
                                                )}

                                                <div className="hidden sm:block ml-auto">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-10 w-10">
                                                                <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>
                                                                <Share2 className="mr-2 h-4 w-4" /> Share Trip
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                                Report Issue
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── Cancel Confirmation Dialog ────────────────────────────────── */}
            <Dialog open={!!cancelTarget} onOpenChange={closeCancelDialog}>
                <DialogContent className="max-w-md glass-premium border-0" overlayClass="bg-black/40">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Cancel Booking
                        </DialogTitle>
                        <DialogDescription>
                            {cancelTarget?.package?.title || 'Your booking'} — {cancelTarget?.booking_reference}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Loading preview */}
                    {previewLoading && (
                        <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span>Calculating refund...</span>
                        </div>
                    )}

                    {/* Preview loaded */}
                    {preview && !previewLoading && (
                        <div className="space-y-4 py-2">
                            {/* Refund amount card with glassmorphism */}
                            <div className={`rounded-2xl border p-6 text-center transition-all animate-in fade-in zoom-in duration-500 ${preview.refund_amount > 0
                                ? 'border-emerald-200/50 bg-emerald-500/10 text-emerald-900'
                                : 'border-red-200/50 bg-red-500/10 text-red-900'
                                }`}>
                                {preview.refund_amount > 0 ? (
                                    <>
                                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                                        </div>
                                        <p className="text-3xl font-bold tracking-tight text-emerald-700">
                                            ₹{preview.refund_amount.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                        </p>
                                        <p className="text-sm font-bold text-emerald-600/80 mt-1 uppercase tracking-wider">
                                            {preview.refund_percentage}% refund
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <XCircle className="h-7 w-7 text-red-500" />
                                        </div>
                                        <p className="text-xl font-bold text-red-700">No Refund</p>
                                        <p className="text-sm font-medium text-red-500/80 mt-1 uppercase tracking-wider">Non-refundable policy</p>
                                    </>
                                )}
                            </div>

                            {/* Trust-building message with frosted look */}
                            <div className="bg-white/40 backdrop-blur-md rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-white/40 shadow-sm shadow-blue-900/5">
                                {preview.message}
                            </div>

                            {/* Days before info */}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                    {preview.days_before > 0
                                        ? `Travel is ${preview.days_before} day(s) away`
                                        : 'Travel date has passed'}
                                </span>
                                <span className="mx-1">·</span>
                                <span>Amount paid: ₹{preview.paid_amount.toLocaleString('en-IN')}</span>
                            </div>

                            {!preview.cancellation_enabled && (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                                    ⚠️ This package does not have a cancellation policy configured.
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={closeCancelDialog}
                            disabled={cancelling}
                            className="flex-1 bg-white/20 hover:bg-white/40 border-white/40 text-gray-800 backdrop-blur-sm transition-all"
                        >
                            Keep Booking
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmCancel}
                            disabled={cancelling || previewLoading}
                            className="flex-1 gap-2 bg-red-500/90 hover:bg-red-600 transition-all shadow-lg shadow-red-200/50"
                        >
                            {cancelling ? (
                                <><RefreshCw className="h-4 w-4 animate-spin" /> Cancelling...</>
                            ) : (
                                <><X className="h-4 w-4" /> Confirm Cancel</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
