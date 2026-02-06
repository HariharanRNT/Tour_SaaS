'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, MapPin, Calendar, Users, Sparkles, Plus, Trash2, CheckCircle, ShieldCheck, Headphones } from 'lucide-react'
import { getValidImageUrl } from '@/lib/utils/image'
import { TripCart } from '@/components/itinerary/trip-cart'
import { ServiceCard } from '@/components/itinerary/service-card'
import { flightsAPI } from '@/lib/api'
import { FlightCard, Flight } from '@/components/itinerary/flight-card'
import { FlightFilters, FlightFilterState } from '@/components/itinerary/flight-filters'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DayPlanner } from '@/components/itinerary/DayPlanner'

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
}

interface DayItinerary {
    day_number: number
    morning: Activity[]
    afternoon: Activity[]
    evening: Activity[]
    night: Activity[]
}

export default function BuildTripPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const sessionId = searchParams.get('session')

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
        if (sessionId) {
            loadSession()
        }
    }, [sessionId])

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

            const response = await fetch(`http://localhost:8000/api/v1/trip-planner/session/${sessionId}`, {
                headers
            })
            if (response.ok) {
                const data = await response.json()
                setSession(data)

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
                            night: []
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
                } : null
            }

            const response = await fetch(`http://localhost:8000/api/v1/trip-planner/session/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (response.ok) {
                setSuccess(true)
                setTimeout(() => setSuccess(false), 2000)
            } else {
                alert('Failed to save itinerary')
            }
        } catch (error) {
            console.error('Failed to save itinerary:', error)
            alert('Failed to save itinerary')
        } finally {
            setSaving(false)
        }
    }

    const handleCheckout = async () => {
        // Save first
        await saveItinerary()

        const token = localStorage.getItem('token')
        const checkoutUrl = `/checkout?sessionId=${sessionId}`

        if (token) {
            router.push(checkoutUrl)
        } else {
            router.push(`/login?next=${encodeURIComponent(checkoutUrl)}`)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                    <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Generating your dream trip...</h2>
                    <p className="text-gray-500">We're finding the best spots for you.</p>
                </div>
            </div>
        )
    }

    if (!session) return null

    const travelers = {
        adults: session.travelers.adults || 1,
        children: session.travelers.children || 0,
        infants: session.travelers.infants || 0
    }

    const preferences = session.preferences || {}

    return (
        <div className="min-h-screen bg-gray-50/50 pb-32 font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Modern Header Area */}
            <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white pb-40 pt-16 overflow-hidden shadow-2xl">
                {/* Abstract Background pattern */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                        <div className="space-y-5 max-w-4xl">
                            {/* Title */}
                            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-xl leading-tight">
                                Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">{session.destination}</span> Getaway
                            </h1>

                            {/* Friendly Tone Subtitle */}
                            <p className="text-xl text-blue-100/90 font-medium leading-relaxed max-w-2xl">
                                {session.duration_days} Days &middot; {session.duration_nights} Nights &middot; Curated exclusively for you
                            </p>

                            {/* Micro-Badges */}
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                <Badge variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-blue-50 px-3 py-1.5 flex items-center gap-2 bg-opacity-10 hover:bg-opacity-20 transition-all font-medium">
                                    <Calendar className="h-3.5 w-3.5 text-cyan-300" />
                                    {session.duration_days} Days
                                </Badge>
                                <Badge variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-blue-50 px-3 py-1.5 flex items-center gap-2 bg-opacity-10 hover:bg-opacity-20 transition-all font-medium">
                                    <Users className="h-3.5 w-3.5 text-cyan-300" />
                                    {travelers.adults + travelers.children + travelers.infants} Travelers
                                </Badge>
                                <Badge variant="outline" className="bg-amber-500/10 backdrop-blur-md border-amber-500/30 text-amber-100 px-3 py-1.5 flex items-center gap-2 bg-opacity-10 hover:bg-opacity-20 transition-all font-medium">
                                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                                    Personalized Itinerary
                                </Badge>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex-shrink-0 mb-2">
                            <Button
                                id="save-btn"
                                className={`
                                    relative overflow-hidden transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 border border-white/20 h-12 px-8
                                    ${success ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-white text-blue-900 hover:bg-blue-50'}
                                 `}
                                onClick={saveItinerary}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : success ? <CheckCircle className="h-5 w-5 mr-2" /> : null}
                                <span className="font-bold tracking-wide text-base">{saving ? 'Saving...' : success ? 'Itinerary Saved!' : 'Save Itinerary'}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-6 -mt-32 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column - Modules & Itinerary */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-8">

                        {/* Match Score Banner */}
                        {session.matched_package_id ? (
                            <div className="bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 rounded-2xl p-1 shadow-lg shadow-violet-100/50 border border-white/60 mb-8">
                                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 border border-white/50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700"></div>

                                    <div className="relative z-10 p-3.5 bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 rounded-2xl shadow-sm ring-1 ring-violet-200/50">
                                        <Sparkles className="h-6 w-6 animate-pulse" />
                                    </div>

                                    <div className="relative z-10 flex-1 space-y-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-lg text-gray-900 tracking-tight">
                                                Intelligently Designed for You
                                            </h3>
                                            {session.match_score > 0 && (
                                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 text-xs font-semibold">
                                                    {Math.round(session.match_score * 100)}% Match
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-gray-600 font-medium leading-relaxed">
                                            We’ve crafted this itinerary based on your preferences, destination highlights, and popular travel patterns.
                                        </p>
                                        <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5 pt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                            Fully flexible — feel free to tweak any details below
                                        </p>
                                    </div>

                                    <div className="relative z-10 hidden md:flex flex-col items-center gap-1 opacity-80">
                                        <Badge variant="outline" className="border-violet-200 bg-violet-50/50 text-violet-700 text-xs px-2.5 py-1">
                                            AI-Powered
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border-l-4 border-l-orange-500 p-6 flex items-start gap-4">
                                <div className="p-2 bg-orange-100/50 text-orange-600 rounded-lg">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Starting Fresh</h3>
                                    <p className="text-sm text-gray-600">
                                        We've started a blank itinerary. Add activities below to build your dream trip!
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Package Description */}
                        {/* Trip Overview Section */}
                        {session.package_description && (
                            <Card className="rounded-2xl border border-gray-100 shadow-xl shadow-blue-50/50 bg-white overflow-hidden mb-8">
                                <CardHeader className="bg-gradient-to-r from-gray-50 to-white pb-6 border-b border-gray-100/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-blue-100/50 text-blue-600 rounded-xl">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900">Trip Overview</h2>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-8">
                                    {/* Summary Paragraph */}
                                    <div className="prose prose-blue max-w-none">
                                        <p className="text-gray-600 leading-7 text-lg font-medium">
                                            {session.package_description}
                                        </p>
                                    </div>

                                    {/* Highlights Subsection */}
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-amber-500" />
                                            Experience Highlights
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {[
                                                { icon: "🏛️", title: "Cultural Immersion", desc: "Expert-guided tours of heritage sites" },
                                                { icon: "✨", title: "Premium Comfort", desc: "Handpicked stays with top-tier amenities" },
                                                { icon: "🍽️", title: "Culinary Journey", desc: "Authentic local dining experiences" }
                                            ].map((item, idx) => (
                                                <div key={idx} className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all group">
                                                    <div className="text-2xl mb-3 group-hover:scale-110 transition-transform duration-300 inline-block">{item.icon}</div>
                                                    <h4 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h4>
                                                    <p className="text-xs text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* ITINERARY MODULE */}
                        <div>
                            <div className="mb-6">
                                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Your Day-by-Day Journey</h2>
                                <div className="flex items-center gap-3 text-gray-500 font-medium">
                                    <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 px-3 py-1">
                                        {itinerary.length} Days Planned
                                    </Badge>
                                    <span className="flex items-center gap-1.5 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        Flexible &amp; Editable
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl shadow-xl shadow-blue-50/50 border border-gray-100 p-1 md:p-6 overflow-hidden">
                                <Tabs value={currentDay.toString()} onValueChange={(v) => setCurrentDay(parseInt(v))} className="w-full">
                                    <TabsList className="mb-8 w-full flex justify-start overflow-x-auto bg-transparent p-2 gap-3 scrollbar-hide h-auto">
                                        {itinerary.map((day) => (
                                            <TabsTrigger
                                                key={day.day_number}
                                                value={day.day_number.toString()}
                                                className="
                                                    px-6 py-3 rounded-2xl border border-gray-100 bg-gray-50/50 text-gray-600 font-semibold min-w-[100px]
                                                    data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 
                                                    data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 data-[state=active]:border-transparent
                                                    transition-all duration-300 hover:bg-white hover:border-gray-200 hover:shadow-md
                                                "
                                            >
                                                Day {day.day_number}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>

                                    {itinerary.map((day) => (
                                        <TabsContent key={day.day_number} value={day.day_number.toString()} className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="px-2">
                                                <DayPlanner
                                                    day={day}
                                                    onAddActivity={addActivity}
                                                    onRemoveActivity={removeActivity}
                                                />
                                            </div>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </div>
                        </div>

                        {/* FLIGHTS MODULE */}
                        {preferences.include_flights && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900">Flights</h2>
                                    </div>
                                    {loadingFlights && <Badge variant="secondary" className="animate-pulse bg-blue-50 text-blue-600">Checking live fares...</Badge>}
                                    {flightError && <Badge variant="destructive">{flightError}</Badge>}
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* ONWARD FLIGHT */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            Onward Journey
                                        </h3>
                                        {selectedOnwardFlight ? (
                                            <div className="relative group">
                                                <div className="transition-transform duration-300 group-hover:-translate-y-1">
                                                    <FlightCard
                                                        flight={selectedOnwardFlight}
                                                        isSelected={true}
                                                        onSelect={() => { }}
                                                    />
                                                </div>
                                                <div className="absolute top-4 right-4 md:static md:mt-3 flex justify-end">
                                                    <Dialog open={isOnwardModalOpen} onOpenChange={setIsOnwardModalOpen}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm">
                                                                Change Flight
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
                                                            <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
                                                                <DialogTitle>Select Onward Flight</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="flex flex-1 overflow-hidden">
                                                                {/* (Filter Sidebar + List Content - kept same logic, just container style) */}
                                                                <div className="hidden md:block w-72 border-r bg-white p-6 overflow-y-auto">
                                                                    <div className="flex items-center justify-between mb-6">
                                                                        <h3 className="font-bold text-gray-900">Filters</h3>
                                                                        <Button variant="ghost" size="sm" className="text-blue-600 h-auto p-0 hover:bg-transparent" onClick={() => setFilters({ refundType: 'all', stops: [], dates: [], timeRanges: [], airlines: [] })}>Reset</Button>
                                                                    </div>
                                                                    <FlightFilters filters={filters} onChange={setFilters} availableAirlines={availableAirlines} />
                                                                </div>
                                                                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                                                                    <div className="space-y-4">
                                                                        {filteredOnwardFlights.length === 0 ? (
                                                                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
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
                                        ) : (
                                            !loadingFlights && <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400">No onward flights available</div>
                                        )}
                                    </div>

                                    {/* RETURN FLIGHT */}
                                    {returnFlights.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                                Return Journey
                                            </h3>
                                            {selectedReturnFlight ? (
                                                <div className="relative group">
                                                    <div className="transition-transform duration-300 group-hover:-translate-y-1">
                                                        <FlightCard
                                                            flight={selectedReturnFlight}
                                                            isSelected={true}
                                                            onSelect={() => { }}
                                                        />
                                                    </div>
                                                    <div className="absolute top-4 right-4 md:static md:mt-3 flex justify-end">
                                                        <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm">
                                                                    Change Flight
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
                                                                <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
                                                                    <DialogTitle>Select Return Flight</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="flex flex-1 overflow-hidden">
                                                                    <div className="hidden md:block w-72 border-r bg-white p-6 overflow-y-auto">
                                                                        <div className="flex items-center justify-between mb-6">
                                                                            <h3 className="font-bold text-gray-900">Filters</h3>
                                                                            <Button variant="ghost" size="sm" className="text-blue-600 h-auto p-0 hover:bg-transparent" onClick={() => setFilters({ refundType: 'all', stops: [], dates: [], timeRanges: [], airlines: [] })}>Reset</Button>
                                                                        </div>
                                                                        <FlightFilters filters={filters} onChange={setFilters} availableAirlines={availableAirlines} />
                                                                    </div>
                                                                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
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
                                            ) : (
                                                !loadingFlights && <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400">No return flights available</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {(selectedOnwardFlight || selectedReturnFlight) && (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-center gap-2 text-green-800 shadow-sm">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-semibold">Flights successfully added to your package</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* HOTELS & TRANSFERS MODULES (Grid Layout) */}
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* HOTELS MODULE */}
                            {preferences.include_hotels && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900">Accommodation</h2>
                                    </div>
                                    <div className="hover:shadow-xl transition-shadow duration-300 rounded-2xl">
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
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TRANSFERS MODULE */}
                            {preferences.include_transfers && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900">Transfers</h2>
                                    </div>
                                    <div className="hover:shadow-xl transition-shadow duration-300 rounded-2xl">
                                        <ServiceCard
                                            type="transfer"
                                            status={transferSelected ? 'selected' : 'pending'}
                                            title={transferSelected ? 'Private Transfers' : 'Add Transfers'}
                                            description={transferSelected ? 'Airport Pickup & Drop + Inter-city' : 'Include cab services'}
                                            price={transferSelected ? TRANSFER_ESTIMATE : undefined}
                                            details={transferSelected ? {
                                                duration: 'Full Trip Coverage'
                                            } : undefined}
                                            onAction={() => setTransferSelected(!transferSelected)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Confidence Boost */}
                        <div className="mt-12 mb-8 border-t border-gray-200 pt-8">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 text-center">Why book with us?</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex flex-col items-center text-center gap-2 group">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-100 transition-colors">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm">Verified & Secure</h4>
                                    <p className="text-xs text-gray-500">Curated packages & 100% secure payments</p>
                                </div>
                                <div className="flex flex-col items-center text-center gap-2 group">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-full group-hover:bg-green-100 transition-colors">
                                        <CheckCircle className="h-6 w-6" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm">Flexible & Transparent</h4>
                                    <p className="text-xs text-gray-500">Customizable plans with no hidden fees</p>
                                </div>
                                <div className="flex flex-col items-center text-center gap-2 group">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-full group-hover:bg-purple-100 transition-colors">
                                        <Headphones className="h-6 w-6" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm">24/7 Expert Support</h4>
                                    <p className="text-xs text-gray-500">Instant confirmation & dedicated assistance</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Trip Cart (Sticky) */}
                    <div className="lg:col-span-4 xl:col-span-3">
                        <div className="sticky top-8">
                            <div className="relative">
                                {/* Decorative elements behind cart */}
                                <div className="absolute inset-x-0 -top-10 -bottom-10 bg-gradient-to-b from-blue-50 to-transparent rounded-3xl -z-10 translate-y-4"></div>
                                <TripCart
                                    basePrice={session.price_per_person || 18000}
                                    travelers={session.travelers}
                                    duration={{ days: session.duration_days, nights: session.duration_nights }}
                                    services={[
                                        ...(selectedOnwardFlight ? [{ name: 'Onward Flight', price: selectedOnwardFlight.price * (travelers.adults + travelers.children) }] : []),
                                        ...(selectedReturnFlight ? [{ name: 'Return Flight', price: selectedReturnFlight.price * (travelers.adults + travelers.children) }] : []),
                                        ...(hotelSelected ? [{ name: 'Hotel Upgrade', price: HOTEL_ESTIMATE * (travelers.adults + travelers.children) }] : []),
                                        ...(transferSelected ? [{ name: 'Private Transfers', price: TRANSFER_ESTIMATE * (travelers.adults + travelers.children) }] : [])
                                    ]}
                                    onCheckout={handleCheckout}
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
