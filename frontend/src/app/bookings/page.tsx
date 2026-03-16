'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { bookingsAPI } from '@/lib/api'
import { Booking } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Calendar, Users, Clock, Check, X, Copy, Download, Share2, MoreHorizontal, MapPin, ArrowRight, Eye, CreditCard } from 'lucide-react'
import { toast } from 'react-toastify'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadBookings()
    }, [])

    const loadBookings = async () => {
        try {
            const data = await bookingsAPI.getAll()
            setBookings(data)
        } catch (error) {
            console.error('Failed to load bookings:', error)
            toast.error('Failed to load your bookings')
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
            toast.success('Reference copied to clipboard')
        } else {
            // Fallback for non-secure contexts (like rnt.local)
            const textArea = document.createElement("textarea")
            textArea.value = text
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            try {
                document.execCommand('copy')
                toast.success('Reference copied to clipboard')
            } catch (err) {
                console.error('Unable to copy to clipboard', err)
                toast.error('Failed to copy reference')
            }
            document.body.removeChild(textArea)
        }
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'confirmed':
                return {
                    border: 'border-l-emerald-500',
                    bg: 'bg-emerald-50/30 hover:bg-emerald-50/50',
                    badge: 'bg-gradient-to-r from-emerald-500 to-green-500 shadow-emerald-200 text-white',
                    icon: <Check className="h-3 w-3" />,
                    text: 'CONFIRMED'
                }
            case 'pending':
                return {
                    border: 'border-l-amber-500',
                    bg: 'bg-amber-50/30 hover:bg-amber-50/50',
                    badge: 'bg-gradient-to-r from-amber-500 to-[var(--gradient-end)] shadow-amber-200 text-white animate-pulse',
                    icon: <Clock className="h-3 w-3" />,
                    text: 'PENDING'
                }
            case 'cancelled':
                return {
                    border: 'border-l-red-500',
                    bg: 'bg-red-50/20 hover:bg-red-50/40',
                    badge: 'bg-gradient-to-r from-red-500 to-rose-500 shadow-red-200 text-white',
                    icon: <X className="h-3 w-3" />,
                    text: 'CANCELLED'
                }
            case 'completed':
                return {
                    border: 'border-l-blue-500',
                    bg: 'bg-blue-50/30 hover:bg-blue-50/50',
                    badge: 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-200 text-white',
                    icon: <Check className="h-3 w-3" />,
                    text: 'COMPLETED'
                }
            default:
                return {
                    border: 'border-l-gray-300',
                    bg: 'bg-white',
                    badge: 'bg-gray-100 text-gray-800',
                    icon: null,
                    text: status.toUpperCase()
                }
        }
    }

    const downloadInvoice = async (booking: Booking, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        try {
            toast.info("Starting download...")
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
            <div className="container mx-auto px-4 py-16 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        )
    }

    // ... (rest of file) ...



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
                            const imageUrl = booking.package?.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'

                            return (
                                <Card
                                    key={booking.id}
                                    className={`
                                        overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1
                                        border-l-4 ${statusConfig.border} ${statusConfig.bg}
                                    `}
                                >
                                    <div className="flex flex-col md:flex-row">
                                        {/* Image Section */}
                                        <div className="w-full md:w-48 h-48 md:h-auto relative flex-shrink-0">
                                            {/* We use a div background here for cover fit, but Next/Image is better for optimization if URL is valid */}
                                            {/* Using simple div for robust fallback structure */}
                                            <div className="absolute inset-0 bg-gray-200">
                                                {/* In a real app, use Next/Image with valid domains in config */}
                                                <img
                                                    src={imageUrl}
                                                    alt={booking.package?.title}
                                                    className={`w-full h-full object-cover ${booking.status === 'cancelled' ? 'grayscale opacity-70' : ''}`}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                                                    }}
                                                />
                                            </div>

                                            {/* Status Badge (Visible on mobile image) */}
                                            <div className="absolute top-2 right-2 md:hidden">
                                                <Badge className={`${statusConfig.badge} border-0 px-2 py-1`}>
                                                    <span className="mr-1">{statusConfig.icon}</span> {statusConfig.text}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Content Section */}
                                        <div className="flex-1 p-6 flex flex-col justify-between">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h2 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                                                            {booking.package?.destination ? `🏖️ ${booking.package.title}` : booking.package?.title || 'Custom Trip'}
                                                        </h2>
                                                        {/* Desktop Badge */}
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
                                                    <p className="text-2xl font-bold text-blue-600">
                                                        {formatCurrency(booking.total_amount)}
                                                    </p>
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

                                                {booking.status === 'pending' && (
                                                    <Button variant="ghost" className="flex-1 sm:flex-none gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                                                        <X className="h-4 w-4" /> Cancel
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
        </div>
    )
}
