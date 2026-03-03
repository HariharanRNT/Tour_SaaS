'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, MapPin, Loader2, Clock } from 'lucide-react'

export default function CreateItineraryPage() {
    const router = useRouter()
    const [destination, setDestination] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [loading, setLoading] = useState(false)
    const [itinerary, setItinerary] = useState<any>(null)
    const [error, setError] = useState('')

    const calculateDays = () => {
        if (!startDate || !endDate) return 0
        const start = new Date(startDate)
        const end = new Date(endDate)
        const diffTime = Math.abs(end.getTime() - start.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        return diffDays
    }

    const handleCreateItinerary = async () => {
        if (!destination || !startDate || !endDate) {
            setError('Please fill in all fields')
            return
        }

        const days = calculateDays()
        if (days < 1 || days > 30) {
            setError('Please select between 1 and 30 days')
            return
        }

        setLoading(true)
        setError('')

        try {
            // TODO: Call itinerary API when backend is fixed
            // For now, simulate the response
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Mock itinerary data
            const mockItinerary = {
                itinerary_id: 'mock-123',
                destination,
                start_date: startDate,
                end_date: endDate,
                total_days: days,
                days: Array.from({ length: days }, (_, i) => ({
                    day_number: i + 1,
                    date: new Date(new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    slots: [
                        { time_slot: 'MORNING', activity: null, is_available: true },
                        { time_slot: 'AFTERNOON', activity: null, is_available: true },
                        { time_slot: 'EVENING', activity: null, is_available: true }
                    ],
                    total_activities: 0,
                    is_full: false
                })),
                unassigned_activities: [],
                total_price: 0,
                currency: 'USD'
            }

            setItinerary(mockItinerary)
        } catch (err: any) {
            setError(err.message || 'Failed to create itinerary')
        } finally {
            setLoading(false)
        }
    }

    const getTimeSlotIcon = (slot: string) => {
        switch (slot) {
            case 'MORNING': return '🌅'
            case 'AFTERNOON': return '☀️'
            case 'EVENING': return '🌆'
            default: return '⏰'
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold mb-2">Create Your Itinerary</h1>
                <p className="text-muted-foreground mb-8">
                    Select your destination and travel dates to get a personalized day-wise itinerary
                </p>

                {!itinerary ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Trip Details</CardTitle>
                            <CardDescription>
                                Tell us where you want to go and when
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="destination">Destination</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="destination"
                                        placeholder="e.g., Singapore, Paris, Tokyo"
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start-date">Start Date</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            id="start-date"
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="pl-10"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="end-date">End Date</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            id="end-date"
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="pl-10"
                                            min={startDate || new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>
                            </div>

                            {startDate && endDate && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-blue-900">
                                        <Clock className="h-5 w-5" />
                                        <span className="font-semibold">
                                            {calculateDays()} {calculateDays() === 1 ? 'day' : 'days'} trip
                                        </span>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-900">
                                    {error}
                                </div>
                            )}

                            <Button
                                onClick={handleCreateItinerary}
                                disabled={loading || !destination || !startDate || !endDate}
                                size="lg"
                                className="w-full"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        Creating Your Itinerary...
                                    </>
                                ) : (
                                    'Create Itinerary'
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Your {itinerary.destination} Itinerary</CardTitle>
                                <CardDescription>
                                    {itinerary.total_days} days • {itinerary.start_date} to {itinerary.end_date}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {itinerary.currency} {itinerary.total_price.toFixed(2)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Total Price</p>
                                    </div>
                                    <Button onClick={() => setItinerary(null)} variant="outline">
                                        Create New Itinerary
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Day-wise breakdown */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold">Day-wise Plan</h2>
                            {itinerary.days.map((day: any) => (
                                <Card key={day.day_number}>
                                    <CardHeader>
                                        <CardTitle>Day {day.day_number}</CardTitle>
                                        <CardDescription>{day.date}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {day.slots.map((slot: any) => (
                                                <div key={slot.time_slot} className="border-l-4 border-blue-500 pl-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-2xl">{getTimeSlotIcon(slot.time_slot)}</span>
                                                        <span className="font-semibold">{slot.time_slot}</span>
                                                    </div>
                                                    {slot.activity ? (
                                                        <div className="glass-panel p-4">
                                                            <h4 className="font-semibold">{slot.activity.title}</h4>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {slot.activity.description}
                                                            </p>
                                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                                <span>⏱️ {slot.activity.duration_hours}h</span>
                                                                <span>💰 {slot.activity.currency} {slot.activity.price_per_person}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-muted-foreground italic">
                                                            No activity assigned
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Unassigned activities */}
                        {itinerary.unassigned_activities.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Available Activities</CardTitle>
                                    <CardDescription>
                                        {itinerary.unassigned_activities.length} activities couldn't be auto-assigned
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {itinerary.unassigned_activities.map((activity: any) => (
                                            <div key={activity.activity_id} className="border rounded-lg p-4">
                                                <h4 className="font-semibold">{activity.title}</h4>
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                    {activity.description}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-sm">
                                                    <span>⏱️ {activity.duration_hours}h</span>
                                                    <span>💰 {activity.currency} {activity.price_per_person}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
