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
    Circle, CheckCircle, CheckCircle2, Image as ImageIcon, Briefcase,
    Mountain, Palmtree, Landmark, Coffee, Tent, Building2, ChevronRight,
    Trash2, GripVertical, ChevronUp, ChevronDown, Plane, Hotel, Utensils,
    Camera, UserCheck, FileCheck, ShieldCheck, Upload, Link2, Car, Plus, Map, Moon
} from 'lucide-react'
import { ItineraryBuilder } from '@/components/admin/ItineraryBuilder'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { API_URL } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Country } from 'country-state-city'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { compressImage, uploadToS3 } from '@/lib/image-upload-utils'

interface PackageFormData {
    title: string
    destination: string
    country: string
    duration_days: number
    duration_nights: number
    trip_styles: string[]
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
    // Flight Configuration
    flights_enabled: boolean
    flight_origin_cities: string[]
    flight_cabin_class: string
    flight_price_included: boolean
    flight_baggage_note: string
    // Cancellation Policy
    cancellation_enabled: boolean
    cancellation_rules: { daysBefore: number; refundPercentage: number; fareType?: 'total_fare' | 'base_fare' }[]
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
    const [tripStyleError, setTripStyleError] = useState(false)

    // Multi-Destination Drag & Drop State
    const [draggedLegIndex, setDraggedLegIndex] = useState<number | null>(null)
    const [dragOverLegIndex, setDragOverLegIndex] = useState<number | null>(null)
    const [originInput, setOriginInput] = useState('')

