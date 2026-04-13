'use client'

import { API_URL } from '@/lib/api'
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PackageFormData {
    title: string
    destination: string
    duration_days: number
    duration_nights: number
    category: string
    price_per_person: number
    max_group_size: number
    description: string
    booking_type: 'INSTANT' | 'ENQUIRY'
    price_label: string
    enquiry_payment: 'OFFLINE' | 'PAYMENT_LINK'
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
        description: '',
        booking_type: 'INSTANT',
        price_label: '',
        enquiry_payment: 'OFFLINE'
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
            // const response = await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${id}`)
            const response = await fetch(`${API_URL}/api/v1/admin-simple/packages-simple/${id}`)
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
                    description: data.package.description || '',
                    booking_type: data.package.booking_type || 'INSTANT',
                    price_label: data.package.price_label || '',
                    enquiry_payment: data.package.enquiry_payment || 'OFFLINE'
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
            const url = packageId
                ? `${API_URL}/api/v1/admin-simple/packages-simple/${packageId}`
                : `${API_URL}/api/v1/admin-simple/packages-simple`

            const method = packageId ? 'PATCH' : 'POST'

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                const errorData = await response.json()
                alert(`Failed to save package: ${JSON.stringify(errorData)}`)
                return
            }

            const data = await response.json()
            if (!packageId) {
                setPackageId(data.id)
            }

            setActiveTab('itinerary');
            toast.success('Package saved successfully!');
        } catch (error) {
            console.error('Failed to save package:', error);
            alert(`Failed to save package: ${error}`);
        } finally {
            setSaving(false);
        }
    }

    const handlePublish = async () => {
        if (!packageId) {
            alert('Please save the package first');
            return;
        }

        try {
            // await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}/status?new_status=PUBLISHED`, {
            await fetch(`${API_URL}/api/v1/admin-simple/packages-simple/${packageId}/status?new_status=PUBLISHED`, {
                method: 'PATCH'
            });
            router.push('/admin/packages');
            toast.success('Package published successfully!');
        } catch (error) {
            console.error('Failed to publish:', error);
            alert('Failed to publish package');
        }
    }


    const isBasicInfoValid = () => {
        return formData.title && formData.destination && formData.price_per_person > 0
    }

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>
    }

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-[1440px] mx-auto space-y-6">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/admin/packages')}
                            className="mb-2 p-0 h-auto hover:bg-transparent text-blue-600 font-medium"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Packages
                        </Button>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {packageId ? 'Edit Package' : 'Create New Package'}
                        </h1>
                        <p className="text-slate-900 mt-1">Fill in the details to create a tour package</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {packageId && (
                            <Button
                                variant="outline"
                                onClick={() => router.push(`/packages/${packageId}`)}
                                className="border-gray-200"
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                            </Button>
                        )}
                        <Button
                            onClick={handleSaveDraft}
                            disabled={!isBasicInfoValid() || saving}
                            variant="outline"
                            className="border-gray-200"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? 'Saving...' : 'Save Draft'}
                        </Button>
                        {packageId && (
                            <Button onClick={handlePublish} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                Publish Package
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="itinerary" disabled={!packageId}>
                            Itinerary {!packageId && '(Save first)'}
                        </TabsTrigger>
                    </TabsList>

                    {/* Basic Info Tab */}
                    <TabsContent value="basic" className="mt-0">
                        <Card className="border-gray-100 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-900">Package Details</CardTitle>
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
                                            className="border-gray-200"
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
                                            className="border-gray-200"
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
                                            className="border-gray-200"
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
                                            className="border-gray-200"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="category">Category</Label>
                                        <select
                                            id="category"
                                            value={formData.category}
                                            onChange={(e) => updateFormData('category', e.target.value)}
                                            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
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
                                            className="border-gray-200"
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
                                            className="border-gray-200"
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
                                        className="border-gray-200"
                                    />
                                </div>

                                <div className="pt-4 border-t border-gray-100 space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-base font-semibold text-gray-900">Booking Flow Configuration</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div 
                                                className={cn(
                                                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                                                    formData.booking_type === 'INSTANT' 
                                                        ? "border-blue-600 bg-blue-50/50 shadow-sm" 
                                                        : "border-gray-200 hover:border-gray-300 bg-white"
                                                )}
                                                onClick={() => updateFormData('booking_type', 'INSTANT')}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                                        formData.booking_type === 'INSTANT' ? "border-blue-600" : "border-gray-300"
                                                    )}>
                                                        {formData.booking_type === 'INSTANT' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">Instant Booking</p>
                                                        <p className="text-xs text-gray-600 mt-0.5">Automated payment and confirmation</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div 
                                                className={cn(
                                                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                                                    formData.booking_type === 'ENQUIRY' 
                                                        ? "border-blue-600 bg-blue-50/50 shadow-sm" 
                                                        : "border-gray-200 hover:border-gray-300 bg-white"
                                                )}
                                                onClick={() => updateFormData('booking_type', 'ENQUIRY')}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                                        formData.booking_type === 'ENQUIRY' ? "border-blue-600" : "border-gray-300"
                                                    )}>
                                                        {formData.booking_type === 'ENQUIRY' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">Custom Enquiry</p>
                                                        <p className="text-xs text-gray-600 mt-0.5">Consultative flow via enquiry form</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {formData.booking_type === 'ENQUIRY' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2">
                                                <Label htmlFor="price_label">Custom Price Label (Optional)</Label>
                                                <Input
                                                    id="price_label"
                                                    placeholder="e.g. Price on request"
                                                    value={formData.price_label}
                                                    onChange={(e) => updateFormData('price_label', e.target.value)}
                                                    className="border-gray-200"
                                                />
                                                <p className="text-[10px] text-gray-500">Replaces numeric price if provided</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="enquiry_payment">Conversion Payment Type</Label>
                                                <select
                                                    id="enquiry_payment"
                                                    value={formData.enquiry_payment}
                                                    onChange={(e) => updateFormData('enquiry_payment', e.target.value)}
                                                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                                                >
                                                    <option value="OFFLINE">Offline Payment / Direct Bank Transfer</option>
                                                    <option value="PAYMENT_LINK">Payment Link (Razorpay)</option>
                                                </select>
                                                <p className="text-[10px] text-gray-500">Method used if the enquiry converts to a booking</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t border-gray-50">
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push('/admin/packages')}
                                        className="border-gray-200"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSaveDraft}
                                        disabled={!isBasicInfoValid() || saving}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {saving ? 'Saving...' : 'Save & Continue to Itinerary'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Itinerary Tab */}
                    <TabsContent value="itinerary" className="mt-0">
                        {packageId ? (
                            <ItineraryBuilder
                                packageId={packageId}
                                durationDays={formData.duration_days}
                            />
                        ) : (
                            <Card className="border-gray-100 shadow-sm">
                                <CardContent className="py-24 text-center">
                                    <div className="bg-transparent w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Save className="h-8 w-8 text-gray-300" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">No Package Saved</h3>
                                    <p className="text-slate-900 max-w-xs mx-auto mt-1">
                                        Please save the basic package information first to start building your itinerary.
                                    </p>
                                    <Button onClick={() => setActiveTab('basic')} className="mt-6" variant="outline">
                                        Go to Basic Info
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
