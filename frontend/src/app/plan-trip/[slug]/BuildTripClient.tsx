'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, MapPin, Calendar, Users, Sparkles, Plus, Trash2, CheckCircle, ShieldCheck, Headphones, Clock, Wallet, Save, Plane, Hotel, Camera, Car, Download, Bot, ArrowLeft, XCircle, AlertCircle, Shield, Star, Heart, Globe, Map as MapIcon } from 'lucide-react'
import { getValidImageUrl } from '@/lib/utils/image'
import { formatDate, cn } from '@/lib/utils'
import { TripCart } from '@/components/itinerary/trip-cart'
import { ServiceCard } from '@/components/itinerary/service-card'
import { flightsAPI, API_URL } from '@/lib/api'
import { FlightCard, Flight } from '@/components/itinerary/flight-card'
import { FlightFilters, FlightFilterState } from '@/components/itinerary/flight-filters'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DayPlanner } from '@/components/itinerary/DayPlanner'
import { BookingAuthModal } from '@/components/auth/BookingAuthModal'

interface Activity {
    id?: string
    title: string
    description: string
    image_url?: string | string[]
    start_time?: string
    end_time?: string
}

interface TimeSlot {
    morning: Activity[]
    afternoon: Activity[]
    evening: Activity[]
    night: Activity[]
    half_day: Activity[]
    full_day: Activity[]
}

interface DayItinerary {
    day_number: number
    morning: Activity[]
    afternoon: Activity[]
    evening: Activity[]
    night: Activity[]
    half_day: Activity[]
    full_day: Activity[]
}

interface DraftSession {
    sessionId: string
    destination: string
    created_at: string
    itinerary: DayItinerary[]
    hotelSelected: boolean
    transferSelected: boolean
    selectedOnwardFlight: Flight | null
    selectedReturnFlight: Flight | null
}

