'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Calendar, Users, Sun, Cloud, Sunset, Moon, ArrowLeft, Clock, X, Check, Plane, FileDown } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { packagesEnhancedAPI, API_URL } from '@/lib/api'
import { ActivityImageGallery } from '@/components/ui/activity-image-gallery'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PassengerCounter } from '@/components/packages/PassengerCounter'
import Image from 'next/image'

interface Activity {
    id: string
    title: string
    description: string
    time_slot: string
    display_order: number
    image_url?: string
    images?: string[]
}

interface DayItinerary {
    day_number: number
    morning: Activity[]
    afternoon: Activity[]
    evening: Activity[]
    night: Activity[]
    full_day: Activity[]
    half_day: Activity[]
}

interface PackageDetail {
    id: string
    title: string
    destination: string
    duration_days: number
    duration_nights: number
    price_per_person: number
    description: string
    category: string
    max_group_size: number
    itinerary_by_day: DayItinerary[]
    // GST configuration (per-package)
    gst_applicable?: boolean | null
    gst_percentage?: number | null
    gst_mode?: string | null
    // Flight configuration
    flights_enabled: boolean
    flight_origin_cities: string[]
    flight_cabin_class: string
    flight_price_included: boolean
    flight_baggage_note: string
}

const timeSlotConfig = {
    full_day: { icon: Calendar, label: 'Full Day', color: 'text-[var(--primary)]', bgColor: 'bg-[var(--primary)]/10' },
    morning: { icon: Sun, label: 'Morning', color: 'text-slate-600', bgColor: 'bg-slate-50' },
    half_day: { icon: Clock, label: 'Half Day', color: 'text-slate-600', bgColor: 'bg-slate-50' },
    afternoon: { icon: Cloud, label: 'Afternoon', color: 'text-slate-600', bgColor: 'bg-slate-50' },
    evening: { icon: Sunset, label: 'Evening', color: 'text-slate-600', bgColor: 'bg-slate-50' },
    night: { icon: Moon, label: 'Night', color: 'text-slate-600', bgColor: 'bg-slate-50' }
}

