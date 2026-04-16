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
    cardStyle?: 'glassy' | 'minimal' | 'rounded' | 'classic'
    buttonStyle?: 'pill' | 'rounded' | 'square'
    primaryColor?: string
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
    dayBadgeColor,
    cardStyle = 'glassy',
    buttonStyle = 'pill',
    primaryColor
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
            morning: { text: 'text-black', bg: 'bg-white', border: 'border-amber-600', iconBg: 'bg-gradient-to-br from-[#F59E0B] to-[#FCD34D]', iconColor: 'text-black' },
            afternoon: { text: 'text-black', bg: 'bg-white', border: 'border-[var(--itinerary-primary,var(--primary))]', iconBg: 'bg-gradient-to-br from-[var(--itinerary-primary,var(--primary))] to-[var(--itinerary-secondary,var(--primary))]', iconColor: 'text-black' },
            evening: { text: 'text-black', bg: 'bg-white', border: 'border-orange-600', iconBg: 'bg-gradient-to-br from-[#E11D48] to-[#FB7185]', iconColor: 'text-black' },
            night: { text: 'text-black', bg: 'bg-white', border: 'border-black/20', iconBg: 'bg-gradient-to-br from-[#451A03] to-[#92400E]', iconColor: 'text-black' },
            half_day: { text: 'text-black', bg: 'bg-white', border: 'border-teal-200', iconBg: 'bg-teal-500', iconColor: 'text-black' },
            full_day: { text: 'text-black', bg: 'bg-white', border: 'border-blue-200', iconBg: 'bg-blue-500', iconColor: 'text-black' }
        }

        const theme = themeMap[timeSlot]

        return (
            <div className="relative pl-12 md:pl-16 py-4 group">
                {/* Connector Line - Dashed Gradient */}
                {!isLastSection && (
                    <div
                        className="absolute left-[27px] md:left-[39px] top-12 bottom-0 w-0.5"
                        style={{
                            backgroundImage: `linear-gradient(to bottom, ${primaryColor || 'var(--primary-glow)'} 50%, transparent 50%)`,
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
                    <div className="absolute -left-1 w-2.5 h-2.5 rounded-full bg-[var(--itinerary-primary,var(--primary))] hidden md:block" />
                </div>

                {/* Frosted Time-Strip Header - 3D Glassy */}
                <div className="flex items-center gap-4 mb-8 translate-x-1 md:translate-x-2">
                    <div className={cn(
                        "flex items-center gap-4 bg-white/40 backdrop-blur-xl border border-white/40 px-6 py-2.5 rounded-[1.25rem] shadow-sm",
                        cardStyle === 'minimal' && "bg-white/80 border-black/5",
                        cardStyle === 'classic' && "bg-black/5 border-black/10 shadow-none"
                    )}>
                        <h4 className={cn("font-display text-xl md:text-2xl font-bold tracking-tight", theme.text)}>
                            {label}
                        </h4>
                        <div className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-full border border-[var(--itinerary-primary,var(--primary-glow))]">
                            <span className="text-black font-bold text-[10px] uppercase tracking-widest whitespace-nowrap">
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
                                className={cn(
                                    "group/card relative overflow-hidden transition-all duration-500 cursor-pointer ml-1",
                                    cardStyle === 'glassy' ? "rounded-[2.5rem] border border-white/40 bg-white/40 backdrop-blur-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] hover:-translate-y-2" :
                                        cardStyle === 'minimal' ? "rounded-xl border border-black/5 bg-white shadow-sm hover:shadow-md hover:border-black/10" :
                                            cardStyle === 'rounded' ? "rounded-3xl border border-black/10 bg-white shadow-md hover:shadow-lg" :
                                                "rounded-lg border border-black/10 bg-black/5 shadow-none hover:bg-white" // classic
                                )}
                                onClick={() => setSelectedActivity(activity)}
                            >
                                <div className="flex flex-col md:flex-row h-full">
                                    {/* Image Section */}
                                    <div className={cn(
                                        "relative h-32 md:h-32 shrink-0 overflow-hidden m-2",
                                        cardStyle === 'glassy' ? "w-full md:w-36 bg-black/5 rounded-2xl md:m-2" : "w-full md:w-40 bg-black/5 rounded-lg md:m-0"
                                    )}>
                                        {images.length > 0 ? (
                                            <>
                                                <Image
                                                    src={images[0]}
                                                    alt={activity.title}
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover/card:scale-110"
                                                    unoptimized
                                                />
                                                {/* Overlay */}
                                                <div className="absolute inset-0 bg-[var(--itinerary-primary,var(--primary-soft))]/20 group-hover/card:bg-transparent transition-colors duration-500" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                                {images.length > 1 && (
                                                    <div className="absolute bottom-3 right-3 bg-white/40 text-black text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md flex items-center gap-1 border border-white/40 shadow-sm">
                                                        <ImageIcon className="h-3 w-3" stroke="black" />
                                                        <span>+{images.length - 1}</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-black/30 bg-black/5">
                                                <ImageIcon className="h-10 w-10 opacity-30" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0 p-3 md:py-3 md:pr-6 md:pl-2 flex flex-col">
                                        <div className="flex justify-between items-start gap-4 min-w-0">
                                            <div className="space-y-2 min-w-0 flex-1">
                                                {/* Category Tag */}
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--itinerary-primary,var(--primary-glow))]/10 border border-[var(--itinerary-primary,var(--primary))]/20 text-black text-[10px] font-bold uppercase tracking-wider mb-1">
                                                    ✨ Experience
                                                </div>

                                                <h5 className="font-display text-lg md:text-xl text-black leading-tight group-hover/card:text-[var(--itinerary-primary,var(--primary))] transition-colors break-words">
                                                    {activity.title}
                                                </h5>
                                                {(activity.start_time || activity.end_time) && (
                                                    <div className="flex items-center text-xs font-bold text-black uppercase tracking-widest">
                                                        <Clock className="h-3.5 w-3.5 mr-2 text-[var(--itinerary-primary,var(--primary))]" />
                                                        {activity.start_time || '?'} - {activity.end_time || '?'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-black mt-1 line-clamp-2 text-[11px] leading-relaxed font-bold mb-auto">
                                            {activity.description.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                        </p>

                                        <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-[var(--itinerary-primary,var(--primary-glow))]/20">
                                            <div className="flex items-center gap-3">
                                                {activity.duration && (
                                                    <Badge variant="outline" className="bg-transparent text-black border-[var(--itinerary-primary,var(--primary))]/20 px-3 py-1 font-bold text-[10px] flex items-center gap-1.5 uppercase tracking-wider">
                                                        <Clock className="h-3 w-3" />
                                                        {activity.duration}
                                                    </Badge>
                                                )}
                                                {activity.price_per_person !== undefined && (
                                                    <div className="flex items-center text-[11px] font-black text-[var(--itinerary-primary,var(--primary))] bg-orange-50/50 px-3 py-1 rounded-full border border-[var(--itinerary-primary,var(--primary-glow))]/20 uppercase tracking-wider">
                                                        ₹{activity.price_per_person}
                                                    </div>
                                                )}
                                            </div>

                                            <div className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all group/btn",
                                                buttonStyle === 'pill' ? "rounded-full bg-[var(--itinerary-primary,var(--primary))]/10 border border-[var(--itinerary-primary,var(--primary))]/30 text-[var(--itinerary-primary,var(--primary))] hover:bg-[var(--itinerary-primary,var(--primary))] hover:text-white" :
                                                    buttonStyle === 'rounded' ? "rounded-lg bg-[var(--itinerary-primary,var(--primary))] text-white shadow-sm hover:shadow-md" :
                                                        "rounded-none bg-black text-white hover:bg-black" // square
                                            )}>
                                                <span>Details</span>
                                                <ChevronRight className="h-2 w-2 transition-transform group-hover/btn:translate-x-1" />
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
            {/* Main 3D Glassy Container */}
            <div className="bg-white/40 backdrop-blur-[24px] rounded-[3rem] border border-white/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-500 hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.2)] relative">
                {/* Background Depth Glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

                {/* Header */}
                <div className="px-8 py-12 border-b border-white/20 flex flex-col md:flex-row md:items-center justify-between gap-8 relative">
                    <div className="flex items-center gap-8 md:gap-10">
                        {/* 3D Circular Day Badge */}
                        <div className="relative shrink-0">
                            {/* Outer pulsing ring */}
                            <div className="absolute inset-[-12px] rounded-full bg-blue-500/10 animate-pulse" />

                            <div className="h-24 w-24 rounded-full bg-blue-600 text-white flex flex-col items-center justify-center shadow-[0_20px_40px_rgba(37,99,235,0.3)] relative z-10 border-4 border-white ring-[12px] ring-blue-500/10 transition-transform duration-500 hover:scale-105">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 mt-1">Day</span>
                                <span className="text-4xl leading-none font-display font-black">{day.day_number}</span>
                            </div>
                        </div>

                        <div className="relative group">
                            {/* Decorative accent */}
                            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-blue-600 rounded-full hidden md:block" />

                            <h3 className="font-display text-4xl md:text-5xl leading-none tracking-tight">
                                <span className="text-black font-extrabold">Destination</span>{' '}
                                <span className="text-blue-600 italic font-medium">Highlights</span>
                            </h3>

                            <div className="flex flex-wrap items-center gap-4 mt-5">
                                <span className="flex items-center gap-2 bg-[var(--primary)]/10 px-4 py-1.5 rounded-full border border-[var(--primary)]/30 transition-all hover:bg-[var(--primary)]/20">
                                    <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                                    <span className="font-bold text-[var(--primary)] text-[10px] uppercase tracking-widest">{totalActivities} Experiences</span>
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
                    <DialogContent className="max-w-[640px] p-0 overflow-hidden flex flex-col max-h-[85vh] rounded-[2rem] border border-white/40 [&>button]:hidden shadow-2xl bg-white/40 backdrop-blur-3xl">
                        {selectedActivity && (
                            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                                {/* Image Gallery */}
                                <div className="relative w-full bg-black/5 h-[280px] shrink-0">
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
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                                                            </div>
                                                        </CarouselItem>
                                                    ))}
                                                </CarouselContent>
                                                {images.length > 1 && (
                                                    <>
                                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 text-white text-xs font-bold shadow-lg">
                                                            <ImageIcon className="h-3.5 w-3.5" />
                                                            <span>{current} / {images.length}</span>
                                                        </div>
                                                        <CarouselPrevious className="left-6 z-40 h-12 w-12 bg-white/20 border-white/30 text-white hover:bg-white/40 backdrop-blur-md transition-all border-none shadow-lg" />
                                                        <CarouselNext className="right-6 z-40 h-12 w-12 bg-white/20 border-white/30 text-white hover:bg-white/40 backdrop-blur-md transition-all border-none shadow-lg" />
                                                    </>
                                                )}
                                            </Carousel>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-black/5 text-black/30">
                                                <ImageIcon className="h-16 w-16 opacity-30" />
                                            </div>
                                        );
                                    })()}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-6 right-6 bg-white/20 text-white hover:bg-white/40 rounded-full z-50 backdrop-blur-md h-10 w-10 border-none transition-all shadow-lg"
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
                                <div className="p-8 md:p-10 space-y-6 bg-[var(--primary-soft)]/30 backdrop-blur-xl flex-1">
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-2xl text-black flex items-center gap-3">
                                            <div className="h-8 w-1.5 bg-[var(--primary)] rounded-full"></div>
                                            About this activity
                                        </h3>
                                        <div className="text-black leading-relaxed text-lg whitespace-pre-wrap font-medium">
                                            {selectedActivity.description}
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-[var(--primary)]/10 flex justify-end">
                                        <Button
                                            onClick={() => setSelectedActivity(null)}
                                            size="lg"
                                            className="rounded-xl px-10 h-12 text-lg font-bold text-white transition-all hover:scale-[1.05] shadow-lg shadow-[var(--primary)]/30 hover:shadow-[var(--primary)]/50 border-none"
                                            style={{
                                                background: 'linear-gradient(135deg, var(--primary), #FFB38A)'
                                            }}
                                        >
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
