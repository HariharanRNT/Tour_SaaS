'use client'

import { ItineraryDay } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface ItinerarySummaryProps {
    days: ItineraryDay[]
    destination: string
    locationInfo?: {
        city: string
        country: string
    }
}

export function ItinerarySummary({ days, destination, locationInfo }: ItinerarySummaryProps) {
    // Calculate total cost
    const totalCost = days.reduce((total, day) => {
        let dayCost = 0
        if (day.activities.morning) dayCost += day.activities.morning.price_per_person
        if (day.activities.evening) dayCost += day.activities.evening.price_per_person
        if (day.activities.full_day) dayCost += day.activities.full_day.price_per_person
        return total + dayCost
    }, 0)

    // Count total activities
    const totalActivities = days.reduce((total, day) => {
        let count = 0
        if (day.activities.morning) count++
        if (day.activities.evening) count++
        if (day.activities.full_day) count++
        return total + count
    }, 0)

    // Get currency from first activity
    const currency = days.find(d =>
        d.activities.morning || d.activities.evening || d.activities.full_day
    )?.activities.morning?.currency ||
        days.find(d => d.activities.evening)?.activities.evening?.currency ||
        days.find(d => d.activities.full_day)?.activities.full_day?.currency ||
        '₹'

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {locationInfo?.city || destination}, {locationInfo?.country || ''}
                    </CardTitle>
                    <CardDescription>
                        {formatDuration(days.length)} itinerary
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-black font-semibold">Total Activities</span>
                        <Badge variant="secondary" className="bg-black text-white">{totalActivities}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-black font-semibold">Estimated Cost</span>
                        <span className="text-lg font-black text-black">
                            ₹{totalCost.toFixed(2)}
                        </span>
                    </div>
                    <p className="text-xs text-black font-bold uppercase tracking-wider">
                        * Per person pricing
                    </p>
                </CardContent>
            </Card>

            {/* Day by Day Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="day-1" className="w-full">
                        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                            {days.map((day) => (
                                <TabsTrigger key={day.dayNumber} value={`day-${day.dayNumber}`}>
                                    Day {day.dayNumber}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {days.map((day) => {
                            const dayActivities = [
                                day.activities.morning,
                                day.activities.evening,
                                day.activities.full_day
                            ].filter(Boolean)

                            const dayCost = dayActivities.reduce((sum, act) =>
                                sum + (act?.price_per_person || 0), 0
                            )

                            return (
                                <TabsContent key={day.dayNumber} value={`day-${day.dayNumber}`} className="space-y-3">
                                    {dayActivities.length === 0 ? (
                                        <p className="text-sm text-black font-bold text-center py-8">
                                            No activities scheduled for this day
                                        </p>
                                    ) : (
                                        <>
                                            {dayActivities.map((activity, idx) => (
                                                <div key={idx} className="border rounded-lg p-3">
                                                    <h4 className="font-semibold text-sm mb-1">
                                                        {activity!.title}
                                                    </h4>
                                                    <div className="flex items-center justify-between text-xs text-black font-bold">
                                                        <span>{activity!.duration}</span>
                                                        <span className="font-extrabold text-black">
                                                            ₹{activity!.price_per_person}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="pt-2 border-t flex items-center justify-between">
                                                <span className="text-sm font-bold text-black">Day Total</span>
                                                <span className="font-black text-black">
                                                    ₹{dayCost.toFixed(2)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </TabsContent>
                            )
                        })}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