export default function PackageDetailPage() {
    const params = useParams()
    const router = useRouter()
    const packageId = params.id as string

    const [packageData, setPackageData] = useState<PackageDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [gstSettings, setGstSettings] = useState<{ inclusive: boolean, percentage: number } | null>(null)

    // Booking Modal State
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState('')
    const [travelers, setTravelers] = useState({ adults: 2, children: 0, infants: 0 })
    const [originCity, setOriginCity] = useState('')
    const [bookingConfirmed, setBookingConfirmed] = useState(false)

    useEffect(() => {
        loadPackageDetails()
        loadAgentSettings()
    }, [packageId])

    const loadAgentSettings = async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const headers: Record<string, string> = {}
            if (token) headers['Authorization'] = `Bearer ${token}`

            const res = await fetch(`${API_URL}/api/v1/agent/settings`, { headers })
            if (res.ok) {
                const data = await res.json()
                // Only store agent-level GST as fallback — package-level config takes priority
                if (data.gst_applicable) {
                    setGstSettings({
                        inclusive: data.gst_inclusive,
                        percentage: data.gst_percentage
                    })
                } else {
                    setGstSettings(null)  // Agent has GST off — suppress GST
                }
            }
        } catch (err) {
            console.error("Failed to fetch agent settings", err)
        }
    }

    const loadPackageDetails = async () => {
        setLoading(true)
        setError('')

        try {
            const data = await packagesEnhancedAPI.getWithItinerary(packageId)
            setPackageData(data)
        } catch (err) {
            console.error('Error loading package:', err)
            setError('Failed to load package details. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    /**
     * Resolve the effective GST settings for this package.
     * Priority: package-level gst_applicable > agent-level fallback
     *
     * - package.gst_applicable === false  → no GST at all
     * - package.gst_applicable === true   → use package's own percentage/mode
     * - package.gst_applicable === null/undefined → fall back to agent settings
     */
    const effectiveGst: { inclusive: boolean; percentage: number } | null = (() => {
        if (!packageData) return null
        // Package explicitly disables GST
        if (packageData.gst_applicable === false) return null
        // Package has its own GST configuration
        if (packageData.gst_applicable === true && packageData.gst_percentage) {
            return {
                inclusive: packageData.gst_mode === 'inclusive',
                percentage: packageData.gst_percentage
            }
        }
        // Fall back to agent-level settings
        return gstSettings
    })()

    const calculateTotal = () => {
        if (!packageData) return 0
        const basePrice = packageData.price_per_person
        const totalTravelers = travelers.adults + travelers.children // Infants are free

        let subTotal = basePrice * totalTravelers

        if (effectiveGst && !effectiveGst.inclusive) {
            subTotal += (subTotal * effectiveGst.percentage) / 100
        }

        return subTotal
    }

    const handleConfirmBooking = () => {
        if (!selectedDate || travelers.adults < 1) return

        // Capture flight intent if enabled
        if (packageData?.flights_enabled && !originCity) {
            // In a real app, we'd show a specific validation error
            return
        }

        const intent = {
            packageId: packageData?.id,
            slug: Array.isArray(params.slug) ? params.slug[0] : params.slug,
            travelDate: selectedDate,
            travelers: travelers,
            originCity: originCity,
            flightEnabled: packageData?.flights_enabled,
            cabinClass: packageData?.flight_cabin_class
        }

        localStorage.setItem('booking_intent', JSON.stringify(intent))

        setBookingConfirmed(true)
        setIsBookingModalOpen(false)

        // Redirect to itinerary page with search params
        const params_slug = Array.isArray(params.slug) ? params.slug[0] : params.slug
        const queryParams = new URLSearchParams({
            date: selectedDate,
            adults: travelers.adults.toString(),
            children: travelers.children.toString(),
            infants: travelers.infants.toString(),
            origin: originCity,
            package_id: packageData?.id || ''
        }).toString()

        router.push(`/plan-trip/${params_slug}?${queryParams}`)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                    <p className="mt-4 text-gray-500 font-medium">Loading package details...</p>
                </div>
            </div>
        )
    }

    if (error || !packageData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || 'Package not found'}</p>
                    <Button onClick={() => router.push('/packages')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Packages
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white py-8">
                <div className="container mx-auto px-4">
                    <Button
                        variant="ghost"
                        className="text-white hover:bg-white/20 mb-4"
                        onClick={() => router.push('/packages')}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Packages
                    </Button>

                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <Badge variant="secondary" className="mb-2">
                                <MapPin className="h-3 w-3 mr-1" />
                                {packageData.destination}
                            </Badge>
                            <h1 className="text-4xl font-bold mb-2">{packageData.title}</h1>
                            {packageData.category && (
                                <p className="text-white/80">{packageData.category} Tour</p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-white/80 text-sm">Starting from</p>
                            <p className="text-4xl font-bold">
                                {packageData && effectiveGst && !effectiveGst.inclusive
                                    ? `₹${(packageData.price_per_person * (1 + effectiveGst.percentage / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                    : `₹${packageData?.price_per_person.toLocaleString()}`
                                }
                            </p>
                            <p className="text-white/80 text-sm">per person {effectiveGst && !effectiveGst.inclusive ? '(inc. GST)' : ''}</p>
                        </div>
                    </div>

                    <div className="flex gap-6 mt-6 text-white/90">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            <span>{formatDuration(packageData.duration_days)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            <span>Max {packageData.max_group_size} people</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        {/* Description */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>About This Package</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 whitespace-pre-line">{packageData.description}</p>
                            </CardContent>
                        </Card>

                        {/* Itinerary */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Day-wise Itinerary</CardTitle>
                                    <CardDescription>
                                        Explore the detailed schedule for your {packageData.duration_days}-day journey
                                    </CardDescription>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                        window.open(`${API_URL}/api/v1/packages/${packageData.id}/itinerary-pdf`, '_blank')
                                    }}
                                >
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Download PDF
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {packageData.itinerary_by_day && packageData.itinerary_by_day.length > 0 ? (
                                    <Tabs defaultValue="day-1" className="w-full">
                                        <TabsList className="w-full flex-wrap h-auto">
                                            {packageData.itinerary_by_day.map((day) => (
                                                <TabsTrigger key={day.day_number} value={`day-${day.day_number}`}>
                                                    Day {day.day_number}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>

                                        {packageData.itinerary_by_day.map((day) => (
                                            <TabsContent key={day.day_number} value={`day-${day.day_number}`} className="mt-6">
                                                <div className="space-y-6">
                                                    {Object.entries(timeSlotConfig).map(([slot, config]) => {
                                                        const activities = day[slot as keyof typeof timeSlotConfig] as Activity[]
                                                        if (!activities || activities.length === 0) return null

                                                        const Icon = config.icon
                                                        return (
                                                            <div key={slot}>
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <Icon className={`h-5 w-5 ${config.color}`} />
                                                                    <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
                                                                </div>
                                                                <div className="space-y-3 ml-7">
                                                                    {activities.map((activity, idx) => (
                                                                        <div
                                                                            key={activity.id || idx}
                                                                            className={`p-4 rounded-lg border ${config.bgColor} border-gray-200`}
                                                                        >
                                                                            <div className="flex gap-4">
                                                                                {(() => {
                                                                                    // Normalize images from either 'images' array or 'image_url' (which can be string or string[])
                                                                                    const rawImages = activity.images || activity.image_url;
                                                                                    const images = Array.isArray(rawImages)
                                                                                        ? rawImages
                                                                                        : (typeof rawImages === 'string' && rawImages ? [rawImages] : []);

                                                                                    if (images.length === 0) return null;

                                                                                    return (
                                                                                        <div className="w-24 h-24 flex-shrink-0">
                                                                                            <ActivityImageGallery
                                                                                                images={images}
                                                                                                title={activity.title}
                                                                                            />
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                                <div className="flex-1">
                                                                                    <h4 className="font-semibold text-gray-900 mb-1">
                                                                                        {activity.title}
                                                                                    </h4>
                                                                                    <p className="text-gray-600 text-sm whitespace-pre-line">
                                                                                        {activity.description}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                ) : (
                                    <p className="text-gray-500 text-center py-8">
                                        No itinerary details available for this package.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-4">
                            <CardHeader>
                                <CardTitle>{bookingConfirmed ? 'Booking Summary' : 'Book This Package'}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {bookingConfirmed ? (
                                    <>
                                        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 mb-2 flex items-start gap-3">
                                            <div className="bg-green-100 p-1.5 rounded-full shrink-0">
                                                <Check className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">Booking Confirmed</p>
                                                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" /> {selectedDate}
                                                </p>
                                                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                                    <Users className="h-4 w-4" /> {travelers.adults + travelers.children} Travelers
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between py-3 border-b">
                                            <span className="text-gray-600">Total Price</span>
                                            <div className="text-right">
                                                <span className="text-2xl font-bold text-[var(--primary)] block">
                                                    ₹{calculateTotal().toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </span>
                                                {effectiveGst && !effectiveGst.inclusive && (
                                                    <span className="text-xs text-gray-400 block">+ GST ({effectiveGst.percentage}%) included</span>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            className="w-full text-[var(--primary)] border-[var(--primary-glow)] hover:bg-[var(--primary-glow)]"
                                            onClick={() => setBookingConfirmed(false)}
                                        >
                                            Modify Booking
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between py-3 border-b">
                                            <span className="text-gray-600">Price per person</span>
                                            <div className="text-right">
                                                <span className="text-2xl font-bold text-[var(--primary)] block">
                                                    {packageData && effectiveGst && !effectiveGst.inclusive
                                                        ? `₹${(packageData.price_per_person * (1 + effectiveGst.percentage / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                                        : `₹${packageData?.price_per_person.toLocaleString()}`
                                                    }
                                                </span>
                                                {effectiveGst && !effectiveGst.inclusive && (
                                                    <span className="text-xs text-gray-400 block">+ GST ({effectiveGst.percentage}%) included</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm text-gray-600">
                                            <div className="flex justify-between">
                                                <span>Duration</span>
                                                <span className="font-medium">{formatDuration(packageData?.duration_days || 0)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Max group size</span>
                                                <span className="font-medium">{packageData?.max_group_size} people</span>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full"
                                            size="lg"
                                            disabled={!packageData}
                                            onClick={() => setIsBookingModalOpen(true)}
                                        >
                                            Book Now
                                        </Button>

                                        <p className="text-xs text-gray-500 text-center">
                                            You can customize the itinerary during booking
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            {/* Booking Modal */}
            <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
                <DialogContent className="sm:max-w-[500px] glass-panel bg-white/80 p-0 overflow-hidden border-white/40">
                    <div className="absolute top-4 right-4 z-10">
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/50 hover:bg-white/80">
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogClose>
                    </div>

                    <div className="flex flex-col h-full max-h-[90vh]">
                        {/* Modal Header with Package Info */}
                        <div className="bg-gradient-to-br from-[var(--primary-glow)] to-indigo-50/30 p-6 border-b border-white/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/10 rounded-full blur-2xl -mr-16 -mt-16"></div>

                            <div className="flex gap-4 relative z-10">
                                {packageData?.itinerary_by_day?.[0]?.morning?.[0]?.image_url ? (
                                    <div className="w-20 h-20 rounded-xl overflow-hidden shadow-sm shrink-0 relative">
                                        <Image
                                            src={packageData.itinerary_by_day[0].morning[0].image_url}
                                            alt={packageData.title}
                                            fill
                                            className="object-cover"
                                            sizes="80px"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                        <MapPin className="h-8 w-8 text-[var(--primary)]" />
                                    </div>
                                )}
                                <div className="flex flex-col justify-center">
                                    <Badge variant="secondary" className="w-fit mb-1 bg-white/60">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {packageData?.destination}
                                    </Badge>
                                    <h3 className="font-bold text-lg text-gray-900 line-clamp-2 leading-tight">
                                        {packageData?.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {formatDuration(packageData?.duration_days || 0)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Booking Form Content */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Date Selection */}
                            <div className="space-y-3">
                                <Label htmlFor="travel-date" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-[var(--primary)]" />
                                    Date of Travel
                                </Label>
                                <Input
                                    id="travel-date"
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="h-12 glass-input"
                                />
                            </div>

                            {/* Starting From (Origin) - Conditional */}
                            {packageData?.flights_enabled && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-500">
                                    <Label htmlFor="origin-city" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                        <Plane className="h-4 w-4 text-[var(--primary)]" />
                                        Starting From
                                    </Label>
                                    <div className="relative group/origin">
                                        <Input
                                            id="origin-city"
                                            placeholder={packageData.flight_origin_cities.length > 0
                                                ? `Search from ${packageData.flight_origin_cities.join(', ')}...`
                                                : "Enter city or airport code..."
                                            }
                                            value={originCity}
                                            onChange={(e) => setOriginCity(e.target.value.toUpperCase())}
                                            className="h-12 glass-input border-[var(--primary)]/20 focus:border-[var(--primary)] pl-10"
                                        />
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MapPin className="h-4 w-4 text-gray-400 group-hover/origin:text-[var(--primary)] transition-colors" />
                                        </div>
                                    </div>
                                    {packageData.flight_origin_cities.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Recommended:</span>
                                            {packageData.flight_origin_cities.map(city => (
                                                <button
                                                    key={city}
                                                    onClick={() => setOriginCity(city)}
                                                    className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all",
                                                        originCity === city
                                                            ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                                                            : "bg-white text-[var(--primary)] border-[var(--primary)]/30 hover:bg-[var(--primary)]/5"
                                                    )}
                                                >
                                                    {city}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Travelers Selection */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-[var(--primary)]" />
                                    Travelers
                                </Label>
                                <div className="glass-card rounded-xl p-4 space-y-3 border-white/60">
                                    <PassengerCounter
                                        label="Adults"
                                        sublabel="Age 12+"
                                        value={travelers.adults}
                                        min={1}
                                        max={10}
                                        onChange={(val) => setTravelers(prev => ({ ...prev, adults: val }))}
                                    />
                                    <div className="h-px w-full bg-gray-100 my-2"></div>
                                    <PassengerCounter
                                        label="Children"
                                        sublabel="Age 2-11"
                                        value={travelers.children}
                                        min={0}
                                        max={5}
                                        onChange={(val) => setTravelers(prev => ({ ...prev, children: val }))}
                                    />
                                    <div className="h-px w-full bg-gray-100 my-2"></div>
                                    <PassengerCounter
                                        label="Infants"
                                        sublabel="Under 2 (Free)"
                                        value={travelers.infants}
                                        min={0}
                                        max={3}
                                        onChange={(val) => setTravelers(prev => ({ ...prev, infants: val }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Live Price Summary & Actions */}
                        <div className="p-6 bg-gray-50/80 border-t border-gray-100 mt-auto">
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium mb-1">Total Price</p>
                                    {(!selectedDate || travelers.adults < 1) ? (
                                        <p className="text-sm text-gray-400 italic">Fill details to see price</p>
                                    ) : (
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-[var(--primary)]">
                                                ₹{calculateTotal().toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">
                                        {travelers.adults + travelers.children} × ₹{packageData?.price_per_person.toLocaleString()}
                                    </p>
                                    {effectiveGst && !effectiveGst.inclusive && (
                                        <p className="text-xs text-[var(--primary)] font-medium">+ {effectiveGst.percentage}% GST</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 bg-white hover:bg-gray-50"
                                    onClick={() => setIsBookingModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    disabled={!selectedDate || travelers.adults < 1}
                                    onClick={handleConfirmBooking}
                                >
                                    Confirm Book
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    )
}
