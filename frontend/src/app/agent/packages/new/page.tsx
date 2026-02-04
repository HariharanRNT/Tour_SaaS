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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'react-toastify'

interface PackageFormData {
    title: string
    destination: string
    country: string
    duration_days: number
    duration_nights: number
    category: string
    price_per_person: number
    max_group_size: number
    description: string
    is_public: boolean
    feature_image_url?: string
}

export default function CreatePackagePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editPackageId = searchParams.get('id')

    const [activeTab, setActiveTab] = useState('basic')
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(false)
    const [packageId, setPackageId] = useState<string | null>(editPackageId)
    const [useFeatureImage, setUseFeatureImage] = useState(false)

    const [formData, setFormData] = useState<PackageFormData>({
        title: '',
        destination: '',
        country: '',
        duration_days: 7,
        duration_nights: 6,
        category: 'Adventure',
        price_per_person: 0,
        max_group_size: 20,
        description: '',
        is_public: true,
        feature_image_url: ''
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
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/agent/packages/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (!response.ok) {
                throw new Error('Failed to load package')
            }
            const data = await response.json()
            // Agent API returns package directly, not wrapped in { package: ... }
            const pkg = data; // response is the package object directly from agent_packages.py

            if (pkg) {
                setFormData({
                    title: pkg.title || '',
                    destination: pkg.destination || '',
                    country: pkg.country || '',
                    duration_days: pkg.duration_days || 7,
                    duration_nights: pkg.duration_nights || 6,
                    category: pkg.category || 'Adventure',
                    price_per_person: pkg.price_per_person || 0,
                    max_group_size: pkg.max_group_size || 20,
                    description: pkg.description || '',
                    is_public: pkg.is_public !== undefined ? pkg.is_public : true,
                    feature_image_url: pkg.feature_image_url || ''
                })
                if (pkg.feature_image_url) {
                    setUseFeatureImage(true)
                }
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

    const handleSaveDraft = async (shouldRedirect: boolean = false) => {
        setSaving(true)
        try {
            console.log('Saving package:', formData)

            const url = packageId
                ? `http://localhost:8000/api/v1/agent/packages/${packageId}`
                : 'http://localhost:8000/api/v1/agent/packages'

            const method = packageId ? 'PUT' : 'POST'
            const token = localStorage.getItem('token')

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            console.log('Response status:', response.status)

            if (!response.ok) {
                const errorData = await response.json()
                console.error('Error response:', errorData)
                toast.error(`Failed to save package: ${JSON.stringify(errorData)}`)
                return
            }

            const data = await response.json()
            console.log('Package saved:', data)

            if (!packageId) {
                setPackageId(data.id)
                // Update URL without reloading
                window.history.replaceState(null, '', `?id=${data.id}`)
            }

            toast.success(packageId ? 'Package updated successfully' : 'Package saved as draft')

            if (shouldRedirect) {
                router.push('/agent/packages')
            } else {
                // Move to itinerary tab
                setActiveTab('itinerary')
            }
        } catch (error) {
            console.error('Failed to save package:', error)
            toast.error('Failed to save package')
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
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/agent/packages/${packageId}/status?new_status=published`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                throw new Error('Failed to update status')
            }

            toast.success('Package published successfully')
            router.push('/agent/packages')
        } catch (error) {
            console.error('Failed to publish:', error)
            toast.error('Failed to publish package')
        }
    }

    const isBasicInfoValid = () => {
        return formData.title && formData.destination && formData.country && formData.price_per_person > 0
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
                                onClick={() => router.push('/agent/packages')}
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
                                onClick={() => handleSaveDraft(true)}
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
                                            placeholder="e.g., Tokyo"
                                            value={formData.destination}
                                            onChange={(e) => updateFormData('destination', e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="country">
                                            Country <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="country"
                                            placeholder="e.g., Japan"
                                            value={formData.country}
                                            onChange={(e) => updateFormData('country', e.target.value)}
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

                                    <div className="flex flex-col space-y-4 pt-4 border-t">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="is_public"
                                                checked={formData.is_public}
                                                onCheckedChange={(checked) => updateFormData('is_public', !!checked)}
                                            />
                                            <Label htmlFor="is_public" className="cursor-pointer font-medium">
                                                Show this package in Customer UI
                                            </Label>
                                        </div>

                                        <div className="flex flex-col space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="use_feature_image"
                                                    checked={useFeatureImage}
                                                    onCheckedChange={(checked) => {
                                                        setUseFeatureImage(!!checked);
                                                        if (!checked) updateFormData('feature_image_url', '');
                                                    }}
                                                />
                                                <Label htmlFor="use_feature_image" className="cursor-pointer font-medium">
                                                    Use Custom Feature Image for Customer Home Page
                                                </Label>
                                            </div>

                                            {useFeatureImage && (
                                                <div className="ml-6">
                                                    <Label htmlFor="feature_image_url">Feature Image URL</Label>
                                                    <Input
                                                        id="feature_image_url"
                                                        placeholder="https://example.com/image.jpg"
                                                        value={formData.feature_image_url || ''}
                                                        onChange={(e) => updateFormData('feature_image_url', e.target.value)}
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        This image will be displayed on the customer home page instead of the default blue background.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
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
                                        onClick={() => router.push('/agent/packages')}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => handleSaveDraft(false)}
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
