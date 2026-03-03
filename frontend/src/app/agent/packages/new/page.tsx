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
    Mountain, Palmtree, Landmark, Coffee, Tent, Building2, ChevronRight,
    Trash2, GripVertical, ChevronUp, ChevronDown
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
    trip_style: string
    price_per_person: number
    description: string
    is_public: boolean
    feature_image_url?: string
    package_mode: string
    destinations: { city: string; country: string; days: number }[]
    activities: string[]
    included_items: string[]
    slug: string
    gst_applicable: boolean
    gst_percentage: number
    gst_mode: string
}

const TRIP_STYLES = [
    { id: 'Adventure', icon: '🎒', label: 'Adventure' },
    { id: 'Leisure', icon: '🏖️', label: 'Leisure' },
    { id: 'Cultural', icon: '🏛️', label: 'Cultural' },
    { id: 'Family', icon: '👨‍👩‍👧', label: 'Family' },
    { id: 'Honeymoon', icon: '💑', label: 'Honeymoon' },
    { id: 'Luxury', icon: '⭐', label: 'Luxury' },
    { id: 'Wellness', icon: '🧘', label: 'Wellness' },
    { id: 'Group Tour', icon: '🤝', label: 'Group Tour' },
    { id: 'Corporate', icon: '💼', label: 'Corporate' }
]

