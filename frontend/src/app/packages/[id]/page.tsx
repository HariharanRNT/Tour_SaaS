'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Calendar, Users, Sun, Cloud, Sunset, Moon, ArrowLeft, Clock } from 'lucide-react'
import { packagesEnhancedAPI } from '@/lib/api'
import { ActivityImageGallery } from '@/components/ui/activity-image-gallery'

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
}

const timeSlotConfig = {
    full_day: { icon: Calendar, label: 'Full Day', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    morning: { icon: Sun, label: 'Morning', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    half_day: { icon: Clock, label: 'Half Day', color: 'text-teal-600', bgColor: 'bg-teal-50' },
    afternoon: { icon: Cloud, label: 'Afternoon', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    evening: { icon: Sunset, label: 'Evening', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    night: { icon: Moon, label: 'Night', color: 'text-purple-600', bgColor: 'bg-purple-50' }
}

export default function PackageDetailPage() {
    const params = useParams()
    const router = useRouter()
    const packageId = params.id as string

    const [packageData, setPackageData] = useState<PackageDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [gstSettings, setGstSettings] = useState<{ inclusive: boolean, percentage: number } | null>(null)

    useEffect(() => {
        loadPackageDetails()
        loadAgentSettings()
    }, [packageId])

    const loadAgentSettings = async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const headers: Record<string, string> = {}
            if (token) headers['Authorization'] = `Bearer ${token}`

            const res = await fetch('http://localhost:8000/api/v1/agent/settings', { headers })
            if (res.ok) {
                const data = await res.json()
                setGstSettings({
                    inclusive: data.gst_inclusive,
                    percentage: data.gst_percentage
                })
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading package details...</p>
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8">
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
                                <p className="text-blue-100">{packageData.category} Tour</p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-blue-100 text-sm">Starting from</p>
                            <p className="text-4xl font-bold">
                                {packageData && gstSettings && !gstSettings.inclusive
                                    ? `₹${(packageData.price_per_person * (1 + gstSettings.percentage / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                    : `₹${packageData?.price_per_person.toLocaleString()}`
                                }
                            </p>
                            <p className="text-blue-100 text-sm">per person {gstSettings && !gstSettings.inclusive ? '(inc. GST)' : ''}</p>
                        </div>
                    </div>

                    <div className="flex gap-6 mt-6 text-blue-100">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            <span>{packageData.duration_days} days / {packageData.duration_nights} nights</span>
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
                            <CardHeader>
                                <CardTitle>Day-wise Itinerary</CardTitle>
                                <CardDescription>
                                    Explore the detailed schedule for your {packageData.duration_days}-day journey
                                </CardDescription>
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
                                <CardTitle>Book This Package</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b">
                                    <span className="text-gray-600">Price per person</span>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold text-blue-600 block">
                                            {packageData && gstSettings && !gstSettings.inclusive
                                                ? `₹${(packageData.price_per_person * (1 + gstSettings.percentage / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                                : `₹${packageData?.price_per_person.toLocaleString()}`
                                            }
                                        </span>
                                        {gstSettings && !gstSettings.inclusive && (
                                            <span className="text-xs text-gray-400 block">+ GST ({gstSettings.percentage}%) included</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Duration</span>
                                        <span className="font-medium">{packageData.duration_days} days</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Max group size</span>
                                        <span className="font-medium">{packageData.max_group_size} people</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full"
                                    size="lg"
                                    disabled={true}
                                >
                                    Book Now
                                </Button>

                                <p className="text-xs text-gray-500 text-center">
                                    You can customize the itinerary during booking
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div >
    )
}
