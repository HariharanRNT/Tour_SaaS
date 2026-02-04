'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, MapPin, Calendar, Users, Sparkles, Plus, Trash2, CheckCircle } from 'lucide-react'
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
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Area */}
            <div className="bg-blue-600 text-white pb-32 pt-8">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Build Your Itinerary</h1>
                            <div className="flex items-center gap-4 text-blue-100">
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {session.destination}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {session.duration_days} Days / {session.duration_nights} Nights
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {travelers.adults} Adults, {travelers.children} Children, {travelers.infants} Infants
                                </span>
                            </div>
                        </div>
                        <Button
                            id="save-btn"
                            className="bg-white text-blue-600 hover:bg-blue-50"
                            onClick={saveItinerary}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : success ? <CheckCircle className="h-4 w-4 mr-2" /> : null}
                            {saving ? 'Saving...' : success ? 'Saved!' : 'Save Itinerary'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-24">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Left Column - Modules & Itinerary */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Match Score Banner */}
                        {/* Match Score Banner */}
                        {session.matched_package_id ? (
                            <div className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 text-green-600 rounded-full">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Great match found!</h3>
                                        <p className="text-sm text-gray-500">
                                            We've pre-populated your itinerary based on a curated package. Feel free to customize it!
                                        </p>
                                    </div>
                                </div>
                                {session.match_score > 0 && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                                        Match Score: {Math.round(session.match_score * 100)}%
                                    </Badge>
                                )}
                            </div>
                        ) : (
                            <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4 flex items-center justify-between border-l-4 border-l-red-500">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white text-red-600 rounded-full shadow-sm">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-red-700">No matching package found</h3>
                                        <p className="text-sm text-red-600/90">
                                            We've started a blank itinerary for you. Search and add activities to build your custom trip!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Package Description */}
                        {session.package_description && (
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <h3 className="font-semibold text-gray-900 mb-2">About this Package</h3>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {session.package_description}
                                </p>
                            </div>
                        )}

                        {/* ITINERARY MODULE */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-3">Day-wise Itinerary</h2>
                            <div className="bg-white rounded-xl shadow-sm border p-6">
                                <Tabs value={currentDay.toString()} onValueChange={(v) => setCurrentDay(parseInt(v))} className="w-full">
                                    <TabsList className="mb-6 flex overflow-x-auto justify-start h-auto p-1 bg-gray-100/50 gap-2">
                                        {itinerary.map((day) => (
                                            <TabsTrigger
                                                key={day.day_number}
                                                value={day.day_number.toString()}
                                                className="px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                                            >
                                                Day {day.day_number}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>

                                    {itinerary.map((day) => (
                                        <TabsContent key={day.day_number} value={day.day_number.toString()} className="mt-0">
                                            <DayPlanner
                                                day={day}
                                                onAddActivity={addActivity}
                                                onRemoveActivity={removeActivity}
                                            />
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </div>
                        </div>

                        {/* FLIGHTS MODULE */}
                        {preferences.include_flights && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-xl font-bold text-gray-900">Flights</h2>
                                    {loadingFlights && <Badge variant="outline" className="animate-pulse">Checking live fares...</Badge>}
                                    {flightError && <Badge variant="destructive">{flightError}</Badge>}
                                </div>

                                {/* ONWARD FLIGHT */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Onward Journey</h3>
                                    {selectedOnwardFlight ? (
                                        <div className="relative">
                                            <FlightCard
                                                flight={selectedOnwardFlight}
                                                isSelected={true}
                                                onSelect={() => { }}
                                            />
                                            <div className="absolute top-4 right-4 md:static md:flex md:justify-end md:mt-2">
                                                <Dialog open={isOnwardModalOpen} onOpenChange={setIsOnwardModalOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="bg-white/90 backdrop-blur border-blue-200 text-blue-700 hover:bg-blue-50">
                                                            Change Onward Flight
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                                                        <DialogHeader className="px-6 py-4 border-b">
                                                            <DialogTitle>Select Onward Flight</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="flex flex-1 overflow-hidden">
                                                            {/* Filters Sidebar */}
                                                            <div className="w-64 border-r bg-gray-50 flex-shrink-0 overflow-y-auto p-4 hidden md:block">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <h3 className="font-semibold text-gray-900">Filters</h3>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-auto p-0 text-blue-600 font-normal hover:bg-transparent"
                                                                        onClick={() => setFilters({
                                                                            refundType: 'all',
                                                                            stops: [],
                                                                            dates: [],
                                                                            timeRanges: [],
                                                                            airlines: []
                                                                        })}
                                                                    >
                                                                        Reset
                                                                    </Button>
                                                                </div>
                                                                <FlightFilters
                                                                    filters={filters}
                                                                    onChange={setFilters}
                                                                    availableAirlines={availableAirlines}
                                                                />
                                                            </div>

                                                            {/* Flight List */}
                                                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                                                                <div className="space-y-4">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <span className="text-sm text-gray-500">
                                                                            Found {filteredOnwardFlights.length} flights
                                                                        </span>
                                                                    </div>

                                                                    {filteredOnwardFlights.length === 0 ? (
                                                                        <div className="text-center py-10 bg-white rounded-lg border border-dashed text-gray-500">
                                                                            <p>No flights match your filters.</p>
                                                                            <Button
                                                                                variant="link"
                                                                                onClick={() => setFilters({
                                                                                    refundType: 'all',
                                                                                    stops: [],
                                                                                    dates: [],
                                                                                    timeRanges: [],
                                                                                    airlines: []
                                                                                })}
                                                                            >
                                                                                Clear Filters
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        filteredOnwardFlights.map((flight) => (
                                                                            <FlightCard
                                                                                key={flight.id}
                                                                                flight={flight}
                                                                                isSelected={selectedOnwardFlight.id === flight.id}
                                                                                isBestValue={onwardFlights[0].id === flight.id}
                                                                                onSelect={(f) => {
                                                                                    setSelectedOnwardFlight(f)
                                                                                    setIsOnwardModalOpen(false)
                                                                                }}
                                                                            />
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
                                        !loadingFlights && <div className="text-sm text-gray-500 italic">No onward flights available.</div>
                                    )}
                                </div>

                                {/* RETURN FLIGHT */}
                                {returnFlights.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Return Journey</h3>
                                        {selectedReturnFlight ? (
                                            <div className="relative">
                                                <FlightCard
                                                    flight={selectedReturnFlight}
                                                    isSelected={true}
                                                    onSelect={() => { }}
                                                />
                                                <div className="absolute top-4 right-4 md:static md:flex md:justify-end md:mt-2">
                                                    <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="bg-white/90 backdrop-blur border-blue-200 text-blue-700 hover:bg-blue-50">
                                                                Change Return Flight
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                                                            <DialogHeader className="px-6 py-4 border-b">
                                                                <DialogTitle>Select Return Flight</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="flex flex-1 overflow-hidden">
                                                                {/* Filters Sidebar */}
                                                                <div className="w-64 border-r bg-gray-50 flex-shrink-0 overflow-y-auto p-4 hidden md:block">
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <h3 className="font-semibold text-gray-900">Filters</h3>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-auto p-0 text-blue-600 font-normal hover:bg-transparent"
                                                                            onClick={() => setFilters({
                                                                                refundType: 'all',
                                                                                stops: [],
                                                                                dates: [],
                                                                                timeRanges: [],
                                                                                airlines: []
                                                                            })}
                                                                        >
                                                                            Reset
                                                                        </Button>
                                                                    </div>
                                                                    <FlightFilters
                                                                        filters={filters}
                                                                        onChange={setFilters}
                                                                        availableAirlines={availableAirlines}
                                                                    />
                                                                </div>

                                                                {/* Flight List */}
                                                                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                                                                    <div className="space-y-4">
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <span className="text-sm text-gray-500">
                                                                                Found {filteredReturnFlights.length} flights
                                                                            </span>
                                                                        </div>

                                                                        {filteredReturnFlights.length === 0 ? (
                                                                            <div className="text-center py-10 bg-white rounded-lg border border-dashed text-gray-500">
                                                                                <p>No flights match your filters.</p>
                                                                                <Button
                                                                                    variant="link"
                                                                                    onClick={() => setFilters({
                                                                                        refundType: 'all',
                                                                                        stops: [],
                                                                                        dates: [],
                                                                                        timeRanges: [],
                                                                                        airlines: []
                                                                                    })}
                                                                                >
                                                                                    Clear Filters
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            filteredReturnFlights.map((flight) => (
                                                                                <FlightCard
                                                                                    key={flight.id}
                                                                                    flight={flight}
                                                                                    isSelected={selectedReturnFlight.id === flight.id}
                                                                                    isBestValue={returnFlights[0].id === flight.id}
                                                                                    onSelect={(f) => {
                                                                                        setSelectedReturnFlight(f)
                                                                                        setIsReturnModalOpen(false)
                                                                                    }}
                                                                                />
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
                                            !loadingFlights && <div className="text-sm text-gray-500 italic">No return flights available.</div>
                                        )}
                                    </div>
                                )}

                                {(selectedOnwardFlight || selectedReturnFlight) && (
                                    <p className="text-sm text-green-600 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Flights included in package price
                                    </p>
                                )}
                            </div>
                        )}

                        {/* HOTELS MODULE */}
                        {preferences.include_hotels && (
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-3">Accommodation</h2>
                                <ServiceCard
                                    type="hotel"
                                    status={hotelSelected ? 'selected' : 'pending'}
                                    title={hotelSelected ? 'Luxury Stay' : 'Select Hotel'}
                                    description={hotelSelected ? '5-Star Hotel with Breakfast' : 'Choose where you want to stay'}
                                    price={hotelSelected ? HOTEL_ESTIMATE : undefined}
                                    details={hotelSelected ? {
                                        date: 'Check-in: Day 1',
                                        rating: 4.8
                                    } : undefined}
                                    onAction={() => setHotelSelected(!hotelSelected)}
                                />
                            </div>
                        )}



                        {/* TRANSFERS MODULE */}
                        {preferences.include_transfers && (
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-3">Transfers</h2>
                                <ServiceCard
                                    type="transfer"
                                    status={transferSelected ? 'selected' : 'pending'}
                                    title={transferSelected ? 'Private Transfers' : 'Select Transfers'}
                                    description={transferSelected ? 'Airport Pickup & Drop + Inter-city' : 'Choose transfer options'}
                                    price={transferSelected ? TRANSFER_ESTIMATE : undefined}
                                    details={transferSelected ? {
                                        duration: 'Full Trip Coverage'
                                    } : undefined}
                                    onAction={() => setTransferSelected(!transferSelected)}
                                />
                            </div>
                        )}

                    </div>

                    {/* Right Column - Trip Cart */}
                    <div className="order-first lg:order-last">
                        <TripCart
                            travelers={travelers}
                            basePrice={session.price_per_person || 0}
                            flightPrice={(selectedOnwardFlight?.price || 0) + (selectedReturnFlight?.price || 0)}
                            hotelPrice={hotelSelected ? HOTEL_ESTIMATE : 0}
                            transferPrice={transferSelected ? TRANSFER_ESTIMATE : 0}
                            onCheckout={handleCheckout}
                            disabled={preferences.include_flights && loadingFlights}
                        />
                    </div>

                </div>
            </div>
        </div>
    )
}