const ACTIVITIES = [
    { id: 'Beach', label: 'Beach', icon: '🏖️' },
    { id: 'Mountain', label: 'Mountain', icon: '⛰️' },
    { id: 'Trekking', label: 'Trekking', icon: '🥾' },
    { id: 'Heritage', label: 'Heritage', icon: '🏛️' },
    { id: 'Nature', label: 'Nature', icon: '🌿' },
    { id: 'Food & Culinary', label: 'Food & Culinary', icon: '🍽️' },
    { id: 'City Tour', label: 'City Tour', icon: '🏙️' },
    { id: 'Snow', label: 'Snow', icon: '❄️' },
    { id: 'Pilgrimage', label: 'Pilgrimage', icon: '🛕' },
    { id: 'Water Sports', label: 'Water Sports', icon: '🌊' },
    { id: 'Safari', label: 'Safari', icon: '🦁' },
    { id: 'Cycling', label: 'Cycling', icon: '🚴' },
    { id: 'Wine Tour', label: 'Wine Tour', icon: '🍷' },
    { id: 'Photography', label: 'Photography', icon: '📸' },
    { id: 'Festivals', label: 'Festivals', icon: '🎭' }
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
        trip_style: '',
        price_per_person: 0,
        description: '',
        is_public: false,
        feature_image_url: '',
        package_mode: 'single',
        destinations: [],
        activities: [],
        included_items: [],
        slug: '',
        gst_applicable: false,
        gst_percentage: 18,
        gst_mode: 'exclusive'
    })

    // Whether agent has GST set to Applicable in Settings — controls GST section visibility
    const [agentGstApplicable, setAgentGstApplicable] = useState<boolean | null>(null)

    // Load existing package data if editing
    useEffect(() => {
        if (editPackageId) {
            loadPackageData(editPackageId)
        }
    }, [editPackageId])

    // Auto-populate GST defaults from agent settings
    // - For NEW packages: always apply agent settings
    // - For EXISTING packages: applied inside loadPackageData if pkg hasn't explicitly set GST
    useEffect(() => {
        if (editPackageId) return // Edit mode: loadPackageData handles it

        const token = localStorage.getItem('token')
        if (!token) return

        const applyAgentGstDefaults = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/v1/agent/settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (!res.ok) return
                const data = await res.json()

                const applicable = Boolean(data.gst_applicable)
                setAgentGstApplicable(applicable)
                setFormData(prev => ({
                    ...prev,
                    gst_applicable: applicable,
                    // Decimal type from Python serializes as string "18.00" — parse to number
                    gst_percentage: Number(data.gst_percentage) || 18,
                    gst_mode: data.gst_inclusive ? 'inclusive' : 'exclusive'
                }))
            } catch {
                // silently skip — defaults already set in useState
            }
        }

        applyAgentGstDefaults()
        // Run on mount only (editPackageId is null for new packages)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Load AI-generated package data if coming from AI Assistant
    useEffect(() => {
        const fromAI = searchParams.get('from')
        if (fromAI === 'ai') {
            const aiPackageData = localStorage.getItem('ai_generated_package')
            if (aiPackageData) {
                try {
                    const packageData = JSON.parse(aiPackageData)

                    // Pre-fill form with AI data
                    setFormData({
                        title: packageData.packageTitle || '',
                        destination: packageData.destination || '',
                        country: packageData.country || '',
                        duration_days: packageData.duration?.days || 7,
                        duration_nights: packageData.duration?.nights || 6,
                        trip_style: packageData.trip_style || 'Adventure',
                        price_per_person: packageData.pricePerPerson || 0,
                        description: packageData.packageOverview || '',
                        is_public: true,
                        feature_image_url: '',
                        package_mode: 'single',
                        destinations: [],
                        activities: [],
                        included_items: [],
                        slug: '',
                        gst_applicable: false,
                        gst_percentage: 18,
                        gst_mode: 'exclusive'
                    })

                    // Store itinerary data for the itinerary builder
                    if (packageData.itinerary) {
                        localStorage.setItem('ai_itinerary_data', JSON.stringify(packageData.itinerary))
                    }

                    // Store highlights, inclusions, exclusions
                    if (packageData.highlights) {
                        localStorage.setItem('ai_highlights', JSON.stringify(packageData.highlights))
                    }
                    if (packageData.inclusions) {
                        localStorage.setItem('ai_inclusions', JSON.stringify(packageData.inclusions))
                    }
                    if (packageData.exclusions) {
                        localStorage.setItem('ai_exclusions', JSON.stringify(packageData.exclusions))
                    }

                    // Clear the AI package data after loading (but keep itinerary data for ItineraryBuilder)
                    localStorage.removeItem('ai_generated_package')

                    toast.success('AI-generated package loaded! Review and customize as needed.')
                } catch (error) {
                    console.error('Error loading AI package:', error)
                    toast.error('Failed to load AI-generated package')
                }
            }
        }
    }, [searchParams])

    // Auto-generate slug from title
    useEffect(() => {
        if (formData.title && !formData.slug) {
            updateFormData('slug', formData.title.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
        }
    }, [formData.title, formData.slug])

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
                // Detect whether GST has been explicitly configured on this package (null = never set)
                const gstNeverSet = pkg.gst_applicable === null || pkg.gst_applicable === undefined
                let gstApplicable: boolean = Boolean(pkg.gst_applicable)
                let gstPercentage: number = Number(pkg.gst_percentage) || 18
                let gstMode: string = pkg.gst_mode || 'exclusive'

                if (gstNeverSet && token) {
                    // Package GST was never explicitly set — fetch agent defaults from Settings
                    try {
                        const settingsRes = await fetch('http://localhost:8000/api/v1/agent/settings', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        })
                        if (settingsRes.ok) {
                            const settings = await settingsRes.json()
                            gstApplicable = Boolean(settings.gst_applicable)
                            gstPercentage = Number(settings.gst_percentage) || 18
                            gstMode = settings.gst_inclusive ? 'inclusive' : 'exclusive'
                            setAgentGstApplicable(Boolean(settings.gst_applicable))
                        }
                    } catch { /* silently use form defaults */ }
                } else {
                    // Package has own GST config — fetch agent settings just for visibility control
                    try {
                        const token2 = localStorage.getItem('token')
                        const settingsRes = await fetch('http://localhost:8000/api/v1/agent/settings', {
                            headers: { 'Authorization': `Bearer ${token2 || ''}` }
                        })
                        if (settingsRes.ok) {
                            const settings = await settingsRes.json()
                            setAgentGstApplicable(Boolean(settings.gst_applicable))
                        }
                    } catch { /* ignore */ }
                }

                setFormData({
                    title: pkg.title || '',
                    destination: pkg.destination || '',
                    country: pkg.country || '',
                    duration_days: pkg.duration_days || 7,
                    duration_nights: pkg.duration_nights || 6,
                    trip_style: pkg.trip_style || 'Adventure',
                    price_per_person: pkg.price_per_person || 0,
                    description: pkg.description || '',
                    is_public: pkg.is_public !== undefined ? pkg.is_public : true,
                    feature_image_url: pkg.feature_image_url || '',
                    package_mode: pkg.package_mode || 'single',
                    destinations: pkg.destinations || [],
                    activities: pkg.activities || [],
                    included_items: pkg.included_items || [],
                    slug: pkg.slug || '',
                    gst_applicable: Boolean(gstApplicable),
                    gst_percentage: gstPercentage,
                    gst_mode: gstMode
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

    const handleAddDestination = () => {
        const newDestinations = [...formData.destinations, { city: '', country: '', days: 1 }]
        setFormData(prev => ({ ...prev, destinations: newDestinations }))
        updateMultiDuration(newDestinations)
    }

    const handleRemoveDestination = (index: number) => {
        const newDestinations = formData.destinations.filter((_, i) => i !== index)
        setFormData(prev => ({ ...prev, destinations: newDestinations }))
        updateMultiDuration(newDestinations)
    }

    const handleUpdateDestination = (index: number, field: string, value: any) => {
        const newDestinations = [...formData.destinations]
        newDestinations[index] = { ...newDestinations[index], [field]: value }
        setFormData(prev => ({ ...prev, destinations: newDestinations }))

        if (field === 'days') {
            updateMultiDuration(newDestinations)
        }
    }

    const handleMoveDestination = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === formData.destinations.length - 1) return

        const newDestinations = [...formData.destinations]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        const temp = newDestinations[index]
        newDestinations[index] = newDestinations[targetIndex]
        newDestinations[targetIndex] = temp

        setFormData(prev => ({ ...prev, destinations: newDestinations }))
    }

    const updateMultiDuration = (destinations: any[]) => {
        const totalDays = destinations.reduce((sum, dest) => sum + (parseInt(dest.days) || 0), 0)
        setFormData(prev => ({
            ...prev,
            duration_days: totalDays > 0 ? totalDays : 1,
            duration_nights: totalDays > 0 ? totalDays - 1 : 0
        }))
    }

    const toggleActivity = (activity: string) => {
        setFormData(prev => {
            const types = prev.activities.includes(activity)
                ? prev.activities.filter(t => t !== activity)
                : [...prev.activities, activity]
            return { ...prev, activities: types }
        })
    }

    const toggleIncludedItem = (item: string) => {
        setFormData(prev => {
            const items = prev.included_items.includes(item)
                ? prev.included_items.filter(i => i !== item)
                : [...prev.included_items, item]
            return { ...prev, included_items: items }
        })
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
        if (formData.package_mode === 'single') {
            return formData.title && formData.destination && formData.country && formData.price_per_person > 0 && formData.trip_style
        } else {
            return formData.title && formData.destinations.length > 0 && formData.destinations.every(d => d.city && d.country && d.days > 0) && formData.price_per_person > 0 && formData.trip_style
        }
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
        <div className="min-h-screen pb-32 overflow-x-hidden">
            {/* Header */}
            <div className="glass-navbar sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col gap-6">
                        {/* Top Row: Back Button */}
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/agent/packages')}
                                className="text-slate-500 hover:text-slate-900 -ml-2 hover:bg-white/50"
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
                                        className="bg-white border-gray-200 text-gray-700 hover:bg-transparent"
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
                        <Card className="glass-panel border-0 shadow-lg overflow-hidden group rounded-3xl">
                            <div className="bg-gradient-to-r from-blue-50/20 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-3">
                                <div className="p-2 bg-blue-100/50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Overview</h3>
                                    <p className="text-xs text-gray-500">Essential package details</p>
                                </div>
                            </div>
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Package Type Toggle */}
                                <div className="space-y-3 md:col-span-2 mb-2">
                                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Package Type <span className="text-red-500">*</span></Label>
                                    <div className="flex p-1 bg-gray-100 rounded-lg max-w-sm">
                                        <button
                                            type="button"
                                            onClick={() => updateFormData('package_mode', 'single')}
                                            className={cn(
                                                "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                                formData.package_mode === 'single' ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            <MapPin className="w-4 h-4" />
                                            Single Destination
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateFormData('package_mode', 'multi')}
                                            className={cn(
                                                "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                                formData.package_mode === 'multi' ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            <Globe className="w-4 h-4" />
                                            Multi Destination
                                        </button>
                                    </div>
                                </div>

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
                                            className={cn("glass-input pl-10 h-12 rounded-xl", getInputStyle(formData.title, true))}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-gray-400">
                                            {formData.title.length}/100
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">Create an engaging title that highlights the experience</p>
                                </div>

                                {formData.package_mode === 'single' && (
                                    <>
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
                                                    className="glass-input pl-10 h-11 border-gray-200 rounded-xl"
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
                                                    <SelectTrigger className="glass-input pl-10 h-11 border-gray-200 rounded-xl">
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
                                    </>
                                )}

                                {formData.package_mode === 'multi' && (
                                    <div className="md:col-span-2 space-y-4 mt-2">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Destination Legs <span className="text-red-500">*</span></Label>
                                            <Button type="button" variant="outline" size="sm" onClick={handleAddDestination} className="h-8 text-xs border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                                + Add Leg
                                            </Button>
                                        </div>

                                        {formData.destinations.length === 0 && (
                                            <div className="text-center py-8 bg-transparent rounded-xl border border-dashed border-gray-200">
                                                <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">No destinations added yet.</p>
                                                <p className="text-xs text-gray-400">Click the button above to start building your multi-destination tour.</p>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {formData.destinations.map((dest, index) => (
                                                <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-white/60 backdrop-blur-sm border border-white/70 rounded-2xl shadow-sm relative group overflow-hidden">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl"></div>

                                                    {/* Drag Handle & Order */}
                                                    <div className="flex flex-col items-center justify-center px-1">
                                                        <span className="text-xs font-bold text-gray-400 mb-1">#{index + 1}</span>
                                                        <div className="flex flex-col">
                                                            <button type="button" onClick={() => handleMoveDestination(index, 'up')} disabled={index === 0} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30 p-0.5" title="Move Up">
                                                                <ChevronUp className="w-4 h-4" />
                                                            </button>
                                                            <button type="button" onClick={() => handleMoveDestination(index, 'down')} disabled={index === formData.destinations.length - 1} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30 p-0.5" title="Move Down">
                                                                <ChevronDown className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                                                        <div className="sm:col-span-5 space-y-1">
                                                            <Label className="text-[10px] text-gray-500 uppercase">City / Area</Label>
                                                            <Input
                                                                placeholder="e.g. Kyoto"
                                                                value={dest.city}
                                                                onChange={(e) => handleUpdateDestination(index, 'city', e.target.value)}
                                                                className="h-9 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500"
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-4 space-y-1">
                                                            <Label className="text-[10px] text-gray-500 uppercase">Country</Label>
                                                            <Select value={dest.country} onValueChange={(val) => handleUpdateDestination(index, 'country', val)}>
                                                                <SelectTrigger className="h-9 text-sm focus:ring-1 focus:ring-indigo-500">
                                                                    <SelectValue placeholder="Country" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {Country.getAllCountries().map((c) => (
                                                                        <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="sm:col-span-3 space-y-1">
                                                            <Label className="text-[10px] text-gray-500 uppercase">Days Here</Label>
                                                            <div className="flex items-center">
                                                                <Input
                                                                    type="number" min="1"
                                                                    value={dest.days}
                                                                    onChange={(e) => handleUpdateDestination(index, 'days', parseInt(e.target.value) || 1)}
                                                                    className="h-9 text-sm text-center pr-8 focus-visible:ring-1 focus-visible:ring-indigo-500"
                                                                />
                                                                <span className="text-xs text-gray-500 -ml-10 pointer-events-none">days</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center sm:pl-2 sm:border-l border-gray-50 pt-3 sm:pt-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveDestination(index)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors w-full sm:w-auto flex justify-center"
                                                            title="Remove Leg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Summary Bar */}
                                            {formData.destinations.length > 0 && (
                                                <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex justify-between items-center text-sm shadow-sm">
                                                    <span className="font-medium text-indigo-700">Trip Summary</span>
                                                    <div className="flex gap-4 text-indigo-600/80">
                                                        <span><strong>{formData.destinations.reduce((sum, d) => sum + (parseInt(d.days as any) || 0), 0)}</strong> Days</span>
                                                        <span><strong>{formData.destinations.reduce((sum, d) => sum + (parseInt(d.days as any) || 0), 0) - 1 > 0 ? formData.destinations.reduce((sum, d) => sum + (parseInt(d.days as any) || 0), 0) - 1 : 0}</strong> Nights</span>
                                                        <span><strong>{new Set(formData.destinations.filter(d => d.country).map(d => d.country)).size}</strong> Countries</span>
                                                        <span><strong>{formData.destinations.filter(d => d.city).length}</strong> Cities</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Logistics & Pricing */}
                        <Card className="glass-panel border-0 shadow-lg overflow-hidden group rounded-3xl mt-8">
                            <div className="bg-gradient-to-r from-emerald-50/20 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-3">
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
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Duration <span className="text-red-500">*</span></Label>
                                        {formData.package_mode === 'multi' && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase font-bold tracking-widest">Auto</span>}
                                    </div>
                                    <div className="flex rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                                        <div className="flex-1 border-r border-gray-200 bg-white/5 relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Calendar className="h-4 w-4 text-gray-500" />
                                            </div>
                                            <Input
                                                type="number"
                                                min="1"
                                                readOnly={formData.package_mode === 'multi'}
                                                value={formData.duration_days}
                                                onChange={(e) => updateFormData('duration_days', parseInt(e.target.value))}
                                                className={cn("pl-10 h-12 border-0 bg-transparent focus-visible:ring-0 text-center font-medium", formData.package_mode === 'multi' && "opacity-80 cursor-not-allowed")}
                                            />
                                            <span className="absolute right-3 top-3 text-xs text-gray-500 pointer-events-none">Days</span>
                                        </div>
                                        <div className="flex-1 bg-white relative group">
                                            <Input
                                                type="number"
                                                min="0"
                                                readOnly={formData.package_mode === 'multi'}
                                                value={formData.duration_nights}
                                                onChange={(e) => updateFormData('duration_nights', parseInt(e.target.value))}
                                                className={cn("pl-4 h-12 border-0 bg-transparent focus:ring-0 text-center font-medium text-gray-600", formData.package_mode === 'multi' && "bg-white/5 opacity-80 cursor-not-allowed")}
                                            />
                                            <span className="absolute right-3 top-3 text-xs text-gray-500 pointer-events-none">Nights</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">{formData.package_mode === 'multi' ? "Auto-calculated from destination legs" : "Auto-calculates nights based on days"}</p>
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

                                {/* GST Configuration — visibility controlled by Agent Settings */}
                                {agentGstApplicable === true && (
                                    <div className="space-y-3 md:col-span-2">
                                        <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">GST Configuration</Label>
                                        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-4">
                                            {/* GST Percentage */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">GST Percentage</Label>
                                                <div className="flex items-center gap-2">
                                                    {[5, 12, 18].map(pct => (
                                                        <button
                                                            key={pct}
                                                            type="button"
                                                            onClick={() => updateFormData('gst_percentage', pct)}
                                                            className={cn(
                                                                "px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all",
                                                                formData.gst_percentage === pct
                                                                    ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                                                                    : "border-gray-200 bg-white text-gray-500 hover:border-indigo-300"
                                                            )}
                                                        >
                                                            {pct}%
                                                        </button>
                                                    ))}
                                                    <div className="relative flex-1 max-w-[120px]">
                                                        <Input
                                                            type="number" min="0" max="100" step="0.01"
                                                            value={formData.gst_percentage}
                                                            onChange={(e) => updateFormData('gst_percentage', parseFloat(e.target.value) || 0)}
                                                            className="h-10 pr-8 text-sm font-bold rounded-lg"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* GST Mode */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">GST Mode</Label>
                                                <div className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateFormData('gst_mode', 'exclusive')}
                                                        className={cn(
                                                            "flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all text-left",
                                                            formData.gst_mode === 'exclusive'
                                                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                                        )}
                                                    >
                                                        <div className="font-bold">Exclusive</div>
                                                        <div className="text-[11px] opacity-70">GST added on top of price</div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateFormData('gst_mode', 'inclusive')}
                                                        className={cn(
                                                            "flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all text-left",
                                                            formData.gst_mode === 'inclusive'
                                                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                                        )}
                                                    >
                                                        <div className="font-bold">Inclusive</div>
                                                        <div className="text-[11px] opacity-70">Price already includes GST</div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Live Preview */}
                                            {formData.price_per_person > 0 && (
                                                <div className="mt-2 p-3 bg-white rounded-lg border border-indigo-100 text-sm">
                                                    {formData.gst_mode === 'exclusive' ? (
                                                        <>
                                                            <span className="font-medium text-gray-700">Preview: </span>
                                                            <span className="text-gray-600">₹{formData.price_per_person.toLocaleString('en-IN')}</span>
                                                            <span className="text-gray-400 mx-1">+</span>
                                                            <span className="text-amber-600">₹{(formData.price_per_person * formData.gst_percentage / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} GST ({formData.gst_percentage}%)</span>
                                                            <span className="text-gray-400 mx-1">=</span>
                                                            <span className="font-bold text-emerald-700">₹{(formData.price_per_person * (1 + formData.gst_percentage / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })} per person</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="font-medium text-gray-700">Preview: </span>
                                                            <span className="font-bold text-emerald-700">₹{formData.price_per_person.toLocaleString('en-IN')}</span>
                                                            <span className="text-gray-500 ml-1">(GST {formData.gst_percentage}% included)</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3 md:col-span-2">
                                    <div>
                                        <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">TRIP STYLE <span className="text-red-500">*</span></Label>
                                        <p className="text-[11px] text-gray-500 mt-0.5">Who is this package designed for?</p>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                        {TRIP_STYLES.map((style) => {
                                            const isSelected = formData.trip_style === style.id
                                            return (
                                                <div
                                                    key={style.id}
                                                    onClick={() => updateFormData('trip_style', style.id)}
                                                    className={cn(
                                                        "cursor-pointer rounded-xl border p-3 flex flex-col items-center gap-2 transition-all hover:border-indigo-300 hover:bg-indigo-50",
                                                        isSelected ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 text-indigo-700 shadow-sm" : "border-gray-200 text-gray-600 bg-white"
                                                    )}
                                                >
                                                    <span className={cn("text-2xl transition-all", isSelected ? "scale-110" : "grayscale opacity-80")}>{style.icon}</span>
                                                    <span className="text-xs font-medium text-center">{style.label}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Activities (Multi-select Chips) */}
                                <div className="space-y-3 md:col-span-2 mt-4 pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">ACTIVITIES <span className="text-gray-400 font-normal normal-case">(Optional)</span></Label>
                                            <p className="text-[11px] text-gray-500 mt-0.5">What will customers do on this trip? (Helps with search & discovery)</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {ACTIVITIES.map((activity) => {
                                            const isSelected = formData.activities.includes(activity.id)
                                            return (
                                                <Badge
                                                    key={activity.id}
                                                    variant="outline"
                                                    className={cn(
                                                        "cursor-pointer px-4 py-2 text-sm font-medium transition-all group rounded-full",
                                                        isSelected ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm"
                                                    )}
                                                    onClick={() => toggleActivity(activity.id)}
                                                >
                                                    <span className="mr-2 text-base">{activity.icon}</span>
                                                    {activity.label}
                                                </Badge>
                                            )
                                        })}
                                    </div>
                                    {/* Warnings based on selection count */}
                                    {formData.activities.length === 0 && (
                                        <p className="text-[11px] text-amber-600 flex items-center gap-1.5 bg-amber-50 p-2 rounded-md w-fit">
                                            <Info className="w-3 h-3" />
                                            Adding activities helps customers discover your package.
                                        </p>
                                    )}
                                    {formData.activities.length > 6 && (
                                        <p className="text-[11px] text-amber-600 flex items-center gap-1.5 bg-amber-50 p-2 rounded-md w-fit">
                                            <Info className="w-3 h-3" />
                                            You've added several activities — make sure they all apply!
                                        </p>
                                    )}
                                </div>

                                {/* Price Includes Checklist */}
                                <div className="space-y-4 md:col-span-2 mt-4 border-t border-gray-100 pt-6">
                                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Price Includes</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {['Flights', 'Hotels', 'Transfers', 'Meals', 'Sightseeing', 'Guide', 'Visa', 'Insurance'].map((item) => (
                                            <div key={item} className="flex items-center space-x-3 bg-white/5 p-2.5 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                                                <Checkbox
                                                    id={`include-${item}`}
                                                    checked={formData.included_items.includes(item)}
                                                    onCheckedChange={() => toggleIncludedItem(item)}
                                                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white data-[state=checked]:border-none shadow-sm h-5 w-5"
                                                />
                                                <label
                                                    htmlFor={`include-${item}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-700"
                                                >
                                                    {item}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>



                            </CardContent>
                        </Card>

                        {/* Content & Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Description */}
                            <Card className="glass-panel md:col-span-2 border-0 shadow-lg rounded-3xl overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-50/20 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-2">
                                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900">Description</h3>
                                </div>
                                <CardContent className="p-6 space-y-4">
                                    <div className="bg-transparent p-2 rounded-t-lg border border-b-0 flex gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"><span className="font-bold">B</span></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"><span className="italic">I</span></Button>
                                    </div>
                                    <div className="relative group/desc">
                                        <Textarea
                                            name="description"
                                            placeholder="Describe highlights, what's included..."
                                            value={formData.description || ''}
                                            onChange={(e) => updateFormData('description', e.target.value)}
                                            className={cn("glass-input min-h-[200px] border-t-0 rounded-t-none rounded-b-xl resize-y relative z-10", getInputStyle(formData.description))}
                                        />
                                        <div className="absolute bottom-2 right-3 text-xs text-gray-400 bg-white/80 px-1.5 py-0.5 rounded pointer-events-none z-20 border border-gray-100 shadow-sm">
                                            {formData.description?.length || 0} characters
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Settings & Visibility */}
                            <div className="space-y-8">
                                <Card className="glass-panel border-0 shadow-lg rounded-3xl group">
                                    <div className="bg-gradient-to-r from-gray-50/20 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-3">
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
                                                <div className="ml-7 animate-in fade-in slide-in-from-top-2 space-y-2">
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    try {
                                                                        const formData = new FormData();
                                                                        formData.append('file', file);

                                                                        // Show loading toast
                                                                        const toastId = toast.loading('Uploading image...');

                                                                        const token = localStorage.getItem('token');
                                                                        const response = await fetch('http://localhost:8000/api/v1/upload', {
                                                                            method: 'POST',
                                                                            headers: {
                                                                                'Authorization': `Bearer ${token}`
                                                                            },
                                                                            body: formData
                                                                        });

                                                                        if (!response.ok) throw new Error('Upload failed');

                                                                        const data = await response.json();
                                                                        updateFormData('feature_image_url', data.url);
                                                                        toast.update(toastId, { render: 'Image uploaded successfully', type: 'success', isLoading: false, autoClose: 3000 });
                                                                    } catch (error) {
                                                                        console.error('Upload error:', error);
                                                                        toast.dismiss();
                                                                        toast.error('Failed to upload image');
                                                                    }
                                                                }
                                                            }}
                                                            className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                        />
                                                    </div>
                                                    <div className="text-xs text-gray-500 text-center">- OR -</div>
                                                    <Input
                                                        placeholder="Enter Image URL manually..."
                                                        value={formData.feature_image_url || ''}
                                                        onChange={(e) => updateFormData('feature_image_url', e.target.value)}
                                                        className="glass-input h-9 text-xs"
                                                    />
                                                    {formData.feature_image_url && (
                                                        <div className="mt-2 rounded-md overflow-hidden border border-gray-200">
                                                            <img
                                                                src={formData.feature_image_url}
                                                                alt="Feature preview"
                                                                className="w-full h-32 object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Invalid+Image+URL';
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

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
                                    packageMode={formData.package_mode}
                                    destinations={formData.destinations}
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
                            <Card className="glass-panel border-0 shadow-lg">
                                <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-xl p-8">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className="bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 border-0 flex items-center gap-1.5 py-1 px-3">
                                                    <span>{TRIP_STYLES.find(c => c.id === formData.trip_style)?.icon}</span>
                                                    {TRIP_STYLES.find(c => c.id === formData.trip_style)?.label || formData.trip_style}
                                                </Badge>
                                                {formData.is_public ? (
                                                    <Badge className="bg-green-500/20 text-green-100 border-0">Public</Badge>
                                                ) : (
                                                    <Badge className="bg-red-500/20 text-red-100 border-0">Draft</Badge>
                                                )}
                                            </div>
                                            <CardTitle className="text-3xl font-bold mb-2">{formData.title}</CardTitle>
                                            <div className="flex flex-wrap items-center gap-4 text-gray-300 text-sm">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {formData.package_mode === 'multi' && formData.destinations.length > 0
                                                        ? `${formData.destinations.map(d => d.city).join(' → ')}`
                                                        : `${formData.destination}, ${formData.country}`
                                                    }
                                                </span>
                                                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formData.duration_days} Days</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">Price per person</p>
                                            <p className="text-3xl font-bold">₹{formData.price_per_person.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Description</h3>
                                            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                                                {formData.description || "No description provided."}
                                            </p>
                                        </div>
                                        <div className="space-y-6">
                                            {formData.activities.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Activities</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {formData.activities.map(activityId => {
                                                            const activityInfo = ACTIVITIES.find(a => a.id === activityId)
                                                            return activityInfo ? (
                                                                <Badge key={activityId} variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors rounded-full px-3 py-1">
                                                                    <span className="mr-1.5">{activityInfo.icon}</span> {activityInfo.label}
                                                                </Badge>
                                                            ) : null
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {formData.included_items.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Price Includes</h3>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {formData.included_items.map(item => (
                                                            <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                                {item}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
            <div className="fixed bottom-0 left-0 right-0 p-4 z-[100]" style={{ background: 'rgba(255, 255, 255, 0.15)', borderTop: '1px solid rgba(255, 255, 255, 0.20)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
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
                        <span className="text-sm text-gray-500 flex items-center gap-2 font-medium bg-transparent px-3 py-1.5 rounded-full border border-gray-100">
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
                            className="h-11 px-6 rounded-full border border-violet-300 text-violet-700 bg-transparent hover:bg-violet-50 font-medium"
                        >
                            <Save className="w-4 h-4 mr-2 text-gray-500" />
                            {saving ? 'Saving...' : 'Save Draft'}
                        </Button>
                        <Button
                            onClick={() => activeStep === 3 ? handlePublish() : setActiveStep(activeStep + 1)}
                            disabled={!isBasicInfoValid() || saving}
                            className="h-auto font-bold text-white transition-all hover:-translate-y-0.5"
                            style={{ background: 'linear-gradient(135deg, #7c5cfc, #6c47ff)', boxShadow: '0 8px 32px rgba(108,71,255,0.50)', borderRadius: '100px', padding: '16px 40px' }}
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