    const [formData, setFormData] = useState<PackageFormData>({
        title: '',
        destination: '',
        country: '',
        duration_days: 7,
        duration_nights: 6,
        trip_styles: [], price_per_person: 0,
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
        gst_mode: 'exclusive',
        // Flight Defaults
        flights_enabled: false,
        flight_origin_cities: [],
        flight_cabin_class: 'ECONOMY',
        flight_price_included: false,
        flight_baggage_note: '',
        // Cancellation Policy
        cancellation_enabled: false,
        cancellation_rules: []
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
                const res = await fetch(`${API_URL}/api/v1/agent/settings`, {
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
                        trip_styles: packageData.trip_style ? [packageData.trip_style] : ['Adventure'],
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
                        gst_mode: 'exclusive',
                        // Flight Configuration
                        flights_enabled: false,
                        flight_origin_cities: [],
                        flight_cabin_class: 'ECONOMY',
                        flight_price_included: false,
                        flight_baggage_note: '',
                        // Cancellation Policy
                        cancellation_enabled: false,
                        cancellation_rules: []
                    })
                    setOriginInput('')

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
            const response = await fetch(`${API_URL}/api/v1/agent/packages/${id}`, {
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
                        const settingsRes = await fetch(`${API_URL}/api/v1/agent/settings`, {
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
                        const settingsRes = await fetch(`${API_URL}/api/v1/agent/settings`, {
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
                    trip_styles: pkg.trip_styles || (pkg.trip_style ? [pkg.trip_style] : []),
                    price_per_person: Number(pkg.price_per_person) || 0,
                    description: pkg.description || '',
                    is_public: pkg.is_public !== undefined ? pkg.is_public : true,
                    feature_image_url: pkg.feature_image_url || '',
                    package_mode: (pkg.package_mode || 'single').toLowerCase(),
                    destinations: pkg.destinations || [],
                    activities: pkg.activities || [],
                    included_items: pkg.included_items || [],
                    slug: pkg.slug || '',
                    gst_applicable: Boolean(gstApplicable),
                    gst_percentage: gstPercentage,
                    gst_mode: gstMode,
                    // Flight Configuration
                    flights_enabled: pkg.flights_enabled || false,
                    flight_origin_cities: pkg.flight_origin_cities || [],
                    flight_cabin_class: pkg.flight_cabin_class || 'ECONOMY',
                    flight_price_included: pkg.flight_price_included || false,
                    flight_baggage_note: pkg.flight_baggage_note || '',
                    // Cancellation Policy — preserve fareType per rule; default absent ones to 'total_fare' when GST is on
                    cancellation_enabled: pkg.cancellation_enabled || false,
                    cancellation_rules: (pkg.cancellation_rules || []).map((r: any) => ({
                        daysBefore: r.daysBefore ?? 0,
                        refundPercentage: r.refundPercentage ?? 0,
                        ...(gstApplicable && { fareType: r.fareType || 'total_fare' }),
                    }))
                })
                if (pkg.flight_origin_cities) {
                    setOriginInput(pkg.flight_origin_cities.join(', '))
                }
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

    const handleDragStartLeg = (e: React.DragEvent, index: number) => {
        setDraggedLegIndex(index)
        e.dataTransfer.effectAllowed = 'move'
        // Create a transparent image to avoid default drag ghost if needed, or leave default
    }

    const handleDragOverLeg = (e: React.DragEvent, index: number) => {
        e.preventDefault() // Necessary to allow dropping
        if (dragOverLegIndex !== index) {
            setDragOverLegIndex(index)
        }
    }

    const handleDragEndLeg = () => {
        setDraggedLegIndex(null)
        setDragOverLegIndex(null)
    }

    const handleDropLeg = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        if (draggedLegIndex === null || draggedLegIndex === index) {
            setDraggedLegIndex(null)
            setDragOverLegIndex(null)
            return
        }

        const newDestinations = [...formData.destinations]
        const draggedItem = newDestinations[draggedLegIndex]

        newDestinations.splice(draggedLegIndex, 1)
        newDestinations.splice(index, 0, draggedItem)

        setFormData(prev => ({ ...prev, destinations: newDestinations }))
        setDraggedLegIndex(null)
        setDragOverLegIndex(null)
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

    const toggleTripStyle = (styleId: string) => {
        setTripStyleError(false)
        setFormData(prev => {
            const styles = prev.trip_styles.includes(styleId)
                ? prev.trip_styles.filter(s => s !== styleId)
                : [...prev.trip_styles, styleId]
            return { ...prev, trip_styles: styles }
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

    const handleContinueSave = async (targetStep: number) => {
        // Validation check before proceeding
        if (targetStep > activeStep) {
            const missingFields: string[] = [];
            if (!formData.title) missingFields.push("Package Title");
            if (formData.package_mode === 'multi') {
                if (formData.destinations.length === 0) missingFields.push("Destinations");
                else if (formData.destinations.some(d => !d.city || !d.country || (d.days || 0) <= 0)) {
                    missingFields.push("Incomplete Destination Legs");
                }
            } else {
                if (!formData.destination) missingFields.push("Location City");
                if (!formData.country) missingFields.push("Country");
            }
            if (!formData.price_per_person || Number(formData.price_per_person) <= 0) missingFields.push("Price per Person");
            if (formData.trip_styles.length === 0) missingFields.push("Trip Style");

            if (missingFields.length > 0) {
                const warningMsg = `Required fields missing: ${missingFields.join(', ')}`;
                if (packageId) {
                    toast.warning(`${warningMsg}. Proceeding anyway since it's an update.`);
                } else {
                    toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
                    setTripStyleError(formData.trip_styles.length === 0);
                    return;
                }
            }
        }

        setSaving(true)
        try {
            const url = packageId
                ? `${API_URL}/api/v1/agent/packages/${packageId}`
                : `${API_URL}/api/v1/agent/packages`

            const method = packageId ? 'PUT' : 'POST'
            const token = localStorage.getItem('token')

            const sanitisedRules = formData.cancellation_rules.map(r => {
                if (!agentGstApplicable) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { fareType: _dropped, ...rest } = r as any
                    return rest
                }
                return { ...r, fareType: r.fareType || 'total_fare' }
            })

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...formData, cancellation_rules: sanitisedRules })
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

            toast.success(packageId ? 'Package details updated' : 'Package details saved')
            setActiveStep(targetStep) // Advance step only on success

        } catch (error) {
            console.error('Failed to save package:', error)
            toast.error('Failed to save package details. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleSaveDraftOnly = async () => {
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

            if (!response.ok) throw new Error('Failed to save draft')

            toast.success('Draft saved successfully')
            router.push('/agent/packages')
        } catch (error) {
            console.error('Failed to save draft:', error)
            toast.error('Failed to save draft. Please try again.')
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
            const response = await fetch(`${API_URL}/api/v1/agent/packages/${packageId}/status?new_status=published`, {
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
        const hasTitle = Boolean(formData.title);
        const hasPrice = Number(formData.price_per_person) > 0;
        const hasTripStyle = formData.trip_styles.length >= 1;
        const mode = (formData.package_mode || 'single').toLowerCase();

        if (mode === 'single') {
            return hasTitle && Boolean(formData.destination) && Boolean(formData.country) && hasPrice && hasTripStyle;
        } else {
            return hasTitle && formData.destinations.length > 0 && formData.destinations.every(d => d.city && d.country && (Number(d.days) || 0) > 0) && hasPrice && hasTripStyle;
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
        // Prevent skipping ahead without saving basic info
        if (step > 1 && !packageId) {
            if (activeStep === 1 && isBasicInfoValid()) {
                handleContinueSave(step)
            } else {
                toast.info("Please fill required basic info to continue")
            }
            return
        }

        // Auto-save when moving to a different step if we have a package ID
        if (packageId && step !== activeStep) {
            handleContinueSave(step)
        } else {
            setActiveStep(step)
        }
    }

    return (
        <div className="pkg-creation-root min-h-screen pb-32 overflow-x-hidden">
            {/* Header */}
            <div className="glass-navbar sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col gap-6">
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
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex items-end justify-between pb-2">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <span className="text-3xl">🗺️</span>
                                    {packageId ? (
                                        <span className="truncate max-w-xl block" title={formData.title}>
                                            Edit Package: <span className="text-[var(--primary)]">{formData.title || 'Untitled Package'}</span>
                                        </span>
                                    ) : 'Create New Package'}
                                </h1>
                                <p className="text-sm text-gray-500 mt-2 ml-12">
                                    Fill in the details to create a tour package
                                </p>
                            </div>

                            {/* Action Buttons: Publish */}
                            <div className="flex items-center gap-3">
                                {packageId && activeStep === 3 && (
                                    <Button
                                        onClick={handlePublish}
                                        size="sm"
                                        className="bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white shadow-sm"
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Publish
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Stepper Component - Modern Design */}
                        <div className="w-full max-w-3xl mx-auto py-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-white bg-gradient-to-r from-[var(--primary)] to-[#FF9A5C] px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                                        Progress: {activeStep === 1 ? '33%' : activeStep === 2 ? '66%' : '100%'}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest">Step {activeStep} of 3</span>
                            </div>

                            <div className="relative flex items-center justify-between">
                                {/* Background Line */}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-[var(--primary)]/10 rounded-full -z-10" />

                                {/* Active Progress Line */}
                                <div
                                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-[var(--primary)] to-[#FF9A5C] rounded-full -z-10 transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1)"
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
                                                "w-10 -10 rounded-full flex items-center justify-center border-2 transition-all duration-700 z-10",
                                                isCompleted ? "bg-emerald-500 border-white text-white shadow-[0_0_15px_var(--primary-glow)]" :
                                                    isCurrent ? "bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] border-white text-white shadow-[0_0_20px_var(--primary-glow)] scale-110" :
                                                        "bg-white/20 backdrop-blur-md border-white/30 text-gray-500"
                                            )}>
                                                {isCompleted ? <Check className="w-5 h-5" /> : (
                                                    <span className={cn("text-sm font-bold", isCurrent && "animate-pulse")}>{item.step}</span>
                                                )}

                                                {/* Pulsing ring for current */}
                                                {isCurrent && (
                                                    <div className="absolute inset-0 rounded-full border-4 border-[var(--primary)]/30 animate-ping" />
                                                )}
                                            </div>

                                            <div className={cn(
                                                "absolute -bottom-10 flex flex-col items-center transition-all duration-300",
                                                isCurrent ? "opacity-100 transform translate-y-0" : "opacity-60 group-hover:opacity-100"
                                            )}>
                                                <span className={cn(
                                                    "text-[11px] font-bold whitespace-nowrap tracking-tight",
                                                    isCurrent ? "text-[var(--primary)]" : isCompleted ? "text-emerald-500" : "text-gray-400"
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
                        <Card className="glass-card border-0 shadow-lg overflow-hidden group">
                            <div className="bg-gradient-to-r from-[var(--primary)]/5 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-3">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-[var(--primary)] group-hover:scale-110 transition-transform">
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
                                    <div className="relative flex p-1 rounded-full max-w-sm" style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                                        {/* Sliding Background Indicator */}
                                        <div
                                            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-in-out shadow-lg"
                                            style={{
                                                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                                                left: formData.package_mode === 'single' ? '4px' : 'calc(50%)'
                                            }}
                                        />

                                        {/* Single Option */}
                                        <button
                                            type="button"
                                            onClick={() => updateFormData('package_mode', 'single')}
                                            className={cn(
                                                "relative z-10 flex-1 py-2 px-4 text-sm font-bold rounded-full transition-colors flex items-center justify-center gap-2",
                                                formData.package_mode === 'single' ? "text-white" : "text-[#8C6B5D] hover:text-[var(--primary)] hover:bg-white/10"
                                            )}
                                        >
                                            <MapPin className="w-4 h-4" />
                                            Single
                                        </button>

                                        {/* Multi Option */}
                                        <button
                                            type="button"
                                            onClick={() => updateFormData('package_mode', 'multi')}
                                            className={cn(
                                                "relative z-10 flex-1 py-2 px-4 text-sm font-bold rounded-full transition-colors flex items-center justify-center gap-2",
                                                formData.package_mode === 'multi' ? "text-white" : "text-[#8C6B5D] hover:text-[var(--primary)] hover:bg-white/10"
                                            )}
                                        >
                                            <Globe className="w-4 h-4" />
                                            Multi-Destinations
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label className={cn("text-xs font-medium text-gray-500 uppercase tracking-wider", formData.title ? "text-[var(--primary)]" : "")}>
                                        Package Title <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FileText className={cn("h-4 w-4 transition-colors", formData.title ? "text-[var(--primary)]" : "text-gray-400 group-focus-within/input:text-[var(--primary)]")} />
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
                                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location <span className="text-red-500">*</span></Label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <MapPin className="h-4 w-4 text-gray-400 group-focus-within:text-[var(--primary)] transition-colors" />
                                                </div>
                                                <Input
                                                    placeholder="e.g., Tokyo"
                                                    value={formData.destination}
                                                    onChange={(e) => updateFormData('destination', e.target.value)}
                                                    className="glass-input pl-10 h-11 rounded-xl focus:border-[var(--primary)]/50"
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
                                                    <SelectContent className="pkg-creation-root glass-dropdown-content">
                                                        {Country.getAllCountries().map((country) => (
                                                            <SelectItem key={country.isoCode} value={country.name} className="glass-select-item">
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
                                    <div className="md:col-span-2 space-y-4 mt-2 pt-2">
                                        <div className="flex items-center justify-between border-b border-gray-100/50 pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
                                                    <Label className="text-xs font-bold text-[#1e293b] uppercase tracking-[0.15em]">Destination Legs</Label>
                                                </div>
                                                <div className="px-2.5 py-1 text-[10px] font-bold text-[var(--primary)] bg-white/20 border border-[rgba(255,107,43,0.3)] tracking-wide rounded-full shadow-sm">
                                                    {formData.destinations.length} Leg{formData.destinations.length !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={handleAddDestination}
                                                className="h-8 px-4 text-xs font-semibold text-[var(--primary)] bg-[rgba(255,255,255,0.22)] border-[1.5px] border-[rgba(255,107,43,0.45)] hover:bg-[rgba(255,107,43,0.08)] hover:border-[var(--primary)] transition-all rounded-full shadow-sm"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1 text-[var(--primary)]" /> Add Leg
                                            </Button>
                                        </div>

                                        {formData.destinations.length === 0 && (
                                            <div className="text-center py-8 bg-transparent rounded-xl border border-dashed border-gray-200">
                                                <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">No destinations added yet.</p>
                                                <p className="text-xs text-gray-400">Click the button above to start building your multi-destination tour.</p>
                                            </div>
                                        )}

                                        <div className="space-y-0 relative">
                                            {formData.destinations.map((dest, index) => (
                                                <div key={index} className="relative group/leg flex flex-col items-center">
                                                    <div
                                                        draggable
                                                        onDragStart={(e) => handleDragStartLeg(e, index)}
                                                        onDragOver={(e) => handleDragOverLeg(e, index)}
                                                        onDragEnd={handleDragEndLeg}
                                                        onDrop={(e) => handleDropLeg(e, index)}
                                                        className={cn(
                                                            "w-full flex flex-col sm:flex-row gap-3 p-5 relative transition-all duration-300 group overflow-visible",
                                                            draggedLegIndex === index ? "opacity-40" : "opacity-100",
                                                            dragOverLegIndex === index && draggedLegIndex !== null && draggedLegIndex < index ? "border-b-4 border-b-[var(--primary)]" : "",
                                                            dragOverLegIndex === index && draggedLegIndex !== null && draggedLegIndex > index ? "border-t-4 border-t-[var(--primary)]" : ""
                                                        )}
                                                        style={{
                                                            background: 'rgba(255,255,255,0.20)',
                                                            backdropFilter: 'blur(16px)',
                                                            border: '1px solid rgba(255,255,255,0.40)',
                                                            borderLeft: '3px solid var(--primary)',
                                                            borderRadius: '20px',
                                                            boxShadow: draggedLegIndex === index ? '0 12px 32px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.02)'
                                                        }}
                                                        onMouseEnter={(e: any) => { if (draggedLegIndex === null) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px var(--primary-glow)' } }}
                                                        onMouseLeave={(e: any) => { if (draggedLegIndex === null) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)' } }}
                                                    >
                                                        {/* Drag Handle */}
                                                        <div className="absolute left-[-22px] top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-2 text-[rgba(255,107,43,0.40)] hover:text-[var(--primary)]">
                                                            <GripVertical className="w-5 h-5" />
                                                        </div>

                                                        {/* Leg Number Badge */}
                                                        <div
                                                            className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center rounded-full text-white text-xs font-bold shadow-md z-10"
                                                            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
                                                        >
                                                            {index + 1}
                                                        </div>

                                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-5 mt-2 sm:mt-0 pl-2">
                                                            <div className="sm:col-span-5 relative flex items-center">
                                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                                                    <MapPin className="h-4 w-4 text-[var(--primary)]" />
                                                                </div>
                                                                <Input
                                                                    placeholder="City / Area"
                                                                    value={dest.city}
                                                                    onChange={(e) => handleUpdateDestination(index, 'city', e.target.value)}
                                                                    className="pl-9 h-11 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:border-[var(--primary)]/50 w-full hover:bg-[rgba(255,255,255,0.4)]"
                                                                    style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: '14px' }}
                                                                />
                                                            </div>
                                                            <div className="sm:col-span-4 relative flex items-center">
                                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                                                    <Globe className="h-4 w-4 text-[var(--primary)]" />
                                                                </div>
                                                                <Select value={dest.country} onValueChange={(val) => handleUpdateDestination(index, 'country', val)}>
                                                                    <SelectTrigger
                                                                        className="pl-9 h-11 text-sm font-medium transition-all focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]/50 w-full hover:bg-[rgba(255,255,255,0.4)] relative"
                                                                        style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: '14px' }}
                                                                    >
                                                                        <SelectValue placeholder="Country" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="pkg-creation-root glass-dropdown-content border-white/40">
                                                                        {Country.getAllCountries().map((c) => (
                                                                            <SelectItem key={c.isoCode} value={c.name} className="glass-select-item">{c.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="sm:col-span-3 relative flex items-center">
                                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                                                    <Calendar className="h-4 w-4 text-[var(--primary)]" />
                                                                </div>
                                                                <Input
                                                                    type="number" min="1"
                                                                    value={dest.days}
                                                                    onChange={(e) => handleUpdateDestination(index, 'days', parseInt(e.target.value) || 1)}
                                                                    className="pl-9 h-11 text-sm font-bold text-gray-800 focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:border-[var(--primary)]/50 w-full hover:bg-[rgba(255,255,255,0.4)] pr-12 text-center"
                                                                    style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: '14px' }}
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider font-semibold text-[rgba(120,60,20,0.55)] pointer-events-none">Days</span>
                                                            </div>
                                                        </div>

                                                        {/* Delete Button - Appears on hover */}
                                                        <div className="absolute right-[-10px] top-[-10px] sm:top-1/2 sm:-translate-y-1/2 sm:right-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all z-10">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveDestination(index)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-full text-[rgba(220,50,50,0.6)] hover:text-[#ff4d4f] transition-colors bg-[rgba(255,255,255,0.22)] hover:bg-[#fff0f0] border border-transparent hover:border-[rgba(220,50,50,0.3)] shadow-sm backdrop-blur-md"
                                                                title="Remove Leg"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Connector Arrow (Except for last item) */}
                                                    {index < formData.destinations.length - 1 && (
                                                        <div className="hidden sm:flex flex-col items-center h-8 my-1 relative">
                                                            <div className="w-px h-full border-l-[1.5px] border-dashed border-[rgba(255,107,43,0.35)]"></div>
                                                            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-[rgba(255,255,255,0.8)] backdrop-blur-sm border border-[rgba(255,107,43,0.30)] rounded-full flex items-center justify-center shadow-sm z-10">
                                                                <Plane className="w-3 h-3 text-[rgba(255,107,43,0.8)] rotate-[135deg] translate-y-[0.5px] -translate-x-[0.5px]" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Bottom Add Leg Button */}
                                            {formData.destinations.length > 0 && (
                                                <div className="pt-2 pb-6 mt-4">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddDestination}
                                                        className="w-full py-4 flex items-center justify-center gap-2 text-sm font-bold tracking-wide transition-all group"
                                                        style={{
                                                            border: '2px dashed rgba(255,107,43,0.40)',
                                                            borderRadius: '20px',
                                                            background: 'rgba(255,255,255,0.10)',
                                                            color: 'var(--primary)'
                                                        }}
                                                        onMouseEnter={(e: any) => {
                                                            e.currentTarget.style.background = 'rgba(255,107,43,0.08)';
                                                            e.currentTarget.style.borderStyle = 'solid';
                                                        }}
                                                        onMouseLeave={(e: any) => {
                                                            e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
                                                            e.currentTarget.style.borderStyle = 'dashed';
                                                        }}
                                                    >
                                                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        Add Another Destination
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Trip Summary Bar at the bottom */}
                                        {formData.destinations.length > 0 && (
                                            <div
                                                className="flex flex-col sm:flex-row justify-between items-center p-4 shadow-sm mt-2"
                                                style={{
                                                    background: 'rgba(255,255,255,0.22)',
                                                    border: '1px solid rgba(255,255,255,0.40)',
                                                    borderRadius: '16px'
                                                }}
                                            >
                                                <div className="flex items-center gap-2 mb-3 sm:mb-0">
                                                    <div className="p-1.5 bg-[var(--primary)]/10 rounded-lg">
                                                        <Map className="w-4 h-4 text-[var(--primary)]" />
                                                    </div>
                                                    <span className="font-bold text-[var(--primary)] text-sm tracking-wide">Trip Summary</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                                                    <div className="px-3 py-1.5 bg-[rgba(255,255,255,0.5)] border border-white/50 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-300">
                                                        <Calendar className="w-3.5 h-3.5 text-[rgba(120,60,20,0.5)]" />
                                                        <span className="text-[var(--primary)] font-bold text-sm tracking-tight min-w-[12px] text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{formData.destinations.reduce((sum, d) => sum + (parseInt(d.days as any) || 0), 0)}</span>
                                                        <span className="text-[rgba(120,60,20,0.7)] uppercase tracking-wider">Days</span>
                                                    </div>
                                                    <div className="px-3 py-1.5 bg-[rgba(255,255,255,0.5)] border border-white/50 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-300">
                                                        <Moon className="w-3.5 h-3.5 text-[rgba(120,60,20,0.5)]" />
                                                        <span className="text-[var(--primary)] font-bold text-sm tracking-tight min-w-[12px] text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.max(0, formData.destinations.reduce((sum, d) => sum + (parseInt(d.days as any) || 0), 0) - 1)}</span>
                                                        <span className="text-[rgba(120,60,20,0.7)] uppercase tracking-wider">Nights</span>
                                                    </div>
                                                    <div className="px-3 py-1.5 bg-[rgba(255,255,255,0.5)] border border-white/50 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-300">
                                                        <Globe className="w-3.5 h-3.5 text-[rgba(120,60,20,0.5)]" />
                                                        <span className="text-[var(--primary)] font-bold text-sm tracking-tight min-w-[12px] text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{new Set(formData.destinations.filter(d => d.country).map(d => d.country)).size}</span>
                                                        <span className="text-[rgba(120,60,20,0.7)] uppercase tracking-wider">Countries</span>
                                                    </div>
                                                    <div className="px-3 py-1.5 bg-[rgba(255,255,255,0.5)] border border-white/50 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-300">
                                                        <Building2 className="w-3.5 h-3.5 text-[rgba(120,60,20,0.5)]" />
                                                        <span className="text-[var(--primary)] font-bold text-sm tracking-tight min-w-[12px] text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{formData.destinations.filter(d => d.city).length}</span>
                                                        <span className="text-[rgba(120,60,20,0.7)] uppercase tracking-wider">Cities</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Logistics & Pricing */}
                        <Card className="glass-card border-0 shadow-lg overflow-hidden group mt-8">
                            <div className="bg-gradient-to-r from-[var(--primary)]/5 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-3">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-[var(--primary)] group-hover:scale-110 transition-transform">
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
                                        {formData.package_mode === 'multi' && <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded uppercase font-bold tracking-widest">Auto</span>}
                                    </div>
                                    <div className="flex rounded-xl glass-input overflow-hidden group/duration transition-all hover:border-[var(--primary)]/30">
                                        <div className="flex-1 relative group">
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
                                        <div className="w-px bg-white/30" />
                                        <div className="flex-1 relative group">
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
                                            type="text"
                                            inputMode="numeric"
                                            value={formData.price_per_person as any}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                updateFormData('price_per_person', val === '' ? '' as any : Number(val));
                                            }}
                                            className={cn("glass-input pl-8 h-12 font-mono font-medium text-lg", getInputStyle(formData.price_per_person, true))}
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
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {[5, 12, 18].map(pct => (
                                                        <button
                                                            key={pct}
                                                            type="button"
                                                            onClick={() => updateFormData('gst_percentage', pct)}
                                                            className={cn(
                                                                "px-6 py-2.5 text-sm font-bold transition-all rounded-full",
                                                                formData.gst_percentage === pct
                                                                    ? "glass-pill-active"
                                                                    : "glass-pill"
                                                            )}
                                                        >
                                                            {pct}%
                                                        </button>
                                                    ))}
                                                    <div className="relative w-32">
                                                        <Input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={formData.gst_percentage as any}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                updateFormData('gst_percentage', val === '' ? '' as any : Number(val));
                                                            }}
                                                            className="glass-input h-11 pr-8 text-sm font-bold text-center"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold pointer-events-none">%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* GST Mode */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">GST Mode</Label>

                                                {/* Segmented Pill Container */}
                                                <div
                                                    className="relative grid grid-cols-2 p-1 overflow-hidden transition-all duration-300"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.18)',
                                                        border: '1px solid rgba(255,255,255,0.35)',
                                                        borderRadius: '50px',
                                                        gap: 0
                                                    }}
                                                >
                                                    {/* Animated Sliding Background */}
                                                    <div
                                                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] transition-all duration-300 ease-in-out shadow-lg"
                                                        style={{
                                                            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                                                            borderRadius: '50px',
                                                            left: formData.gst_mode === 'exclusive' ? '4px' : 'calc(50%)',
                                                            boxShadow: '0 4px 16px var(--primary-glow)'
                                                        }}
                                                    />

                                                    {/* Exclusive Option */}
                                                    <button
                                                        type="button"
                                                        onClick={() => updateFormData('gst_mode', 'exclusive')}
                                                        className="relative z-10 flex flex-col justify-center items-center py-4 px-6 min-h-[60px] cursor-pointer"
                                                        style={{
                                                            borderRadius: '50px',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseEnter={(e: any) => { if (formData.gst_mode !== 'exclusive') e.currentTarget.style.background = 'var(--primary-glow)' }}
                                                        onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent' }}
                                                    >
                                                        <div
                                                            className="text-sm tracking-wide transition-colors duration-300"
                                                            style={{
                                                                color: formData.gst_mode === 'exclusive' ? '#FFFFFF' : '#1e293b',
                                                                fontWeight: formData.gst_mode === 'exclusive' ? 700 : 500
                                                            }}
                                                        >
                                                            Exclusive
                                                        </div>
                                                        <div
                                                            className="text-[12px] mt-0.5 transition-colors duration-300"
                                                            style={{
                                                                color: formData.gst_mode === 'exclusive' ? 'rgba(255,255,255,0.80)' : 'rgba(120,60,20,0.55)'
                                                            }}
                                                        >
                                                            GST added on top of price
                                                        </div>
                                                    </button>

                                                    {/* Inclusive Option */}
                                                    <button
                                                        type="button"
                                                        onClick={() => updateFormData('gst_mode', 'inclusive')}
                                                        className="relative z-10 flex flex-col justify-center items-center py-4 px-6 min-h-[60px] cursor-pointer"
                                                        style={{
                                                            borderRadius: '50px',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseEnter={(e: any) => { if (formData.gst_mode !== 'inclusive') e.currentTarget.style.background = 'var(--primary-glow)' }}
                                                        onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent' }}
                                                    >
                                                        <div
                                                            className="text-sm tracking-wide transition-colors duration-300"
                                                            style={{
                                                                color: formData.gst_mode === 'inclusive' ? '#FFFFFF' : '#1e293b',
                                                                fontWeight: formData.gst_mode === 'inclusive' ? 700 : 500
                                                            }}
                                                        >
                                                            Inclusive
                                                        </div>
                                                        <div
                                                            className="text-[12px] mt-0.5 transition-colors duration-300"
                                                            style={{
                                                                color: formData.gst_mode === 'inclusive' ? 'rgba(255,255,255,0.80)' : 'rgba(120,60,20,0.55)'
                                                            }}
                                                        >
                                                            Price already includes GST
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Live Preview */}
                                            {formData.price_per_person > 0 && (
                                                <div
                                                    className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.22)',
                                                        border: '1px solid rgba(255,255,255,0.35)',
                                                        borderRadius: '14px',
                                                        padding: '12px 16px'
                                                    }}
                                                >
                                                    {formData.gst_mode === 'exclusive' ? (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-bold text-[#8C6B5D] text-[11px] uppercase tracking-wider">Preview:</span>
                                                            <span className="font-bold text-[#1e293b]">₹{formData.price_per_person.toLocaleString('en-IN')}</span>
                                                            <span className="text-[var(--primary)] font-bold">+</span>
                                                            <span className="font-medium px-2 py-0.5 rounded text-[12px]" style={{ background: 'rgba(255,107,43,0.10)', color: 'rgba(120,60,20,0.70)' }}>
                                                                ₹{(formData.price_per_person * formData.gst_percentage / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} GST ({formData.gst_percentage}%)
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-bold text-[#8C6B5D] text-[11px] uppercase tracking-wider">Preview:</span>
                                                            <span className="text-gray-400 line-through text-sm">₹{(formData.price_per_person + (formData.price_per_person * formData.gst_percentage / 100)).toLocaleString('en-IN')}</span>
                                                            <ArrowRight className="w-3 h-3 text-[var(--primary)]" />
                                                            <span className="font-bold text-[#1e293b]">₹{formData.price_per_person.toLocaleString('en-IN')}</span>
                                                            <span className="font-medium px-2 py-0.5 rounded text-[12px]" style={{ background: 'rgba(255,107,43,0.10)', color: 'rgba(120,60,20,0.70)' }}>
                                                                Includes ₹{(formData.price_per_person - (formData.price_per_person / (1 + (formData.gst_percentage / 100)))).toLocaleString('en-IN', { maximumFractionDigits: 2 })} GST
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="text-right flex flex-col sm:items-end">
                                                        <div className="text-[10px] font-bold text-[#8C6B5D] uppercase tracking-wider mb-0.5">Final Total</div>
                                                        <div className="text-lg font-black" style={{ color: 'var(--primary)' }}>
                                                            ₹{formData.gst_mode === 'exclusive'
                                                                ? (formData.price_per_person + (formData.price_per_person * formData.gst_percentage / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                                                                : formData.price_per_person.toLocaleString('en-IN', { maximumFractionDigits: 2 })
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* ── Cancellation Policy ──────────────────────────── */}
                        <Card className="glass-card border-0 shadow-lg overflow-hidden group mt-8">
                            <div className="bg-gradient-to-r from-[var(--primary)]/5 to-white/20 px-6 py-4 border-b border-white/20 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-[var(--primary)] group-hover:scale-110 transition-transform">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Cancellation Policy</h3>
                                        <p className="text-xs text-gray-500">Define refund rules based on days before travel</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* GST context badge */}
                                    {agentGstApplicable !== null && (
                                        <span className={cn(
                                            "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                                            agentGstApplicable
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-slate-50 text-slate-500 border-slate-200"
                                        )}>
                                            GST {agentGstApplicable ? 'Applicable' : 'Not Applicable'}
                                        </span>
                                    )}
                                    {/* Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !formData.cancellation_enabled
                                            setFormData(prev => ({
                                                ...prev,
                                                cancellation_enabled: next,
                                                cancellation_rules: next && prev.cancellation_rules.length === 0
                                                    ? [agentGstApplicable
                                                        ? { daysBefore: 0, refundPercentage: 0, fareType: 'total_fare' as const }
                                                        : { daysBefore: 0, refundPercentage: 0 }]
                                                    : prev.cancellation_rules
                                            }))
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${formData.cancellation_enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${formData.cancellation_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>

                            {formData.cancellation_enabled && (
                                <CardContent className="p-6 space-y-4">
                                    <p className="text-xs text-gray-500">
                                        Rules are matched by <b>days before travel</b>. List them in <b>descending</b> order (largest daysBefore first).
                                        {agentGstApplicable && <span className="ml-1">Refund % applies to the <b>Fare Type</b> selected per rule.</span>}
                                        {!agentGstApplicable && <span className="ml-1">Refund % applies to the total amount paid.</span>}
                                    </p>

                                    {/* Column headers */}
                                    <div className={cn(
                                        "grid gap-3 px-4",
                                        agentGstApplicable ? "grid-cols-[1fr_1fr_1.4fr_auto]" : "grid-cols-[1fr_1fr_auto]"
                                    )}>
                                        <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Days Before Travel</Label>
                                        <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Refund %</Label>
                                        {agentGstApplicable && (
                                            <div className="flex items-center gap-1">
                                                <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Fare Type</Label>
                                                <div className="relative group/tooltip">
                                                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                                                    <div className="absolute left-0 bottom-5 z-20 w-64 bg-gray-900 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-xl">
                                                        <b>Base Fare</b> excludes GST from refund — GST portion is forfeited.<br />
                                                        <b>Total Fare</b> refunds both base and GST proportionally.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <span />
                                    </div>

                                    {/* Rule rows */}
                                    <div className="space-y-2">
                                        {formData.cancellation_rules.map((rule, idx) => (
                                            <div key={idx} className={cn(
                                                "grid gap-3 items-end bg-white/60 border border-gray-100 rounded-lg px-4 py-3",
                                                agentGstApplicable ? "grid-cols-[1fr_1fr_1.4fr_auto]" : "grid-cols-[1fr_1fr_auto]"
                                            )}>
                                                {/* Days Before */}
                                                <div>
                                                    <Input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={rule.daysBefore as any}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            const updated = [...formData.cancellation_rules]
                                                            updated[idx] = { ...updated[idx], daysBefore: val === '' ? '' as any : Number(val) }
                                                            setFormData(prev => ({ ...prev, cancellation_rules: updated }))
                                                        }}
                                                        className="h-8 text-sm"
                                                        placeholder="e.g. 7"
                                                    />
                                                </div>
                                                {/* Refund % */}
                                                <div>
                                                    <Input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={rule.refundPercentage as any}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            const updated = [...formData.cancellation_rules]
                                                            updated[idx] = { ...updated[idx], refundPercentage: val === '' ? '' as any : Number(val) }
                                                            setFormData(prev => ({ ...prev, cancellation_rules: updated }))
                                                        }}
                                                        className="h-8 text-sm"
                                                        placeholder="0–100"
                                                    />
                                                </div>
                                                {/* Fare Type — only when GST applicable */}
                                                {agentGstApplicable && (
                                                    <Select
                                                        value={rule.fareType || 'total_fare'}
                                                        onValueChange={(val) => {
                                                            const updated = [...formData.cancellation_rules]
                                                            updated[idx] = { ...updated[idx], fareType: val as 'total_fare' | 'base_fare' }
                                                            setFormData(prev => ({ ...prev, cancellation_rules: updated }))
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 text-sm bg-white/80">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="total_fare">
                                                                <span className="font-medium">Total Fare</span>
                                                                <span className="text-[10px] text-gray-400 ml-1">(Base + GST)</span>
                                                            </SelectItem>
                                                            <SelectItem value="base_fare">
                                                                <span className="font-medium">Base Fare</span>
                                                                <span className="text-[10px] text-gray-400 ml-1">(GST forfeited)</span>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                {/* Delete */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = formData.cancellation_rules.filter((_, i) => i !== idx)
                                                        setFormData(prev => ({ ...prev, cancellation_rules: updated }))
                                                    }}
                                                    className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors self-center"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add rule */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 text-[var(--primary)] border-[var(--primary)]/40 hover:border-[var(--primary)] hover:bg-[var(--primary)]/5"
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                cancellation_rules: [
                                                    ...prev.cancellation_rules,
                                                    agentGstApplicable
                                                        ? { daysBefore: 0, refundPercentage: 0, fareType: 'total_fare' as const }
                                                        : { daysBefore: 0, refundPercentage: 0 }
                                                ]
                                            }))
                                        }}
                                    >
                                        <Plus className="w-4 h-4" /> Add Rule
                                    </Button>

                                    {/* Example hint */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                                        {agentGstApplicable ? (
                                            <>
                                                <p><b>Example (GST applicable, Base ₹1,000 + 18% GST = ₹1,180):</b></p>
                                                <p>Cancel 5+ days → 70% of <b>Total Fare</b> = ₹826 &nbsp;|&nbsp; Cancel 2–4 days → 25% of <b>Base Fare</b> = ₹250 (GST forfeited) &nbsp;|&nbsp; &lt;2 days → No refund</p>
                                            </>
                                        ) : (
                                            <p><b>Example:</b> Cancel 7+ days before → 80% refund | 3–6 days → 50% | &lt;3 days → 0%</p>
                                        )}
                                    </div>
                                </CardContent>
                            )}
                        </Card>


                        {/* Trip Categorization */}
                        <Card className="glass-card border-0 shadow-lg overflow-hidden group mt-8">
                            <div className="bg-gradient-to-r from-[var(--primary)]/5 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-3">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-[var(--primary)] group-hover:scale-110 transition-transform">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Trip Style</h3>
                                    <p className="text-xs text-gray-500">Categorize your package for the right audience</p>
                                </div>
                            </div>
                            <CardContent className="p-6">
                                {/* Header row with label, counter pill, Clear All */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Label
                                        className={cn(
                                            "text-xs font-semibold uppercase tracking-wider transition-colors",
                                            tripStyleError ? "text-red-500" : "text-gray-700"
                                        )}
                                    >
                                        TRIP STYLE <span className="text-red-500">*</span>
                                    </Label>

                                    {/* Live counter pill */}
                                    {formData.trip_styles.length > 0 && (
                                        <span
                                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                                            style={{
                                                background: 'rgba(255,107,43,0.15)',
                                                border: '1px solid rgba(255,107,43,0.40)',
                                                color: 'var(--primary)'
                                            }}
                                        >
                                            {formData.trip_styles.length} selected
                                        </span>
                                    )}

                                    {/* Clear all — shows when 2+ selected */}
                                    {formData.trip_styles.length >= 2 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, trip_styles: [] }))
                                                setTripStyleError(false)
                                            }}
                                            className="text-[10px] font-semibold transition-colors"
                                            style={{ color: 'rgba(255,107,43,0.70)' }}
                                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)' }}
                                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,107,43,0.70)' }}
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>

                                <p className="text-[11px] text-gray-500 -mt-1">Who is this package designed for? Select all that apply.</p>

                                {/* Validation error border flash */}
                                <div
                                    className={cn(
                                        "grid grid-cols-2 lg:grid-cols-3 gap-3 rounded-2xl transition-all duration-300",
                                        tripStyleError ? "ring-2 ring-red-400/60 ring-offset-1 p-1" : ""
                                    )}
                                >
                                    {TRIP_STYLES.map((style, index) => {
                                        const isSelected = formData.trip_styles.includes(style.id)
                                        return (
                                            <div
                                                key={style.id}
                                                onClick={() => toggleTripStyle(style.id)}
                                                className={cn(
                                                    "glass-style-card relative cursor-pointer p-4 flex flex-col items-center justify-center gap-3 fade-up-enter group",
                                                    isSelected ? "active" : ""
                                                )}
                                                style={{
                                                    animationDelay: `${index * 50}ms`,
                                                    transition: 'transform 150ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease, border-color 200ms ease, background 200ms ease',
                                                    ...(isSelected ? {
                                                        background: 'var(--primary-glow)',
                                                        border: '2px solid var(--primary)',
                                                        borderRadius: '16px',
                                                        boxShadow: '0 8px 24px var(--primary-glow)'
                                                    } : {
                                                        background: 'rgba(255,255,255,0.18)',
                                                        border: '1px solid rgba(255,255,255,0.35)',
                                                        borderRadius: '16px'
                                                    })
                                                }}
                                            >
                                                {/* Orange checkmark badge */}
                                                {isSelected && (
                                                    <div
                                                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center animate-in zoom-in duration-150"
                                                        style={{ background: 'var(--primary)', flexShrink: 0 }}
                                                    >
                                                        <Check className="w-3 h-3 text-white" style={{ strokeWidth: 3 }} />
                                                    </div>
                                                )}

                                                {/* Animated hover outline */}
                                                <div className={cn(
                                                    "absolute inset-0 rounded-2xl border-2 transition-all duration-300 pointer-events-none",
                                                    isSelected ? "border-[var(--primary)] opacity-100 scale-100" : "border-transparent opacity-0 scale-95 group-hover:border-[var(--primary)]/30 group-hover:scale-100 group-hover:opacity-100"
                                                )} />

                                                {/* Icon */}
                                                <span className={cn(
                                                    "text-3xl transition-all duration-500",
                                                    isSelected
                                                        ? "scale-[1.15] drop-shadow-md filter-none transform-gpu"
                                                        : "opacity-55 grayscale sepia-[.3] hue-rotate-[-30deg] group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-100 group-hover:sepia-0 group-hover:drop-shadow-sm"
                                                )}>
                                                    {style.icon}
                                                </span>

                                                {/* Label */}
                                                <span className={cn(
                                                    "text-xs font-bold text-center tracking-wide transition-colors z-10",
                                                    isSelected ? "text-[var(--primary)] font-semibold" : "text-[rgba(80,40,10,0.70)] group-hover:text-[var(--primary)]"
                                                )}>
                                                    {style.label}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Validation tooltip */}
                                {tripStyleError && (
                                    <p className="text-[11px] text-red-500 flex items-center gap-1.5 mt-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Please select at least one trip style
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Experiences & Activities */}
                        <Card className="glass-card border-0 shadow-lg overflow-hidden group mt-8">
                            <div className="bg-gradient-to-r from-[var(--primary)]/5 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-3">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-[var(--primary)] group-hover:scale-110 transition-transform">
                                    <Mountain className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Experiences & Activities</h3>
                                    <p className="text-xs text-gray-500">Help travelers discover what they will experience</p>
                                </div>
                            </div>
                            <CardContent className="p-6">
                                <div className="space-y-3">
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
                                                        "cursor-pointer px-4 py-2 text-sm font-medium transition-all group rounded-full border shadow-sm",
                                                        isSelected
                                                            ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-transparent shadow-indigo-200/50"
                                                            : "bg-white/10 backdrop-blur-md text-[#2D1A0E] border-white/40 hover:bg-white/20 hover:border-indigo-300 hover:text-indigo-600"
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
                                            You&apos;ve added several activities — make sure they all apply!
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Flight Configuration */}
                        <Card className="glass-card border-0 shadow-lg overflow-hidden group mt-8">
                            <div className="bg-gradient-to-r from-[var(--primary)]/5 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-3">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-[var(--primary)] group-hover:scale-110 transition-transform">
                                    <Plane className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Include Flights</h3>
                                    <p className="text-xs text-gray-500">Manage air travel availability and preferences</p>
                                </div>
                            </div>
                            <CardContent className="p-6">
                                <div className="space-y-6">
                                    <div
                                        className={cn(
                                            "rounded-2xl border transition-all duration-300 overflow-hidden",
                                            formData.flights_enabled
                                                ? "bg-[rgba(255,107,43,0.05)] border-[rgba(255,107,43,0.3)] shadow-[0_8px_30px_rgb(255,107,43,0.08)]"
                                                : "bg-[rgba(255,255,255,0.4)] border-white/40 hover:border-gray-300"
                                        )}
                                    >
                                        <div className="p-5 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                                                    formData.flights_enabled ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20" : "bg-white/50 text-[#8C6B5D]"
                                                )}>
                                                    <Plane className={cn("w-6 h-6", formData.flights_enabled && "animate-pulse")} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">Include Flights</h4>
                                                    <p className="text-xs text-gray-500">Enable live fare search for customers</p>
                                                </div>
                                            </div>
                                            <div
                                                onClick={() => updateFormData('flights_enabled', !formData.flights_enabled)}
                                                className={cn(
                                                    "w-14 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 relative",
                                                    formData.flights_enabled ? "bg-[var(--primary)]" : "bg-gray-200"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300",
                                                    formData.flights_enabled ? "translate-x-7" : "translate-x-0"
                                                )} />
                                            </div>
                                        </div>

                                        {formData.flights_enabled && (
                                            <div className="px-5 pb-6 pt-2 border-t border-[rgba(255,107,43,0.1)] grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-bold text-[#8C6B5D] uppercase tracking-wider">Supported Origin Airports</Label>
                                                    <Textarea
                                                        placeholder="e.g. MAA, BOM, DEL (Comma separated)"
                                                        value={originInput}
                                                        onChange={(e) => {
                                                            const val = e.target.value
                                                            setOriginInput(val)
                                                            const cities = val.split(',').map(c => c.trim().toUpperCase()).filter(c => c !== '')
                                                            updateFormData('flight_origin_cities', cities)
                                                        }}
                                                        className="glass-input min-h-[80px] text-sm font-mono"
                                                    />
                                                    <p className="text-[10px] text-gray-400">Add common codes like MAA, BOM, DEL to restrict search origins.</p>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold text-[#8C6B5D] uppercase tracking-wider">Cabin Class Preference</Label>
                                                        <div className="flex gap-2">
                                                            {['ECONOMY', 'BUSINESS'].map(cls => (
                                                                <button
                                                                    key={cls}
                                                                    type="button"
                                                                    onClick={() => updateFormData('flight_cabin_class', cls)}
                                                                    className={cn(
                                                                        "flex-1 py-2 text-xs font-bold rounded-lg border transition-all",
                                                                        formData.flight_cabin_class === cls
                                                                            ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-[var(--primary)]/20"
                                                                            : "bg-white border-gray-200 text-gray-600 hover:border-[var(--primary)]/30"
                                                                    )}
                                                                >
                                                                    {cls}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100">
                                                        <div>
                                                            <Label className="text-[11px] font-bold text-gray-700">Flight Price Included?</Label>
                                                            <p className="text-[10px] text-gray-400">Check if price is part of base package</p>
                                                        </div>
                                                        <Checkbox
                                                            checked={formData.flight_price_included}
                                                            onCheckedChange={(checked: any) => updateFormData('flight_price_included', checked)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2 space-y-2">
                                                    <Label className="text-[10px] font-bold text-[#8C6B5D] uppercase tracking-wider">Baggage & Additional Notes</Label>
                                                    <Input
                                                        placeholder="e.g. 15kg Check-in + 7kg Cabin included"
                                                        value={formData.flight_baggage_note}
                                                        onChange={(e) => updateFormData('flight_baggage_note', e.target.value)}
                                                        className="glass-input"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Content & Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Description Section */}
                            <Card className="glass-description-card md:col-span-2 border-0 shadow-lg rounded-3xl overflow-hidden group">
                                <div className="bg-gradient-to-r from-purple-50/10 to-transparent px-6 py-5 border-b border-white/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 orange-gradient-badge rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-lg font-bold text-[#5D4037]">Description</h3>
                                            <p className="text-[11px] text-[#8C6B5D] font-medium">Craft a compelling story for your travelers</p>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-6 space-y-6">

                                    <div className="relative group/desc">
                                        <Textarea
                                            name="description"
                                            placeholder="Describe highlights, what's included..."
                                            value={formData.description || ''}
                                            onChange={(e) => updateFormData('description', e.target.value)}
                                            className={cn("glass-textarea w-full relative z-10", getInputStyle(formData.description))}
                                        />

                                        {/* Character Counter Capsule */}
                                        <div className={cn(
                                            "absolute bottom-3 right-3 z-20 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border shadow-sm transition-all animate-in fade-in zoom-in",
                                            (formData.description?.length || 0) > 400
                                                ? "bg-orange-500/20 text-orange-600 border-orange-500/30"
                                                : "bg-white/20 text-[#8C6B5D] border-white/30"
                                        )}>
                                            {formData.description?.length || 0} characters
                                        </div>
                                    </div>

                                    {/* Word Count Progress Bar */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                            <span>Content Quality</span>
                                            <span>{Math.min(100, Math.round(((formData.description?.length || 0) / 500) * 100))}%</span>
                                        </div>
                                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="word-count-progress rounded-full"
                                                style={{ width: `${Math.min(100, ((formData.description?.length || 0) / 500) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Settings & Visibility */}
                            <div className="space-y-8">
                                <Card className="glass-description-card border-0 shadow-lg group">
                                    <div className="bg-gradient-to-r from-white/10 to-transparent px-6 py-4 border-b border-white/20 flex items-center gap-3">
                                        <div className="p-2 orange-gradient-badge rounded-xl text-white group-hover:scale-110 transition-transform shadow-lg">
                                            <Settings className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-serif text-lg font-bold text-[#5D4037]">Settings</h3>
                                    </div>
                                    <CardContent className="p-6 space-y-8">
                                        {/* Public Visibility Toggle */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-sm font-bold text-[#5D4037]">Public Visibility</Label>
                                                <p className="text-[11px] text-[#8C6B5D] font-medium leading-relaxed">
                                                    Show this package to customers in search results catalog
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => updateFormData('is_public', !formData.is_public)}
                                                className={cn("glass-toggle flex-shrink-0", formData.is_public ? "active" : "")}
                                            />
                                        </div>

                                        <div className="h-px bg-white/10" />

                                        {/* Custom Feature Image Toggle */}
                                        <div className="space-y-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <Label className="text-sm font-bold text-[#5D4037]">Custom Feature Image</Label>
                                                    <p className="text-[11px] text-[#8C6B5D] font-medium leading-relaxed">
                                                        Upload a custom banner image for this specific package
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUseFeatureImage(!useFeatureImage);
                                                        if (useFeatureImage) updateFormData('feature_image_url', '');
                                                    }}
                                                    className={cn("glass-toggle flex-shrink-0", useFeatureImage ? "active" : "")}
                                                />
                                            </div>

                                            {useFeatureImage && (
                                                <div className="animate-in slide-in-from-top-4 fade-in duration-500 space-y-4">
                                                    <div
                                                        className="border-2 border-dashed border-[var(--primary)]/30 rounded-2xl p-8 bg-white/5 hover:bg-[var(--primary)]/5 transition-colors group/upload cursor-pointer text-center"
                                                        onClick={() => document.getElementById('feature-upload')?.click()}
                                                    >
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="p-3 bg-[var(--primary)]/10 rounded-full text-[var(--primary)] group-hover/upload:scale-110 transition-transform">
                                                                <Upload className="w-6 h-6" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-bold text-[#5D4037]">Drag & drop or Click to upload</p>
                                                                <p className="text-[10px] text-[#8C6B5D]">PNG, JPG up to 5MB</p>
                                                            </div>
                                                        </div>
                                                        <input
                                                            id="feature-upload"
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const toastId = toast.loading('Optimizing and uploading image...');
                                                                    try {
                                                                        // 1. Compress image
                                                                        const compressedFile = await compressImage(file, {
                                                                            maxWidthOrHeight: 1920,
                                                                            initialQuality: 0.8
                                                                        });

                                                                        // 2. Get presigned URL
                                                                        const token = localStorage.getItem('token');
                                                                        const presignedRes = await fetch('http://localhost:8000/api/v1/presigned-url', {
                                                                            method: 'POST',
                                                                            headers: {
                                                                                'Authorization': `Bearer ${token}`,
                                                                                'Content-Type': 'application/json'
                                                                            },
                                                                            body: JSON.stringify({
                                                                                file_name: compressedFile.name,
                                                                                content_type: compressedFile.type,
                                                                                folder: 'packages'
                                                                            })
                                                                        });

                                                                        if (!presignedRes.ok) throw new Error('Failed to get upload URL');
                                                                        const { upload_url, file_url } = await presignedRes.json();

                                                                        // 3. Direct upload to S3
                                                                        const success = await uploadToS3(compressedFile, upload_url);
                                                                        if (!success) throw new Error('S3 upload failed');

                                                                        // 4. Update form state
                                                                        updateFormData('feature_image_url', file_url);
                                                                        toast.success('Image uploaded successfully!', { id: toastId });
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                        toast.error('Upload failed', { id: toastId });
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                            <Link2 className="w-3.5 h-3.5 text-[#8C6B5D]" />
                                                        </div>
                                                        <Input
                                                            placeholder="Or paste image URL here..."
                                                            value={formData.feature_image_url || ''}
                                                            onChange={(e) => updateFormData('feature_image_url', e.target.value)}
                                                            className="glass-input h-10 pl-9 text-xs font-medium"
                                                        />
                                                    </div>

                                                    {formData.feature_image_url && (
                                                        <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-xl group/preview">
                                                            <img
                                                                src={formData.feature_image_url}
                                                                alt="Preview"
                                                                className="w-full h-40 object-cover"
                                                                onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Invalid+Image'}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => updateFormData('feature_image_url', '')}
                                                                className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover/preview:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
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
                )}

                {/* STEP 2: Itinerary */}
                {activeStep === 2 && (
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
                    </div>
                )}

                {/* STEP 3: Review */}
                {activeStep === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-3xl mx-auto">
                        <Card className="glass-panel border-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-xl p-8">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            {formData.trip_styles.map(styleId => {
                                                const style = TRIP_STYLES.find(c => c.id === styleId);
                                                return style ? (
                                                    <Badge key={styleId} className="bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 border-0 flex items-center gap-1.5 py-1 px-3">
                                                        <span>{style.icon}</span>
                                                        {style.label}
                                                    </Badge>
                                                ) : null;
                                            })}
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
                            onClick={() => {
                                if (activeStep === 1) router.push('/agent/packages')
                                else if (activeStep === 2) setActiveStep(1)
                                else if (activeStep === 3) setActiveStep(2)
                            }}
                            className="text-gray-500 hover:text-gray-900 font-medium px-4 h-11"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {activeStep === 1 && 'Back to Packages'}
                            {activeStep === 2 && 'Back to Basic Info'}
                            {activeStep === 3 && 'Back to Itinerary'}
                        </Button>
                        <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                        <span className="text-sm text-gray-500 flex items-center gap-2 font-medium bg-transparent px-3 py-1.5 rounded-full border border-gray-100">
                            <span className="relative flex h-2 w-2">
                                <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", packageId ? "bg-emerald-400 animate-ping" : "bg-gray-400")}></span>
                                <span className={cn("relative inline-flex rounded-full h-2 w-2", packageId ? "bg-emerald-500" : "bg-gray-400")}></span>
                            </span>
                            {saving ? 'Saving...' : packageId ? 'Draft Saved' : 'Unsaved Draft'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {packageId && (
                            <Button
                                variant="ghost"
                                onClick={() => window.open(`/plan-trip/${formData.slug}?mode=preview`, '_blank')}
                                className="h-11 px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium"
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                            </Button>
                        )}
                        {activeStep === 1 && (
                            <Button
                                variant="outline"
                                onClick={handleSaveDraftOnly}
                                disabled={saving}
                                className="h-11 px-6 rounded-full border border-orange-200 text-orange-700 bg-white/50 hover:bg-orange-50 font-medium shadow-sm mr-2"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Draft
                            </Button>
                        )}
                        <Button
                            onClick={() => {
                                if (activeStep === 3) handlePublish()
                                else handleContinueSave(activeStep + 1)
                            }}
                            disabled={saving}
                            className={cn(
                                "h-11 px-8 font-bold shadow-lg transition-all active:scale-95 rounded-full",
                                (isBasicInfoValid() || Boolean(packageId))
                                    ? "orange-gradient-badge text-white hover:shadow-orange-500/25"
                                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            )}
                        >
                            {activeStep === 3 ? (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Publish Package
                                </>
                            ) : (
                                <>
                                    {activeStep === 2 ? 'Review & Finish' : 'Save & Continue'}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}