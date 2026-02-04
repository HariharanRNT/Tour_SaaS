'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { MapPin, Calendar as CalendarIcon, Users, Sparkles, Loader2, Plane, Hotel, Car, ChevronRight, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from "react-toastify"
import { Skeleton } from "@/components/ui/skeleton"

export default function PlanTripPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Form data
    const [destination, setDestination] = useState('')
    const [durationDays, setDurationDays] = useState('7')
    const [durationNights, setDurationNights] = useState('6')
    const [startDate, setStartDate] = useState<Date>()
    const [adults, setAdults] = useState('2')
    const [children, setChildren] = useState('0')
    const [infants, setInfants] = useState('0')
    const [category, setCategory] = useState('')
    const [includeFlights, setIncludeFlights] = useState(false)
    const [includeHotels, setIncludeHotels] = useState(false)
    const [includeTransfers, setIncludeTransfers] = useState(false)
    const [departureLocation, setDepartureLocation] = useState('')
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    const [availableDurations, setAvailableDurations] = useState<number[]>([])
    const [durationLoading, setDurationLoading] = useState(false)
    const [availableDateRanges, setAvailableDateRanges] = useState<{ from: string, to: string }[]>([])
    const [suggestions, setSuggestions] = useState<{ label: string, value: string, type: string }[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)

    // Handle pre-filled destination from Popular Destinations
    useEffect(() => {
        const destParam = searchParams.get('destination')
        if (destParam) {
            setDestination(destParam)
            // Skip directly to Step 2: Duration & Dates
            setCurrentStep(2)
            // Fetch configuration for the selected destination
            fetchDurations(destParam)
        }
    }, [searchParams])

    const fetchDurations = async (dest: string) => {
        setDurationLoading(true)
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Domain': domain
            }
            if (token) headers['Authorization'] = `Bearer ${token}`

            const res = await fetch(`http://localhost:8000/api/v1/packages/config/durations?destination=${encodeURIComponent(dest)}`, {
                headers: headers
            })
            if (res.ok) {
                const data = await res.json()
                setAvailableDurations(data)

                // If data found, pick first as default and fetch dates for it
                let selectedDuration = durationDays;
                if (data.length > 0 && !data.includes(parseInt(durationDays))) {
                    selectedDuration = data[0].toString()
                    setDurationDays(selectedDuration)
                    setDurationNights((data[0] - 1).toString())
                }

                // Fetch dates for the (potentially new) duration
                if (selectedDuration) {
                    await fetchDates(dest, parseInt(selectedDuration))
                }
            } else {
                setAvailableDurations([])
                setAvailableDateRanges([])
            }
        } catch (error) {
            console.error("Failed to fetch durations", error)
        } finally {
            setDurationLoading(false)
        }
    }

    const fetchDates = async (dest: string, duration: number) => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Domain': domain
            }
            if (token) headers['Authorization'] = `Bearer ${token}`

            const res = await fetch(`http://localhost:8000/api/v1/packages/config/dates?destination=${encodeURIComponent(dest)}&duration_days=${duration}`, {
                headers: headers
            })
            if (res.ok) {
                const data = await res.json()
                setAvailableDateRanges(data)
            } else {
                setAvailableDateRanges([])
            }
        } catch (error) {
            console.error("Failed to fetch dates", error)
        }
    }

    const fetchSuggestions = async (q: string) => {
        if (q.length < 1) {
            setSuggestions([])
            return
        }
        try {
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const res = await fetch(`http://localhost:8000/api/v1/packages/config/suggestions?q=${encodeURIComponent(q)}`, {
                headers: { 'X-Domain': domain }
            })
            if (res.ok) {
                const data = await res.json()
                setSuggestions(data)
            }
        } catch (error) {
            console.error("Failed to fetch suggestions", error)
        }
    }

    const handleContinue = async () => {
        if (currentStep === 1) {
            if (!destination) {
                toast.error("Destination Required: Please enter your destination")
                return
            }
            // Fetch durations (and dates) before moving to next step
            await fetchDurations(destination)
        }

        if (currentStep === 2 && (!durationDays || !durationNights || !startDate)) {
            toast.error("Incomplete Details: Please fill in duration and start date")
            return
        }
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleStartPlanning = async () => {
        if (includeFlights && !departureLocation) {
            toast.error("Departure Location Required: Please enter your departure location for flights")
            return
        }

        setLoading(true)

        try {
            // Get token if user is logged in
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const response = await fetch('http://localhost:8000/api/v1/trip-planner/create-session', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    destination,
                    duration_days: parseInt(durationDays),
                    duration_nights: parseInt(durationNights),
                    start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
                    travelers: {
                        adults: parseInt(adults),
                        children: parseInt(children),
                        infants: parseInt(infants)
                    },
                    preferences: {
                        category: category || undefined,
                        include_flights: includeFlights,
                        include_hotels: includeHotels,
                        include_transfers: includeTransfers,
                        departure_location: includeFlights ? departureLocation : undefined
                    }
                })
            })

            if (response.ok) {
                const session = await response.json()
                router.push(`/plan-trip/build?session=${session.session_id}`)
            } else {
                const error = await response.json()
                toast.error(`Error: ${error.detail || 'Failed to create session'}`)
            }
        } catch (error) {
            console.error('Failed to create session:', error)
            toast.error("Connection Error: Failed to create planning session")
        } finally {
            setLoading(false)
        }
    }

    const steps = [
        { number: 1, title: 'Destination', description: 'Where do you want to go?' },
        { number: 2, title: 'Duration & Dates', description: 'When and how long?' },
        { number: 3, title: 'Travelers', description: 'Who is traveling?' },
        { number: 4, title: 'Customize', description: 'Additional services' }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            {/* Header */}
            <div className="relative bg-blue-900 text-white py-20 overflow-hidden">
                {/* Background Image Overlay */}
                <div
                    className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
                    style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2021&q=80")' }}
                />
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-block p-3 rounded-full bg-white/10 backdrop-blur-sm mb-6">
                            <Sparkles className="h-12 w-12 text-yellow-300" />
                        </div>
                        <h1 className="text-5xl font-bold mb-6 tracking-tight">Plan Your Perfect Trip</h1>
                        <p className="text-xl text-blue-100 leading-relaxed font-light">
                            Tell us where you want to go, and we'll help you create the perfect itinerary tailored just for you.
                        </p>
                    </div>
                </div>
            </div>

            {/* Planning Form */}
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-3xl mx-auto">
                    {/* Progress Steps */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center">
                            {steps.map((step, index) => (
                                <div key={step.number} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= step.number
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            {step.number}
                                        </div>
                                        <div className="text-center mt-2">
                                            <div className={`text-sm font-semibold ${currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
                                                }`}>
                                                {step.title}
                                            </div>
                                            <div className="text-xs text-gray-500 hidden md:block">
                                                {step.description}
                                            </div>
                                        </div>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`h-1 flex-1 mx-2 ${currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                                            }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step Content */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{steps[currentStep - 1].title}</CardTitle>
                            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Step 1: Destination */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="destination" className="text-lg font-semibold">
                                            <MapPin className="inline h-5 w-5 mr-2" />
                                            Where do you want to go? <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="destination"
                                                placeholder="e.g., Tokyo, Paris, Bali..."
                                                value={destination}
                                                onChange={(e) => {
                                                    setDestination(e.target.value)
                                                    fetchSuggestions(e.target.value)
                                                    setShowSuggestions(true)
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                                className="text-lg"
                                                autoFocus
                                            />
                                            {showSuggestions && suggestions.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {suggestions.map((s, i) => (
                                                        <div
                                                            key={i}
                                                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b last:border-0"
                                                            onClick={() => {
                                                                setDestination(s.value)
                                                                setShowSuggestions(false)
                                                                setSuggestions([])
                                                                fetchDurations(s.value)
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <MapPin className="h-4 w-4 text-blue-500" />
                                                                <div>
                                                                    <div className="font-semibold text-sm">{s.label}</div>
                                                                    <div className="text-xs text-gray-500 capitalize">{s.type}</div>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="h-4 w-4 text-gray-300" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            Enter a city or country name
                                        </p>
                                    </div>

                                    {/* Trip Type */}
                                    <div className="space-y-2">
                                        <Label htmlFor="category">Trip Type (Optional)</Label>
                                        <Select value={category} onValueChange={setCategory}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select trip type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Adventure">Adventure</SelectItem>
                                                <SelectItem value="Relaxation">Relaxation</SelectItem>
                                                <SelectItem value="Cultural">Cultural</SelectItem>
                                                <SelectItem value="Beach">Beach</SelectItem>
                                                <SelectItem value="City">City Break</SelectItem>
                                                <SelectItem value="Nature">Nature & Wildlife</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Duration & Dates */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="duration-days">
                                                Duration - Days <span className="text-red-500">*</span>
                                            </Label>
                                            <Select value={durationDays} onValueChange={(val) => {
                                                setDurationDays(val)
                                                // Auto-calculate nights as days - 1
                                                const days = parseInt(val)
                                                if (days > 1) {
                                                    setDurationNights((days - 1).toString())
                                                }
                                                // Fetch available dates for this duration
                                                if (destination) {
                                                    fetchDates(destination, days)
                                                }
                                            }}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={durationLoading ? "Loading..." : "Select duration"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableDurations.length > 0 ? (
                                                        availableDurations.map(days => (
                                                            <SelectItem key={days} value={days.toString()}>
                                                                {days} Days
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem value="none" disabled>
                                                            {durationLoading ? "Loading..." : "No packages found for this destination"}
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="duration-nights">
                                                Duration - Nights <span className="text-red-500">*</span>
                                            </Label>
                                            <Select value={durationNights} onValueChange={setDurationNights}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(nights => (
                                                        <SelectItem key={nights} value={nights.toString()}>
                                                            {nights} Nights
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>
                                            Start Date <span className="text-red-500">*</span>
                                        </Label>
                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={`w-full justify-start text-left ${!startDate ? 'text-muted-foreground' : ''}`}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={startDate}
                                                    onSelect={(date) => {
                                                        setStartDate(date)
                                                        setIsCalendarOpen(false)
                                                    }}
                                                    disabled={(date) => {
                                                        const today = new Date()
                                                        today.setHours(0, 0, 0, 0)
                                                        if (date < today) return true

                                                        // Filter based on availability from backend
                                                        if (availableDateRanges.length > 0) {
                                                            const dateStr = format(date, 'yyyy-MM-dd')
                                                            // Date must fall within at least one range
                                                            const isAvailable = availableDateRanges.some(range =>
                                                                dateStr >= range.from && dateStr <= range.to
                                                            )
                                                            return !isAvailable
                                                        }

                                                        // Fallback logic could be here (e.g., if no dates returned, maybe block all? or allow all?)
                                                        // Given strict requirement, if fetch happened and returned 0, we should really show nothing,
                                                        // but if it hasn't fetched (e.g. step 1), we shouldn't block.
                                                        // But fetch happens on step 2 entry.
                                                        // If length 0, it means either loading, failed, or no dates.
                                                        // We'll leave it open if no ranges defined to avoid blocking during loading/errors,
                                                        // unless user wants strict blocking.
                                                        return false
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <p className="text-sm text-gray-500">
                                            Select when you want to start your trip
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Travelers */}
                            {currentStep === 3 && (
                                <div className="space-y-4">
                                    <Label className="text-lg font-semibold">
                                        <Users className="inline h-5 w-5 mr-2" />
                                        Who is traveling?
                                    </Label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="adults">
                                                Adults <span className="text-red-500">*</span>
                                            </Label>
                                            <Select value={adults} onValueChange={setAdults}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[1, 2, 3, 4, 5, 6].map(num => (
                                                        <SelectItem key={num} value={num.toString()}>
                                                            {num} {num === 1 ? 'Adult' : 'Adults'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="children">Children</Label>
                                            <Select value={children} onValueChange={setChildren}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[0, 1, 2, 3, 4].map(num => (
                                                        <SelectItem key={num} value={num.toString()}>
                                                            {num} {num === 1 ? 'Child' : 'Children'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="infants">Infants (0-2 yrs)</Label>
                                            <Select value={infants} onValueChange={setInfants}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[0, 1, 2, 3].map(num => (
                                                        <SelectItem key={num} value={num.toString()}>
                                                            {num} {num === 1 ? 'Infant' : 'Infants'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Customize Services */}
                            {currentStep === 4 && (
                                <div className="space-y-4">
                                    <Label className="text-lg font-semibold">
                                        ✈️ Customize Your Trip
                                    </Label>
                                    <p className="text-sm text-gray-500">
                                        Select additional services to include in your itinerary
                                    </p>

                                    {/* Include Flights */}
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                                            <Checkbox
                                                id="include-flights"
                                                checked={includeFlights}
                                                onCheckedChange={(checked) => setIncludeFlights(checked as boolean)}
                                            />
                                            <label
                                                htmlFor="include-flights"
                                                className="text-sm font-medium leading-none cursor-pointer flex items-center flex-1"
                                            >
                                                <Plane className="h-4 w-4 mr-2 text-blue-600" />
                                                Include Flights
                                            </label>
                                        </div>

                                        {includeFlights && (
                                            <div className="ml-6 space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                                                <Label htmlFor="departure-location">
                                                    Where are you flying from? <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="departure-location"
                                                    placeholder="e.g., New York, JFK"
                                                    value={departureLocation}
                                                    onChange={(e) => setDepartureLocation(e.target.value)}
                                                />
                                                <p className="text-xs text-gray-600">
                                                    Enter your departure city or airport
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Include Hotels */}
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                                            <Checkbox
                                                id="include-hotels"
                                                checked={includeHotels}
                                                onCheckedChange={(checked) => setIncludeHotels(checked as boolean)}
                                            />
                                            <label
                                                htmlFor="include-hotels"
                                                className="text-sm font-medium leading-none cursor-pointer flex items-center flex-1"
                                            >
                                                <Hotel className="h-4 w-4 mr-2 text-green-600" />
                                                Include Hotels
                                            </label>
                                        </div>
                                        {includeHotels && (
                                            <div className="ml-6 mr-2 p-3 bg-green-50 rounded-md border border-green-100 text-sm animate-in fade-in slide-in-from-top-2">
                                                <p className="text-green-800 mb-2">
                                                    Hotel recommendations will be included in your itinerary based on your destination and travel dates.
                                                </p>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-200 text-green-800">
                                                    Coming Soon
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Include Transfers */}
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                                            <Checkbox
                                                id="include-transfers"
                                                checked={includeTransfers}
                                                onCheckedChange={(checked) => setIncludeTransfers(checked as boolean)}
                                            />
                                            <label
                                                htmlFor="include-transfers"
                                                className="text-sm font-medium leading-none cursor-pointer flex items-center flex-1"
                                            >
                                                <Car className="h-4 w-4 mr-2 text-orange-600" />
                                                Include Transfers
                                            </label>
                                        </div>
                                        {includeTransfers && (
                                            <div className="ml-6 mr-2 p-3 bg-orange-50 rounded-md border border-orange-100 text-sm animate-in fade-in slide-in-from-top-2">
                                                <p className="text-orange-800 mb-2">
                                                    Airport and city transfers will be included in your itinerary for convenient transportation.
                                                </p>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-200 text-orange-800">
                                                    Coming Soon
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between pt-6 border-t">
                                {currentStep > 1 && (
                                    <Button variant="outline" onClick={handleBack} disabled={loading}>
                                        <ChevronLeft className="mr-2 h-4 w-4" />
                                        Back
                                    </Button>
                                )}

                                {currentStep < 4 ? (
                                    <Button onClick={handleContinue} className="ml-auto">
                                        Continue
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleStartPlanning}
                                        disabled={loading}
                                        className="ml-auto bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Building...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="mr-2 h-5 w-5" />
                                                Start Planning
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>

                            {/* Loading Skeleton Preview */}
                            {loading && (
                                <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center space-x-4">
                                        <Skeleton className="h-12 w-12 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-[250px]" />
                                            <Skeleton className="h-4 w-[200px]" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-[125px] w-full rounded-xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-[80%]" />
                                    </div>
                                    <p className="text-center text-sm text-blue-600 animate-pulse font-medium">
                                        AI is crafting your perfect itinerary...
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Info Cards */}
                    <div className="grid md:grid-cols-3 gap-6 mt-12">
                        <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-none shadow-md bg-white/50 backdrop-blur-sm">
                            <CardContent className="pt-8 pb-8">
                                <div className="text-center">
                                    <div className="text-4xl mb-4 bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">🎯</div>
                                    <h3 className="text-lg font-bold mb-2 text-gray-800">Smart Matching</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Our AI finds the best activities that match your travel style.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-none shadow-md bg-white/50 backdrop-blur-sm">
                            <CardContent className="pt-8 pb-8">
                                <div className="text-center">
                                    <div className="text-4xl mb-4 bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">✏️</div>
                                    <h3 className="text-lg font-bold mb-2 text-gray-800">Full Customization</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Easily add, remove, or modify any activity in your itinerary.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-none shadow-md bg-white/50 backdrop-blur-sm">
                            <CardContent className="pt-8 pb-8">
                                <div className="text-center">
                                    <div className="text-4xl mb-4 bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">💾</div>
                                    <h3 className="text-lg font-bold mb-2 text-gray-800">Save & Book</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Save your plan for later or simple checkout when you're ready.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
