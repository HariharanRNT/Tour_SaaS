'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    ArrowLeft, ArrowRight, Save, Eye, Check, MapPin, Globe, Calendar, Users,
    Banknote, FileText, Settings, AlertCircle, Info, Lock,
    Circle, CheckCircle, Image as ImageIcon, Briefcase,
    Mountain, Palmtree, Landmark, Coffee, Tent, Building2, ChevronRight
} from 'lucide-react'
import { ItineraryBuilder } from '@/components/admin/ItineraryBuilder'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'react-toastify'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Country } from 'country-state-city'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

const CATEGORIES = [
    { id: 'Adventure', icon: Mountain, label: 'Adventure' },
    { id: 'Beach', icon: Palmtree, label: 'Beach & Relaxation' },
    { id: 'Cultural', icon: Landmark, label: 'Cultural & Heritage' },
    { id: 'City', icon: Building2, label: 'City Tours' },
    { id: 'Nature', icon: Tent, label: 'Nature & Wildlife' },
    { id: 'Food', icon: Coffee, label: 'Food & Culinary' },
    { id: 'Luxury', icon: Banknote, label: 'Luxury' },
]

export default function CreatePackagePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editPackageId = searchParams.get('id')

    // Steps: 1: Basic Info, 2: Itinerary, 3: Review
    const [activeStep, setActiveStep] = useState(1)
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
            if (!response.ok) throw new Error('Failed to load package')
            const pkg = await response.json()

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
                if (pkg.feature_image_url) setUseFeatureImage(true)
                setPackageId(id)
            }
        } catch (error) {
            console.error('Failed to load package:', error)
            toast.error('Failed to load package data')
        } finally {
            setLoading(false)
        }
    }

    const updateFormData = (field: keyof PackageFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (field === 'duration_days') {
            setFormData(prev => ({ ...prev, duration_nights: value - 1 }))
        }
    }

    const handleSaveDraft = async (shouldRedirect: boolean = false) => {
        setSaving(true)
        try {
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

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(JSON.stringify(errorData))
            }

            const data = await response.json()

            if (!packageId) {
                setPackageId(data.id)
                window.history.replaceState(null, '', `?id=${data.id}`)
            }

            toast.success(packageId ? 'Package updated successfully' : 'Package saved as draft')

            if (shouldRedirect) {
                router.push('/agent/packages')
            } else if (activeStep === 1) {
                setActiveStep(2)
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

            if (!response.ok) throw new Error('Failed to update status')

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

    // Helper for input validation styles
    const getInputStyle = (value: any, required: boolean = false) => {
        const baseStyle = "transition-all duration-200"
        const validStyle = "border-emerald-500 focus-visible:ring-emerald-500/20"
        const errorStyle = "border-red-500 bg-red-50/10 focus-visible:ring-red-500/20"
        const focusStyle = "focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/10"

        if (required && !value) return cn(baseStyle, errorStyle)
        if (value) return cn(baseStyle, validStyle)
        return cn(baseStyle, focusStyle)
    }

    const handleStepClick = (step: number) => {
        // Only allow clicking if we have a package ID (saved) or moving back
        if (packageId || step < activeStep) {
            setActiveStep(step)
        } else {
            toast.info("Please save the basic info first")
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-32 overflow-x-hidden">
            {/* Header */}
            <div className="bg-gradient-to-b from-gray-50 to-white border-b sticky top-0 z-10 transition-all duration-200">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col gap-6">
                        {/* Top Row: Back Button */}
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/agent/packages')}
                                className="text-gray-500 hover:text-gray-900 -ml-2 hover:bg-gray-100/50"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Packages
                            </Button>

                            <div className="flex gap-2">
                                {packageId && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/packages/${packageId}`)}
                                        className="bg-white text-xs h-8"
                                    >
                                        <Eye className="mr-2 h-3.5 w-3.5" />
                                        Preview
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex items-end justify-between pb-2">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <span className="text-3xl">🗺️</span>
                                    {packageId ? (
                                        <span className="truncate max-w-xl block" title={formData.title}>
                                            Edit Package: <span className="text-indigo-600">{formData.title || 'Untitled Package'}</span>
                                        </span>
                                    ) : 'Create New Package'}
                                </h1>
                                <p className="text-sm text-gray-500 mt-2 ml-12">
                                    Fill in the details to create a tour package
                                </p>
                            </div>

                            {/* Action Buttons: Preview, Save, Publish */}
                            <div className="flex items-center gap-3">
                                {packageId && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/packages/${packageId}`)}
                                        className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Preview
                                    </Button>
                                )}
                                <Button
                                    onClick={() => handleSaveDraft(false)}
                                    disabled={!isBasicInfoValid() || saving}
                                    variant="outline"
                                    size="sm"
                                    className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {saving ? 'Saving...' : 'Save Draft'}
                                </Button>
                                {packageId && (
                                    <Button
                                        onClick={handlePublish}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Publish
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Stepper Component - Modern Design */}
                        <div className="w-full max-w-3xl mx-auto py-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                                    Progress: {activeStep === 1 ? '33%' : activeStep === 2 ? '66%' : '100%'}
                                </span>
                                <span className="text-xs text-gray-400">Step {activeStep} of 3</span>
                            </div>

                            <div className="relative flex items-center justify-between">
                                {/* Background Line */}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-2 bg-gray-100 rounded-full -z-10" />

                                {/* Active Progress Line */}
                                <div
                                    className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full -z-10 transition-all duration-700 ease-out"
                                    style={{ width: `${((activeStep - 1) / 2) * 100}%` }}
                                />

                                {[
                                    { step: 1, label: 'Basic Info', status: 'Complete' },
                                    { step: 2, label: 'Itinerary', status: 'In Progress' },
                                    { step: 3, label: 'Review & Publish', status: 'Not Started' }
                                ].map((item) => {
                                    const isCompleted = item.step < activeStep
                                    const isCurrent = item.step === activeStep

                                    return (
                                        <div
                                            key={item.step}
                                            className="group relative flex flex-col items-center cursor-pointer"
                                            onClick={() => handleStepClick(item.step)}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 z-10",
                                                isCompleted ? "bg-emerald-500 border-white text-white shadow-lg shadow-emerald-200" :
                                                    isCurrent ? "bg-white border-indigo-500 text-indigo-600 shadow-xl shadow-indigo-200 scale-110" :
                                                        "bg-gray-100 border-white text-gray-400"
                                            )}>
                                                {isCompleted ? <Check className="w-5 h-5" /> : (
                                                    <span className={cn("text-sm font-bold", isCurrent && "animate-pulse")}>{item.step}</span>
                                                )}

                                                {/* Pulsing ring for current */}
                                                {isCurrent && (
                                                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping" />
                                                )}
                                            </div>

                                            <div className={cn(
                                                "absolute -bottom-10 flex flex-col items-center transition-all duration-300",
                                                isCurrent ? "opacity-100 transform translate-y-0" : "opacity-60 group-hover:opacity-100"
                                            )}>
                                                <span className={cn(
                                                    "text-sm font-bold whitespace-nowrap",
                                                    isCurrent ? "text-indigo-700" : isCompleted ? "text-emerald-600" : "text-gray-400"
                                                )}>
                                                    {item.label}
                                                </span>
                                                <span className="text-[10px] uppercase font-medium tracking-wider text-gray-400 mt-0.5">
                                                    {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="container mx-auto px-4 py-8 max-w-5xl">

                {/* STEP 1: Basic Info */}
                {activeStep === 1 && (
                    <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Overview Section */}
                        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow ring-1 ring-gray-200/50 overflow-hidden group">
                            <div className="bg-gradient-to-r from-blue-50/50 to-white px-6 py-4 border-b flex items-center gap-3">
                                <div className="p-2 bg-blue-100/50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Overview</h3>
                                    <p className="text-xs text-gray-500">Essential package details</p>
                                </div>
                            </div>
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <Label className={cn("text-xs font-medium text-gray-500 uppercase tracking-wider", formData.title ? "text-blue-600" : "")}>
                                        Package Title <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FileText className={cn("h-4 w-4 transition-colors", formData.title ? "text-indigo-500" : "text-gray-400 group-focus-within/input:text-indigo-500")} />
                                        </div>
                                        <Input
                                            placeholder="e.g., Tokyo Adventure 7 Days"
                                            value={formData.title}
                                            onChange={(e) => updateFormData('title', e.target.value)}
                                            className={cn("pl-10 h-12 rounded-xl", getInputStyle(formData.title, true))}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-gray-400">
                                            {formData.title.length}/100
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">Create an engaging title that highlights the experience</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Destination <span className="text-red-500">*</span></Label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MapPin className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                        </div>
                                        <Input
                                            placeholder="e.g., Tokyo"
                                            value={formData.destination}
                                            onChange={(e) => updateFormData('destination', e.target.value)}
                                            className="pl-10 h-11 border-gray-200 rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Country <span className="text-red-500">*</span></Label>
                                    <div className="relative group">
                                        <Select
                                            value={formData.country}
                                            onValueChange={(value) => updateFormData('country', value)}
                                        >
                                            <SelectTrigger className="pl-10 h-11 border-gray-200 rounded-xl">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Globe className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                                </div>
                                                <SelectValue placeholder="Select a country" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Country.getAllCountries().map((country) => (
                                                    <SelectItem key={country.isoCode} value={country.name}>
                                                        {country.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Logistics & Pricing */}
                        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow ring-1 ring-gray-200/50 overflow-hidden group">
                            <div className="bg-gradient-to-r from-emerald-50/50 to-white px-6 py-4 border-b flex items-center gap-3">
                                <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                                    <Banknote className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Logistics & Pricing</h3>
                                    <p className="text-xs text-gray-500">Timeline and costs</p>
                                </div>
                            </div>
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                                {/* Duration - Combined Field */}
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Duration <span className="text-red-500">*</span></Label>
                                    <div className="flex rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                                        <div className="flex-1 border-r border-gray-200 bg-gray-50/50 relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Calendar className="h-4 w-4 text-gray-500" />
                                            </div>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={formData.duration_days}
                                                onChange={(e) => updateFormData('duration_days', parseInt(e.target.value))}
                                                className="pl-10 h-12 border-0 bg-transparent focus-visible:ring-0 text-center font-medium"
                                            />
                                            <span className="absolute right-3 top-3 text-xs text-gray-500 pointer-events-none">Days</span>
                                        </div>
                                        <div className="flex-1 bg-white relative group">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={formData.duration_nights}
                                                onChange={(e) => updateFormData('duration_nights', parseInt(e.target.value))}
                                                className="pl-4 h-12 border-0 bg-transparent focus:ring-0 text-center font-medium text-gray-600"
                                            />
                                            <span className="absolute right-3 top-3 text-xs text-gray-500 pointer-events-none">Nights</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">Auto-calculates nights based on days</p>
                                </div>

                                {/* Price - Enhanced Field */}
                                <div className="space-y-2 md:col-span-1">
                                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Price per Person <span className="text-red-500">*</span></Label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 font-bold">₹</span>
                                        </div>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={formData.price_per_person}
                                            onChange={(e) => updateFormData('price_per_person', parseFloat(e.target.value))}
                                            className={cn("pl-8 h-12 rounded-xl font-mono font-medium text-lg", getInputStyle(formData.price_per_person, true))}
                                        />
                                        {formData.price_per_person > 0 && (
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <Badge variant="secondary" className="text-xs font-normal">
                                                    ~ ${(formData.price_per_person * 0.012).toFixed(0)} USD
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Category - Icon Grid */}
                                <div className="space-y-3 md:col-span-2">
                                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {CATEGORIES.map((cat) => {
                                            const Icon = cat.icon
                                            const isSelected = formData.category === cat.id
                                            return (
                                                <div
                                                    key={cat.id}
                                                    onClick={() => updateFormData('category', isSelected ? '' : cat.id)}
                                                    className={cn(
                                                        "cursor-pointer rounded-xl border p-3 flex flex-col items-center gap-2 transition-all hover:border-indigo-300 hover:bg-indigo-50",
                                                        isSelected ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 text-indigo-700 shadow-sm" : "border-gray-200 text-gray-600 bg-white"
                                                    )}
                                                >
                                                    <Icon className={cn("w-6 h-6 transition-colors", isSelected ? "text-indigo-600" : "text-gray-400")} />
                                                    <span className="text-xs font-medium text-center">{cat.label}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Group Size Slider */}
                                <div className="space-y-4 md:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Max Group Size</Label>
                                        <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-md">
                                            {formData.max_group_size} people
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-gray-400">1</span>
                                        <Slider
                                            value={[formData.max_group_size]}
                                            min={1}
                                            max={50}
                                            step={1}
                                            onValueChange={(vals: number[]) => updateFormData('max_group_size', vals[0])}
                                            className="flex-1"
                                        />
                                        <span className="text-xs text-gray-400">50</span>
                                    </div>
                                </div>

                            </CardContent>
                        </Card>

                        {/* Content & Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Description */}
                            <Card className="md:col-span-2 border-0 shadow-md ring-1 ring-gray-100">
                                <div className="bg-gradient-to-r from-purple-50 to-white px-6 py-4 border-b flex items-center gap-2">
                                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900">Description</h3>
                                </div>
                                <CardContent className="p-6 space-y-4">
                                    <div className="bg-gray-50 p-2 rounded-t-lg border border-b-0 flex gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"><span className="font-bold">B</span></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"><span className="italic">I</span></Button>
                                    </div>
                                    <div className="relative group/desc">
                                        <Textarea
                                            name="description"
                                            placeholder="Describe highlights, what's included..."
                                            value={formData.description || ''}
                                            onChange={(e) => updateFormData('description', e.target.value)}
                                            className={cn("min-h-[200px] border-t-0 rounded-t-none focus-visible:ring-0 rounded-b-xl resize-y relative z-10", getInputStyle(formData.description))}
                                        />
                                        <div className="absolute bottom-2 right-3 text-xs text-gray-400 bg-white/80 px-1.5 py-0.5 rounded pointer-events-none z-20 border border-gray-100 shadow-sm">
                                            {formData.description?.length || 0} characters
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Settings & Visibility */}
                            <div className="space-y-8">
                                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow ring-1 ring-gray-200/50 group">
                                    <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b flex items-center gap-3">
                                        <div className="p-2 bg-gray-100 rounded-lg text-gray-600 group-hover:scale-110 transition-transform">
                                            <Settings className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900">Settings</h3>
                                    </div>
                                    <CardContent className="p-6 space-y-6">

                                        <div className="flex flex-col gap-3 p-3 rounded-lg border border-indigo-100 bg-indigo-50/30">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="is_public"
                                                    checked={formData.is_public}
                                                    onCheckedChange={(checked) => updateFormData('is_public', !!checked)}
                                                    className="w-5 h-5 border-indigo-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                />
                                                <Label htmlFor="is_public" className="cursor-pointer font-medium text-gray-900">
                                                    Public Visibility
                                                </Label>
                                            </div>
                                            <p className="text-xs text-indigo-600/80 ml-7">
                                                Show this package to customers in search results
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="use_feature_image"
                                                    checked={useFeatureImage}
                                                    onCheckedChange={(checked) => {
                                                        setUseFeatureImage(!!checked);
                                                        if (!checked) updateFormData('feature_image_url', '');
                                                    }}
                                                    className="w-5 h-5"
                                                />
                                                <Label htmlFor="use_feature_image" className="cursor-pointer font-medium text-gray-700">
                                                    Custom Feature Image
                                                </Label>
                                            </div>

                                            {useFeatureImage && (
                                                <div className="ml-7 animate-in fade-in slide-in-from-top-2">
                                                    <Input
                                                        placeholder="Image URL..."
                                                        value={formData.feature_image_url || ''}
                                                        onChange={(e) => updateFormData('feature_image_url', e.target.value)}
                                                        className="h-9 text-xs"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="hidden"></div>
                            </div>
                        </div>

                    </div>
                )
                }

                {/* STEP 2: Itinerary */}
                {
                    activeStep === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                            {packageId ? (
                                <ItineraryBuilder
                                    packageId={packageId}
                                    durationDays={formData.duration_days}
                                />
                            ) : (
                                <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">Package not saved</h3>
                                    <p className="text-gray-500 mb-6">Please save the basic details first to start building the itinerary.</p>
                                    <Button onClick={() => setActiveStep(1)} variant="outline">
                                        Go to Basic Info
                                    </Button>
                                </div>
                            )}
                            <div className="mt-8 flex justify-between">
                                <Button variant="outline" onClick={() => setActiveStep(1)}>
                                    Back to Basic Info
                                </Button>
                                <Button onClick={() => setActiveStep(3)} className="bg-blue-600 hover:bg-blue-700">
                                    Continue to Review
                                </Button>
                            </div>
                        </div>
                    )
                }

                {/* STEP 3: Review */}
                {
                    activeStep === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-3xl mx-auto">
                            <Card className="border-0 shadow-lg">
                                <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-xl p-8">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className="bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 border-0">
                                                    {CATEGORIES.find(c => c.id === formData.category)?.label || formData.category}
                                                </Badge>
                                                {formData.is_public ? (
                                                    <Badge className="bg-green-500/20 text-green-100 border-0">Public</Badge>
                                                ) : (
                                                    <Badge className="bg-red-500/20 text-red-100 border-0">Draft</Badge>
                                                )}
                                            </div>
                                            <CardTitle className="text-3xl font-bold mb-2">{formData.title}</CardTitle>
                                            <div className="flex items-center gap-4 text-gray-300 text-sm">
                                                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {formData.destination}, {formData.country}</span>
                                                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formData.duration_days} Days</span>
                                                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Max {formData.max_group_size}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">Price per person</p>
                                            <p className="text-3xl font-bold">₹{formData.price_per_person.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Description</h3>
                                        <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                                            {formData.description || "No description provided."}
                                        </p>
                                    </div>

                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
                                        <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-medium text-yellow-800">Ready to Publish?</h4>
                                            <p className="text-sm text-yellow-700 mt-1">
                                                Make sure you have added itinerary activities for all {formData.duration_days} days.
                                                Once published, this package will be visible to your customers.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button variant="outline" className="flex-1 h-12" onClick={() => setActiveStep(2)}>
                                            Back to Itinerary
                                        </Button>
                                        <Button
                                            onClick={handlePublish}
                                            className="flex-[2] h-12 bg-green-600 hover:bg-green-700 text-white text-lg shadow-lg shadow-green-200"
                                        >
                                            <CheckCircle className="w-5 h-5 mr-2" />
                                            Publish Package
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
            </div>

            {/* Enhanced Sticky Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] z-[100]">
                <div className="container mx-auto max-w-5xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <Button
                            variant="ghost"
                            onClick={headerBack}
                            className="text-gray-500 hover:text-gray-900 font-medium px-4 h-11"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Basic Info
                        </Button>
                        <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                        <span className="text-sm text-gray-500 flex items-center gap-2 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Auto-saved Recently
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => handleSaveDraft(false)}
                            disabled={!isBasicInfoValid() || saving}
                            className="h-11 px-6 border-gray-300 hover:bg-gray-50 font-medium text-gray-700"
                        >
                            <Save className="w-4 h-4 mr-2 text-gray-500" />
                            {saving ? 'Saving...' : 'Save Draft'}
                        </Button>
                        <Button
                            onClick={() => activeStep === 3 ? handlePublish() : setActiveStep(activeStep + 1)}
                            disabled={!isBasicInfoValid() || saving}
                            className="h-11 px-8 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold shadow-lg shadow-indigo-200 transition-all hover:translate-y-[-2px] hover:shadow-xl hover:shadow-indigo-300/50"
                        >
                            {activeStep === 3 ? (
                                <>Publish Package <CheckCircle className="w-4 h-4 ml-2" /></>
                            ) : (
                                <>Continue to {activeStep === 1 ? 'Itinerary' : 'Review'} <ArrowRight className="w-4 h-4 ml-2" /></>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div >
    )

    function headerBack() {
        router.push('/agent/packages')
    }
}
