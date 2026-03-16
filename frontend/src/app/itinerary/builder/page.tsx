'use client'

import { useState, useEffect, useRef } from 'react'
import { Activity, ItineraryDay, TimeSlot } from '@/types'
import { toursAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { DestinationSearch } from '@/components/itinerary/DestinationSearch'
import { TripComponentsSelector } from '@/components/itinerary/TripComponentsSelector'
import { TravelDaysSelector } from '@/components/itinerary/TravelDaysSelector'
import { ActivityBrowser } from '@/components/itinerary/ActivityBrowser'
import { DayPlanner, DayItineraryData, Activity as PlannerActivity } from '@/components/itinerary/DayPlanner'
import { ItinerarySummary } from '@/components/itinerary/ItinerarySummary'
import { TimeSlotSelector } from '@/components/itinerary/TimeSlotSelector'
import { ArrowLeft, ArrowRight, Save } from 'lucide-react'

interface LocationInfo {
    city: string
    country: string
    country_code: string
    latitude: number
    longitude: number
    formatted_address: string
}

export default function ItineraryBuilderPage() {
    // Step management
    const [currentStep, setCurrentStep] = useState(1)

    // Destination state
    const [destination, setDestination] = useState('')
    const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null)
    const [loadingActivities, setLoadingActivities] = useState(false)

    // Activities state
    const [activities, setActivities] = useState<Activity[]>([])

    // Itinerary state
    const [numberOfDays, setNumberOfDays] = useState(3)
    const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([])

    // Time slot selector state
    const [showTimeSlotSelector, setShowTimeSlotSelector] = useState(false)
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
    const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null)

    // Trip components state
    const [tripComponents, setTripComponents] = useState<{
        includeFlights: boolean
        includeHotels: boolean
        includeTransfers: boolean
        flightOrigin?: string
    }>({
        includeFlights: false,
        includeHotels: false,
        includeTransfers: false
    })

    // Ref for daily schedule section
    const dailyScheduleRef = useRef<HTMLDivElement>(null)

    // Initialize itinerary days when numberOfDays changes
    useEffect(() => {
        const days: ItineraryDay[] = Array.from({ length: numberOfDays }, (_, i) => ({
            dayNumber: i + 1,
            activities: {}
        }))
        setItineraryDays(days)
    }, [numberOfDays])

    // Handle destination search
    const handleDestinationSearch = async (searchTerm: string) => {
        setLoadingActivities(true)
        try {
            const data = await toursAPI.search(searchTerm, 50)
            setActivities(data.tours || [])
            setLocationInfo(data.location)
            setDestination(searchTerm)
            setCurrentStep(2) // Move to next step
        } catch (error: any) {
            console.error('Failed to load activities:', error)
            alert(error.response?.data?.detail || 'Failed to load activities. Please try another destination.')
        } finally {
            setLoadingActivities(false)
        }
    }

    // Handle adding activity to day
    const handleAddActivityToDay = (activity: Activity) => {
        setSelectedActivity(activity)
        setShowTimeSlotSelector(true)

        // Scroll to daily schedule section
        setTimeout(() => {
            dailyScheduleRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })
        }, 100)
    }

    // Handle time slot selection from DayPlanner
    const handleSelectTimeSlot = (dayNumber: number, timeSlot: string) => {
        // We accept string to match DayPlanner's broader type, but only process valid slots if needed
        // For now, we just open the selector which handles specific slot selection
        setSelectedDayNumber(dayNumber)
        setShowTimeSlotSelector(true)
    }

    // Handle confirming time slot
    const handleConfirmTimeSlot = (timeSlot: TimeSlot) => {
        if (!selectedActivity && selectedDayNumber === null) return

        const dayNumber = selectedDayNumber || 1

        setItineraryDays(prevDays =>
            prevDays.map(day => {
                if (day.dayNumber === dayNumber) {
                    const updatedActivities = { ...day.activities }

                    if (timeSlot === 'full_day') {
                        // Full day activity replaces both morning and evening
                        updatedActivities.full_day = selectedActivity!
                        delete updatedActivities.morning
                        delete updatedActivities.evening
                    } else if (timeSlot === 'morning') {
                        updatedActivities.morning = selectedActivity!
                        // If switching to morning, ensure full_day is removed if present?
                        // The UI should probably handle this logic or here. 
                        // For now keeping existing logic but maybe clearing full_day is safer.
                        delete updatedActivities.full_day
                    } else if (timeSlot === 'evening') {
                        updatedActivities.evening = selectedActivity!
                        delete updatedActivities.full_day
                    }

                    return { ...day, activities: updatedActivities }
                }
                return day
            })
        )

        // Reset state
        setShowTimeSlotSelector(false)
        setSelectedActivity(null)
        setSelectedDayNumber(null)
    }

    // Handle removing activity from day
    const handleRemoveActivity = (dayNumber: number, timeSlot: string, index: number) => {
        setItineraryDays(prevDays =>
            prevDays.map(day => {
                if (day.dayNumber === dayNumber) {
                    const updatedActivities = { ...day.activities }
                    // Only standard slots are key-indexed in our current state structure
                    if (timeSlot === 'morning' || timeSlot === 'evening' || timeSlot === 'full_day') {
                        delete updatedActivities[timeSlot]
                    }
                    return { ...day, activities: updatedActivities }
                }
                return day
            })
        )
    }

    // Get occupied slots for a day
    const getOccupiedSlots = (dayNumber: number): TimeSlot[] => {
        const day = itineraryDays.find(d => d.dayNumber === dayNumber)
        if (!day) return []

        const occupied: TimeSlot[] = []
        if (day.activities.morning) occupied.push('morning')
        if (day.activities.evening) occupied.push('evening')
        if (day.activities.full_day) occupied.push('full_day')
        return occupied
    }

    // Helper to map ItineraryDay to DayItineraryData
    const mapToPlannerData = (day: ItineraryDay): DayItineraryData => {
        const mapActivity = (activity?: Activity): PlannerActivity[] => {
            if (!activity) return []
            return [{
                id: activity.id,
                title: activity.title,
                description: activity.description,
                image_url: activity.images && activity.images.length > 0 ? activity.images[0] : undefined,
                duration: activity.duration,
                price_per_person: activity.price_per_person,
                currency: activity.currency,
            }]
        }

        return {
            day_number: day.dayNumber,
            morning: mapActivity(day.activities.morning),
            afternoon: [],
            evening: mapActivity(day.activities.evening),
            night: [],
            half_day: [],
            full_day: mapActivity(day.activities.full_day)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--heading, #0f172a)" }}>Itinerary Builder</h1>
                <p className="text-lg text-muted-foreground" style={{ color: "var(--body-text, #64748b)" }}>
                    Plan your perfect trip with activities tailored to your schedule
                </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center justify-center gap-4">
                    {[
                        { num: 1, label: 'Destination' },
                        { num: 2, label: 'Trip Components' },
                        { num: 3, label: 'Duration' },
                        { num: 4, label: 'Plan Activities' }
                    ].map((step, idx) => (
                        <div key={step.num} className="flex items-center">
                            <div className={`flex items-center gap-2 ${currentStep >= step.num ? 'text-primary' : 'text-muted-foreground'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep >= step.num ? 'bg-primary text-primary-foreground' : 'bg-muted'}`} style={currentStep >= step.num ? { backgroundColor: "var(--primary, #2563eb)", color: "var(--foreground, #ffffff)" } : {}}>
                                    {step.num}
                                </div>
                                <span className="font-medium hidden sm:inline" style={currentStep >= step.num ? { color: "var(--primary, #2563eb)" } : {}}>{step.label}</span>
                            </div>
                            {idx < 3 && (
                                <div className={`w-12 h-0.5 mx-2 ${currentStep > step.num ? 'bg-primary' : 'bg-muted'}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 1: Destination Search */}
            {currentStep === 1 && (
                <div className="max-w-2xl mx-auto">
                    <DestinationSearch
                        onDestinationSelected={handleDestinationSearch}
                        loading={loadingActivities}
                    />
                </div>
            )}

            {/* Step 2: Trip Components */}
            {currentStep === 2 && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <TripComponentsSelector
                        components={tripComponents}
                        onComponentsChange={setTripComponents}
                    />
                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentStep(1)}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <Button
                            onClick={() => setCurrentStep(3)}
                            disabled={tripComponents.includeFlights && !tripComponents.flightOrigin}
                        >
                            Continue
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Travel Days Selection */}
            {currentStep === 3 && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <TravelDaysSelector
                        numberOfDays={numberOfDays}
                        onDaysChange={setNumberOfDays}
                    />
                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentStep(2)}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <Button onClick={() => setCurrentStep(4)}>
                            Continue
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Activity Planning */}
            {currentStep === 4 && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <Button variant="outline" onClick={() => setCurrentStep(3)}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <Button variant="default">
                            <Save className="h-4 w-4 mr-2" />
                            Save Itinerary
                        </Button>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Left: Activity Browser */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-secondary/50 border border-border rounded-lg p-4">
                                <h3 className="font-semibold text-primary mb-1">
                                    📍 {locationInfo?.city || destination}, {locationInfo?.country || ''}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Browse activities below and add them to your daily schedule
                                </p>
                            </div>

                            <ActivityBrowser
                                activities={activities}
                                loading={loadingActivities}
                                onAddToDay={handleAddActivityToDay}
                            />
                        </div>

                        {/* Right: Itinerary Summary */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-4">
                                <ItinerarySummary
                                    days={itineraryDays}
                                    destination={destination}
                                    locationInfo={locationInfo || undefined}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Day Planners */}
                    <div ref={dailyScheduleRef} className="space-y-4 scroll-mt-4">
                        <h2 className="text-2xl font-bold">Daily Schedule</h2>
                        <div className="grid gap-4">
                            {itineraryDays.map(day => (
                                <DayPlanner
                                    key={day.dayNumber}
                                    day={mapToPlannerData(day)}
                                    onAddActivity={handleSelectTimeSlot}
                                    onRemoveActivity={handleRemoveActivity}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Time Slot Selector Modal */}
            {showTimeSlotSelector && selectedDayNumber !== null && (
                <TimeSlotSelector
                    onSelect={handleConfirmTimeSlot}
                    onCancel={() => {
                        setShowTimeSlotSelector(false)
                        setSelectedActivity(null)
                        setSelectedDayNumber(null)
                    }}
                    occupiedSlots={getOccupiedSlots(selectedDayNumber)}
                />
            )}
        </div>
    )
}
