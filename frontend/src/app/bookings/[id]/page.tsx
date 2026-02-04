'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { bookingsAPI } from '@/lib/api'
import { Booking } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
    Phone
} from 'lucide-react'
import { FlightBookingDetails } from '@/components/booking/flight-booking-details'
import { SimpleFlightCard } from '@/components/booking/simple-flight-card'

export default function BookingDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [booking, setBooking] = useState<Booking | null>(null)
    const [loading, setLoading] = useState(true)

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
        } finally {
            setLoading(false)
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
                    Back to Bookings
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800'
            case 'pending': return 'bg-yellow-100 text-yellow-800'
            case 'cancelled': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed': return <CheckCircle className="h-4 w-4 mr-1" />
            case 'pending': return <Clock className="h-4 w-4 mr-1" />
            case 'cancelled': return <XCircle className="h-4 w-4 mr-1" />
            default: return null
        }
    }

    // Determine contact info (Booking User)
    // Note: The booking object from API might nested user data if joined, 
    // but the Interface 'Booking' might need checking if it includes 'user'
    // For now assuming existing Type or fallback.
    const userEmail = contactInfo?.email || (booking as any).user?.email || 'N/A'
    const userPhone = contactInfo?.phone || (booking as any).user?.phone || 'N/A'
    const userName = (booking as any).user ? `${(booking as any).user.first_name} ${(booking as any).user.last_name}` : 'N/A'


    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-5xl">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Button variant="ghost" onClick={() => router.push('/bookings')} className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to My Bookings
                    </Button>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">Booking Reference:</span>
                        <span className="font-mono font-bold text-lg">{booking.booking_reference}</span>
                        <Badge variant="outline" className={`ml-2 ${getStatusColor(booking.status)} border-0 flex items-center`}>
                            {getStatusIcon(booking.status)}
                            {booking.status.toUpperCase()}
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* LEFT COLUMN - Main Info */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Package Info */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-xl text-blue-700">{booking.package?.title || 'Custom Trip'}</CardTitle>
                                        <CardDescription className="flex items-center mt-1">
                                            <MapPin className="h-3 w-3 mr-1" /> {booking.package?.destination || 'N/A'}
                                        </CardDescription>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Travel Date</p>
                                        <p className="font-semibold">{formatDate(booking.travel_date)}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                        <span>Duration: {booking.package?.duration_days || 0} Days / {booking.package?.duration_nights || 0} Nights</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-gray-400" />
                                        <span>Travelers: {booking.number_of_travelers}</span>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-medium mb-2">Package Inclusions</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {booking.package?.included_items?.map((item, i) => (
                                            <Badge key={i} variant="secondary">{item}</Badge>
                                        )) || <span className="text-sm text-gray-500">No specific inclusions listed.</span>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Flight Info */}
                        {flightConfirmation ? (
                            <div className="bg-white rounded-lg border shadow-sm p-4">
                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <Plane className="h-5 w-5 text-blue-600" /> Flight Details (Confirmed)
                                </h3>
                                <FlightBookingDetails
                                    details={flightConfirmation}
                                    travelers={booking.travelers}
                                    contactInfo={contactInfo}
                                />
                            </div>
                        ) : flightDetails ? (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                    <Plane className="h-5 w-5 text-blue-600" /> Flight Information
                                </h3>

                                {/* Onward Flight */}
                                {(flightDetails.onward || flightDetails.fromCode) && (
                                    <SimpleFlightCard
                                        type="ONWARD"
                                        details={flightDetails.onward || flightDetails}
                                    />
                                )}

                                {/* Return Flight */}
                                {(flightDetails.return || flightDetails.tripType === 'ROUND_TRIP') && (
                                    <SimpleFlightCard
                                        type="RETURN"
                                        details={flightDetails.return || flightDetails}
                                    />
                                )}

                                {!flightConfirmation && (
                                    <div className="mt-2 text-xs text-gray-500 italic text-center">
                                        * Flight details are subject to confirmation. PNR will be generated shortly.
                                    </div>
                                )}
                            </div>
                        ) : null}


                        {/* Travelers List */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Users className="h-5 w-5 text-purple-600" /> Traveler Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>#</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Gender</TableHead>
                                            <TableHead>Nationality</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {booking.travelers?.map((traveler, index) => (
                                            <TableRow key={traveler.id}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell className="font-medium">
                                                    {traveler.first_name} {traveler.last_name}
                                                    {traveler.is_primary && <Badge className="ml-2 text-xs" variant="secondary">Primary</Badge>}
                                                </TableCell>
                                                <TableCell>{traveler.date_of_birth ? 'Adult/Child' : 'N/A'}</TableCell>
                                                <TableCell className="capitalize">{traveler.gender?.toLowerCase()}</TableCell>
                                                <TableCell>{traveler.nationality}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                    </div>

                    {/* RIGHT COLUMN - Sidebar Info */}
                    <div className="space-y-6">

                        {/* Payment Summary */}
                        <Card>
                            <CardHeader className="bg-gray-50 pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <CreditCard className="h-5 w-5" /> Payment Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Amount</span>
                                        <span className="font-bold text-lg">{formatCurrency(booking.total_amount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Payment Status</span>
                                        <span className={`font-medium capitalize ${booking.payment_status === 'succeeded' ? 'text-green-600' :
                                            booking.payment_status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                            {booking.payment_status}
                                        </span>
                                    </div>

                                    <Separator className="my-2" />

                                    <div className="space-y-2 text-xs text-gray-500">
                                        <p>Includes all package inclusions, taxes, and fees.</p>
                                        <p>Transaction ID: Not recorded in demo mode</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contact Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <User className="h-4 w-4" /> Primary Contact
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <span>{userName}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span>{userEmail}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span>{userPhone}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-50 border-blue-100">
                            <CardContent className="pt-6">
                                <h4 className="font-semibold text-blue-900 mb-2">Need Help?</h4>
                                <p className="text-sm text-blue-800 mb-4">
                                    Contact our support team for any changes to your booking.
                                </p>
                                <Button variant="outline" className="w-full bg-white text-blue-700 hover:bg-blue-50">
                                    Contact Support
                                </Button>
                            </CardContent>
                        </Card>

                    </div>
                </div>

            </div>
        </div>
    )
}
