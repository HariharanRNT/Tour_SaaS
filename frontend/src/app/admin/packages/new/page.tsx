'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Eye } from 'lucide-react'
import { ItineraryBuilder } from '@/components/admin/ItineraryBuilder'

interface PackageFormData {
    title: string
    destination: string
    duration_days: number
    duration_nights: number
    category: string
    price_per_person: number
    max_group_size: number
    description: string
}

export default function CreatePackagePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editPackageId = searchParams.get('id')

    const [activeTab, setActiveTab] = useState('basic')
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(false)
    const [packageId, setPackageId] = useState<string | null>(editPackageId)

    const [formData, setFormData] = useState<PackageFormData>({
        title: '',
        destination: '',
        duration_days: 7,
        duration_nights: 6,
        category: 'Adventure',
        price_per_person: 0,
        max_group_size: 20,
        description: ''
    })

    // Load existing package data if editing
    useEffect(() => {
        if (editPackageId) {
            loadPackageData(editPackageId)
        }
    }, [editPackageId])

    const loadPackageData = async (id: string) => {
        setLoading(true)
        try {
            const response = await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${id}`)
            if (!response.ok) {
                throw new Error('Failed to load package')
            }
            const data = await response.json()

            if (data.package) {
                setFormData({
                    title: data.package.title || '',
                    destination: data.package.destination || '',
                    duration_days: data.package.duration_days || 7,
                    duration_nights: data.package.duration_nights || 6,
                    category: data.package.category || 'Adventure',
                    price_per_person: data.package.price_per_person || 0,
                    max_group_size: data.package.max_group_size || 20,
                    description: data.package.description || ''
                })
            }
        } catch (error) {
            console.error('Failed to load package:', error)
            alert('Failed to load package data')
        } finally {
            setLoading(false)
        }
    }

    const updateFormData = (field: keyof PackageFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))

        // Auto-calculate nights when days change
        if (field === 'duration_days') {
            setFormData(prev => ({ ...prev, duration_nights: value - 1 }))
        }
    }

    const handleSaveDraft = async () => {
        setSaving(true)
        try {
            console.log('Saving package:', formData)

            const url = packageId
                ? `http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}`
                : 'http://localhost:8000/api/v1/admin-simple/packages-simple'

            const method = packageId ? 'PATCH' : 'POST'

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            console.log('Response status:', response.status)

            if (!response.ok) {
                const errorData = await response.json()
                console.error('Error response:', errorData)
                alert(`Failed to save package: ${JSON.stringify(errorData)}`)
                return
            }

            const data = await response.json()
            console.log('Package saved:', data)

            if (!packageId) {
                setPackageId(data.id)
            }

            // alert(packageId ? 'Package updated successfully!' : 'Package saved as draft!')

            // Move to itinerary tab
            setActiveTab('itinerary')
        } catch (error) {
            console.error('Failed to save package:', error)
            alert(`Failed to save package: ${error}`)
        } finally {
            setSaving(false)
        }
    }

    const handlePublish = async () => {
        if (!packageId) {
            alert('Please save the package first')
            return
        }

        try {
            await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}/status?new_status=PUBLISHED`, {
                method: 'PATCH'
            })

            // alert('Package published successfully!')
            router.push('/admin/packages')
        } catch (error) {
            console.error('Failed to publish:', error)
            alert('Failed to publish package')
        }
    }

    const isBasicInfoValid = () => {
        return formData.title && formData.destination && formData.price_per_person > 0
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/admin/packages')}
                                className="mb-2"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Packages
                            </Button>
                            <h1 className="text-3xl font-bold">Create New Package</h1>
                            <p className="text-gray-600 mt-1">Fill in the details to create a tour package</p>
                        </div>
                        <div className="flex gap-2">
                            {packageId && (
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(`/packages/${packageId}`)}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Preview
                                </Button>
                            )}
                            <Button
                                onClick={handleSaveDraft}
                                disabled={!isBasicInfoValid() || saving}
                                variant="outline"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? 'Saving...' : 'Save Draft'}
                            </Button>
                            {packageId && (
                                <Button onClick={handlePublish}>
                                    Publish Package
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="itinerary" disabled={!packageId}>
                            Itinerary {!packageId && '(Save first)'}
                        </TabsTrigger>
                    </TabsList>

                    {/* Basic Info Tab */}
                    <TabsContent value="basic" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Package Details</CardTitle>
                                <CardDescription>
                                    Enter the basic information about your tour package
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">
                                            Package Title <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="title"
                                            placeholder="e.g., Tokyo Adventure 7 Days"
                                            value={formData.title}
                                            onChange={(e) => updateFormData('title', e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="destination">
                                            Destination <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="destination"
                                            placeholder="e.g., Tokyo, Japan"
                                            value={formData.destination}
                                            onChange={(e) => updateFormData('destination', e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="duration_days">Duration (Days)</Label>
                                        <Input
                                            id="duration_days"
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={formData.duration_days}
                                            onChange={(e) => updateFormData('duration_days', parseInt(e.target.value))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="duration_nights">Duration (Nights)</Label>
                                        <Input
                                            id="duration_nights"
                                            type="number"
                                            min="0"
                                            max="30"
                                            value={formData.duration_nights}
                                            onChange={(e) => updateFormData('duration_nights', parseInt(e.target.value))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="category">Category</Label>
                                        <select
                                            id="category"
                                            value={formData.category}
                                            onChange={(e) => updateFormData('category', e.target.value)}
                                            className="w-full border rounded-md px-3 py-2"
                                        >
                                            <option value="Adventure">Adventure</option>
                                            <option value="Cultural">Cultural</option>
                                            <option value="Beach">Beach</option>
                                            <option value="City">City</option>
                                            <option value="Nature">Nature</option>
                                            <option value="Luxury">Luxury</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="price_per_person">
                                            Price per Person (₹) <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="price_per_person"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.price_per_person}
                                            onChange={(e) => updateFormData('price_per_person', parseFloat(e.target.value))}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="max_group_size">Max Group Size</Label>
                                        <Input
                                            id="max_group_size"
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={formData.max_group_size}
                                            onChange={(e) => updateFormData('max_group_size', parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe the package highlights, what's included, and what makes it special..."
                                        value={formData.description}
                                        onChange={(e) => updateFormData('description', e.target.value)}
                                        rows={6}
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push('/admin/packages')}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSaveDraft}
                                        disabled={!isBasicInfoValid() || saving}
                                    >
                                        {saving ? 'Saving...' : 'Save & Continue to Itinerary'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Itinerary Tab */}
                    <TabsContent value="itinerary" className="mt-6">
                        {packageId ? (
                            <ItineraryBuilder
                                packageId={packageId}
                                durationDays={formData.duration_days}
                            />
                        ) : (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <p className="text-gray-500">Save the package first to build the itinerary</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
