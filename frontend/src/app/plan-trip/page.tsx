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
import { MapPin, Calendar as CalendarIcon, Users, Sparkles, Loader2, Plane, Hotel, Car, ChevronRight, ChevronLeft, CheckCircle2, Clock, User, Baby } from 'lucide-react'
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
            {/* Hero Section */}
            <div className="relative bg-blue-900 text-white overflow-hidden shadow-md z-10 min-h-[240px] md:min-h-[300px] flex items-end">
                {/* Background Image Overlay */}
                <div
                    className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
                    style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2021&q=80")' }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-0" />

                <div className="container mx-auto px-4 relative z-10 pt-16 pb-24">
                    <div className="flex flex-col items-start max-w-2xl">
                        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                            <Sparkles className="h-4 w-4 text-yellow-300" />
                            <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">AI Trip Planner</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 md:mb-4 leading-tight">
                            Plan Your Perfect Trip
                        </h1>
                        <p className="text-lg md:text-xl text-blue-100 font-light opacity-90 leading-relaxed max-w-xl">
                            Create your custom itinerary in seconds.
                        </p>
                    </div>
                </div>
            </div>

            {/* Planning Form Container */}
            <div className="container mx-auto px-4 -mt-12 relative z-20 pb-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Stepper Component */}
                    {/* Stepper Component - Pill Style */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 p-6 border border-white relative overflow-hidden">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10 pointer-events-none"></div>

                        {/* Progress Text */}
                        <div className="flex justify-between items-end mb-6 px-2">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                                        {currentStep}
                                    </span>
                                    {steps[currentStep - 1].title}
                                </h2>
                                <p className="text-blue-500/80 font-medium text-sm mt-1 ml-10">
                                    Step {currentStep} of {steps.length} — {steps[currentStep - 1].description}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 md:gap-4 overflow-x-auto md:overflow-visible no-scrollbar pb-2 md:pb-0">
                            {steps.map((step, index) => {
                                const isCompleted = currentStep > step.number;
                                const isActive = currentStep === step.number;
                                const isInteractive = currentStep > step.number; // Allow clicking back

                                return (
                                    <div
                                        key={step.number}
                                        onClick={() => {
                                            if (isInteractive) setCurrentStep(step.number);
                                        }}
                                        className={`
                                            flex-1 min-w-[200px] md:min-w-0 flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all duration-500 ease-out relative group overflow-hidden
                                            ${isActive
                                                ? 'border-blue-500 bg-blue-50/50 shadow-[0_4px_20px_-2px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/30 translate-y-[-2px]'
                                                : isCompleted
                                                    ? 'border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-md cursor-pointer'
                                                    : 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed opacity-70'
                                            }
                                        `}
                                    >
                                        {/* Number Badge */}
                                        <div className={`
                                            w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-500 shrink-0 relative z-10
                                            ${isActive
                                                ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 scale-110'
                                                : isCompleted
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-slate-200 text-slate-400'
                                            }
                                        `}>
                                            {isCompleted ? <CheckCircle2 className="h-5 w-5 animate-in zoom-in duration-300" /> : step.number}
                                        </div>

                                        {/* Text Content */}
                                        <div className="flex flex-col relative z-10">
                                            <span className={`
                                                text-sm font-bold transition-colors duration-300 leading-tight mb-0.5
                                                ${isActive ? 'text-blue-900' : isCompleted ? 'text-blue-900/80' : 'text-slate-400'}
                                            `}>
                                                {step.title}
                                            </span>
                                            <span className={`
                                                text-[10px] font-bold uppercase tracking-wider transition-colors duration-300
                                                ${isActive ? 'text-blue-600' : isCompleted ? 'text-blue-400' : 'text-slate-300'}
                                            `}>
                                                {isActive ? (
                                                    <span className="animate-pulse">In Progress</span>
                                                ) : isCompleted ? (
                                                    'Completed'
                                                ) : (
                                                    'Upcoming'
                                                )}
                                            </span>
                                        </div>

                                        {/* Active Glow Overlay */}
                                        {isActive && (
                                            <>
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-transparent z-0" />
                                                <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-400/20 rounded-full blur-2xl animate-pulse" />
                                            </>
                                        )}
                                    </div>
                                );
                            })}
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
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <div className="relative group">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                                            <div className="relative">
                                                <Input
                                                    id="destination"
                                                    placeholder=" "
                                                    value={destination}
                                                    onChange={(e) => {
                                                        setDestination(e.target.value)
                                                        fetchSuggestions(e.target.value)
                                                        setShowSuggestions(true)
                                                    }}
                                                    onFocus={() => setShowSuggestions(true)}
                                                    className="pl-12 pt-6 pb-2 h-14 w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all shadow-sm peer text-base"
                                                    autoFocus
                                                />
                                                <Label
                                                    htmlFor="destination"
                                                    className="absolute left-12 top-2.5 text-gray-500 text-xs font-medium transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base pointer-events-none"
                                                >
                                                    Where do you want to go? <span className="text-red-500">*</span>
                                                </Label>
                                            </div>

                                            {showSuggestions && suggestions.length > 0 && (
                                                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto p-1">
                                                    {suggestions.map((s, i) => (
                                                        <div
                                                            key={i}
                                                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between rounded-xl transition-colors group/item"
                                                            onClick={() => {
                                                                setDestination(s.value)
                                                                setShowSuggestions(false)
                                                                setSuggestions([])
                                                                fetchDurations(s.value)
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-blue-50 p-2 rounded-full group-hover/item:bg-blue-100 transition-colors">
                                                                    <MapPin className="h-4 w-4 text-blue-500" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-sm text-gray-800">{s.label}</div>
                                                                    <div className="text-xs text-gray-500 capitalize">{s.type}</div>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover/item:text-blue-400" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 pl-4 pt-1">
                                            Enter a city or country e.g., Tokyo, Paris, Bali...
                                        </p>
                                    </div>

                                    {/* Trip Type */}
                                    <div className="relative group">
                                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                                        <Select value={category} onValueChange={setCategory}>
                                            <SelectTrigger className="pl-12 pt-6 pb-2 h-14 w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all shadow-sm text-left">
                                                <div className="absolute left-12 top-2.5 text-xs text-gray-500 font-medium">Trip Type</div>
                                                <SelectValue placeholder="Select style" />
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
                            {/* Step 2: Duration & Dates */}
                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="relative group">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
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
                                                <SelectTrigger className="pl-12 pt-6 pb-2 h-14 w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all shadow-sm text-left">
                                                    <div className="absolute left-12 top-2.5 text-xs text-gray-500 font-medium">Duration (Days) <span className="text-red-500">*</span></div>
                                                    <SelectValue placeholder={durationLoading ? "Loading..." : "Select days"} />
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
                                                            {durationLoading ? "Loading..." : "No packages found"}
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="relative group">
                                            <Hotel className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                                            <Select value={durationNights} onValueChange={setDurationNights}>
                                                <SelectTrigger className="pl-12 pt-6 pb-2 h-14 w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all shadow-sm text-left">
                                                    <div className="absolute left-12 top-2.5 text-xs text-gray-500 font-medium">Duration (Nights) <span className="text-red-500">*</span></div>
                                                    <SelectValue placeholder="Select nights" />
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

                                    <div className="relative group">
                                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={`pl-12 pt-6 pb-2 h-14 w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all shadow-sm text-left justify-start font-normal hover:bg-white hover:text-black ${!startDate ? 'text-muted-foreground' : ''}`}
                                                >
                                                    <div className="absolute left-12 top-2.5 text-xs text-gray-500 font-medium">Start Date <span className="text-red-500">*</span></div>
                                                    <span className="mt-1">{startDate ? format(startDate, 'PPP') : 'Pick a date'}</span>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
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
                                                        return false
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <p className="text-xs text-gray-400 pl-4 pt-1">
                                            Select when you want to start your trip
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Travelers */}
                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                        <Users className="h-5 w-5 text-blue-500" />
                                        Who is traveling?
                                    </h3>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                                            <Select value={adults} onValueChange={setAdults}>
                                                <SelectTrigger className="pl-12 pt-6 pb-2 h-14 w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all shadow-sm text-left">
                                                    <div className="absolute left-12 top-2.5 text-xs text-gray-500 font-medium">Adults <span className="text-red-500">*</span></div>
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

                                        <div className="relative group">
                                            <Baby className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                                            <Select value={children} onValueChange={setChildren}>
                                                <SelectTrigger className="pl-12 pt-6 pb-2 h-14 w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all shadow-sm text-left">
                                                    <div className="absolute left-12 top-2.5 text-xs text-gray-500 font-medium">Children</div>
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

                                        <div className="relative group">
                                            <Baby className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10 opacity-70" />
                                            <Select value={infants} onValueChange={setInfants}>
                                                <SelectTrigger className="pl-12 pt-6 pb-2 h-14 w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all shadow-sm text-left">
                                                    <div className="absolute left-12 top-2.5 text-xs text-gray-500 font-medium">Infants (0-2 yrs)</div>
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
                                    <p className="text-xs text-gray-400 pl-1">
                                        Specify the number of travelers to find the best accommodation options.
                                    </p>
                                </div>
                            )}

                            {/* Step 4: Customize Services */}
                            {/* Step 4: Customize Services */}
                            {currentStep === 4 && (
                                <div className="space-y-6">
                                    <div className="text-center md:text-left">
                                        <h3 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2 mb-2 text-gray-900">
                                            <Sparkles className="h-5 w-5 text-blue-500" />
                                            Customize Your Experience
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Select the services you'd like to add to your itinerary.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Flights Card */}
                                        <div
                                            onClick={() => setIncludeFlights(!includeFlights)}
                                            className={`
                                                relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer group
                                                ${includeFlights
                                                    ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10'
                                                    : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-md'
                                                }
                                            `}
                                        >
                                            <div className="p-5 flex items-start gap-4">
                                                <div className={`
                                                    p-3 rounded-xl transition-colors
                                                    ${includeFlights ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'}
                                                `}>
                                                    <Plane className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <h4 className={`font-bold text-lg ${includeFlights ? 'text-blue-900' : 'text-gray-900'}`}>
                                                            Flights
                                                        </h4>
                                                        <div className={`
                                                            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                                            ${includeFlights ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 bg-transparent'}
                                                        `}>
                                                            {includeFlights && <CheckCircle2 className="h-4 w-4" />}
                                                        </div>
                                                    </div>
                                                    <p className={`text-sm ${includeFlights ? 'text-blue-700' : 'text-gray-500'}`}>
                                                        Find and book the best flights matching your itinerary dates.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Expandable Content for Flights */}
                                            <div className={`
                                                transition-all duration-500 ease-in-out border-t border-blue-200/50
                                                ${includeFlights ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 border-none'}
                                            `}>
                                                <div className="p-5 pt-4 bg-blue-100/50">
                                                    <div className="relative group">
                                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 z-10" />
                                                        <Input
                                                            onClick={(e) => e.stopPropagation()} // Prevent card toggle
                                                            placeholder="Where are you flying from? (e.g., JFK)"
                                                            value={departureLocation}
                                                            onChange={(e) => setDepartureLocation(e.target.value)}
                                                            className="pl-10 h-12 bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 text-blue-900 placeholder:text-blue-300"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hotels Card */}
                                        <div
                                            onClick={() => setIncludeHotels(!includeHotels)}
                                            className={`
                                                relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer group
                                                ${includeHotels
                                                    ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10'
                                                    : 'border-gray-100 bg-white hover:border-emerald-200 hover:shadow-md'
                                                }
                                            `}
                                        >
                                            <div className="p-5 flex items-start gap-4">
                                                <div className={`
                                                    p-3 rounded-xl transition-colors
                                                    ${includeHotels ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200'}
                                                `}>
                                                    <Hotel className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-3">
                                                            <h4 className={`font-bold text-lg ${includeHotels ? 'text-emerald-900' : 'text-gray-900'}`}>
                                                                Hotels
                                                            </h4>
                                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                                Coming Soon
                                                            </span>
                                                        </div>
                                                        <div className={`
                                                            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                                            ${includeHotels ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 bg-transparent'}
                                                        `}>
                                                            {includeHotels && <CheckCircle2 className="h-4 w-4" />}
                                                        </div>
                                                    </div>
                                                    <p className={`text-sm ${includeHotels ? 'text-emerald-700' : 'text-gray-500'}`}>
                                                        Get recommendations for top-rated stays.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transfers Card */}
                                        <div
                                            onClick={() => setIncludeTransfers(!includeTransfers)}
                                            className={`
                                                relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer group
                                                ${includeTransfers
                                                    ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/10'
                                                    : 'border-gray-100 bg-white hover:border-orange-200 hover:shadow-md'
                                                }
                                            `}
                                        >
                                            <div className="p-5 flex items-start gap-4">
                                                <div className={`
                                                    p-3 rounded-xl transition-colors
                                                    ${includeTransfers ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600 group-hover:bg-orange-200'}
                                                `}>
                                                    <Car className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-3">
                                                            <h4 className={`font-bold text-lg ${includeTransfers ? 'text-orange-900' : 'text-gray-900'}`}>
                                                                Transfers
                                                            </h4>
                                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                                                Coming Soon
                                                            </span>
                                                        </div>
                                                        <div className={`
                                                            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                                            ${includeTransfers ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-transparent'}
                                                        `}>
                                                            {includeTransfers && <CheckCircle2 className="h-4 w-4" />}
                                                        </div>
                                                    </div>
                                                    <p className={`text-sm ${includeTransfers ? 'text-orange-700' : 'text-gray-500'}`}>
                                                        Seamless airport and city transfers.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                                {currentStep > 1 ? (
                                    <Button
                                        variant="ghost"
                                        onClick={handleBack}
                                        disabled={loading}
                                        className="text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 transition-colors pl-0 hover:pl-2"
                                    >
                                        <ChevronLeft className="mr-2 h-4 w-4" />
                                        Back
                                    </Button>
                                ) : (
                                    <div></div> /* Spacer for alignment */
                                )}

                                <Button
                                    onClick={currentStep === 4 ? handleStartPlanning : handleContinue}
                                    disabled={loading}
                                    className={`
                                        h-14 px-8 text-base font-semibold rounded-xl transition-all duration-300 shadow-lg hover:-translate-y-1 hover:shadow-xl
                                        ${currentStep === 4
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40 min-w-[200px]'
                                            : 'bg-gray-900 hover:bg-black text-white shadow-gray-900/10 hover:shadow-gray-900/20'
                                        }
                                    `}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Building Itinerary...
                                        </>
                                    ) : (
                                        <>
                                            {currentStep === 1 && "Choose Dates"}
                                            {currentStep === 2 && "Add Travelers"}
                                            {currentStep === 3 && "Customize Trip"}
                                            {currentStep === 4 && "Generate My Plan"}
                                            {currentStep === 4 ? (
                                                <Sparkles className="ml-2 h-5 w-5 fill-white/20 text-white animate-pulse" />
                                            ) : (
                                                <ChevronRight className="ml-2 h-5 w-5" />
                                            )}
                                        </>
                                    )}
                                </Button>
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
