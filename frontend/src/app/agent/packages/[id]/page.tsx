'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Calendar } from 'lucide-react'
import { ItineraryBuilder } from '@/components/admin/ItineraryBuilder'
import { toast } from 'sonner'

interface Package {
    id: string
    title: string
    destination: string
    duration_days: number
    duration_nights: number
    category: string
    price_per_person: number
    max_group_size: number
    description: string
    status?: string
    itinerary?: any[]
}

export default function PackageDetailPage() {
    const router = useRouter()
    const params = useParams()
    const packageId = params.id as string

    const [packageData, setPackageData] = useState<Package | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Dialog State removed as we use ItineraryBuilder now

    useEffect(() => {
        loadPackageData()
    }, [packageId])

    const loadPackageData = async () => {
        setLoading(true)
        setError(null)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/agent/packages/${packageId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                throw new Error('Failed to load package')
            }

            const pkg = await response.json()
            if (!pkg) {
                setError('Package not found')
                return
            }

            setPackageData(pkg)
        } catch (err) {
            console.error('Failed to load package:', err)
            setError('Failed to load package details')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading package details...</p>
                </div>
            </div>
        )
    }

    if (error || !packageData) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="pt-6">
                        <p className="text-red-600 text-center">{error || 'Package not found'}</p>
                        <Button onClick={() => router.push('/agent/packages')} className="mt-4 w-full">
                            Back to Packages
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-transparent pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.push('/agent/packages')}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">{packageData.title}</h1>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {packageData.destination}</span>
                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {packageData.duration_days}D/{packageData.duration_nights}N</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {packageData.status && (
                                <Badge variant={packageData.status === 'published' ? 'default' : 'secondary'}>
                                    {packageData.status}
                                </Badge>
                            )}
                            <Button onClick={() => router.push(`/agent/packages/new?id=${packageId}`)} variant="outline" size="sm">
                                Edit Details
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <Tabs defaultValue="itinerary" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="itinerary">Itinerary Builder</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Package Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Category</label>
                                            <p className="font-medium">{packageData.category}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Price</label>
                                            <p className="font-medium text-blue-600">₹{packageData.price_per_person}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Group Size</label>
                                            <p className="font-medium">{packageData.max_group_size}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Description</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 whitespace-pre-wrap text-sm">{packageData.description}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="itinerary">
                        <Card>
                            <CardHeader>
                                <CardTitle>Itinerary Planner</CardTitle>
                                <CardDescription>Manage day-wise activities</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ItineraryBuilder
                                    packageId={packageId}
                                    durationDays={packageData.duration_days}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}