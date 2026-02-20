'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Sunrise, Sunset, Sun, Moon, Plus, Clock, MapPin, X, ChevronRight, Image as ImageIcon, Calendar } from 'lucide-react'
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
    half_day: Activity[]
    full_day: Activity[]
}

interface DayPlannerProps {
    day: DayItineraryData
    onAddActivity: (dayNumber: number, timeSlot: 'morning' | 'afternoon' | 'evening' | 'night' | 'half_day' | 'full_day') => void
    onRemoveActivity: (dayNumber: number, timeSlot: 'morning' | 'afternoon' | 'evening' | 'night' | 'half_day' | 'full_day', index: number) => void
    isReadonly?: boolean
    // Theme Props
    morningColor?: string
    afternoonColor?: string
    eveningColor?: string
    nightColor?: string
    activeDayColor?: string
    headingBorderColor?: string
    dayBadgeColor?: string
}

export function DayPlanner({
    day,
    onAddActivity,
    onRemoveActivity,
    isReadonly,
    morningColor,
    afternoonColor,
    eveningColor,
    nightColor,
    activeDayColor,
    headingBorderColor,
    dayBadgeColor
}: DayPlannerProps) {
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

    const getImages = (activity: Activity): string[] => {
        if (!activity.image_url) return []
        return Array.isArray(activity.image_url) ? activity.image_url : [activity.image_url]
    }

    const renderTimelineSection = (
        timeSlot: 'morning' | 'afternoon' | 'evening' | 'night' | 'half_day' | 'full_day',
        icon: React.ReactNode,
        label: string,
        timeRange: string,
        activities: Activity[],
        isLastSection: boolean = false
    ) => {

        // Enhanced Color themes
        const themeMap = {
            morning: { text: morningColor ? '' : 'text-amber-700', bg: 'bg-gradient-to-br from-amber-50 to-orange-50', border: 'border-amber-200', iconBg: 'bg-amber-100', pill: 'bg-amber-100 text-amber-800', customColor: morningColor },
            afternoon: { text: afternoonColor ? '' : 'text-orange-700', bg: 'bg-gradient-to-br from-orange-50 to-red-50', border: 'border-orange-200', iconBg: 'bg-orange-100', pill: 'bg-orange-100 text-orange-800', customColor: afternoonColor },
            evening: { text: eveningColor ? '' : 'text-indigo-700', bg: 'bg-gradient-to-br from-indigo-50 to-violet-50', border: 'border-indigo-200', iconBg: 'bg-indigo-100', pill: 'bg-indigo-100 text-indigo-800', customColor: eveningColor },
            night: { text: nightColor ? '' : 'text-purple-700', bg: 'bg-gradient-to-br from-purple-50 to-slate-50', border: 'border-purple-200', iconBg: 'bg-purple-100', pill: 'bg-purple-100 text-purple-800', customColor: nightColor },
            half_day: { text: 'text-teal-700', bg: 'bg-gradient-to-br from-teal-50 to-emerald-50', border: 'border-teal-200', iconBg: 'bg-teal-100', pill: 'bg-teal-100 text-teal-800' },
            full_day: { text: 'text-blue-700', bg: 'bg-gradient-to-br from-blue-50 to-cyan-50', border: 'border-blue-200', iconBg: 'bg-blue-100', pill: 'bg-blue-100 text-blue-800' }
        }

        const theme = themeMap[timeSlot]

        return (
            <div className="relative pl-12 md:pl-16 py-4 group">
                {/* Connector Line - spanning the entire section */}
                {!isLastSection && (
                    <div className="absolute left-[27px] md:left-[35px] top-10 bottom-0 w-0.5 bg-gray-200/80 group-hover:bg-blue-200 transition-colors" />
                )}

                {/* Section Header Node (Large Icon) */}
                <div
                    className={cn(
                        "absolute left-[10px] md:left-[14px] top-5 h-9 w-9 md:h-11 md:w-11 rounded-xl border-[3px] border-white shadow-md z-10 flex items-center justify-center transition-transform hover:scale-110",
                        theme.bg, theme.text
                    )}
                    style={{ color: (theme as any).customColor || '', backgroundColor: (theme as any).customColor ? `${(theme as any).customColor}10` : '' }}
                >
                    {icon}
                </div>

                {/* Section Header Text */}
                <div className="flex items-baseline gap-3 mb-6 ml-2">
                    <h4 className={cn("font-bold text-lg md:text-xl capitalize", theme.text)} style={{ color: (theme as any).customColor || '' }}>
                        {label}
                    </h4>
                    <span className="text-gray-400 font-medium text-sm bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                        {timeRange}
                    </span>
                </div>

                {/* Activities List */}
                <div className="space-y-6 mb-8">
                    {activities.map((activity, index) => {
                        const images = getImages(activity)

                        return (
                            <div
                                key={index}
                                className="group/card relative overflow-hidden rounded-[1.25rem] border border-gray-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer ml-1"
                                onClick={() => setSelectedActivity(activity)}
                            >
                                <div className="flex flex-col md:flex-row h-full">
                                    {/* Image Section - Larger & Responsive */}
                                    <div className="relative w-full md:w-64 h-48 md:h-auto shrink-0 overflow-hidden bg-gray-100">
                                        {images.length > 0 ? (
                                            <>
                                                <Image
                                                    src={images[0]}
                                                    alt={activity.title}
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover/card:scale-110"
                                                    unoptimized
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                                {images.length > 1 && (
                                                    <div className="absolute bottom-3 right-3 bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-md flex items-center gap-1 border border-white/30">
                                                        <ImageIcon className="h-3.5 w-3.5" />
                                                        <span>+{images.length - 1} photos</span>
                                                    </div>
                                                )}

                                                {/* Price Overlay on Image (Mobile) */}
                                                {activity.price_per_person !== undefined && (
                                                    <div className="absolute top-3 left-3 md:hidden bg-white/90 backdrop-blur text-gray-900 text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                                                        ₹{activity.price_per_person}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-300 bg-gray-50">
                                                <ImageIcon className="h-10 w-10 opacity-30" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 p-5 md:p-6 flex flex-col">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="space-y-1">
                                                <h5 className="font-bold text-lg md:text-xl text-gray-900 leading-snug group-hover/card:text-blue-600 transition-colors">
                                                    {activity.title}
                                                </h5>
                                                {(activity.start_time || activity.end_time) && (
                                                    <div className="flex items-center text-sm font-medium text-gray-500 mb-2">
                                                        <Clock className="h-4 w-4 mr-1.5 text-blue-500" />
                                                        {activity.start_time || '?'} - {activity.end_time || '?'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="hidden md:block">
                                                <div className="bg-gray-50 rounded-full p-2 group-hover/card:bg-blue-50 transition-colors">
                                                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover/card:text-blue-500 transition-colors" />
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-gray-500 mt-3 line-clamp-2 text-sm leading-relaxed mb-auto">
                                            {activity.description.replace(/<[^>]*>/g, '').substring(0, 140)}...
                                        </p>

                                        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-50">
                                            {activity.duration && (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 px-2.5 py-0.5 font-medium flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {activity.duration}
                                                </Badge>
                                            )}
                                            {activity.price_per_person !== undefined && (
                                                <div className="hidden md:flex items-center text-sm font-bold text-gray-900 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-100 text-green-700">
                                                    <span className="mr-0.5">₹</span>
                                                    {activity.price_per_person}
                                                </div>
                                            )}
                                            <span className="text-xs font-semibold text-blue-600 ml-auto group-hover/card:underline cursor-pointer">
                                                View details
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    const totalActivities = (day.morning?.length || 0) + (day.afternoon?.length || 0) + (day.evening?.length || 0) + (day.night?.length || 0)

    let pace = 'Balanced'
    if (totalActivities <= 2) pace = 'Relaxed'
    else if (totalActivities >= 5) pace = 'Packed'

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden ring-1 ring-gray-900/5 hover:ring-blue-500/20 transition-all duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 via-white to-blue-50/20 px-6 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                    <div
                        className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex flex-col items-center justify-center font-bold shadow-lg shadow-blue-500/30 transform transition-transform hover:rotate-3 hover:scale-105"
                        style={{ backgroundColor: dayBadgeColor || '', backgroundImage: dayBadgeColor ? 'none' : '' }}
                    >
                        <span className="text-xs font-medium opacity-80 uppercase tracking-widest">Day</span>
                        <span className="text-3xl leading-none">{day.day_number}</span>
                    </div>
                    <div>
                        <h3 className="font-extrabold text-gray-900 text-2xl tracking-tight mb-1">
                            Destination Highlights
                        </h3>
                        <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
                            <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-gray-200 shadow-sm">
                                <span className="bg-blue-100 text-blue-700 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold">{totalActivities}</span>
                                <span>Experiences</span>
                            </span>
                            <span className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm",
                                pace === 'Relaxed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                    pace === 'Balanced' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-orange-50 text-orange-700 border-orange-100"
                            )}>
                                {pace === 'Relaxed' && '🌱'}
                                {pace === 'Balanced' && '⚖️'}
                                {pace === 'Packed' && '⚡'}
                                {pace} Pace
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="p-2 md:p-8 relative">
                {/* Full Day Exclusivity Rule */}
                {day.full_day && day.full_day.length > 0 ? (
                    renderTimelineSection(
                        'full_day',
                        <Calendar className="h-5 w-5" />,
                        'Full Day',
                        'All Day Experience',
                        day.full_day,
                        true
                    )
                ) : (
                    <>
                        {(() => {
                            const firstHalf = (day.half_day || []).filter(a => a.start_time && parseInt(a.start_time.split(':')[0]) < 12)
                            const secondHalf = (day.half_day || []).filter(a => !a.start_time || parseInt(a.start_time.split(':')[0]) >= 12)

                            return (
                                <>
                                    {/* First Half (Pre-Morning) */}
                                    {firstHalf.length > 0 && renderTimelineSection(
                                        'half_day',
                                        <Clock className="h-5 w-5" />,
                                        'Early Start',
                                        '06:00 - 12:00',
                                        firstHalf
                                    )}

                                    {renderTimelineSection(
                                        'morning',
                                        <Sunrise className="h-6 w-6" />,
                                        'Morning',
                                        '06:00 - 12:00',
                                        day.morning || []
                                    )}

                                    {/* Second Half (Post-Morning) */}
                                    {secondHalf.length > 0 && renderTimelineSection(
                                        'half_day',
                                        <Clock className="h-5 w-5" />,
                                        'Mid-Day',
                                        '12:00 - 18:00',
                                        secondHalf
                                    )}

                                    {renderTimelineSection(
                                        'afternoon',
                                        <Sun className="h-6 w-6" />,
                                        'Afternoon',
                                        '12:00 - 17:00',
                                        day.afternoon || []
                                    )}

                                    {renderTimelineSection(
                                        'evening',
                                        <Sunset className="h-6 w-6" />,
                                        'Evening',
                                        '17:00 - 21:00',
                                        day.evening || []
                                    )}

                                    {renderTimelineSection(
                                        'night',
                                        <Moon className="h-6 w-6" />,
                                        'Night',
                                        '21:00 - 06:00',
                                        day.night || [],
                                        true // Last section
                                    )}
                                </>
                            )
                        })()}
                    </>
                )}
            </div>

            {/* details Modal */}
            <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-[2rem] border-0 [&>button]:hidden">
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
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 pointer-events-none" />
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        {getImages(selectedActivity).length > 1 && (
                                            <>
                                                <CarouselPrevious className="left-4 bg-white/20 border-white/40 text-white hover:bg-white/40" />
                                                <CarouselNext className="right-4 bg-white/20 border-white/40 text-white hover:bg-white/40" />
                                            </>
                                        )}
                                    </Carousel>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                        <ImageIcon className="h-16 w-16 opacity-30" />
                                    </div>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-4 right-4 bg-black/20 text-white hover:bg-black/40 rounded-full z-50 backdrop-blur-sm"
                                    onClick={() => setSelectedActivity(null)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>

                                <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-10">
                                    <h2 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-md">{selectedActivity.title}</h2>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedActivity.duration && (
                                            <Badge className="px-3 py-1 text-sm bg-white/20 text-white border-white/30 backdrop-blur-md">
                                                <Clock className="w-4 h-4 mr-1.5" />
                                                {selectedActivity.duration}
                                            </Badge>
                                        )}
                                        {selectedActivity.price_per_person !== undefined && (
                                            <Badge className="px-3 py-1 text-sm bg-green-500/80 text-white border-transparent backdrop-blur-md font-bold">
                                                <span className="mr-1">₹</span>
                                                {selectedActivity.price_per_person}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-8 md:p-10 space-y-8 bg-white">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                                        About this activity
                                        <div className="h-px bg-gray-100 flex-1 ml-4"></div>
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-wrap">
                                        {selectedActivity.description}
                                    </p>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button onClick={() => setSelectedActivity(null)} size="lg" className="rounded-xl px-8">
                                        Close Details
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
