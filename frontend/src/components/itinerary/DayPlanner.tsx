'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Sunrise, Sunset, Sun, Moon, Plus, Clock, MapPin, DollarSign, X, ChevronRight, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

// Define types locally if they aren't matching or import and adapt
// We will adapt to what page.tsx is sending
export interface Activity {
    id?: string
    title: string
    description: string
    image_url?: string | string[]
    duration?: string
    start_time?: string
    end_time?: string
    price_per_person?: number
    currency?: string
}

export interface DayItineraryData {
    day_number: number
    morning: Activity[]
    afternoon: Activity[]
    evening: Activity[]
    night: Activity[]
}

interface DayPlannerProps {
    day: DayItineraryData
    onAddActivity: (dayNumber: number, timeSlot: 'morning' | 'afternoon' | 'evening' | 'night') => void
    onRemoveActivity: (dayNumber: number, timeSlot: 'morning' | 'afternoon' | 'evening' | 'night', index: number) => void
}

export function DayPlanner({ day, onAddActivity, onRemoveActivity }: DayPlannerProps) {
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

    const getImages = (activity: Activity): string[] => {
        if (!activity.image_url) return []
        return Array.isArray(activity.image_url) ? activity.image_url : [activity.image_url]
    }

    const renderTimelineSection = (
        timeSlot: 'morning' | 'afternoon' | 'evening' | 'night',
        icon: React.ReactNode,
        label: string,
        timeRange: string,
        activities: Activity[],
        isLastSection: boolean = false
    ) => {

        // Color themes
        const themeMap = {
            morning: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100' },
            afternoon: { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', iconBg: 'bg-orange-100' },
            evening: { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', iconBg: 'bg-indigo-100' },
            night: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', iconBg: 'bg-purple-100' }
        }

        const theme = themeMap[timeSlot]

        return (
            <div className="relative pl-8 md:pl-10 py-2 group">
                {/* Connector Line - spanning the entire section */}
                {!isLastSection && (
                    <div className="absolute left-[19px] md:left-[23px] top-6 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-gray-100" />
                )}

                {/* Section Header Node */}
                <div className={cn(
                    "absolute left-[10px] md:left-[14px] top-6 h-5 w-5 rounded-full border-2 border-white shadow-sm z-10 flex items-center justify-center",
                    theme.iconBg
                )}>
                    <div className={cn("h-2 w-2 rounded-full", activities.length > 0 ? "bg-green-500" : "bg-gray-300")} />
                </div>

                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className={cn("p-1.5 rounded-lg", theme.bg, theme.text)}>
                        {icon}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wide">{label}</h4>
                        <p className="text-xs text-gray-500 font-medium">{timeRange}</p>
                    </div>
                </div>

                {/* Activities List */}
                <div className="space-y-4 mb-6">
                    {activities.map((activity, index) => {
                        const images = getImages(activity)

                        return (
                            <div
                                key={index}
                                className="group/card relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-blue-100 transition-all ml-1 cursor-pointer"
                                onClick={() => setSelectedActivity(activity)}
                            >
                                <div className="flex flex-col sm:flex-row">
                                    {/* Image Section */}
                                    <div className="relative w-full sm:w-40 h-32 sm:h-auto shrink-0 overflow-hidden bg-gray-100">
                                        {images.length > 0 ? (
                                            <>
                                                <Image
                                                    src={images[0]}
                                                    alt={activity.title}
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                                                    unoptimized
                                                />
                                                {images.length > 1 && (
                                                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                                                        <ImageIcon className="h-3 w-3" />
                                                        <span>+{images.length - 1}</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-300">
                                                <ImageIcon className="h-8 w-8" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/5 transition-colors" />
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 p-4 flex flex-col justify-between">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <h5 className="font-bold text-base text-gray-900 line-clamp-1 group-hover/card:text-blue-600 transition-colors flex items-center gap-2">
                                                    {activity.title}
                                                    <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                                </h5>
                                                {(activity.start_time || activity.end_time) && (
                                                    <div className="flex items-center text-xs font-semibold text-blue-600 mt-1 mb-1">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {activity.start_time || '?'} - {activity.end_time || '?'}
                                                    </div>
                                                )}
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                    {activity.description.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                                </p>
                                            </div>
                                            {/* Cancel button removed as per request */}
                                        </div>

                                        <div className="flex items-center gap-3 mt-3">
                                            {activity.duration && (
                                                <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-0 font-medium">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {activity.duration}
                                                </Badge>
                                            )}
                                            {activity.price_per_person !== undefined && (
                                                <div className="flex items-center text-sm font-semibold text-gray-900">
                                                    <DollarSign className="h-3.5 w-3.5 text-gray-400 mr-0.5" />
                                                    {activity.currency || '$'} {activity.price_per_person}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* Add Button */}
                    {/* Add Button removed as per request */}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50/50 to-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white border border-gray-100 text-blue-600 flex items-center justify-center font-bold text-xl shadow-sm">
                        {day.day_number}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Day {day.day_number} Itinerary</h3>
                        <p className="text-sm text-gray-500">
                            {(day.morning?.length || 0) + (day.afternoon?.length || 0) + (day.evening?.length || 0) + (day.night?.length || 0)} Activities Planned
                        </p>
                    </div>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="p-6 relative">

                {renderTimelineSection(
                    'morning',
                    <Sunrise className="h-5 w-5" />,
                    'Morning',
                    '06:00 - 12:00',
                    day.morning || []
                )}

                {renderTimelineSection(
                    'afternoon',
                    <Sun className="h-5 w-5" />,
                    'Afternoon',
                    '12:00 - 17:00',
                    day.afternoon || []
                )}

                {renderTimelineSection(
                    'evening',
                    <Sunset className="h-5 w-5" />,
                    'Evening',
                    '17:00 - 21:00',
                    day.evening || []
                )}

                {renderTimelineSection(
                    'night',
                    <Moon className="h-5 w-5" />,
                    'Night',
                    '21:00 - 06:00',
                    day.night || [],
                    true // Last section
                )}
            </div>

            {/* details Modal */}
            <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    {selectedActivity && (
                        <div className="flex flex-col h-full overflow-y-auto">
                            {/* Image Gallery */}
                            <div className="relative w-full bg-black/5 aspect-video shrink-0">
                                {getImages(selectedActivity).length > 0 ? (
                                    <Carousel className="w-full h-full">
                                        <CarouselContent>
                                            {getImages(selectedActivity).map((img, idx) => (
                                                <CarouselItem key={idx} className="h-full">
                                                    <div className="relative w-full h-full aspect-video">
                                                        <Image
                                                            src={img}
                                                            alt={`${selectedActivity.title} - ${idx + 1}`}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                        />
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        {getImages(selectedActivity).length > 1 && (
                                            <>
                                                <CarouselPrevious className="left-4" />
                                                <CarouselNext className="right-4" />
                                            </>
                                        )}
                                    </Carousel>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                        <ImageIcon className="h-10 w-10 opacity-50" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-6 md:p-8 space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedActivity.title}</h2>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedActivity.duration && (
                                            <Badge variant="secondary" className="px-3 py-1 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100">
                                                <Clock className="w-4 h-4 mr-1.5" />
                                                {selectedActivity.duration}
                                            </Badge>
                                        )}
                                        {selectedActivity.price_per_person !== undefined && (
                                            <Badge variant="outline" className="px-3 py-1 text-sm border-2 font-semibold">
                                                <DollarSign className="w-4 h-4 mr-1" />
                                                {selectedActivity.currency} {selectedActivity.price_per_person} / person
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="font-semibold text-gray-900">About this activity</h3>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-base">
                                        {selectedActivity.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
