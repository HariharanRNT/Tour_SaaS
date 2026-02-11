'use client'

import { useState } from 'react'
import { Activity } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Clock, MapPin, Star, Users, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

interface ActivityDetailsModalProps {
    activity: Activity
    open: boolean
    onOpenChange: (open: boolean) => void
    onAddToDay?: (activity: Activity) => void
}

export function ActivityDetailsModal({ activity, open, onOpenChange, onAddToDay }: ActivityDetailsModalProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const hasImages = activity.images && activity.images.length > 0

    const nextImage = () => {
        if (hasImages) {
            setCurrentImageIndex((prev) => (prev + 1) % activity.images.length)
        }
    }

    const previousImage = () => {
        if (hasImages) {
            setCurrentImageIndex((prev) => (prev - 1 + activity.images.length) % activity.images.length)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col bg-white border-0 shadow-2xl">
                {/* 1. Hero Section (Sticky/Fixed Visual) */}
                <div className="relative h-[40vh] min-h-[300px] w-full shrink-0 group">
                    {hasImages ? (
                        <>
                            <Image
                                src={activity.images[currentImageIndex]}
                                alt={activity.title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                unoptimized
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                        </>
                    ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                            <MapPin className="h-20 w-20 text-slate-700" />
                        </div>
                    )}

                    {/* Navigation Arrows */}
                    {hasImages && activity.images.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={previousImage}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-black/20 rounded-full h-10 w-10 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={nextImage}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-black/20 rounded-full h-10 w-10 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                            {/* Image Counter */}
                            <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white/90 text-xs font-medium border border-white/10">
                                {currentImageIndex + 1} / {activity.images.length} Photos
                            </div>
                        </>
                    )}

                    {/* Close Button */}
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all border border-white/10 z-50 group/close"
                    >
                        <span className="sr-only">Close</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 group-hover/close:rotate-90 transition-transform"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>

                    {/* Title Content Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white z-20">
                        <div className="flex flex-wrap gap-2 mb-3">
                            {activity.category && (
                                <Badge className="bg-blue-600/90 hover:bg-blue-600 text-white border-none backdrop-blur-sm">
                                    {activity.category}
                                </Badge>
                            )}
                            {activity.rating > 0 && (
                                <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-sm gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {activity.rating.toFixed(1)} ({activity.reviews_count || 124} reviews)
                                </Badge>
                            )}
                        </div>
                        <h2 className="text-2xl md:text-4xl font-bold leading-tight tracking-tight shadow-sm">
                            {activity.title}
                        </h2>
                    </div>
                </div>

                {/* 2. Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                    <div className="max-w-4xl mx-auto">

                        {/* Quick Info Bar - Sticky within scroll view usually, but placed at top here */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 border-b border-slate-200">
                            <div className="bg-white p-4 flex items-center gap-3 justify-center md:justify-start">
                                <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                                    <Clock className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Duration</p>
                                    <p className="text-sm font-semibold text-slate-700">{activity.duration || 'Flexible'}</p>
                                </div>
                            </div>
                            <div className="bg-white p-4 flex items-center gap-3 justify-center md:justify-start">
                                <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Group Size</p>
                                    <p className="text-sm font-semibold text-slate-700">{activity.max_group_size ? `Up to ${activity.max_group_size}` : 'Varies'}</p>
                                </div>
                            </div>
                            <div className="bg-white p-4 flex items-center gap-3 justify-center md:justify-start">
                                <div className="p-2 rounded-full bg-violet-50 text-violet-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Type</p>
                                    <p className="text-sm font-semibold text-slate-700">Instant Confirm</p>
                                </div>
                            </div>
                            <div className="bg-white p-4 flex items-center gap-3 justify-center md:justify-start">
                                <div className="p-2 rounded-full bg-amber-50 text-amber-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Location</p>
                                    <p className="text-sm font-semibold text-slate-700 truncate max-w-[100px]" title="View Map">View on Map</p>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Layout */}
                        <div className="p-6 md:p-8 space-y-8">

                            {/* Short Description */}
                            <div className="grid md:grid-cols-[2fr,1fr] gap-8">
                                <div className="space-y-6">
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3">
                                            <span className="h-6 w-1 bg-blue-500 rounded-full" />
                                            About this activity
                                        </h3>
                                        <div
                                            className="text-slate-600 leading-relaxed text-sm md:text-base space-y-4"
                                            dangerouslySetInnerHTML={{ __html: activity.description || 'Experience the best of this destination with our guided activity.' }}
                                        />
                                    </section>

                                    {/* Highlights Section (Visualized) */}
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                            <span className="h-6 w-1 bg-amber-500 rounded-full" />
                                            Highlights
                                        </h3>
                                        <div className="grid gap-3">
                                            {/* Logic to extract highlights or use placeholders if not in data schema */}
                                            {activity.included_items && activity.included_items.slice(0, 3).map((item, i) => (
                                                <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                    <div className="h-6 w-6 shrink-0 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mt-0.5">
                                                        <Star className="h-3.5 w-3.5 fill-current" />
                                                    </div>
                                                    <span className="text-slate-700 text-sm font-medium">{item}</span>
                                                </div>
                                            ))}
                                            {/* Fallback if no specific highlights data - typically parsed from desc or separate field */}
                                            {(!activity.included_items || activity.included_items.length === 0) && (
                                                <div className="p-4 bg-slate-50 rounded-lg text-slate-500 text-sm italic">
                                                    Detailed highlights available upon booking.
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                {/* Sidebar / Right Info Column */}
                                <div className="space-y-6">
                                    {/* What's Included Card */}
                                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            Quick Check
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                    <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <span className="text-sm text-slate-600">Free Cancellation (24h)</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                    <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <span className="text-sm text-slate-600">Mobile Voucher</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                    <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <span className="text-sm text-slate-600">Instant Confirmation</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Thumbnail Gallery (Quick Access) */}
                                    {hasImages && activity.images.length > 1 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {activity.images.slice(0, 6).map((img, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentImageIndex(idx)}
                                                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-blue-500 ring-1 ring-blue-500' : 'border-transparent hover:border-blue-300'}`}
                                                >
                                                    <Image src={img} alt={`Thumb ${idx}`} fill className="object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Detailed Includes/Excludes Split */}
                            <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                            <Plus className="h-4 w-4" />
                                        </div>
                                        What's Included
                                    </h3>
                                    <ul className="space-y-2">
                                        {activity.included_items?.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                                                <svg className="h-5 w-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                <span className="leading-relaxed">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                        </div>
                                        What's Not Included
                                    </h3>
                                    <ul className="space-y-2">
                                        {activity.excluded_items?.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                                                <svg className="h-5 w-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                <span className="leading-relaxed">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* 3. Sticky Footer Action Bar */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Price</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-slate-800">₹{activity.price_per_person?.toLocaleString()}</span>
                            <span className="text-sm font-medium text-slate-400">/ person</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="hidden sm:flex border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        >
                            Close Details
                        </Button>
                        {onAddToDay && (
                            <Button
                                onClick={() => {
                                    onAddToDay(activity)
                                    onOpenChange(false)
                                }}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 px-8 py-6 h-auto text-base font-semibold rounded-xl transition-all hover:scale-[1.02]"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Add to Itinerary
                            </Button>
                        )}
                        {!onAddToDay && activity.booking_link && (
                            <Button
                                onClick={() => window.open(activity.booking_link, '_blank')}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 h-auto text-base font-semibold rounded-xl"
                            >
                                Book this Activity
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
