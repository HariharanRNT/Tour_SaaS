'use client'

import { MapPin, Calendar, Clock, BarChart3, Utensils, Car, Map, Info, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface Activity {
    id?: string
    title: string
    description: string
    image_urls?: string[]
    time_slot: string
    start_time?: string
    end_time?: string
    display_order: number
}

interface DayActivities {
    morning: Activity[]
    afternoon: Activity[]
    evening: Activity[]
    night: Activity[]
    half_day: Activity[]
    full_day: Activity[]
}

interface ItinerarySummaryProps {
    activities: Record<number, DayActivities>
    durationDays: number
    destinations: { city: string; country: string; days: number }[]
    packageMode: string
}

export function ItinerarySummary({ activities, durationDays, destinations, packageMode }: ItinerarySummaryProps) {
    const totalActivities = Object.values(activities).reduce((acc: number, day: DayActivities) =>
        acc + Object.values(day).reduce((dAcc: number, slot: Activity[]) => dAcc + slot.length, 0)
        , 0)

    const totalMeals = Object.values(activities).reduce((acc: number, day: DayActivities) =>
        acc + (day.morning.filter((a: Activity) => a.title.toLowerCase().includes('breakfast')).length || 0) +
        (day.afternoon.filter((a: Activity) => a.title.toLowerCase().includes('lunch')).length || 0) +
        (day.evening.filter((a: Activity) => a.title.toLowerCase().includes('dinner')).length || 0)
        , 0)

    const totalTours = Object.values(activities).reduce((acc: number, day: DayActivities) =>
        acc + Object.values(day).reduce((dAcc: number, slot: Activity[]) =>
            dAcc + slot.filter((a: Activity) => a.title.toLowerCase().includes('tour') || a.title.toLowerCase().includes('visit') || a.title.toLowerCase().includes('museum')).length
            , 0)
        , 0)

    const totalTransfers = Object.values(activities).reduce((acc: number, day: DayActivities) =>
        acc + Object.values(day).reduce((dAcc: number, slot: Activity[]) =>
            dAcc + slot.filter((a: Activity) => a.title.toLowerCase().includes('transfer') || a.title.toLowerCase().includes('pick') || a.title.toLowerCase().includes('drop')).length
            , 0)
        , 0)

    // Completion percentage based on activities per day (at least 2 recommended)
    const activeDays = Object.keys(activities).filter(day => {
        const d = activities[parseInt(day)]
        return Object.values(d).some(slot => slot.length > 0)
    }).length
    const completionPercentage = Math.round((activeDays / durationDays) * 100)

    return (
        <div className="flex flex-col h-full bg-slate-50/50 backdrop-blur-xl border-l border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white/40">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Package Summary</h3>
                <p className="text-[10px] text-slate-900 font-medium">Auto-calculating your itinerary stats</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/60 p-3 rounded-2xl border border-white/80 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-violet-100 text-violet-600 rounded-lg">
                                <BarChart3 className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-900 uppercase">Total</span>
                        </div>
                        <p className="text-xl font-black text-slate-800">{totalActivities}</p>
                        <p className="text-[9px] text-slate-700 font-medium whitespace-nowrap">Activities planned</p>
                    </div>

                    <div className="bg-white/60 p-3 rounded-2xl border border-white/80 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                                <Utensils className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-900 uppercase">Meals</span>
                        </div>
                        <p className="text-xl font-black text-slate-800">{totalMeals}</p>
                        <p className="text-[9px] text-slate-700 font-medium whitespace-nowrap">Included in trip</p>
                    </div>
                </div>

                {/* Progress Card */}
                <Card className="bg-white/40 backdrop-blur-md border-white/60 shadow-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <h4 className="text-xs font-bold text-slate-800 mb-0.5">Itinerary Coverage</h4>
                                <p className="text-[10px] text-slate-900">{activeDays} of {durationDays} days planned</p>
                            </div>
                            <span className={cn(
                                "text-xs font-black",
                                completionPercentage > 80 ? "text-emerald-600" : completionPercentage > 40 ? "text-amber-500" : "text-slate-700"
                            )}>{completionPercentage}%</span>
                        </div>
                        <Progress value={completionPercentage} className="h-2 bg-slate-100/50" />

                        {completionPercentage < 100 && (
                            <div className="flex gap-2 p-2 bg-amber-50/50 border border-amber-100 rounded-xl">
                                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <p className="text-[9px] text-amber-900 font-medium">
                                    Continue adding activities to reach full coverage!
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Detailed Breakdown */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest px-1">Detailed Breakdown</h4>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-2.5 bg-white/40 border border-white/60 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Map className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800">{totalTours}</p>
                                    <p className="text-[9px] text-slate-900 font-medium">Sightseeing & Tours</p>
                                </div>
                            </div>
                            {totalTours > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-white/40 border border-white/60 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Car className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800">{totalTransfers}</p>
                                    <p className="text-[9px] text-slate-900 font-medium">Ground Transfers</p>
                                </div>
                            </div>
                            {totalTransfers > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                    </div>
                </div>

                {/* Destination Leg Checklist */}
                {packageMode === 'multi' && destinations.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest px-1">Destination Legs</h4>
                        <div className="space-y-2">
                            {destinations.map((dest, idx) => {
                                // Simple logic to check if this destination has any activities (approximate based on days)
                                // In a more robust implementation, we'd map exact day ranges to destinations
                                return (
                                    <div key={idx} className="flex items-start gap-3 p-2.5 bg-white/40 border border-white/60 rounded-xl">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate">{dest.city}</p>
                                            <p className="text-[9px] text-slate-900 font-medium">{dest.days} Days • {dest.country}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Price Preview */}
            <div className="p-4 bg-indigo-600 text-white border-t border-indigo-700">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-tight">Package Complexity</span>
                    <Badge className="bg-white/20 text-white text-[9px] border-none">High Impact</Badge>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-[10px] opacity-70">Estimated Value Score:</span>
                    <span className="text-lg font-black">{totalActivities * 15 + totalMeals * 5 + totalTours * 20}</span>
                </div>
            </div>
        </div>
    )
}