export default function BuildTripPage({ slug }: { slug?: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryDate = searchParams.get('date')
    const queryAdults = searchParams.get('adults')
    const queryChildren = searchParams.get('children')
    const queryInfants = searchParams.get('infants')

    useEffect(() => {
        // Enforce booking details if accessing a package itinerary
        const mode = searchParams.get('mode')
        if (slug && (!queryDate || !queryAdults) && mode !== 'preview') {
            router.push('/plan-trip')
        }
    }, [slug, queryDate, queryAdults, searchParams, router])

    // Support legacy URLs but prefer the cookie/slug combination
    const urlSessionId = searchParams.get('session')
    const [sessionId, setSessionId] = useState<string | null>(urlSessionId)

    useEffect(() => {
        if (!urlSessionId && typeof window !== 'undefined') {
            // Check for cookie if not in URL
            const cookies = document.cookie.split(';');
            const sessionCookie = cookies.find(c => c.trim().startsWith('tripSessionId='));
            if (sessionCookie) {
                const cookieVal = sessionCookie.split('=')[1];
                setSessionId(cookieVal);
            }
        }
    }, [urlSessionId]);

    const mode = searchParams.get('mode')
    const packageId = searchParams.get('package_id')

    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState<any>(null)
    const [itinerary, setItinerary] = useState<DayItinerary[]>([])
    const [currentDay, setCurrentDay] = useState(1)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)

    // Modular State
    const [flightSelected, setFlightSelected] = useState(false)
    const [hotelSelected, setHotelSelected] = useState(false)
    const [transferSelected, setTransferSelected] = useState(false)

    // Dynamic Price State
    // Dynamic Price State
    const [allFlights, setAllFlights] = useState<Flight[]>([])
    const [onwardFlights, setOnwardFlights] = useState<Flight[]>([])
    const [returnFlights, setReturnFlights] = useState<Flight[]>([])

    const [selectedOnwardFlight, setSelectedOnwardFlight] = useState<Flight | null>(null)
    const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null)

    const [loadingFlights, setLoadingFlights] = useState(false)
    const [flightError, setFlightError] = useState('')

    // UI state for modals
    const [isOnwardModalOpen, setIsOnwardModalOpen] = useState(false)
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
    const [showMobileFilters, setShowMobileFilters] = useState(false)

    // GST Settings State
    const [gstSettings, setGstSettings] = useState<{ inclusive: boolean, percentage: number } | null>(null)

    // Itinerary Theme State

    // Flight Filters State
    const [filters, setFilters] = useState<FlightFilterState>({
        refundType: 'all',
        stops: [],
        dates: [],
        timeRanges: [],
        airlines: []
    })

    const applyFilters = (flights: Flight[]) => {
        return flights.filter(flight => {
            // Refund Type
            if (filters.refundType === 'refundable' && !flight.is_refundable) return false
            if (filters.refundType === 'non_refundable' && flight.is_refundable) return false

            // Stops
            if (filters.stops.length > 0) {
                // If 2 is selected, we treat it as 2 or more stops
                const stops = flight.stops || 0
                if (filters.stops.includes(2) && stops >= 2) return true
                if (!filters.stops.includes(stops)) return false
            }

            // Time Ranges
            if (filters.timeRanges.length > 0) {
                const hour = new Date(flight.departure_time).getHours()
                const ranges = filters.timeRanges
                let match = false
                if (ranges.includes('00-06') && hour >= 0 && hour < 6) match = true
                if (ranges.includes('06-12') && hour >= 6 && hour < 12) match = true
                if (ranges.includes('12-18') && hour >= 12 && hour < 18) match = true
                if (ranges.includes('18-24') && hour >= 18 && hour < 24) match = true
                if (!match) return false
            }

            // Airlines
            if (filters.airlines.length > 0 && !filters.airlines.includes(flight.airline)) return false

            return true
        })
    }

    const filteredOnwardFlights = applyFilters(onwardFlights)
    const filteredReturnFlights = applyFilters(returnFlights)

    // Get unique airlines for filter list
    const availableAirlines = Array.from(new Set(allFlights.map(f => f.airline)))

    // Reset filters when modal closes/opens or just keep them persistent?
    // Let's keep them persistent for now or reset manually if needed.

    // Hardcoded estimates for demo (hotel/transfer)
    const HOTEL_ESTIMATE = 800
    const TRANSFER_ESTIMATE = 100

    useEffect(() => {
        if (slug) {
            loadPackagePreviewBySlug(slug)
        } else if (mode === 'preview' && packageId) {
            loadPackagePreview(packageId)
        } else if (sessionId) {
            loadSession()
        }
    }, [sessionId, mode, packageId, slug])



    // Fetch flight prices when session loads
    useEffect(() => {
        if (session && session.preferences?.include_flights) {
            checkFlightPrices()
        }
    }, [session])

    const checkFlightPrices = async () => {
        setLoadingFlights(true)
        setFlightError('')
        try {

            // Dynamic values from session
            const origin = session?.preferences?.departure_location || 'MAA' // Fallback if missing
            const destination = session?.destination || 'DEL' // Fallback if missing
            const startDate = session?.start_date

            // Calculate return date based on duration
            let depDate = '2026-02-19'
            let retDate = '2026-02-23'

            if (startDate) {
                // Simple string handling or use date-fns if imported
                // Assuming startDate is YYYY-MM-DD
                const start = new Date(startDate)
                const duration = session?.duration_days || 5
                const end = new Date(start)
                end.setDate(start.getDate() + duration)

                depDate = start.toISOString().split('T')[0]
                retDate = end.toISOString().split('T')[0]
            }

            // Map standard city names to airport codes if needed
            // For this demo, we'll assume the inputs are compatible or use a simple mapping for known test cases
            // In a real app, this would use a proper lookup service
            const cityToAirport: Record<string, string> = {
                'chennai': 'MAA',
                'madras': 'MAA',
                'mumbai': 'BOM',
                'bombay': 'BOM',
                'delhi': 'DEL',
                'new delhi': 'DEL',
                'bangalore': 'BLR',
                'bengaluru': 'BLR'
            }

            const originCode = cityToAirport[origin.toLowerCase()] || origin.toUpperCase().substring(0, 3)
            const destinationCode = cityToAirport[destination.toLowerCase()] || destination.toUpperCase().substring(0, 3)

            const params = {
                origin: originCode,
                destination: destinationCode,
                departure_date: depDate,
                return_date: retDate,
                adults: session?.travelers?.adults || 1,
                children: session?.travelers?.children || 0,
                infants: session?.travelers?.infants || 0,
                cabin_class: session?.preferences?.cabin_class || 'ECONOMY',
                is_direct_flight: true
            }

            console.log('Fetching flights with params:', params)
            const response = await flightsAPI.search(params)

            if (response.success && response.flights && response.flights.length > 0) {
                const flights = response.flights as Flight[]

                // Split into Onward and Return
                const onward = flights.filter(f => f.route_type === 'ONWARD' || !f.route_type).sort((a, b) => a.price - b.price)
                const returnLeg = flights.filter(f => f.route_type === 'RETURN').sort((a, b) => a.price - b.price)

                setOnwardFlights(onward)
                setReturnFlights(returnLeg)
                setAllFlights(flights)

                // Auto-select best value for both
                if (onward.length > 0) setSelectedOnwardFlight(onward[0])
                if (returnLeg.length > 0) setSelectedReturnFlight(returnLeg[0])

                setFlightSelected(true)
            } else {
                setFlightError('No flights found')
            }
        } catch (error) {
            console.error('Failed to fetch flight prices:', error)
            setFlightError('Could not fetch latest fares')
        } finally {
            setLoadingFlights(false)
        }
    }

    const loadSession = async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const headers: Record<string, string> = {}
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }
            if (typeof window !== 'undefined') {
                headers['X-Domain'] = window.location.hostname
            }

            const response = await fetch(`${API_URL}/api/v1/trip-planner/session/${sessionId}`, {
                headers
            })
            if (response.ok) {
                const data = await response.json()
                setSession(data)

                // Set GST Settings from session data
                if (data.gst_percentage !== undefined) {
                    setGstSettings({
                        inclusive: data.gst_inclusive,
                        percentage: data.gst_percentage
                    })
                }

                // Initialize modular selection state based on preferences
                const prefs = data.preferences || {}
                // If they requested them, default to selected for better UX, or pending if we want them to choose.

                // Initialize itinerary
                if (data.itinerary && data.itinerary.length > 0) {
                    setItinerary(data.itinerary)
                } else {
                    // Create empty itinerary for each day
                    const emptyItinerary: DayItinerary[] = []
                    for (let i = 1; i <= data.duration_days; i++) {
                        emptyItinerary.push({
                            day_number: i,
                            morning: [],
                            afternoon: [],
                            evening: [],
                            night: [],
                            half_day: [],
                            full_day: []
                        })
                    }
                    setItinerary(emptyItinerary)
                }
            } else {
                alert('Session not found or expired')
                router.push('/plan-trip')
            }
        } catch (error) {
            console.error('Failed to load session:', error)
            alert('Failed to load session')
        } finally {
            setLoading(false)
        }
    }

    const loadPackagePreview = async (pkgId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/v1/packages/${pkgId}/itinerary`)
            if (res.ok) {
                const data = await res.json()
                // Mock session-like structure for preview
                setSession({
                    ...data,
                    start_date: new Date().toISOString().split('T')[0], // Default to today
                    travelers: { adults: 2, children: 0, infants: 0 },
                    preferences: {
                        departure_location: searchParams.get('origin') || 'MAA',
                        include_flights: data.flights_enabled || false,
                        cabin_class: data.flight_cabin_class || 'ECONOMY'
                    }
                })

                if (data.itinerary_by_day) {
                    setItinerary(data.itinerary_by_day)
                }

                if (data.gst_mode) {
                    setGstSettings({
                        inclusive: data.gst_mode === 'inclusive',
                        percentage: data.gst_percentage || 0
                    })
                }
            } else {
                alert("Failed to load package preview")
                router.push('/')
            }
        } catch (error) {
            console.error("Preview load failed", error)
        } finally {
            setLoading(false)
        }
    }

    const loadPackagePreviewBySlug = async (pkgSlug: string) => {
        try {
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const res = await fetch(`${API_URL}/api/v1/packages/slug/${pkgSlug}/itinerary`, {
                headers: { 'X-Domain': domain }
            })
            if (res.ok) {
                const data = await res.json()
                // Mock session-like structure for preview
                setSession({
                    ...data,
                    start_date: new Date().toISOString().split('T')[0], // Default to today
                    travelers: { adults: 2, children: 0, infants: 0 },
                    preferences: {
                        departure_location: searchParams.get('origin') || 'MAA',
                        include_flights: data.flights_enabled || false,
                        cabin_class: data.flight_cabin_class || 'ECONOMY'
                    }
                })

                if (data.itinerary_by_day) {
                    setItinerary(data.itinerary_by_day)
                }

                if (data.gst_mode) {
                    setGstSettings({
                        inclusive: data.gst_mode === 'inclusive',
                        percentage: data.gst_percentage || 0
                    })
                }
            } else {
                alert("Failed to load package preview")
                router.push('/plan-trip')
            }
        } catch (error) {
            console.error("Preview load failed", error)
        } finally {
            setLoading(false)
        }
    }

    const addActivity = (dayNumber: number, timeSlot: keyof TimeSlot) => {
        const newActivity: Activity = {
            title: 'New Activity',
            description: 'Click to edit'
        }

        setItinerary(prev => prev.map(day => {
            if (day.day_number === dayNumber) {
                return {
                    ...day,
                    [timeSlot]: [...day[timeSlot], newActivity]
                }
            }
            return day
        }))
    }

    const updateActivity = (dayNumber: number, timeSlot: keyof TimeSlot, index: number, field: keyof Activity, value: string) => {
        setItinerary(prev => prev.map(day => {
            if (day.day_number === dayNumber) {
                const newActivities = [...day[timeSlot]]
                newActivities[index] = { ...newActivities[index], [field]: value }
                return {
                    ...day,
                    [timeSlot]: newActivities
                }
            }
            return day
        }))
    }

    const removeActivity = (dayNumber: number, timeSlot: keyof TimeSlot, index: number) => {
        setItinerary(prev => prev.map(day => {
            if (day.day_number === dayNumber) {
                const newActivities = [...day[timeSlot]]
                newActivities.splice(index, 1)
                return {
                    ...day,
                    [timeSlot]: newActivities
                }
            }
            return day
        }))
    }



    const saveItinerary = async () => {
        setSaving(true)
        try {
            // Include selectedFlight in the payload
            const totalFlightPrice = (selectedOnwardFlight?.price || 0) + (selectedReturnFlight?.price || 0)

            const payload = {
                itinerary,
                flight_details: (selectedOnwardFlight || selectedReturnFlight) ? {
                    price: totalFlightPrice,
                    // Use the price_id extracted by backend adapter
                    priceId: selectedOnwardFlight?.price_id || selectedReturnFlight?.price_id,
                    onward: selectedOnwardFlight ? {
                        id: selectedOnwardFlight.id,
                        priceId: selectedOnwardFlight.price_id,
                        price: selectedOnwardFlight.price,
                        airline: selectedOnwardFlight.airline,
                        airline_code: selectedOnwardFlight.airline_code,
                        flight_number: selectedOnwardFlight.flight_number,
                        origin: selectedOnwardFlight.origin,
                        destination: selectedOnwardFlight.destination,
                        departure: selectedOnwardFlight.departure_time,
                        arrival: selectedOnwardFlight.arrival_time,
                        duration: selectedOnwardFlight.duration,
                        stops: selectedOnwardFlight.stops
                    } : null,
                    return: selectedReturnFlight ? {
                        id: selectedReturnFlight.id,
                        priceId: selectedReturnFlight.price_id,
                        price: selectedReturnFlight.price,
                        airline: selectedReturnFlight.airline,
                        airline_code: selectedReturnFlight.airline_code,
                        flight_number: selectedReturnFlight.flight_number,
                        origin: selectedReturnFlight.origin,
                        destination: selectedReturnFlight.destination,
                        departure: selectedReturnFlight.departure_time,
                        arrival: selectedReturnFlight.arrival_time,
                        duration: selectedReturnFlight.duration,
                        stops: selectedReturnFlight.stops
                    } : null
                } : null,
                destination: session?.destination || session?.title || slug || 'Trip',
                duration_days: session?.duration_days,
                duration_nights: session?.duration_nights,
                start_date: session?.start_date,
                travelers: travelers,
                preferences: session?.preferences,
                package_id: session?.id || packageId
            }

            let currentSessionId = sessionId;

            if (!currentSessionId || currentSessionId === 'null') {
                const createPayload = {
                    destination: session.destination || session.title || slug || 'Trip',
                    duration_days: session.duration_days || 5,
                    duration_nights: session.duration_nights || 4,
                    start_date: session.start_date || new Date().toISOString().split('T')[0],
                    travelers: travelers,
                    preferences: session.preferences || {},
                    package_id: session.id || packageId
                }

                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                const headers: Record<string, string> = { 'Content-Type': 'application/json' }
                if (token) headers['Authorization'] = `Bearer ${token}`

                const createRes = await fetch(`${API_URL}/api/v1/trip-planner/create-session`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(createPayload)
                })

                if (createRes.ok) {
                    const data = await createRes.json()
                    currentSessionId = data.session_id
                    setSessionId(currentSessionId)
                    if (typeof window !== 'undefined') {
                        document.cookie = `tripSessionId=${currentSessionId}; path=/; max-age=86400`
                        const url = new URL(window.location.href);
                        url.searchParams.set('session', String(currentSessionId));
                        window.history.replaceState({}, '', url.toString());
                    }
                } else {
                    const errorData = await createRes.json().catch(() => ({}));
                    console.error("Create session error detail:", errorData);
                    throw new Error(errorData.detail || "Failed to create session")
                }
            }

            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`

            const response = await fetch(`${API_URL}/api/v1/trip-planner/session/${currentSessionId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            })

            if (response.ok) {
                setSuccess(true)
                setTimeout(() => setSuccess(false), 2000)
                return currentSessionId
            } else {
                alert('Failed to save itinerary')
                return null
            }
        } catch (error) {
            console.error('Failed to save itinerary:', error)
            alert('Failed to save itinerary')
            return null
        } finally {
            setSaving(false)
        }
    }

    const handleCheckout = async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

        if (!token) {
            setIsAuthModalOpen(true)
            return
        }

        // Save first
        const finalSessionId = await saveItinerary()
        if (!finalSessionId) return

        const checkoutUrl = `/checkout?sessionId=${finalSessionId}`
        router.push(checkoutUrl)
    }

    const handleAuthSuccess = () => {
        setIsAuthModalOpen(false)
        handleCheckout()
    }



    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
                    <p className="text-gray-500 font-medium">Building your itinerary...</p>
                </div>
            </div>
        )
    }

    if (!session) return null

    const travelers = {
        adults: queryAdults ? parseInt(queryAdults, 10) : (session.travelers?.adults || 1),
        children: queryChildren ? parseInt(queryChildren, 10) : (session.travelers?.children || 0),
        infants: queryInfants ? parseInt(queryInfants, 10) : (session.travelers?.infants || 0)
    }

    // Override session start_date with query date if present
    if (queryDate && session && !session.start_date_overridden) {
        session.start_date = queryDate;
        session.start_date_overridden = true; // prevent infinite loops if session updates
    }

    const preferences = session.preferences || {}

    return (
        <div className="min-h-screen">
            {/* Preview Banner */}
            {mode === 'preview' && (
                <div className="glass-panel border-b border-amber-200/50 px-4 py-3 sticky top-0 z-50">
                    <div className="container mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-800">
                            <Sparkles className="h-5 w-5" />
                            <span className="font-bold">Sample Itinerary Preview</span>
                            <span className="text-sm opacity-80 hidden md:inline"> - This is a read-only view of our curated package.</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-white/50 hover:bg-white text-amber-900 border-amber-300">
                            Exit Preview
                        </Button>
                    </div>
                </div>
            )}


            {/* Hero Section — destination-specific background */}
            <div className="relative h-[480px] w-full bg-cover bg-center overflow-hidden flex items-center justify-center group shadow-2xl">
                {/* Background Image & Overlay — Destination-specific */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center transition-transform transition-duration-[4s] group-hover:scale-105"
                    style={{
                        backgroundImage: `url('${session?.feature_image_url || session?.destination_image_url || `https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=1800`}')` }}
                />

                {/* Gradient Overlay — stronger at bottom for chip readability */}
                <div
                    className="absolute inset-0 z-10"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.8) 100%)' }}
                />

                {/* Noise texture overlay */}
                <div className="absolute inset-0 z-[11] opacity-[0.035] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/p6.png")' }}></div>

                <div className="container mx-auto px-4 relative z-20 text-center">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Destination Tag — replaces floating pin */}
                        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <div className="inline-flex items-center gap-1.5 bg-black/30 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/20 shadow-sm">
                                <span className="text-[var(--primary-light)] text-[11px]">📍</span>
                                <span className="text-white text-[11px] font-bold uppercase tracking-widest">{session.destination}, {session.country || 'India'}</span>
                            </div>

                            {true && (
                                <Badge className="relative overflow-hidden text-white border-0 px-5 py-2 text-sm font-bold shadow-[0_0_16px_var(--primary-glow)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light,var(--primary))] rounded-full">
                                    <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></span>
                                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                                    AI Optimized Itinerary ✨
                                </Badge>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] font-display drop-shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                            Trip to <span className="text-white italic font-serif bg-clip-text drop-shadow-sm">{session.destination}</span>
                        </h1>

                        {/* Trip Details Grid - Info Chips */}
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
                            <div className="glass-chip-premium px-5 py-3 rounded-2xl flex items-center gap-3 border border-white/20 shadow-lg bg-[var(--primary-soft)] backdrop-blur-md">
                                <div className="p-2 bg-[var(--primary)] rounded-xl shadow-inner">
                                    <Calendar className="h-4 w-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[9px] text-white/70 font-bold uppercase tracking-[0.15em] leading-none mb-1">Dates</p>
                                    <p className="font-bold text-white text-sm whitespace-nowrap">{formatDate(session.start_date)}</p>
                                </div>
                            </div>

                            <div className="glass-chip-premium px-5 py-3 rounded-2xl flex items-center gap-3 border border-white/20 shadow-lg bg-[var(--primary-soft)] backdrop-blur-md">
                                <div className="p-2 bg-[var(--primary)] rounded-xl shadow-inner">
                                    <Clock className="h-4 w-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[9px] text-white/70 font-bold uppercase tracking-[0.15em] leading-none mb-1">Duration</p>
                                    <p className="font-bold text-white text-sm whitespace-nowrap">
                                        {session.duration_days} Days / {session.duration_nights ?? (session.duration_days > 1 ? session.duration_days - 1 : session.duration_days)} Nights
                                    </p>
                                </div>
                            </div>

                            <div className="glass-chip-premium px-5 py-3 rounded-2xl flex items-center gap-3 border border-white/20 shadow-lg bg-[var(--primary-soft)] backdrop-blur-md">
                                <div className="p-2 bg-[var(--primary)] rounded-xl shadow-inner">
                                    <Users className="h-4 w-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[9px] text-white/70 font-bold uppercase tracking-[0.15em] leading-none mb-1">Travelers</p>
                                    <p className="font-bold text-white text-sm whitespace-nowrap">{travelers.adults + travelers.children + travelers.infants} People</p>
                                </div>
                            </div>

                                <div className="p-2 bg-[var(--primary)] rounded-xl shadow-inner">
                                    <Wallet className="h-4 w-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[9px] text-white/70 font-bold uppercase tracking-[0.15em] leading-none mb-1">Budget</p>
                                    <p className="font-bold text-white text-sm whitespace-nowrap">
                                        {session.price_per_person ? `₹${session.price_per_person.toLocaleString()}` : session.budget_tier ? `${session.budget_tier} Tier` : 'Custom'}
                                    </p>
                                </div>
                        </div>
                    </div>
                </div>

                {/* Save Button — frosted pill with orange border */}
                <div className="absolute top-6 right-6 z-30">
                    <Button
                        id="save-btn"
                        className={`
                            rounded-full px-6 h-11 font-bold transition-all shadow-xl backdrop-blur-lg
                            ${success
                                ? 'bg-emerald-500 border-transparent text-white'
                                : 'bg-white/90 border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white'
                            }
                        `}
                        onClick={saveItinerary}
                        disabled={saving || mode === 'preview'}
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : success ? <CheckCircle className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        <span>{saving ? 'Saving...' : success ? 'Saved!' : 'Save Trip'}</span>
                    </Button>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-16 pb-8 relative z-30">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

                        {/* Left Column - Main Content */}
                        {/* Left Column - Main Content */}
                        <div className="lg:col-span-8 xl:col-span-9 space-y-8 min-w-0">

                            {/* AI Summary Banner */}
                            <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_var(--primary-glow)] border border-[var(--primary)]/10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-soft)] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 transition-transform duration-700 group-hover:scale-110" />
                                <div className="flex flex-col md:flex-row gap-8 relative z-10 items-center md:items-start text-center md:text-left">
                                    <div className="shrink-0">
                                        <div className="p-5 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] rounded-[2rem] text-white shadow-[0_12px_30px_var(--primary-glow)] ring-4 ring-white/50">
                                            <Sparkles className="h-9 w-9 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-3xl font-bold text-[var(--primary)] font-display">
                                            Your Personalized AI Itinerary
                                        </h3>
                                        <p className="text-slate-600 leading-relaxed text-lg max-w-2xl">
                                            We've crafted this {session.duration_days}-day journey through <span className="font-bold text-[var(--primary)]">{session.destination}</span> based on your love for <span className="font-bold text-[var(--primary)]">{session.trip_type}</span> experiences.
                                        </p>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                                            {[
                                                { icon: <Sparkles className="h-3 w-3" />, label: 'Perfectly Paced' },
                                                { icon: <MapPin className="h-3 w-3" />, label: 'Top Rated Spots' },
                                                { icon: <CheckCircle className="h-3 w-3" />, label: 'Local Gems' },
                                            ].map((tag) => (
                                                <div key={tag.label} className="bg-[var(--primary)]/10 border border-[var(--primary)]/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-[var(--primary)] flex items-center gap-1.5 transition-all hover:bg-[var(--primary)] hover:text-white hover:border-transparent">
                                                    {tag.icon}
                                                    <span>{tag.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                                    {/* Trip Overview Cards */}
                                    <section>
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="h-10 w-1.5 rounded-full bg-[var(--itinerary-primary,var(--primary))]" />
                                            <h2 className="text-3xl font-bold text-[#3A1A08] font-display">Trip Overview</h2>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {[
                                                { icon: <Plane className="h-6 w-6" />, label: "Flights", desc: "Best connections", detail: "Round-trip · Economy" },
                                                { icon: <Hotel className="h-6 w-6" />, label: "Hotels", desc: "Premium stays", detail: `${session.duration_nights ?? (session.duration_days - 1)} nights · 4★ rated` },
                                                { icon: <Camera className="h-6 w-6" />, label: "Activities", desc: "Curated guide", detail: `${session.duration_days} days · Local expert` },
                                                { icon: <Car className="h-6 w-6" />, label: "Transfers", desc: "Private cabs", detail: "Door-to-door service" }
                                            ].map((item, i) => (
                                                <div key={i} className="group relative transition-all duration-500 overflow-hidden cursor-default p-6 bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/20 shadow-sm hover:shadow-xl hover:-translate-y-2">
                                                    {/* Hover glow */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />

                                                    <div className="relative z-10">
                                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center mb-5 text-white shadow-lg shadow-[var(--primary)]/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                                            {item.icon}
                                                        </div>
                                                        <h3 className="font-bold text-slate-800 text-xl mb-1">{item.label}</h3>
                                                        <p className="text-sm text-slate-600 font-medium opacity-70">{item.desc}</p>
                                                        <p className="text-[11px] text-slate-400 font-semibold mt-1.5">{item.detail}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                            <div className="border-t border-gray-100"></div>

                            {/* Itinerary Tabs - Clean & Modern */}
                            <section>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-1 rounded-full" style={{ backgroundColor: '#3b82f6', backgroundImage: 'linear-gradient(to bottom, #3b82f6, #4f46e5)' }}></div>
                                        <h2 className="text-3xl font-bold text-gray-900">Day-by-Day Journey</h2>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        className="rounded-full border-white/20 hover:bg-white/10 text-gray-600 gap-2 shadow-sm font-semibold"
                                        onClick={() => {
                                            // The original package ID is used for generating the PDF
                                            // Handling both TripSession (has package_id) and Package modes (has id)
                                            const pkgId = session?.package_id || session?.id || packageId;
                                            if (pkgId) {
                                                window.open(`${API_URL}/api/v1/packages/${pkgId}/itinerary-pdf`, '_blank');
                                            } else {
                                                alert("Could not locate the package ID required for the PDF.");
                                            }
                                        }}
                                    >
                                        <Download className="h-4 w-4" /> Download PDF
                                    </Button>
                                </div>

                                <Tabs value={currentDay.toString()} onValueChange={(v) => setCurrentDay(parseInt(v))} className="w-full">
                                    <TabsList className="mb-8 w-full flex justify-start overflow-x-auto glass-panel p-1.5 gap-2 scrollbar-hide h-auto rounded-2xl border border-white/20">
                                        {itinerary.map((day) => (
                                            <TabsTrigger
                                                key={day.day_number}
                                                value={day.day_number.toString()}
                                                className="
                                                px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                                                data-[state=active]:bg-white data-[state=active]:shadow-md
                                                text-slate-500 hover:text-slate-700 hover:bg-slate-100/50
                                            "
                                                style={{
                                                    color: currentDay === day.day_number ? '#1d4ed8' : ''
                                                }}
                                            >
                                                Day {day.day_number}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>

                                    {itinerary.map((day) => (
                                        <TabsContent key={day.day_number} value={day.day_number.toString()} className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-5 duration-500">
                                            <DayPlanner
                                                day={day}
                                                onAddActivity={addActivity}
                                                onRemoveActivity={removeActivity}
                                                morningColor={undefined}
                                                afternoonColor={undefined}
                                                eveningColor={undefined}
                                                nightColor={undefined}
                                                activeDayColor={undefined}
                                                headingBorderColor={undefined}
                                                dayBadgeColor={undefined}
                                                isReadonly={mode === 'preview'}
                                            />
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </section>

                            {(preferences.include_flights || preferences.include_hotels || preferences.include_transfers) && (
                                <div className="border-t border-gray-100"></div>
                            )}

                            {/* FLIGHTS MODULE - Enhanced */}
                            {preferences.include_flights && (
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                                        <div className="flex-1 flex items-center justify-between">
                                            <h2 className="text-2xl font-bold text-gray-900">Flights</h2>
                                            {flightError && <Badge variant="destructive">{flightError}</Badge>}
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black text-[var(--primary)] uppercase tracking-[0.2em] flex items-center gap-2">
                                                <div className="p-1 bg-[var(--primary)]/10 rounded-md">
                                                    <Plane className="h-3 w-3" />
                                                </div>
                                                Onward Journey
                                            </h3>
                                            {selectedOnwardFlight ? (
                                                <div className="hover:shadow-2xl transition-all duration-300 rounded-[16px] bg-white/5 ring-1 ring-white/10 overflow-hidden group backdrop-blur-sm border border-white/10">
                                                    <div className="p-1">
                                                        <FlightCard
                                                            flight={selectedOnwardFlight}
                                                            isSelected={true}
                                                            onSelect={() => { }}
                                                        />
                                                        <div className="border-t border-dashed border-gray-100 p-2 flex justify-center">
                                                            <Dialog open={isOnwardModalOpen} onOpenChange={setIsOnwardModalOpen}>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="link" size="sm" className="text-[var(--primary)] hover:text-[var(--primary)] w-full mb-1 font-black underline decoration-[var(--primary)]/0 hover:decoration-[var(--primary)]/40 underline-offset-4 transition-all duration-300" disabled={mode === 'preview'}>
                                                                        Change Onward Flight
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="bg-[rgba(255,245,235,0.75)] backdrop-blur-[24px] max-w-5xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border border-white/40 shadow-[0_8px_32px_var(--primary-glow)]">
                                                                    <DialogHeader className="px-6 py-5 border-b border-white/20 bg-white/10 flex flex-row items-center justify-between">
                                                                        <DialogTitle className="text-[#3A1A08] font-black text-xl font-display uppercase tracking-tight">Select Onward Flight</DialogTitle>
                                                                    </DialogHeader>
                                                                    <div className="flex flex-1 overflow-hidden">
                                                                        <div className={`md:block w-72 border-r border-white/30 bg-white/20 p-6 overflow-y-auto ${showMobileFilters ? 'fixed inset-0 z-50 w-full' : 'hidden'}`}>
                                                                            <div className="flex items-center justify-between mb-6">
                                                                                <h3 className="font-bold text-gray-900">Filters</h3>
                                                                                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setShowMobileFilters(false)}>Close</Button>
                                                                            </div>
                                                                            <div className="flex items-center justify-between mb-6 md:hidden">
                                                                                <h3 className="font-bold text-gray-900">Filters</h3>
                                                                                <Button variant="ghost" size="sm" onClick={() => setFilters({ refundType: 'all', stops: [], dates: [], timeRanges: [], airlines: [] })}>Reset</Button>
                                                                            </div>
                                                                            <FlightFilters filters={filters} onChange={setFilters} availableAirlines={availableAirlines} />
                                                                            <Button className="w-full mt-4 md:hidden" onClick={() => setShowMobileFilters(false)}>Apply Filters</Button>
                                                                        </div>
                                                                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-transparent custom-orange-scrollbar">
                                                                            <div className="md:hidden mb-4">
                                                                                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowMobileFilters(true)}>
                                                                                    Filters
                                                                                </Button>
                                                                            </div>
                                                                            <div className="space-y-4">
                                                                                {filteredOnwardFlights.length === 0 ? (
                                                                                    <div className="text-center py-12 glass-panel rounded-xl border-dashed border-0">
                                                                                        <p className="text-gray-500 mb-2">No flights found matching your filters.</p>
                                                                                        <Button variant="link" onClick={() => setFilters({ refundType: 'all', stops: [], dates: [], timeRanges: [], airlines: [] })}>Clear Filters</Button>
                                                                                    </div>
                                                                                ) : (
                                                                                    filteredOnwardFlights.map(f => (
                                                                                        <FlightCard key={f.id} flight={f} isSelected={selectedOnwardFlight.id === f.id} isBestValue={onwardFlights[0].id === f.id} onSelect={(flight) => { setSelectedOnwardFlight(flight); setIsOnwardModalOpen(false); }} />
                                                                                    ))
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Card className="glass-panel min-h-[200px] flex items-center justify-center border-dashed border-2 border-white/20 shadow-none">
                                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                                        {loadingFlights ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plane className="h-8 w-8 opacity-20" />}
                                                        <p className="font-medium text-sm">{loadingFlights ? "Finding best flights..." : "No onward flights"}</p>
                                                    </div>
                                                </Card>
                                            )}
                                        </div>

                                        {returnFlights.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-black text-[var(--primary)] uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <div className="p-1 bg-[var(--primary)]/10 rounded-md">
                                                        <Plane className="h-3 w-3 -rotate-180" />
                                                    </div>
                                                    Return Journey
                                                </h3>
                                                {selectedReturnFlight ? (
                                                    <div className="hover:shadow-2xl transition-all duration-300 rounded-[16px] bg-white/5 ring-1 ring-white/10 overflow-hidden group backdrop-blur-sm border border-white/10">
                                                        <div className="p-1">
                                                            <FlightCard
                                                                flight={selectedReturnFlight}
                                                                isSelected={true}
                                                                onSelect={() => { }}
                                                            />
                                                            <div className="border-t border-dashed border-gray-100 p-2 flex justify-center">
                                                                <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
                                                                    <DialogTrigger asChild>
                                                                        <Button variant="link" size="sm" className="text-[var(--primary)] hover:text-[var(--primary)] w-full mb-1 font-black underline decoration-[var(--primary)]/0 hover:decoration-[var(--primary)]/40 underline-offset-4 transition-all duration-300" disabled={mode === 'preview'}>
                                                                            Change Return Flight
                                                                        </Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent className="bg-[#FFF5EB]/75 backdrop-blur-[24px] max-w-5xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border border-white/40 shadow-[0_8px_32px_var(--primary-glow)]">
                                                                        <DialogHeader className="px-6 py-5 border-b border-white/20 bg-white/10 flex flex-row items-center justify-between">
                                                                            <DialogTitle className="text-[#3A1A08] font-black text-xl font-display uppercase tracking-tight">Select Return Flight</DialogTitle>
                                                                        </DialogHeader>
                                                                        <div className="flex flex-1 overflow-hidden">
                                                                            <div className={`md:block w-72 border-r border-white/30 bg-white/20 p-6 overflow-y-auto ${showMobileFilters ? 'fixed inset-0 z-50 w-full' : 'hidden'}`}>
                                                                                <div className="flex items-center justify-between mb-6">
                                                                                    <h3 className="font-bold text-gray-900">Filters</h3>
                                                                                    <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setShowMobileFilters(false)}>Close</Button>
                                                                                </div>
                                                                                <div className="flex items-center justify-between mb-6 md:hidden">
                                                                                    <Button variant="ghost" size="sm" className="text-blue-600 h-auto p-0 hover:bg-transparent" onClick={() => setFilters({ refundType: 'all', stops: [], dates: [], timeRanges: [], airlines: [] })}>Reset</Button>
                                                                                </div>
                                                                                <FlightFilters filters={filters} onChange={setFilters} availableAirlines={availableAirlines} />
                                                                                <Button className="w-full mt-4 md:hidden" onClick={() => setShowMobileFilters(false)}>Apply Filters</Button>
                                                                            </div>
                                                                            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-transparent custom-orange-scrollbar">
                                                                                <div className="md:hidden mb-4">
                                                                                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowMobileFilters(true)}>
                                                                                        Filters
                                                                                    </Button>
                                                                                </div>
                                                                                <div className="space-y-4">
                                                                                    {filteredReturnFlights.map(f => (
                                                                                        <FlightCard key={f.id} flight={f} isSelected={selectedReturnFlight.id === f.id} isBestValue={returnFlights[0].id === f.id} onSelect={(flight) => { setSelectedReturnFlight(flight); setIsReturnModalOpen(false); }} />
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Card className="min-h-[200px] flex items-center justify-center border-dashed border-2 border-white/20 shadow-none glass-panel">
                                                        <div className="flex flex-col items-center gap-3 text-gray-400">
                                                            {loadingFlights ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plane className="h-8 w-8 opacity-20" />}
                                                            <p className="font-medium text-sm">{loadingFlights ? "Finding best flights..." : "No return flights"}</p>
                                                        </div>
                                                    </Card>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}


                            {(preferences.include_hotels || preferences.include_transfers) && (
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* HOTELS & TRANSFERS MODULES */}
                                    {preferences.include_hotels && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                                                    <Hotel className="h-6 w-6" />
                                                </div>
                                                <h2 className="text-2xl font-bold text-gray-900">Accommodation</h2>
                                            </div>

                                            <div className="hover:shadow-2xl transition-all duration-300 rounded-[1.5rem] bg-white ring-1 ring-gray-100 p-1 group">
                                                <ServiceCard
                                                    type="hotel"
                                                    status={hotelSelected ? 'selected' : 'pending'}
                                                    title={hotelSelected ? 'Luxury Stay Included' : 'Select Hotel Preference'}
                                                    description={hotelSelected ? '5-Star Hotel with Breakfast' : 'Choose where you want to stay'}
                                                    price={hotelSelected ? HOTEL_ESTIMATE : undefined}
                                                    details={hotelSelected ? {
                                                        date: 'Check-in: Day 1',
                                                        rating: 4.8
                                                    } : undefined}
                                                    onAction={() => setHotelSelected(!hotelSelected)}
                                                    disabled={mode === 'preview'}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {preferences.include_transfers && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl">
                                                    <Car className="h-6 w-6" />
                                                </div>
                                                <h2 className="text-2xl font-bold text-gray-900">Transfers</h2>
                                            </div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] rounded-lg shadow-sm">
                                                        <Plane className="h-4 w-4 text-white" />
                                                    </div>
                                                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Onward Journey</h3>
                                                </div>
                                                <div className="text-xs font-bold text-slate-500 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                                                    Direct Flight Only
                                                </div>
                                            </div>
                                            <div className="hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-[1.5rem] bg-white ring-1 ring-gray-100 p-1">
                                                <ServiceCard
                                                    type="transfer"
                                                    status={transferSelected ? 'selected' : 'pending'}
                                                    title={transferSelected ? 'Private Transfers Included' : 'Add Private Transfers'}
                                                    description={transferSelected ? 'Airport Pickup & Drop + Inter-city' : 'Hassle-free airport & city transfers'}
                                                    price={transferSelected ? TRANSFER_ESTIMATE : undefined}
                                                    details={transferSelected ? {
                                                        duration: 'Full Trip Coverage'
                                                    } : undefined}
                                                    onAction={() => setTransferSelected(!transferSelected)}
                                                    disabled={mode === 'preview'}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}



                            {/* Cancellation Policy Section */}
                            <section className="pt-16 pb-8 border-t border-gray-100">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-10 w-1.5 rounded-full bg-[var(--primary)]" />
                                    <h2 className="text-3xl font-bold text-slate-900 font-display">Cancellation Policy</h2>
                                </div>

                                {session.cancellation_enabled ? (
                                    <div className="space-y-4 max-w-3xl">
                                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2.5rem] p-8 shadow-sm">
                                            <div className="flex items-center gap-3 mb-6 text-emerald-800">
                                                <div className="p-2 bg-emerald-100 rounded-lg">
                                                    <CheckCircle className="h-5 w-5" />
                                                </div>
                                                <span className="font-bold text-xl">Cancellable Package</span>
                                            </div>
                                            <div className="grid gap-4">
                                                {session.cancellation_rules?.map((rule: any, idx: number) => {
                                                    const amount = ((rule.refundPercentage / 100) * (session.price_per_person || 0) * (travelers.adults + travelers.children));
                                                    return (
                                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-2xl border border-emerald-100 shadow-sm transition-all hover:shadow-md gap-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-slate-50 rounded-lg">
                                                                    <Clock className="h-4 w-4 text-emerald-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Timing</p>
                                                                    <span className="font-bold text-slate-800">Cancel before {rule.daysBefore} days</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <div className="text-right">
                                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Refund</p>
                                                                    <span className="text-emerald-700 font-black text-lg">{rule.refundPercentage}% back</span>
                                                                </div>
                                                                <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-black border border-emerald-100">
                                                                    ₹{Math.round(amount).toLocaleString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {/* Final catch-all if last rule > 0 days */}
                                                {(session.cancellation_rules?.length > 0 && session.cancellation_rules[session.cancellation_rules.length - 1].daysBefore > 0) && (
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-red-50 rounded-2xl border border-red-100 shadow-sm gap-4 opacity-80">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white rounded-lg">
                                                                <XCircle className="h-4 w-4 text-red-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-red-400 font-bold uppercase tracking-wider">Condition</p>
                                                                <span className="font-bold text-red-800 whitespace-nowrap">Less than {session.cancellation_rules[session.cancellation_rules.length - 1].daysBefore} days</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <p className="text-xs text-red-400 font-bold uppercase tracking-wider">Refund</p>
                                                                <span className="text-red-700 font-black text-lg">0% back</span>
                                                            </div>
                                                            <div className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-black border border-red-200 uppercase tracking-tighter">
                                                                Non-refundable
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium px-4 flex items-center gap-2">
                                            <AlertCircle className="h-3 w-3" />
                                            * Estimated refund amounts are based on the base package price (₹{(session.price_per_person || 0).toLocaleString()} x {travelers.adults + travelers.children} travelers). Taxes and service fees may not be refundable.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col md:flex-row md:items-center gap-6 p-8 bg-red-50/50 border border-red-100 rounded-[2.5rem] max-w-3xl">
                                        <div className="p-4 bg-red-100 rounded-2xl text-red-600 shadow-inner">
                                            <XCircle className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-red-900 text-2xl font-display mb-1">Non-Cancellable</h4>
                                            <p className="text-red-700 font-medium opacity-80 leading-relaxed">This package is highly curated and does not support cancellations. Once booked, it is non-refundable and non-transferable.</p>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Footer Confidence Boost - Redesigned */}
                            {true && (
                                <div className="pt-16 pb-8" style={{ backgroundColor: 'transparent' }}>
                                    <div className="text-center mb-12">
                                        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-2">
                                            Peace of Mind
                                        </h3>
                                        <h2 className="text-3xl font-bold text-slate-900 font-display">
                                            {"Why book with RNT Tour?"}
                                        </h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {([
                                            { title: "Verified & Secure", description: "Curated packages & 100% secure payments via reliable gateways.", icon: "ShieldCheck" },
                                            { title: "Flexible & Transparent", description: "Customizable plans with absolutely no hidden fees.", icon: "CheckCircle" },
                                            { title: "24/7 Expert Support", description: "Instant confirmation & dedicated assistance throughout your trip.", icon: "Headphones" }
                                        ]).map((card: any, idx: number) => {
                                            const Icons: Record<string, any> = {
                                                ShieldCheck, CheckCircle, Headphones, Map: MapIcon, Users, Clock, Shield, Star, Heart, Camera, Car, Globe, Plane
                                            };
                                            const IconComponent = Icons[card.icon] || ShieldCheck;
                                            
                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex flex-col items-center text-center gap-6 group p-8 transition-all duration-500 bg-white/40 backdrop-blur-sm border border-white/30 rounded-[2rem] hover:shadow-xl hover:-translate-y-1"
                                                >
                                                    <div
                                                        className="p-6 rounded-2xl transition-all duration-500 shadow-sm group-hover:shadow-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] text-white"
                                                    >
                                                        <IconComponent className="h-8 w-8" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-xl mb-2 font-display">{card.title}</h4>
                                                        <p className="text-sm text-slate-600 leading-relaxed">{card.description || card.desc}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Right Column - Trip Cart (Sticky) */}
                        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 min-w-0">
                            <div className="sticky top-8">
                                <div className="relative">
                                    {/* Decorative elements behind cart */}
                                    <div className="absolute inset-x-4 -top-6 -bottom-6 bg-blue-50/50 rounded-[2.5rem] -z-10 blur-xl"></div>
                                    <TripCart
                                        basePrice={session.price_per_person || 18000}
                                        travelers={travelers}
                                        duration={{ days: session.duration_days, nights: session.duration_nights }}
                                        services={[
                                            ...(selectedOnwardFlight ? [{
                                                name: 'Onward Flight',
                                                price: session.flight_price_included ? 0 : selectedOnwardFlight.price * (travelers.adults + travelers.children)
                                            }] : []),
                                            ...(selectedReturnFlight ? [{
                                                name: 'Return Flight',
                                                price: session.flight_price_included ? 0 : selectedReturnFlight.price * (travelers.adults + travelers.children)
                                            }] : []),
                                            ...(hotelSelected ? [{ name: 'Hotel Upgrade', price: HOTEL_ESTIMATE * (travelers.adults + travelers.children) }] : []),
                                            ...(transferSelected ? [{ name: 'Private Transfers', price: TRANSFER_ESTIMATE * (travelers.adults + travelers.children) }] : [])
                                        ]}
                                        onCheckout={handleCheckout}
                                        disabled={mode === 'preview'}
                                        gstSettings={gstSettings || undefined}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
                {/* Mobile Sticky Footer */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 lg:hidden flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-medium">Total Trip Cost {gstSettings && !gstSettings.inclusive && <span className="text-[10px] text-blue-600 font-bold">(+GST)</span>}</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-gray-900">
                                ₹{(() => {
                                    const totalTravelers = travelers.adults + travelers.children + (travelers.infants || 0)
                                    const totalBasePrice = (session.price_per_person || 18000) * totalTravelers
                                    const services = [
                                        ...(selectedOnwardFlight ? [{ price: session.flight_price_included ? 0 : selectedOnwardFlight.price * (travelers.adults + travelers.children) }] : []),
                                        ...(selectedReturnFlight ? [{ price: session.flight_price_included ? 0 : selectedReturnFlight.price * (travelers.adults + travelers.children) }] : []),
                                        ...(hotelSelected ? [{ price: HOTEL_ESTIMATE * (travelers.adults + travelers.children) }] : []),
                                        ...(transferSelected ? [{ price: TRANSFER_ESTIMATE * (travelers.adults + travelers.children) }] : [])
                                    ]
                                    const totalServicesPrice = services.reduce((sum, service) => sum + service.price, 0)
                                    let subTotal = totalBasePrice + totalServicesPrice

                                    if (gstSettings && !gstSettings.inclusive) {
                                        const gstAmount = (subTotal * gstSettings.percentage) / 100
                                        subTotal += gstAmount
                                    }

                                    return subTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                })()}
                            </span>
                            <Button variant="link" size="sm" className="h-auto p-0 text-[var(--primary)] text-xs ml-2" onClick={() => setIsMobileCartOpen(true)}>View Details</Button>
                        </div>
                    </div>
                    <Button onClick={handleCheckout} className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 font-bold px-6 py-2 h-auto rounded-xl shadow-lg shadow-[var(--primary-glow)]">
                        Book Now
                    </Button>
                </div>

                {/* Mobile Cart Dialog */}
                <Dialog open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
                    <DialogContent className="glass-panel max-h-[85vh] overflow-y-auto p-0 gap-0 w-[95vw] rounded-2xl border-0">
                        <div className="p-4 border-b border-white/20 bg-white/10 flex justify-between items-center sticky top-0 z-10">
                            <DialogTitle>Trip Summary</DialogTitle>
                        </div>
                        <div className="p-4 bg-transparent min-h-[50vh]">
                                    <TripCart
                                        basePrice={session.price_per_person || 18000}
                                        travelers={travelers}
                                        duration={{ days: session.duration_days, nights: session.duration_nights }}
                                        services={[
                                            ...(selectedOnwardFlight ? [{
                                                name: 'Onward Flight',
                                                price: session.flight_price_included ? 0 : selectedOnwardFlight.price * (travelers.adults + travelers.children)
                                            }] : []),
                                            ...(selectedReturnFlight ? [{
                                                name: 'Return Flight',
                                                price: session.flight_price_included ? 0 : selectedReturnFlight.price * (travelers.adults + travelers.children)
                                            }] : []),
                                            ...(hotelSelected ? [{ name: 'Hotel Upgrade', price: HOTEL_ESTIMATE * (travelers.adults + travelers.children) }] : []),
                                            ...(transferSelected ? [{ name: 'Private Transfers', price: TRANSFER_ESTIMATE * (travelers.adults + travelers.children) }] : [])
                                        ]}
                                        onCheckout={handleCheckout}
                                        disabled={mode === 'preview'}
                                        gstSettings={gstSettings || undefined}
                                    />
                        </div>
                    </DialogContent>
                </Dialog>

            <BookingAuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onSuccess={handleAuthSuccess}
            />
        </div>
    )
}
