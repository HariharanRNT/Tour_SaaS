'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { bookingsAPI } from '@/lib/api'
import { Booking } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Calendar, MapPin, Users } from 'lucide-react'

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
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="container mx-auto px-4 py-16">Loading...</div>
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8">My Bookings</h1>

            {bookings.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <p className="text-muted-foreground mb-4">You haven't made any bookings yet</p>
                        <Link href="/plan-trip">
                            <Button>Explore Packages</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {bookings.map((booking) => (
                        <Card key={booking.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{booking.package?.title || 'Package'}</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Booking Reference: {booking.booking_reference}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-block px-3 py-1 rounded-full text-sm ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {booking.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-3 gap-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Travel Date</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(booking.travel_date)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Travelers</p>
                                            <p className="text-sm text-muted-foreground">
                                                {booking.number_of_travelers} person(s)
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Total Amount</p>
                                        <p className="text-2xl font-bold text-primary">
                                            {formatCurrency(booking.total_amount)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/bookings/${booking.id}`}>
                                        <Button variant="outline" size="sm">View Details</Button>
                                    </Link>
                                    {booking.status === 'pending' && (
                                        <Button variant="destructive" size="sm">Cancel Booking</Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
