'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, Search, Calendar, Users } from 'lucide-react'
import { TripCustomization } from '@/components/packages/TripCustomization'
import { PassengerCounter } from '@/components/packages/PassengerCounter'
import { packagesEnhancedAPI } from '@/lib/api'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'

interface PackageSearchResult {
    id: string
    title: string
    destination: string
    duration_days: number
    price_per_person: number
    description: string
    max_group_size?: number
}

export default function MultiStepPackageSearch() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [packages, setPackages] = useState<PackageSearchResult[]>([])
    const [error, setError] = useState('')

    const [searchData, setSearchData] = useState({
        destination: '',
        includeFlights: false,
        includeHotels: false,
        includeTransfers: false,
        startDate: '',
        duration: 7,
        adults: 2,
        children: 0,
        infants: 0
    })

    const updateSearchData = (key: string, value: any) => {
        setSearchData(prev => ({ ...prev, [key]: value }))
    }

    const handleStep1Continue = () => {
        if (!searchData.destination.trim()) {
            setError('Please enter a destination')
            return
        }
        setError('')
        setCurrentStep(2)
    }

    const handleDestinationChipClick = (dest: string) => {
        updateSearchData('destination', dest)
        setError('')
        // Use setTimeout to ensure state is updated before moving to next step
        setTimeout(() => {
            setCurrentStep(2)
        }, 50)
    }

    const handleStep3Continue = () => {
        if (!searchData.startDate) {
            setError('Please select a start date')
            return
        }
        setError('')
        handleSearchPackages()
    }

    const handleSearchPackages = async () => {
        setLoading(true)
        setError('')

        try {
            const results = await packagesEnhancedAPI.searchByDestination(searchData.destination, 20)

            // Apply filters
            let filtered = results.filter((pkg: PackageSearchResult) => {
                // Duration filter
                if (searchData.duration && pkg.duration_days !== searchData.duration) {
                    return false
                }

                // Group size filter
                const totalPassengers = searchData.adults + searchData.children + searchData.infants
                const maxSize = pkg.max_group_size || 20
                if (maxSize < totalPassengers) {
                    return false
                }

                return true
            })

            setPackages(filtered)
            setCurrentStep(4)

            if (filtered.length === 0) {
                setError('No packages found matching your criteria. Try adjusting your filters.')
            }
        } catch (err) {
            console.error('Search error:', err)
            setError('Failed to search packages. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const totalPassengers = searchData.adults + searchData.children + searchData.infants

    return (
        <div className="min-h-screen bg-transparent">
            {/* Header */}
            <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white py-8">
                <div className="container mx-auto px-4">
                    <h1 className="text-3xl font-bold">Find Your Perfect Package</h1>
                    <p className="text-white/80 mt-2">Step {currentStep} of 4</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="glass-navbar border-b border-white/20">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between max-w-3xl mx-auto">
                        {[1, 2, 3, 4].map((step) => (
                            <div key={step} className="flex items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step <= currentStep
                                        ? 'bg-[var(--primary)] text-white'
                                        : 'bg-gray-200 text-gray-500'
                                        }`}
                                >
                                    {step}
                                </div>
                                {step < 4 && (
                                    <div
                                        className={`h-1 w-20 mx-2 ${step < currentStep ? 'bg-[var(--primary)]' : 'bg-gray-200'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-12">
                {error && (
                    <div className="glass-panel border-red-200/50 rounded-lg p-4 mb-6 max-w-2xl mx-auto block">
                        <p className="text-red-600 font-medium">{error}</p>
                    </div>
                )}

                {/* Step 1: Destination */}
                {currentStep === 1 && (
                    <Card className="glass-panel max-w-2xl mx-auto border-white/20">
                        <CardHeader>
                            <CardTitle className="text-2xl">Where do you want to go?</CardTitle>
                            <CardDescription className="text-base">
                                Enter your dream destination
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label htmlFor="destination" className="text-base">
                                    Destination
                                </Label>
                                <Input
                                    id="destination"
                                    placeholder="e.g., Tokyo, Paris, Bali"
                                    value={searchData.destination}
                                    onChange={(e) => updateSearchData('destination', e.target.value)}
                                    className="mt-2 h-12 text-lg"
                                    onKeyPress={(e) => e.key === 'Enter' && handleStep1Continue()}
                                />
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 mb-2">Popular destinations:</p>
                                <div className="flex flex-wrap gap-2">
                                    {['Tokyo', 'Paris', 'Bali', 'New York', 'London', 'Dubai'].map((dest) => (
                                        <Badge
                                            key={dest}
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-[var(--primary-glow)]"
                                            onClick={() => handleDestinationChipClick(dest)}
                                        >
                                            {dest}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Button
                                onClick={handleStep1Continue}
                                className="w-full h-12 text-lg"
                                size="lg"
                            >
                                Continue
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Trip Components */}
                {currentStep === 2 && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <TripCustomization
                            includeFlights={searchData.includeFlights}
                            includeHotels={searchData.includeHotels}
                            includeTransfers={searchData.includeTransfers}
                            onFlightsChange={(checked) => updateSearchData('includeFlights', checked)}
                            onHotelsChange={(checked) => updateSearchData('includeHotels', checked)}
                            onTransfersChange={(checked) => updateSearchData('includeTransfers', checked)}
                        />

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(1)}
                                className="flex-1 h-12"
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Back
                            </Button>
                            <Button
                                onClick={() => setCurrentStep(3)}
                                className="flex-1 h-12"
                            >
                                Continue
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Travel Details */}
                {currentStep === 3 && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center">
                                    <Calendar className="mr-3 h-6 w-6" />
                                    Travel Details
                                </CardTitle>
                                <CardDescription className="text-base">
                                    When and how many travelers?
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="startDate" className="text-base">
                                            Start Date <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={searchData.startDate}
                                            onChange={(e) => updateSearchData('startDate', e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="mt-2"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="duration" className="text-base">
                                            Duration (Days)
                                        </Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            value={searchData.duration}
                                            onChange={(e) => updateSearchData('duration', parseInt(e.target.value) || 1)}
                                            min={1}
                                            max={30}
                                            className="mt-2"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-base mb-3 block flex items-center">
                                        <Users className="mr-2 h-5 w-5" />
                                        Passengers ({totalPassengers} total)
                                    </Label>
                                    <div className="border rounded-lg p-4 space-y-2">
                                        <PassengerCounter
                                            label="Adults"
                                            sublabel="Age 12+"
                                            value={searchData.adults}
                                            min={1}
                                            max={10}
                                            onChange={(value) => updateSearchData('adults', value)}
                                        />
                                        <PassengerCounter
                                            label="Children"
                                            sublabel="Age 2-11"
                                            value={searchData.children}
                                            min={0}
                                            max={5}
                                            onChange={(value) => updateSearchData('children', value)}
                                        />
                                        <PassengerCounter
                                            label="Infants"
                                            sublabel="Under 2"
                                            value={searchData.infants}
                                            min={0}
                                            max={2}
                                            onChange={(value) => updateSearchData('infants', value)}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(2)}
                                className="flex-1 h-12"
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Back
                            </Button>
                            <Button
                                onClick={handleStep3Continue}
                                disabled={loading}
                                className="flex-1 h-12"
                            >
                                {loading ? 'Searching...' : 'Search Packages'}
                                <Search className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 4: Results */}
                {currentStep === 4 && (
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {packages.length} {packages.length === 1 ? 'Package' : 'Packages'} Found
                                </h2>
                                <p className="text-gray-600">
                                    {searchData.destination} • {searchData.duration} days • {totalPassengers} travelers
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(1)}
                            >
                                Modify Search
                            </Button>
                        </div>

                        {packages.length > 0 ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {packages.map((pkg) => (
                                    <Card
                                        key={pkg.id}
                                        className="hover:shadow-lg transition-shadow cursor-pointer"
                                    >
                                        <CardHeader>
                                            <div className="flex items-start justify-between mb-2">
                                                <Badge variant="secondary">
                                                    <MapPin className="h-3 w-3 mr-1" />
                                                    {pkg.destination}
                                                </Badge>
                                                <Badge className="bg-[var(--primary)]">
                                                    <span className="mr-0.5">₹</span>
                                                    {pkg.price_per_person.toLocaleString()}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-xl">{pkg.title}</CardTitle>
                                            <CardDescription>
                                                {pkg.duration_days} days trip
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                                                {pkg.description}
                                            </p>
                                            <Link href={`/packages/${pkg.id}`}>
                                                <Button className="w-full">
                                                    View Itinerary
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <p className="text-gray-500">
                                        No packages found. Try adjusting your search criteria.
                                    </p>
                                    <Button
                                        onClick={() => setCurrentStep(1)}
                                        className="mt-4"
                                    >
                                        Start New Search
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
