import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel'
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
    images?: string[]
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
    const [api, setApi] = useState<CarouselApi | null>(null)
    const [current, setCurrent] = useState(1)

    useEffect(() => {
        if (!api) return

        setCurrent(api.selectedScrollSnap() + 1)

        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1)
        })
    }, [api])

    const getImages = (activity: Activity): string[] => {
        // Prioritize the 'images' array if it exists (sent by backend for multi-image activities)
        if (activity.images && Array.isArray(activity.images) && activity.images.length > 0) {
            return activity.images;
        }

        if (!activity.image_url) return []
        if (Array.isArray(activity.image_url)) return activity.image_url

        // Handle potential stringified JSON arrays from backend
        if (typeof activity.image_url === 'string') {
            const trimmed = activity.image_url.trim();
            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed)
                    if (Array.isArray(parsed)) return parsed
                } catch (e) {
                    // Not a JSON array
                }
            }

            // Handle comma-separated URLs (common in some uploaders)
            if (trimmed.includes(',')) {
                return trimmed.split(',').map(u => u.trim()).filter(Boolean);
            }
        }

        return [activity.image_url]
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
            morning: { text: 'text-[#D97706]', bg: 'bg-white', border: 'border-[#D97706]', iconBg: 'bg-gradient-to-br from-[#F59E0B] to-[#FCD34D]', iconColor: 'text-white' },
            afternoon: { text: 'text-[#EA580C]', bg: 'bg-white', border: 'border-[#EA580C]', iconBg: 'bg-gradient-to-br from-[#F97316] to-[#FB923C]', iconColor: 'text-white' },
            evening: { text: 'text-[#DC4E2A]', bg: 'bg-white', border: 'border-[#DC4E2A]', iconBg: 'bg-gradient-to-br from-[#E11D48] to-[#FB7185]', iconColor: 'text-white' },
            night: { text: 'text-[#92400E]', bg: 'bg-white', border: 'border-[#92400E]', iconBg: 'bg-gradient-to-br from-[#451A03] to-[#92400E]', iconColor: 'text-white' },
            half_day: { text: 'text-teal-700', bg: 'bg-white', border: 'border-teal-200', iconBg: 'bg-teal-500', iconColor: 'text-white' },
            full_day: { text: 'text-blue-700', bg: 'bg-white', border: 'border-blue-200', iconBg: 'bg-blue-500', iconColor: 'text-white' }
        }

        const theme = themeMap[timeSlot]

        return (
            <div className="relative pl-12 md:pl-16 py-4 group">
                {/* Connector Line - Dashed Gradient */}
                {!isLastSection && (
                    <div
                        className="absolute left-[27px] md:left-[39px] top-12 bottom-0 w-0.5"
                        style={{
                            backgroundImage: 'linear-gradient(to bottom, rgba(232,104,42,0.4) 50%, transparent 50%)',
                            backgroundSize: '1px 8px',
                            backgroundRepeat: 'repeat-y'
                        }}
                    />
                )}

                {/* Section Header Node (Icon Circle) */}
                <div
                    className={cn(
                        "absolute left-[10px] md:left-[18px] top-5 h-10 w-10 md:h-11 md:w-11 rounded-full shadow-lg z-10 flex items-center justify-center transition-all hover:scale-110",
                        theme.iconBg, theme.iconColor
                    )}
                >
                    {icon}
                    {/* Timeline dot */}
                    <div className="absolute -left-1 w-2.5 h-2.5 rounded-full bg-[#E8682A] hidden md:block" />
                </div>

                {/* Frosted Time-Strip Header */}
                <div className="flex items-center gap-4 mb-8 translate-x-1 md:translate-x-2">
                    <div className="flex items-center gap-4 bg-white/20 backdrop-blur-md border border-white/30 px-6 py-2.5 rounded-[1rem] shadow-sm">
                        <h4 className={cn("font-display text-xl md:text-2xl italic font-bold", theme.text)}>
                            {label}
                        </h4>
                        <div className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-full border border-orange-100/30">
                            <span className="text-[#8B5030] font-bold text-[10px] uppercase tracking-widest whitespace-nowrap">
                                {timeRange}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Activities List */}
                <div className="space-y-8 mb-10">
                    {activities.map((activity, index) => {
                        const images = getImages(activity)

                        return (
                            <div
                                key={index}
                                className="group/card relative overflow-hidden rounded-[2.5rem] border border-orange-200/20 bg-white/60 backdrop-blur-[16px] shadow-[0_8px_24px_rgba(180,80,20,0.1)] hover:shadow-[0_20px_50px_rgba(200,80,20,0.18)] hover:-translate-y-2 transition-all duration-500 cursor-pointer ml-1"
                                onClick={() => setSelectedActivity(activity)}
                            >
                                <div className="flex flex-col md:flex-row h-full">
                                    {/* Image Section */}
                                    <div className="relative w-full md:w-56 h-48 md:h-52 shrink-0 overflow-hidden bg-gray-100 rounded-3xl m-2 md:m-4">
                                        {images.length > 0 ? (
                                            <>
                                                <Image
                                                    src={images[0]}
                                                    alt={activity.title}
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover/card:scale-110"
                                                    unoptimized
                                                />
                                                {/* Warm Overlay */}
                                                <div className="absolute inset-0 bg-orange-900/10 group-hover/card:bg-transparent transition-colors duration-500" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                                {images.length > 1 && (
                                                    <div className="absolute bottom-3 right-3 bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md flex items-center gap-1 border border-white/30">
                                                        <ImageIcon className="h-3 w-3" />
                                                        <span>+{images.length - 1}</span>
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
                                    <div className="flex-1 p-6 md:py-8 md:pr-10 md:pl-4 flex flex-col">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="space-y-2">
                                                {/* Category Tag */}
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100/50 border border-orange-200/50 text-[#A0501E] text-[10px] font-bold uppercase tracking-wider mb-1">
                                                    ✨ Top Experience
                                                </div>

                                                <h5 className="font-display text-2xl md:text-3xl text-[#3A1A08] leading-tight group-hover/card:text-[#E8682A] transition-colors">
                                                    {activity.title}
                                                </h5>
                                                {(activity.start_time || activity.end_time) && (
                                                    <div className="flex items-center text-xs font-bold text-[#A0501E]/60 uppercase tracking-widest">
                                                        <Clock className="h-3.5 w-3.5 mr-2 text-[#E8682A]" />
                                                        {activity.start_time || '?'} - {activity.end_time || '?'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-[#A0501E] mt-4 line-clamp-2 text-sm leading-relaxed font-light opacity-80 mb-auto">
                                            {activity.description.replace(/<[^>]*>/g, '').substring(0, 140)}...
                                        </p>

                                        <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-orange-100/30">
                                            <div className="flex items-center gap-3">
                                                {activity.duration && (
                                                    <Badge variant="outline" className="bg-transparent text-[#A0501E] border-orange-200/50 px-3 py-1 font-bold text-[10px] flex items-center gap-1.5 uppercase tracking-wider">
                                                        <Clock className="h-3 w-3" />
                                                        {activity.duration}
                                                    </Badge>
                                                )}
                                                {activity.price_per_person !== undefined && (
                                                    <div className="flex items-center text-[11px] font-black text-[#E8682A] bg-orange-50/50 px-3 py-1 rounded-full border border-orange-100/50 uppercase tracking-wider">
                                                        ₹{activity.price_per_person}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 bg-[#E8682A]/10 border border-[#E8682A]/30 px-4 py-1.5 rounded-full text-[10px] font-bold text-[#E8682A] uppercase tracking-widest transition-all group/btn hover:bg-[#E8682A] hover:text-white">
                                                <span>View details</span>
                                                <ChevronRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                                            </div>
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
        <div className="relative group/main">
            {/* Main Glass Container */}
            <div className="bg-[#FFEBD2]/35 backdrop-blur-[20px] rounded-[2rem] border border-orange-200/30 shadow-[inset_0_1px_0_rgba(255,220,160,0.5),0_20px_60px_rgba(200,80,20,0.12)] overflow-hidden transition-all duration-500">
                {/* Header */}
                <div className="px-8 py-10 border-b border-orange-200/20 flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                    <div className="flex items-center gap-8">
                        {/* Pulsing Day Badge */}
                        <div className="relative shrink-0">
                            {/* Outer pulsing ring */}
                            <div className="absolute inset-[-8px] rounded-full bg-[#E8682A]/10 animate-pulse" />

                            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#E8682A] to-[#C2440A] text-white flex flex-col items-center justify-center shadow-[0_12px_30px_rgba(232,104,42,0.4)] relative z-10 border-4 border-white">
                                <span className="text-[9px] font-bold opacity-90 uppercase tracking-[0.2em] mb-0.5 mt-1">Day</span>
                                <span className="text-4xl leading-none font-display font-black">{day.day_number}</span>
                            </div>
                        </div>

                        <div className="relative group">
                            {/* Decorative left accent bar */}
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-[#E8682A] to-[#C2440A] rounded-full hidden md:block" />

                            <h3 className="font-display text-4xl leading-none">
                                <span className="text-[#3A1A08] font-bold">Destination</span>{' '}
                                <span className="text-[#E8682A] italic font-medium">Highlights</span>
                            </h3>

                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                <span className="flex items-center gap-2 bg-[#E8682A]/10 px-4 py-1.5 rounded-full border border-[#E8682A]/30 transition-all hover:bg-[#E8682A]/20">
                                    <div className="w-2 h-2 rounded-full bg-[#E8682A]" />
                                    <span className="font-bold text-[#E8682A] text-[10px] uppercase tracking-widest">{totalActivities} Experiences</span>
                                </span>
                                <span className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                                    pace === 'Relaxed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        pace === 'Balanced' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"
                                )}>
                                    {pace === 'Relaxed' ? '🌱' : pace === 'Balanced' ? '⚖️' : '⚡'}
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
                                <div className="relative w-full bg-black/5 aspect-[16/10] md:aspect-video shrink-0">
                                    {(() => {
                                        const images = getImages(selectedActivity);
                                        return images.length > 0 ? (
                                            <Carousel setApi={setApi} className="w-full h-full">
                                                <CarouselContent className="h-full ml-0">
                                                    {images.map((img, idx) => (
                                                        <CarouselItem key={idx} className="basis-full h-full pl-0">
                                                            <div className="relative w-full h-full aspect-[16/10] md:aspect-video">
                                                                <Image
                                                                    src={img}
                                                                    alt={`${selectedActivity.title} - ${idx + 1}`}
                                                                    fill
                                                                    className="object-cover"
                                                                    unoptimized
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 pointer-events-none" />
                                                            </div>
                                                        </CarouselItem>
                                                    ))}
                                                </CarouselContent>
                                                {images.length > 1 && (
                                                    <>
                                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white text-[10px] font-bold">
                                                            <ImageIcon className="h-3 w-3" />
                                                            <span>{current} / {images.length}</span>
                                                        </div>
                                                        <CarouselPrevious className="left-4 z-40 bg-white/20 border-white/40 text-white hover:bg-white/40 backdrop-blur-sm" />
                                                        <CarouselNext className="right-4 z-40 bg-white/20 border-white/40 text-white hover:bg-white/40 backdrop-blur-sm" />
                                                    </>
                                                )}
                                            </Carousel>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                                <ImageIcon className="h-16 w-16 opacity-30" />
                                            </div>
                                        );
                                    })()}
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
        </div >
    )
}
