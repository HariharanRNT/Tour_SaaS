'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, MapPin, Calendar, Users, Sparkles, Plus, Trash2, CheckCircle, ShieldCheck, Headphones, Clock, Wallet, Save, Plane, Hotel, Camera, Car, Download, Bot } from 'lucide-react'
import { getValidImageUrl } from '@/lib/utils/image'
import { formatDate } from '@/lib/utils'
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
        <div className="min-h-screen bg-gray-50 pb-32 font-sans">
            {/* Hero Section */}
            <div className="relative h-[65vh] w-full bg-cover bg-center overflow-hidden flex items-end pb-24 group">
                {/* Background Image & Overlay */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[3s] group-hover:scale-105"
                    style={{
                        backgroundImage: `url('${getValidImageUrl(session.destination_image || '/images/default-destination.jpg')}')`,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent z-10" />

                <div className="container mx-auto px-4 relative z-20">
                    <div className="max-w-4xl space-y-6">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/40 backdrop-blur-md px-4 py-1.5 text-sm font-semibold tracking-wide shadow-sm">
                                <MapPin className="h-4 w-4 mr-1.5" />
                                {session.trip_type}
                            </Badge>
                            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 px-4 py-1.5 text-sm font-bold shadow-lg shadow-orange-500/20">
                                <Sparkles className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
                                AI Optimized Itinerary
                            </Badge>
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.1] drop-shadow-2xl tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                            Trip to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">{session.destination}</span>
                        </h1>

                        {/* Trip Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="flex items-center gap-3 text-white">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Calendar className="h-5 w-5 md:h-6 md:w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-200 font-bold uppercase tracking-wider">Dates</p>
                                        <p className="font-semibold text-sm md:text-base whitespace-nowrap">{formatDate(session.start_date)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="flex items-center gap-3 text-white">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Clock className="h-5 w-5 md:h-6 md:w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-200 font-bold uppercase tracking-wider">Duration</p>
                                        <p className="font-semibold text-sm md:text-base">{session.duration_days} Days / {session.duration_nights} Nights</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="flex items-center gap-3 text-white">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Users className="h-5 w-5 md:h-6 md:w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-200 font-bold uppercase tracking-wider">Travelers</p>
                                        <p className="font-semibold text-sm md:text-base">{travelers.adults + travelers.children + travelers.infants} Travelers</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="flex items-center gap-3 text-white">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Wallet className="h-5 w-5 md:h-6 md:w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-200 font-bold uppercase tracking-wider">Budget</p>
                                        <p className="font-semibold text-sm md:text-base">{session.budget} Tier</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button Floating */}
                <div className="absolute top-6 right-6 z-30">
                    <Button
                        id="save-btn"
                        className={`
                            bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-xl
                            ${success ? 'bg-emerald-500/80 hover:bg-emerald-600/80 text-white border-transparent' : ''}
                        `}
                        onClick={saveItinerary}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : success ? <CheckCircle className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        <span className="font-semibold">{saving ? 'Saving...' : success ? 'Saved!' : 'Save Trip'}</span>
                    </Button>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-16 pb-24 relative z-30">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-12">

                        {/* AI Summary Banner */}
                        <div className="bg-gradient-to-br from-violet-50 via-fuchsia-50 to-white p-8 rounded-[2rem] shadow-sm border border-violet-100/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 transition-transform duration-700 group-hover:scale-110" />
                            <div className="flex flex-col md:flex-row gap-6 relative z-10">
                                <div className="shrink-0 flex items-start">
                                    <div className="p-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl text-white shadow-lg shadow-violet-500/30 ring-4 ring-white">
                                        <Sparkles className="h-8 w-8 animate-pulse" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-700 to-fuchsia-700">
                                        Your Personalized AI Itinerary
                                    </h3>
                                    <p className="text-gray-700 leading-relaxed text-lg">
                                        We've crafted this {session.duration_days}-day journey through <span className="font-semibold text-violet-700">{session.destination}</span> based on your love for <span className="font-semibold text-violet-700">{session.trip_type}</span> experiences.
                                    </p>
                                    <div className="flex flex-wrap gap-3 pt-1">
                                        <Badge variant="outline" className="bg-white/60 border-violet-200 text-violet-700 hover:bg-violet-50">✨ Perfectly Paced</Badge>
                                        <Badge variant="outline" className="bg-white/60 border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50">📍 Top Rated Spots</Badge>
                                        <Badge variant="outline" className="bg-white/60 border-blue-200 text-blue-700 hover:bg-blue-50">💎 Local Gems</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trip Overview Cards */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                                <h2 className="text-2xl font-bold text-gray-900">Trip Overview</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { icon: <Plane className="h-8 w-8" />, label: "Flights", desc: "Best connections", color: "blue" },
                                    { icon: <Hotel className="h-8 w-8" />, label: "Hotels", desc: "4★ & 5★ stays", color: "emerald" },
                                    { icon: <Camera className="h-8 w-8" />, label: "Activities", desc: "Curated experiences", color: "amber" },
                                    { icon: <Car className="h-8 w-8" />, label: "Transfers", desc: "Private cabs", color: "purple" }
                                ].map((item, i) => (
                                    <Card key={i} className="border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-white group cursor-pointer rounded-2xl overflow-hidden ring-1 ring-gray-100 hover:ring-2 hover:ring-blue-100">
                                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                                            <div className={`p-4 rounded-full bg-${item.color}-50 text-${item.color}-600 group-hover:scale-110 transition-transform duration-300 group-hover:bg-${item.color}-100`}>
                                                {item.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg mb-1">{item.label}</h3>
                                                <p className="text-sm text-gray-500 font-medium">{item.desc}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>

                        <div className="border-t border-gray-100"></div>

                        {/* Itinerary Tabs - Clean & Modern */}
                        <section>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                                    <h2 className="text-3xl font-bold text-gray-900">Day-by-Day Journey</h2>
                                </div>
                                <Button variant="outline" className="rounded-full border-gray-200 hover:bg-gray-50 text-gray-600 gap-2">
                                    <Download className="h-4 w-4" /> Download PDF
                                </Button>
                            </div>

                            <Tabs value={currentDay.toString()} onValueChange={(v) => setCurrentDay(parseInt(v))} className="w-full">
                                <TabsList className="mb-8 w-full flex justify-start overflow-x-auto bg-transparent p-2 gap-3 scrollbar-hide h-auto">
                                    {itinerary.map((day) => (
                                        <TabsTrigger
                                            key={day.day_number}
                                            value={day.day_number.toString()}
                                            className="
                                                px-6 py-3 rounded-full border border-gray-200 bg-white min-w-[100px]
                                                data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:border-gray-900 data-[state=active]:shadow-lg 
                                                text-gray-600 font-semibold
                                                hover:border-gray-300 transition-all duration-300
                                            "
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
                                        />
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </section>

                        <div className="border-t border-gray-100"></div>

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
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Onward Journey
                                        </h3>
                                        {selectedOnwardFlight ? (
                                            <div className="hover:shadow-2xl transition-all duration-300 rounded-[1.5rem] bg-white ring-1 ring-gray-100 overflow-hidden group">
                                                <div className="p-1">
                                                    <FlightCard
                                                        flight={selectedOnwardFlight}
                                                        isSelected={true}
                                                        onSelect={() => { }}
                                                    />
                                                    <div className="border-t border-dashed border-gray-100 p-2 flex justify-center">
                                                        <Dialog open={isOnwardModalOpen} onOpenChange={setIsOnwardModalOpen}>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full mb-1">
                                                                    Change Onward Flight
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
                                                                <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
                                                                    <DialogTitle>Select Onward Flight</DialogTitle>
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
                                            </div>
                                        ) : (
                                            <Card className="min-h-[200px] flex items-center justify-center border-dashed border-2 border-gray-200 shadow-none bg-gray-50">
                                                <div className="flex flex-col items-center gap-3 text-gray-400">
                                                    {loadingFlights ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plane className="h-8 w-8 opacity-20" />}
                                                    <p className="font-medium text-sm">{loadingFlights ? "Finding best flights..." : "No onward flights"}</p>
                                                </div>
                                            </Card>
                                        )}
                                    </div>

                                    {returnFlights.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Return Journey
                                            </h3>
                                            {selectedReturnFlight ? (
                                                <div className="hover:shadow-2xl transition-all duration-300 rounded-[1.5rem] bg-white ring-1 ring-gray-100 overflow-hidden group">
                                                    <div className="p-1">
                                                        <FlightCard
                                                            flight={selectedReturnFlight}
                                                            isSelected={true}
                                                            onSelect={() => { }}
                                                        />
                                                        <div className="border-t border-dashed border-gray-100 p-2 flex justify-center">
                                                            <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full mb-1">
                                                                        Change Return Flight
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
                                                </div>
                                            ) : (
                                                <Card className="min-h-[200px] flex items-center justify-center border-dashed border-2 border-gray-200 shadow-none bg-gray-50">
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


                        {/* Add-ons Section - Enhanced Cards */}
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
                                        />
                                    </div>
                                </div>
                            )}
                        </section>


                        {/* Footer Confidence Boost - Redesigned */}
                        <div className="mt-16 mb-8 pt-12 border-t border-gray-100">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-10 text-center">Why book with RNT Tour?</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="flex flex-col items-center text-center gap-4 group">
                                    <div className="p-5 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:shadow-blue-200">
                                        <ShieldCheck className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg mb-1">Verified & Secure</h4>
                                        <p className="text-sm text-gray-500 leading-relaxed">Curated packages & 100% secure payments via reliable gateways.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center text-center gap-4 group">
                                    <div className="p-5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:shadow-emerald-200">
                                        <CheckCircle className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg mb-1">Flexible & Transparent</h4>
                                        <p className="text-sm text-gray-500 leading-relaxed">Customizable plans with absolutely no hidden fees.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center text-center gap-4 group">
                                    <div className="p-5 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:shadow-violet-200">
                                        <Headphones className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg mb-1">24/7 Expert Support</h4>
                                        <p className="text-sm text-gray-500 leading-relaxed">Instant confirmation & dedicated assistance throughout your trip.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Trip Cart (Sticky) */}
                    <div className="lg:col-span-4 xl:col-span-3">
                        <div className="sticky top-8">
                            <div className="relative">
                                {/* Decorative elements behind cart */}
                                <div className="absolute inset-x-4 -top-6 -bottom-6 bg-blue-50/50 rounded-[2.5rem] -z-10 blur-xl"></div>
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
