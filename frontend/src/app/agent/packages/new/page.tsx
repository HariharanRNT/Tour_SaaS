'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
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
    Camera, UserCheck, FileCheck, ShieldCheck, Upload, Link2, Car, Plus, Map, Moon, Sparkles
} from 'lucide-react'
import { ItineraryBuilder } from '@/components/admin/ItineraryBuilder'
import { CityAutocomplete } from '@/components/CityAutocomplete'
import { toast } from 'sonner'
import { API_URL } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import ServiceCard from '@/components/packages/ServiceCard'
import { Badge } from '@/components/ui/badge'
import { Country } from 'country-state-city'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { compressImage, uploadToS3 } from '@/lib/image-upload-utils'
import { useAuth } from '@/context/AuthContext'

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
    // Cancellation Policy
    cancellation_enabled: boolean
    cancellation_rules: { daysBefore: number; refundPercentage: number; fareType?: 'total_fare' | 'base_fare' }[]
    // Dual Booking
    booking_type: 'INSTANT' | 'ENQUIRY'
    price_label?: string
    enquiry_payment: 'OFFLINE'
    // Inclusions & Exclusions
    inclusions: Record<string, { included: boolean; details: string; visibleToCustomer: boolean }>
    custom_services: { id: string; heading: string; description: string; isIncluded: boolean; visibleToCustomer: boolean }[]
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

const INCLUSION_ITEMS = [
    {
        key: 'flights',
        label: 'Flights',
        icon: '✈️',
        placeholder: 'e.g. Round trip flights from Chennai included',
    },
    {
        key: 'transportation',
        label: 'Transportation',
        icon: '🚌',
        placeholder: 'e.g. All AC transfers and sightseeing by cab',
    },
    {
        key: 'hotel',
        label: 'Hotel',
        icon: '🏨',
        placeholder: 'e.g. 3-star hotel stay, twin sharing basis',
    },
    {
        key: 'visaAssistance',
        label: 'Visa Assistance',
        icon: '🛂',
        placeholder: 'e.g. Visa application support and documentation',
    },
    {
        key: 'travelInsurance',
        label: 'Travel Insurance',
        icon: '🛡️',
        placeholder: 'e.g. Basic travel insurance up to ₹5 lakhs',
    },
    {
        key: 'tourGuide',
        label: 'Tour Guide',
        icon: '🧭',
        placeholder: 'e.g. English-speaking local guide for all days',
    },
    {
        key: 'foodAndDining',
        label: 'Food & Dining',
        icon: '🍽️',
        placeholder: 'e.g. Daily breakfast and dinner included',
    },
    {
        key: 'supportAndServices',
        label: 'Support & Services',
        icon: '🎧',
        placeholder: 'e.g. 24/7 helpline and dedicated trip manager',
    },
    {
        key: 'languages',
        label: 'Language Support',
        icon: '🌐',
        placeholder: 'e.g. English and Hindi speaking guides/drivers',
    },
]

const generateSlug = (name: string): string => {
    return name
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9\s-]/g, "") // Allow only a-z, 0-9, spaces, hyphens
        .replace(/\s+/g, "-")          // Replace spaces with hyphens
        .replace(/-+/g, "-")           // Collapse multiple hyphens
        .replace(/^-+|-+$/g, "");      // Trim hyphens from ends
};

export default function CreatePackagePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { hasPermission, isSubUser } = useAuth()
    const editPackageId = searchParams.get('id')

    useEffect(() => {
        if (isSubUser && !hasPermission('packages', 'edit')) {
            router.push('/agent/dashboard')
        }
    }, [isSubUser, hasPermission, router])

    // Steps: 1: Basic Info, 2: Itinerary, 3: Review
    const [activeStep, setActiveStep] = useState(1)
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(false)
    const [packageId, setPackageId] = useState<string | null>(editPackageId)
    const [useFeatureImage, setUseFeatureImage] = useState(false)
    const [tripStyleError, setTripStyleError] = useState(false)
    // Track whether package data has been loaded so we can suppress validation until ready
    const [dataLoaded, setDataLoaded] = useState(!editPackageId)
    // Track whether the slug was manually edited to avoid overwriting it when title changes
    const [isSlugEdited, setIsSlugEdited] = useState(false)

    // Multi-Destination Drag & Drop State
    const [draggedLegIndex, setDraggedLegIndex] = useState<number | null>(null)
    const [dragOverLegIndex, setDragOverLegIndex] = useState<number | null>(null)

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
        // Cancellation Policy
        cancellation_enabled: false,
        cancellation_rules: [],
        // Dual Booking
        booking_type: 'INSTANT',
        price_label: '',
        enquiry_payment: 'OFFLINE',
        // Inclusions & Exclusions
        inclusions: {
            flights: { included: false, details: '', visibleToCustomer: true },
            transportation: { included: false, details: '', visibleToCustomer: true },
            hotel: { included: false, details: '', visibleToCustomer: true },
            visaAssistance: { included: false, details: '', visibleToCustomer: true },
            travelInsurance: { included: false, details: '', visibleToCustomer: true },
            tourGuide: { included: false, details: '', visibleToCustomer: true },
            foodAndDining: { included: false, details: '', visibleToCustomer: true },
            supportAndServices: { included: false, details: '', visibleToCustomer: true },
            languages: { included: false, details: '', visibleToCustomer: true },
        },
        custom_services: []
    })

    const [agentGstApplicable, setAgentGstApplicable] = useState<boolean | null>(null)

    // Duplicate day validation for cancellation rules
    const duplicateDayIndices = formData.cancellation_rules
        .map((r, i) => ({ days: r.daysBefore, index: i }))
        .filter(r => (r.days as any) !== '' && r.days !== null && r.days !== undefined)
        .filter((r, i, self) => self.some((other, otherIdx) => other.days === r.days && other.index !== r.index))
        .map(r => r.index);

    const unorderedRuleIndices = formData.cancellation_rules
        .map((r, i) => ({ days: r.daysBefore, index: i }))
        .filter(r => (r.days as any) !== '' && r.days !== null && r.days !== undefined)
        .filter((r, i, self) => i > 0 && r.days >= self[i - 1].days)
        .map(r => r.index);

    const invalidPercentageIndices = formData.cancellation_rules
        .map((r, i) => ({ percentage: r.refundPercentage, index: i }))
        .filter(r => (r.percentage as any) !== '' && (Number(r.percentage) < 0 || Number(r.percentage) > 100))
        .map(r => r.index);

    const emptyFieldIndices = formData.cancellation_rules
        .map((r, i) => ({ days: r.daysBefore, percentage: r.refundPercentage, index: i }))
        .filter(r => (r.days as any) === '' || (r.percentage as any) === '')
        .map(r => r.index);

    // Clear trip style validation error automatically when styles are pre-populated
    useEffect(() => {
        if (formData.trip_styles.length > 0) {
            setTripStyleError(false)
        }
    }, [formData.trip_styles])

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
                const res = await fetch(`${API_URL}/api/v1/agent/settings/`, {
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
                        // Cancellation Policy
                        cancellation_enabled: false,
                        cancellation_rules: [],
                        // Dual Booking
                        booking_type: 'INSTANT',
                        price_label: '',
                        enquiry_payment: 'OFFLINE',
                        // Inclusions & Exclusions
                        inclusions: {
                            flights: { included: false, details: '', visibleToCustomer: true },
                            transportation: { included: false, details: '', visibleToCustomer: true },
                            hotel: { included: false, details: '', visibleToCustomer: true },
                            visaAssistance: { included: false, details: '', visibleToCustomer: true },
                            travelInsurance: { included: false, details: '', visibleToCustomer: true },
                            tourGuide: { included: false, details: '', visibleToCustomer: true },
                            foodAndDining: { included: false, details: '', visibleToCustomer: true },
                            supportAndServices: { included: false, details: '', visibleToCustomer: true },
                            languages: { included: false, details: '', visibleToCustomer: true },
                        },
                        custom_services: []
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
            console.log(`[SlugGen] Auto-generating slug for: "${formData.title}"`);
            updateFormData('slug', generateSlug(formData.title));
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
                        const settingsRes = await fetch(`${API_URL}/api/v1/agent/settings/`, {
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
                        const settingsRes = await fetch(`${API_URL}/api/v1/agent/settings/`, {
                            headers: { 'Authorization': `Bearer ${token2 || ''}` }
                        })
                        if (settingsRes.ok) {
                            const settings = await settingsRes.json()
                            setAgentGstApplicable(Boolean(settings.gst_applicable))
                        }
                    } catch { /* ignore */ }
                }

                setIsSlugEdited(true)

                setFormData({
                    title: pkg.title || '',
                    destination: pkg.destination || '',
                    country: pkg.country || '',
                    duration_days: pkg.duration_days || 7,
                    duration_nights: pkg.duration_nights || 6,
                    trip_styles: pkg.trip_styles || (pkg.trip_style ? [pkg.trip_style] : []),
                    price_per_person: Number(pkg.price_per_person) || 0,
                    description: pkg.description || '',
                    is_public: (pkg.is_public === true || pkg.is_public === false) ? pkg.is_public : true,
                    feature_image_url: pkg.feature_image_url || '',
                    package_mode: (pkg.package_mode || 'single').toLowerCase(),
                    destinations: pkg.destinations || [],
                    activities: pkg.activities || [],
                    included_items: pkg.included_items || [],
                    slug: pkg.slug || '',
                    gst_applicable: Boolean(gstApplicable),
                    gst_percentage: gstPercentage,
                    gst_mode: gstMode,
                    // Cancellation Policy — preserve fareType per rule; default absent ones to 'total_fare' when GST is on
                    cancellation_enabled: pkg.cancellation_enabled || false,
                    cancellation_rules: (pkg.cancellation_rules || []).map((r: any) => ({
                        daysBefore: r.daysBefore ?? 0,
                        refundPercentage: r.refundPercentage ?? 0,
                        fareType: r.fareType || 'total_fare'
                    })),
                    // Dual Booking
                    booking_type: pkg.booking_type || 'INSTANT',
                    price_label: pkg.price_label || '',
                    enquiry_payment: pkg.enquiry_payment || 'OFFLINE',
                    inclusions: pkg.inclusions ? Object.keys(pkg.inclusions).reduce((acc: any, key: string) => {
                        const val = pkg.inclusions[key];
                        acc[key] = {
                            included: val.included || false,
                            details: val.details || '',
                            visibleToCustomer: val.visibleToCustomer !== undefined ? val.visibleToCustomer : true
                        };
                        return acc;
                    }, {}) : {
                        flights: { included: false, details: '', visibleToCustomer: true },
                        transportation: { included: false, details: '', visibleToCustomer: true },
                        hotel: { included: false, details: '', visibleToCustomer: true },
                        visaAssistance: { included: false, details: '', visibleToCustomer: true },
                        travelInsurance: { included: false, details: '', visibleToCustomer: true },
                        tourGuide: { included: false, details: '', visibleToCustomer: true },
                        foodAndDining: { included: false, details: '', visibleToCustomer: true },
                        supportAndServices: { included: false, details: '', visibleToCustomer: true },
                        languages: { included: false, details: '', visibleToCustomer: true },
                    },
                    custom_services: (pkg.custom_services || []).map((s: any) => ({
                        ...s,
                        visibleToCustomer: s.visibleToCustomer !== undefined ? s.visibleToCustomer : true
                    }))
                })
                if (pkg.feature_image_url) setUseFeatureImage(true)
                setPackageId(id)
                setDataLoaded(true)
            }
        } catch (error) {
            console.error('Failed to load package:', error)
            toast.error('Failed to load package data')
            setDataLoaded(true) // allow interaction even on error
        } finally {
            setLoading(false)
        }
    }

    const updateFormData = (field: keyof PackageFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (field === 'duration_days') {
            setFormData(prev => ({ ...prev, duration_nights: Math.max(0, value - 1) }))
        } else if (field === 'duration_nights') {
            setFormData(prev => ({ ...prev, duration_days: value + 1 }))
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
        // Don't run while initial data is being loaded in edit mode
        if (loading || !dataLoaded) {
            toast.info('Please wait while the package data is loading...')
            return
        }

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
            const isPriceRequired = formData.booking_type === 'INSTANT';
            if (isPriceRequired && (!formData.price_per_person || Number(formData.price_per_person) <= 0)) missingFields.push("Price per Person");
            if (formData.trip_styles.length === 0) missingFields.push("Trip Style");

            // Duplicate destination check
            if (formData.package_mode === 'multi') {
                const uniqueDests = new Set();
                const duplicates = [];
                for (const d of formData.destinations) {
                    const key = `${d.city.trim().toLowerCase()}-${d.country.trim().toLowerCase()}`;
                    if (d.city && d.country) {
                        if (uniqueDests.has(key)) duplicates.push(d.city);
                        else uniqueDests.add(key);
                    }
                }
                if (duplicates.length > 0) {
                    toast.error(`Duplicate destinations not allowed: ${[...new Set(duplicates)].join(', ')}`);
                    return;
                }
            }

            // Custom Services validation
            const invalidCustomServices = formData.custom_services.some(s => !s.heading.trim());

            if (invalidCustomServices) {
                toast.error("Heading is required for all custom services");
                return;
            }

            if (missingFields.length > 0) {
                toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
                setTripStyleError(formData.trip_styles.length === 0);
                return;
            }

            // Cancellation policy validation
            if (formData.cancellation_enabled) {
                if (duplicateDayIndices.length > 0) {
                    toast.error("Cancellation policy has duplicate days. Please use unique days for each rule.");
                    return;
                }
                if (unorderedRuleIndices.length > 0) {
                    toast.error("Cancellation rules must be in descending order (e.g., 30 days, then 15, then 0).");
                    return;
                }
                if (invalidPercentageIndices.length > 0) {
                    toast.error("Refund percentage must be between 0 and 100.");
                    return;
                }
                if (emptyFieldIndices.length > 0) {
                    toast.error("Please fill in both 'Days Before' and 'Refund %' for all cancellation rules.");
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

            const gstApplicableFinal = agentGstApplicable ? formData.gst_applicable : false

            // Process inclusions and custom services to trim whitespace
            const trimmedInclusions: Record<string, any> = {};
            if (formData.inclusions) {
                Object.entries(formData.inclusions).forEach(([key, val]: [string, any]) => {
                    trimmedInclusions[key] = {
                        ...val,
                        details: val.details?.trim() || ''
                    };
                });
            }

            const trimmedCustomServices = (formData.custom_services || []).map((s: any) => ({
                ...s,
                heading: s.heading.trim(),
                description: s.description.trim()
            }));

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    inclusions: trimmedInclusions,
                    custom_services: trimmedCustomServices,
                    gst_applicable: gstApplicableFinal,
                    // Clear GST details when not applicable — prevents default values (18%, exclusive)
                    // from being persisted to the database
                    gst_percentage: gstApplicableFinal ? formData.gst_percentage : null,
                    gst_mode: gstApplicableFinal ? formData.gst_mode : null,
                    cancellation_rules: sanitisedRules
                })
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

        } catch (error: any) {
            console.error('Failed to save package:', error)
            let errorMsg = 'Failed to save package details. Please try again.'
            try {
                const parsed = JSON.parse(error.message)
                if (parsed.detail) {
                    errorMsg = parsed.detail
                }
            } catch { /* ignore */ }
            toast.error(errorMsg)
        } finally {
            setSaving(false)
        }
    }

    const handleSaveDraftOnly = async () => {
        setSaving(true)
        try {
            const url = packageId
                ? `${API_URL}/api/v1/agent/packages/${packageId}`
                : `${API_URL}/api/v1/agent/packages`

            const method = packageId ? 'PUT' : 'POST'
            const token = localStorage.getItem('token')

            const gstApplicableFinal = agentGstApplicable ? formData.gst_applicable : false

            // Process inclusions and custom services to trim whitespace
            const trimmedInclusions: Record<string, any> = {};
            if (formData.inclusions) {
                Object.entries(formData.inclusions).forEach(([key, val]: [string, any]) => {
                    trimmedInclusions[key] = {
                        ...val,
                        details: val.details?.trim() || ''
                    };
                });
            }

            const trimmedCustomServices = (formData.custom_services || []).map((s: any) => ({
                ...s,
                heading: s.heading.trim(),
                description: s.description.trim()
            }));

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    inclusions: trimmedInclusions,
                    custom_services: trimmedCustomServices,
                    gst_applicable: gstApplicableFinal,
                    // Clear GST details when not applicable
                    gst_percentage: gstApplicableFinal ? formData.gst_percentage : null,
                    gst_mode: gstApplicableFinal ? formData.gst_mode : null,
                    cancellation_rules: formData.cancellation_rules.map(r => ({
                        ...r,
                        fareType: r.fareType || 'total_fare'
                    }))
                })
            })

            if (formData.cancellation_enabled) {
                if (duplicateDayIndices.length > 0) {
                    setSaving(false);
                    toast.error("Cancellation policy has duplicate days. Please use unique days for each rule.");
                    return;
                }
                if (unorderedRuleIndices.length > 0) {
                    setSaving(false);
                    toast.error("Cancellation rules must be in descending order (e.g., 30 days, then 15, then 0).");
                    return;
                }
                if (invalidPercentageIndices.length > 0) {
                    setSaving(false);
                    toast.error("Refund percentage must be between 0 and 100.");
                    return;
                }
                if (emptyFieldIndices.length > 0) {
                    setSaving(false);
                    toast.error("Please fill in both 'Days Before' and 'Refund %' for all cancellation rules.");
                    return;
                }
            }

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
        const isPriceRequired = formData.booking_type === 'INSTANT';
        const hasPrice = !isPriceRequired || Number(formData.price_per_person) > 0;
        const hasTripStyle = formData.trip_styles.length >= 1;
        const mode = (formData.package_mode || 'single').toLowerCase();

        if (mode === 'single') {
            return hasTitle && Boolean(formData.destination) && Boolean(formData.country) && hasPrice && hasTripStyle;
        } else {
            const uniqueDests = new Set();
            let hasDuplicates = false;
            for (const d of formData.destinations) {
                const key = `${(d.city || '').trim().toLowerCase()}-${(d.country || '').trim().toLowerCase()}`;
                if (d.city && d.country) {
                    if (uniqueDests.has(key)) { hasDuplicates = true; break; }
                    else uniqueDests.add(key);
                }
            }
            return hasTitle && formData.destinations.length > 0 && formData.destinations.every(d => d.city && d.country && (Number(d.days) || 0) > 0) && hasPrice && hasTripStyle && !hasDuplicates;
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
        // Block navigation while data is still loading
        if (loading || !dataLoaded) {
            return
        }

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

    // Show full-page loading overlay while fetching edit data
    if (loading && !dataLoaded) {
        return (
            <div className="pkg-creation-root min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full border-4 border-[var(--button-glow)] border-t-[var(--button-bg)] animate-spin mx-auto" />
                    <p className="text-black font-semibold text-lg">Loading package details...</p>
                    <p className="text-black/60 text-sm">Please wait while we fetch your saved data</p>
                </div>
            </div>
        )
    }

    return (
        <div className="pkg-creation-root min-h-screen pb-32 overflow-x-hidden">
            {/* Header */}
            <div className="glass-navbar sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/agent/packages')}
                                className="text-black hover:text-black -ml-2 hover:bg-white/50"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Packages
                            </Button>
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex items-end justify-between pb-0">
                            <div>
                                <h1 className="text-3xl font-bold text-black flex items-center gap-3">
                                    <span className="text-3xl">🗺️</span>
                                    {packageId ? (
                                        <span className="truncate max-w-xl block" title={formData.title}>
                                            Edit Package: <span className="text-[var(--primary)]">{formData.title || 'Untitled Package'}</span>
                                        </span>
                                    ) : 'Create New Package'}
                                </h1>
                                <p className="text-sm text-black mt-1 ml-12">
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
                        <div className="w-full max-w-3xl mx-auto py-2">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-white bg-gradient-to-r from-[var(--primary)] to-[#FF9A5C] px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                                        Progress: {activeStep === 1 ? '33%' : activeStep === 2 ? '66%' : '100%'}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest">Step {activeStep} of 3</span>
                            </div>

                            {/* Step track — needs overflow visible so labels below circles aren't clipped */}
                            <div className="relative flex items-start justify-between overflow-visible" style={{ minHeight: '72px' }}>
                                {/* Background Line — sits behind circles via z-index */}
                                <div className="absolute left-0 top-5 -translate-y-1/2 w-full h-1.5 bg-[var(--primary)]/10 rounded-full" style={{ zIndex: 0 }} />

                                {/* Active Progress Line */}
                                <div
                                    className="absolute left-0 top-5 -translate-y-1/2 h-1.5 bg-gradient-to-r from-[var(--primary)] to-[#FF9A5C] rounded-full transition-all duration-1000"
                                    style={{ width: `${((activeStep - 1) / 2) * 100}%`, zIndex: 0 }}
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
                                            className="group flex flex-col items-center cursor-pointer overflow-visible"
                                            style={{ zIndex: 1, minWidth: '72px' }}
                                            onClick={() => handleStepClick(item.step)}
                                        >
                                            {/* Circle */}
                                            <div className={cn(
                                                "relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-700 flex-shrink-0",
                                                isCompleted ? "bg-[#085B1F] border-white text-white shadow-[0_0_15px_rgba(8,91,31,0.3)]" :
                                                    isCurrent ? "bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] border-white text-black shadow-[0_0_20px_var(--primary-glow)] scale-110" :
                                                        "bg-white/20 backdrop-blur-md border-white/30 text-black font-medium"
                                            )}>
                                                {isCompleted ? <Check className="w-5 h-5" /> : (
                                                    <span className={cn("text-sm font-bold", isCurrent && "animate-pulse")}>{item.step}</span>
                                                )}

                                                {/* Pulsing ring for current */}
                                                {isCurrent && (
                                                    <div className="absolute inset-0 rounded-full border-4 border-[var(--primary)]/30 animate-ping" />
                                                )}
                                            </div>

                                            {/* Labels — in normal flow below circle, never absolutely positioned */}
                                            <div className={cn(
                                                "flex flex-col items-center mt-2 transition-all duration-300",
                                                isCurrent ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                                            )}>
                                                <span className={cn(
                                                    "text-[11px] font-bold whitespace-nowrap tracking-tight",
                                                    isCurrent ? "text-[var(--primary)]" : isCompleted ? "text-[#085B1F]" : "text-black"
                                                )}>
                                                    {item.label}
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] uppercase font-bold tracking-wider mt-0.5 whitespace-nowrap",
                                                    isCompleted ? "text-[#085B1F]" : "text-black"
                                                )}>
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
                                <div className="flex-1">
                                    <h3 className="font-semibold text-black">Overview</h3>
                                    <p className="text-xs text-black opacity-80">Essential package details</p>
                                </div>
                                {agentGstApplicable !== null && (
                                    <div className={cn(
                                        "text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-2",
                                        agentGstApplicable
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-white text-black border-black/20"
                                    )}>
                                        <span>GST {agentGstApplicable ? 'Applicable' : 'Not Applicable'}</span>
                                        <div className={cn("w-2 h-2 rounded-full", agentGstApplicable ? "bg-emerald-500 animate-pulse" : "bg-black/30")} />
                                    </div>
                                )}
                            </div>
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Package Type Toggle & Title Row */}
                                <div className="space-y-3 mb-2">
                                    <Label className="text-xs font-bold text-black uppercase tracking-wider">Package Type <span className="text-red-500">*</span></Label>
                                    <div className="relative flex p-1 rounded-full max-w-sm" style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                                        {/* Sliding Background Indicator */}
                                        <div
                                            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-in-out shadow-lg"
                                            style={{
                                                background: 'linear-gradient(135deg, var(--button-bg) 0%, var(--button-bg-light) 100%)',
                                                left: formData.package_mode === 'single' ? '4px' : 'calc(50%)'
                                            }}
                                        />

                                        {/* Single Option */}
                                        <button
                                            type="button"
                                            onClick={() => updateFormData('package_mode', 'single')}
                                            className={cn(
                                                "relative z-10 flex-1 py-2 px-4 text-sm font-bold rounded-full transition-colors flex items-center justify-center gap-2",
                                                formData.package_mode === 'single' ? "text-white" : "text-black hover:text-[var(--primary)] hover:bg-white/10"
                                            )}
                                        >
                                            <MapPin className={cn("w-4 h-4", formData.package_mode === 'single' ? "text-white" : "text-black")} />
                                            Single
                                        </button>

                                        {/* Multi Option */}
                                        <button
                                            type="button"
                                            onClick={() => updateFormData('package_mode', 'multi')}
                                            className={cn(
                                                "relative z-10 flex-1 py-2 px-4 text-sm font-bold rounded-full transition-colors flex items-center justify-center gap-2",
                                                formData.package_mode === 'multi' ? "text-white" : "text-black hover:text-[var(--primary)] hover:bg-white/10"
                                            )}
                                        >
                                            <Globe className={cn("w-4 h-4", formData.package_mode === 'multi' ? "text-white" : "text-black")} />
                                            Multi-Destinations
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className={cn("text-xs font-bold text-black uppercase tracking-wider", formData.title ? "text-[var(--primary)]" : "")}>
                                        Package Title <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FileText className={cn("h-4 w-4 transition-colors", formData.title ? "text-[var(--primary)]" : "text-black/40 group-focus-within/input:text-[var(--primary)]")} />
                                        </div>
                                        <Input
                                            placeholder="e.g., Tokyo Adventure 7 Days"
                                            value={formData.title}
                                            maxLength={100}
                                            onChange={(e) => {
                                                const newTitle = e.target.value;
                                                updateFormData('title', newTitle);
                                                // Auto-update slug only if not manually edited
                                                if (!isSlugEdited) {
                                                    updateFormData('slug', generateSlug(newTitle));
                                                }
                                            }}
                                            className={cn("glass-input pl-10 h-12 rounded-xl", getInputStyle(formData.title, true))}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-black/40">
                                            {formData.title.length}/100
                                        </div>
                                    </div>
                                    <p className="text-xs text-black/80">Create an engaging title that highlights the experience</p>
                                </div>

                                <div className="space-y-2">
                                        <Label className={cn("text-xs font-bold uppercase tracking-wider", formData.slug ? "text-[var(--primary)]" : "text-black")}>
                                            URL Slug <span className="text-black/40 font-normal">(Optional — will auto-generate)</span>
                                        </Label>
                                        <div className="relative group/input">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Link2 className={cn("h-4 w-4 transition-colors", formData.slug ? "text-[var(--primary)]" : "text-black/40 group-focus-within/input:text-[var(--primary)]")} />
                                            </div>
                                            <Input
                                                placeholder="e.g., tokyo-adventure-7-days"
                                                value={formData.slug}
                                                onChange={(e) => {
                                                    const manualSlug = generateSlug(e.target.value);
                                                    updateFormData('slug', manualSlug);
                                                    setIsSlugEdited(true); // Mark as manually edited
                                                }}
                                                className={cn("glass-input pl-10 h-10 rounded-xl font-mono text-xs", getInputStyle(formData.slug, false))}
                                            />
                                        <div className="absolute inset-y-0 right-0 pr-1 flex items-center">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    if (formData.title) {
                                                        const freshSlug = generateSlug(formData.title);
                                                        updateFormData('slug', freshSlug);
                                                        setIsSlugEdited(false); // Reset edit state to allow auto-sync again
                                                        toast.success('Slug synced with title');
                                                    }
                                                }}
                                                className="h-8 w-8 p-0 hover:bg-white/20 text-black/40 hover:text-[var(--primary)]"
                                                title="Sync with title"
                                            >
                                                <Sparkles className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        <p className="text-[10px] font-bold text-black/60">
                                            Changing this will update the public URL. Current: <span className="text-[var(--primary)]">/plan-trip/{formData.slug || '...'}</span>
                                        </p>
                                    </div>
                                </div>

                                {formData.package_mode === 'single' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-black uppercase tracking-wider">Country <span className="text-red-500">*</span></Label>
                                            <div className="relative group">
                                                <Select
                                                    value={formData.country}
                                                    onValueChange={(value) => updateFormData('country', value)}
                                                >
                                                    <SelectTrigger className="glass-input pl-10 h-11 border-gray-200 rounded-xl text-black font-bold">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Globe className="h-4 w-4 text-black group-focus-within:text-[var(--primary)] transition-colors" />
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

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-black uppercase tracking-wider">Location <span className="text-red-500">*</span></Label>
                                            <div className="relative group">
                                                <CityAutocomplete
                                                    countryName={formData.country}
                                                    value={formData.destination}
                                                    onChange={(val) => updateFormData('destination', val)}
                                                    placeholder="Search city..."
                                                    className={cn("!font-bold !text-black", !formData.country && "opacity-60 cursor-not-allowed")}
                                                />
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
                                                    <Label className="text-xs font-bold text-black uppercase tracking-[0.15em]">Destination Legs</Label>
                                                </div>
                                                <div className="px-2.5 py-1 text-[10px] font-bold text-[var(--primary)] bg-white/20 border border-[var(--primary-soft)] tracking-wide rounded-full shadow-sm">
                                                    {formData.destinations.length} Leg{formData.destinations.length !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={handleAddDestination}
                                                className="h-8 px-4 text-xs font-semibold text-[var(--primary)] bg-[rgba(255,255,255,0.22)] border-[1.5px] border-[var(--primary-soft)] hover:bg-[var(--primary-glow)] hover:border-[var(--primary)] transition-all rounded-full shadow-sm"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1 text-[var(--primary)]" /> Add Leg
                                            </Button>
                                        </div>

                                        {formData.destinations.length === 0 && (
                                            <div className="text-center py-8 bg-transparent rounded-xl border border-dashed border-gray-200">
                                                <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-black font-medium">No destinations added yet.</p>
                                                <p className="text-xs text-black opacity-70">Click the button above to start building your multi-destination tour.</p>
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
                                                            background: 'rgba(255,255,255,0.15)',
                                                            backdropFilter: 'blur(28px) saturate(180%)',
                                                            border: '1px solid rgba(255,255,255,0.40)',
                                                            borderLeft: '4px solid var(--primary)',
                                                            borderRadius: '24px',
                                                            boxShadow: draggedLegIndex === index ? '0 12px 32px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.05)'
                                                        }}
                                                        onMouseEnter={(e: any) => { if (draggedLegIndex === null) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px var(--primary-glow)' } }}
                                                        onMouseLeave={(e: any) => { if (draggedLegIndex === null) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)' } }}
                                                    >
                                                        {/* Drag Handle */}
                                                        <div className="absolute left-[-22px] top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-2 text-[var(--primary-soft)] hover:text-[var(--primary)]">
                                                            <GripVertical className="w-5 h-5" />
                                                        </div>

                                                        {/* Leg Number Badge */}
                                                        <div
                                                            className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center rounded-full text-white text-xs font-bold shadow-md z-10"
                                                            style={{ background: 'linear-gradient(135deg, var(--button-bg), var(--button-bg-light))' }}
                                                        >
                                                            {index + 1}
                                                        </div>

                                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-5 mt-2 sm:mt-0 pl-2">
                                                            <div className="sm:col-span-4 relative flex items-center">
                                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                                                    <Globe className="h-4 w-4 text-black" />
                                                                </div>
                                                                <Select value={dest.country} onValueChange={(val) => handleUpdateDestination(index, 'country', val)}>
                                                                    <SelectTrigger
                                                                        className={cn(
                                                                            "pl-9 h-11 text-sm font-bold text-black transition-all focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]/50 w-full hover:bg-[rgba(255,255,255,0.4)] relative",
                                                                            !dest.country ? "border-red-500/50 bg-red-50/5" : "border-white/45 bg-white/25"
                                                                        )}
                                                                        style={{ borderRadius: '14px' }}
                                                                    >
                                                                        <SelectValue placeholder="Country *" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="pkg-creation-root glass-dropdown-content border-white/40">
                                                                        {Country.getAllCountries().map((c) => (
                                                                            <SelectItem key={c.isoCode} value={c.name} className="glass-select-item">{c.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="sm:col-span-5 relative flex items-center">
                                                                <CityAutocomplete
                                                                    countryName={dest.country}
                                                                    value={dest.city}
                                                                    onChange={(val) => handleUpdateDestination(index, 'city', val)}
                                                                    placeholder="City / Area"
                                                                    className={cn("pl-4 h-11 text-sm !font-bold !text-black", !dest.country && "opacity-60 cursor-not-allowed")}
                                                                />
                                                            </div>
                                                            <div className="sm:col-span-3 relative flex items-center">
                                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                                                    <Calendar className="h-4 w-4 text-[var(--primary)]" />
                                                                </div>
                                                                <Input
                                                                    type="number" min="1"
                                                                    value={dest.days}
                                                                    onChange={(e) => handleUpdateDestination(index, 'days', parseInt(e.target.value) || 1)}
                                                                    className="pl-9 h-11 text-sm font-bold text-black focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:border-[var(--primary)]/50 w-full hover:bg-[rgba(255,255,255,0.4)] pr-12 text-center"
                                                                    style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: '14px' }}
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider font-bold text-black pointer-events-none">Days</span>
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
                                                            <div className="w-px h-full border-l-[1.5px] border-dashed border-[var(--primary)]/35"></div>
                                                            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-[rgba(255,255,255,0.8)] backdrop-blur-sm border border-[var(--primary)]/30 rounded-full flex items-center justify-center shadow-sm z-10">
                                                                <Plane className="w-3 h-3 text-[var(--primary)]/80 rotate-[135deg] translate-y-[0.5px] -translate-x-[0.5px]" />
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
                                                            border: '2px dashed var(--primary-soft)',
                                                            borderRadius: '20px',
                                                            background: 'rgba(255,255,255,0.10)',
                                                            color: 'var(--primary)'
                                                        }}
                                                        onMouseEnter={(e: any) => {
                                                            e.currentTarget.style.background = 'var(--primary-glow)';
                                                            e.currentTarget.style.borderStyle = 'solid';
                                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                                        }}
                                                        onMouseLeave={(e: any) => {
                                                            e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
                                                            e.currentTarget.style.borderStyle = 'dashed';
                                                            e.currentTarget.style.borderColor = 'var(--primary-soft)';
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
                                                    background: 'rgba(255,255,255,0.15)',
                                                    backdropFilter: 'blur(32px) saturate(180%)',
                                                    border: '1px solid rgba(255,255,255,0.40)',
                                                    borderRadius: '20px',
                                                    boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
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
                                                        <Calendar className="w-3.5 h-3.5 text-black opacity-80" />
                                                        <span className="text-[var(--primary)] font-bold text-sm tracking-tight min-w-[12px] text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{formData.destinations.reduce((sum, d) => sum + (parseInt(d.days as any) || 0), 0)}</span>
                                                        <span className="text-black font-bold uppercase tracking-wider">Days</span>
                                                    </div>
                                                    <div className="px-3 py-1.5 bg-[rgba(255,255,255,0.5)] border border-white/50 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-300">
                                                        <Moon className="w-3.5 h-3.5 text-black opacity-80" />
                                                        <span className="text-[var(--primary)] font-bold text-sm tracking-tight min-w-[12px] text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.max(0, formData.destinations.reduce((sum, d) => sum + (parseInt(d.days as any) || 0), 0) - 1)}</span>
                                                        <span className="text-black font-bold uppercase tracking-wider">Nights</span>
                                                    </div>
                                                    <div className="px-3 py-1.5 bg-[rgba(255,255,255,0.5)] border border-white/50 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-300">
                                                        <Globe className="w-3.5 h-3.5 text-black opacity-80" />
                                                        <span className="text-[var(--primary)] font-bold text-sm tracking-tight min-w-[12px] text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{new Set(formData.destinations.filter(d => d.country).map(d => d.country)).size}</span>
                                                        <span className="text-black font-bold uppercase tracking-wider">Countries</span>
                                                    </div>
                                                    <div className="px-3 py-1.5 bg-[rgba(255,255,255,0.5)] border border-white/50 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-300">
                                                        <Building2 className="w-3.5 h-3.5 text-black opacity-80" />
                                                        <span className="text-[var(--primary)] font-bold text-sm tracking-tight min-w-[12px] text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{formData.destinations.filter(d => d.city).length}</span>
                                                        <span className="text-black font-bold uppercase tracking-wider">Cities</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Inclusions & Exclusions */}
                        <Card className="glass-card border-0 shadow-lg overflow-hidden group mt-8">
                            <div className="bg-gradient-to-r from-[var(--primary)]/5 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-3">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-[var(--primary)] group-hover:scale-110 transition-transform">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-black">Inclusions & Exclusions</h3>
                                    <p className="text-xs text-black opacity-80">What's covered in this package</p>
                                </div>
                            </div>
                            <CardContent className="p-3">
                                <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500">
                                    <div className="p-1.5 bg-white shadow-sm rounded-full mt-0.5">
                                        <Info className="w-3.5 h-3.5 text-[var(--primary)]" />
                                    </div>
                                    <p className="text-[11px] font-bold text-black opacity-70 leading-relaxed">
                                        The checkbox on the UI page determines whether the item is shown as inclusive or exclusive. <br />
                                        If the toggle is enabled, it is inclusive; if it is disabled, it is exclusive.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-[6px]">
                                    {INCLUSION_ITEMS.map((item) => {
                                        const value = formData.inclusions?.[item.key] || { included: false, details: '', visibleToCustomer: true };

                                        return (
                                            <ServiceCard
                                                key={item.key}
                                                icon={item.icon}
                                                label={item.label}
                                                isOn={value.included}
                                                description={value.details}
                                                isVisible={value.visibleToCustomer}
                                                onVisibilityChange={(val) => {
                                                    const newValue = { ...value, visibleToCustomer: val };
                                                    updateFormData('inclusions', { ...formData.inclusions, [item.key]: newValue });
                                                }}
                                                onToggle={() => {
                                                    const newValue = { ...value, included: !value.included };
                                                    updateFormData('inclusions', { ...formData.inclusions, [item.key]: newValue });
                                                }}
                                                onDescriptionChange={(val) => {
                                                    const newValue = { ...value, details: val };
                                                    updateFormData('inclusions', { ...formData.inclusions, [item.key]: newValue });
                                                }}
                                                placeholder={item.placeholder}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Dynamic Custom Services Builder */}
                                <div className="mt-8 space-y-6 pt-6 border-t border-black/5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-black uppercase tracking-wider">Custom Services Builder</h4>
                                            <p className="text-[11px] text-black/60">Add multiple independent inclusions or exclusions</p>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                const newService = {
                                                    id: uuidv4(),
                                                    heading: '',
                                                    description: '',
                                                    isIncluded: true,
                                                    visibleToCustomer: true
                                                };
                                                updateFormData('custom_services', [...formData.custom_services, newService]);
                                            }}
                                            variant="outline"
                                            className="h-8 gap-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg font-bold text-xs px-3"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Add Custom Service
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[6px]">
                                        {formData.custom_services.map((service, index) => (
                                            <ServiceCard
                                                key={service.id}
                                                isCustom
                                                heading={service.heading}
                                                isOn={service.isIncluded}
                                                description={service.description}
                                                isVisible={service.visibleToCustomer}
                                                onVisibilityChange={(val) => {
                                                    const updated = [...formData.custom_services];
                                                    updated[index].visibleToCustomer = val;
                                                    updateFormData('custom_services', updated);
                                                }}
                                                onToggle={() => {
                                                    const updated = [...formData.custom_services];
                                                    updated[index].isIncluded = !updated[index].isIncluded;
                                                    updateFormData('custom_services', updated);
                                                }}
                                                onDescriptionChange={(val) => {
                                                    const updated = [...formData.custom_services];
                                                    updated[index].description = val;
                                                    updateFormData('custom_services', updated);
                                                }}
                                                onHeadingChange={(val) => {
                                                    const updated = [...formData.custom_services];
                                                    updated[index].heading = val;
                                                    updateFormData('custom_services', updated);
                                                }}
                                                onRemove={() => {
                                                    const updated = formData.custom_services.filter((_, i) => i !== index);
                                                    updateFormData('custom_services', updated);
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {formData.custom_services.length === 0 && (
                                        <div className="text-center py-10 border-2 border-dashed border-black/5 rounded-3xl group-hover:border-[var(--primary)]/20 transition-colors">
                                            <div className="p-3 bg-black/5 rounded-full w-fit mx-auto mb-3">
                                                <Sparkles className="w-5 h-5 text-black/20" />
                                            </div>
                                            <p className="text-xs text-black/40 font-medium">[ ✦ ] No custom services added yet. Click "+ Add Custom Service" to add your own inclusions or exclusions.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Logistics & Pricing */}
                        <Card className="glass-card border-0 shadow-lg overflow-hidden group mt-8">
                            <div className="bg-gradient-to-r from-[var(--primary)]/5 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-3">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-[var(--primary)] group-hover:scale-110 transition-transform">
                                    <Banknote className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-black">Pricing</h3>
                                    <p className="text-xs text-black opacity-80">Timeline and costs</p>
                                </div>
                            </div>
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-black uppercase tracking-wider">Duration <span className="text-red-500">*</span></Label>
                                        {formData.package_mode === 'multi' && <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded uppercase font-bold tracking-widest">Auto</span>}
                                    </div>
                                    <div className="duration-wrapper glass-input overflow-hidden group/duration transition-all hover:border-[var(--primary)]/30">
                                        {/* Nights */}
                                        <div className="duration-half flex-1 border-r border-white/30">
                                            <Moon className="duration-icon text-black" />
                                            <Input
                                                type="number"
                                                min="0"
                                                readOnly={formData.package_mode === 'multi'}
                                                value={formData.duration_nights}
                                                onChange={(e) => updateFormData('duration_nights', parseInt(e.target.value))}
                                                className={cn("duration-value border-0 focus-visible:ring-0", formData.package_mode === 'multi' && "opacity-80 cursor-not-allowed")}
                                            />
                                            <span className="duration-unit text-black">Nights</span>
                                        </div>

                                        {/* Days */}
                                        <div className="duration-half flex-1">
                                            <Calendar className="duration-icon text-black" />
                                            <Input
                                                type="number"
                                                min="1"
                                                readOnly={formData.package_mode === 'multi'}
                                                value={formData.duration_days}
                                                onChange={(e) => updateFormData('duration_days', parseInt(e.target.value))}
                                                className={cn("duration-value border-0 focus-visible:ring-0", formData.package_mode === 'multi' && "opacity-80 cursor-not-allowed")}
                                            />
                                            <span className="duration-unit text-black">Days</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-black opacity-80">{formData.package_mode === 'multi' ? "Auto-calculated from destination legs" : "Auto-calculates nights based on days"}</p>
                                </div>

                                {/* Price - Enhanced Field */}
                                <div className="space-y-2 md:col-span-1">
                                    <Label className="text-xs font-bold text-black uppercase tracking-wider flex items-center">
                                        Price per Person
                                        {formData.booking_type === 'INSTANT' ? (
                                            <span className="required-asterisk">*</span>
                                        ) : (
                                            <span className="optional-tag">Optional</span>
                                        )}
                                    </Label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-black font-bold">₹</span>
                                        </div>
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            value={formData.price_per_person as any}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                updateFormData('price_per_person', val === '' ? '' as any : Number(val));
                                            }}
                                            placeholder={formData.booking_type === 'INSTANT' ? "Enter price per person" : "Optional — leave blank for enquiry"}
                                            className={cn("glass-input pl-8 h-12 font-mono font-medium text-lg", getInputStyle(formData.price_per_person, formData.booking_type === 'INSTANT'))}
                                        />
                                        {Number(formData.price_per_person) > 0 && (
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <Badge variant="secondary" className="text-xs font-normal">
                                                    ~ ${(Number(formData.price_per_person) * 0.012).toFixed(0)} USD
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Booking Type & Optional Price Label Row */}
                                <div className="md:col-span-2 pt-2">
                                    <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                                        {/* Left — Booking Type compact toggle */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-black uppercase tracking-wider">Booking Type</Label>
                                            <div className="flex items-center gap-1 p-1 rounded-full bg-black/5 border border-black/5 w-fit">
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300",
                                                        formData.booking_type === 'INSTANT'
                                                            ? "bg-[var(--primary)] text-black shadow-sm shadow-[var(--primary)]/20"
                                                            : "text-black/40 hover:text-black/60"
                                                    )}
                                                    onClick={() => updateFormData('booking_type', 'INSTANT')}
                                                >
                                                    Instant Booking
                                                </button>
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300",
                                                        formData.booking_type === 'ENQUIRY'
                                                            ? "bg-[var(--primary)] text-black shadow-sm shadow-[var(--primary)]/20"
                                                            : "text-black/40 hover:text-black/60"
                                                    )}
                                                    onClick={() => updateFormData('booking_type', 'ENQUIRY')}
                                                >
                                                    Custom Enquiry
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-black/50 font-medium">
                                                {formData.booking_type === 'INSTANT'
                                                    ? '✦ Customers pay and book immediately'
                                                    : '✦ Customers send inquiry first'}
                                            </p>
                                        </div>

                                        {/* Right — Price Label, only shown when Custom Enquiry is selected */}
                                        {formData.booking_type === 'ENQUIRY' && (
                                            <div className="flex-1 w-full md:max-w-[320px] space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                                <Label className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-2">
                                                    Price Label
                                                    <span className="normal-case opacity-40 font-medium text-[10px]">(Optional)</span>
                                                </Label>
                                                <Input
                                                    placeholder="e.g. Price on request"
                                                    value={formData.price_label}
                                                    maxLength={20}
                                                    onChange={(e) => updateFormData('price_label', e.target.value)}
                                                    className="glass-input h-9 text-xs px-3 rounded-lg border-white/40"
                                                />
                                                <p className="text-[10px] text-black/50 font-medium leading-none">
                                                    Displays instead of numeric price
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* GST Configuration — visibility controlled by Agent Settings */}
                                {agentGstApplicable === true && (
                                    <div className="space-y-3 md:col-span-2">
                                        <Label className="text-xs font-bold text-black uppercase tracking-wider">GST Configuration</Label>
                                        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-5">
                                            {/* Package Level Toggle */}
                                            <div className="flex items-center justify-between p-3 bg-white/40 rounded-xl border border-emerald-200/50">
                                                <div className="space-y-0.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-emerald-900">Enable GST for this package</Label>
                                                    <p className="text-[10px] text-emerald-700 font-medium">When disabled, no tax is added to the customer's total.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => updateFormData('gst_applicable', !formData.gst_applicable)}
                                                    className={cn(
                                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                                        formData.gst_applicable ? "bg-emerald-500" : "bg-gray-300"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                        formData.gst_applicable ? "translate-x-6" : "translate-x-1"
                                                    )} />
                                                </button>
                                            </div>

                                            <div className={cn(
                                                "grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-2 transition-opacity duration-300",
                                                !formData.gst_applicable && "opacity-40 pointer-events-none"
                                            )}>
                                                {/* GST Percentage */}
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-black uppercase tracking-wider">GST Percentage</Label>
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
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-primary-font)] text-sm font-bold pointer-events-none">%</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* GST Mode */}
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-black uppercase tracking-wider">GST Mode</Label>
                                                    <div className="flex items-center gap-1 p-1 rounded-full bg-black/5 border border-black/5 w-fit">
                                                        <button
                                                            type="button"
                                                            className={cn(
                                                                "px-6 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300",
                                                                formData.gst_mode === 'exclusive'
                                                                    ? "bg-[var(--primary)] text-black shadow-sm shadow-[var(--primary)]/20"
                                                                    : "text-black/40 hover:text-black/60"
                                                            )}
                                                            onClick={() => updateFormData('gst_mode', 'exclusive')}
                                                        >
                                                            Exclusive
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={cn(
                                                                "px-6 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300",
                                                                formData.gst_mode === 'inclusive'
                                                                    ? "bg-[var(--primary)] text-black shadow-sm shadow-[var(--primary)]/20"
                                                                    : "text-black/40 hover:text-black/60"
                                                            )}
                                                            onClick={() => updateFormData('gst_mode', 'inclusive')}
                                                        >
                                                            Inclusive
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-black/50 font-medium">
                                                        {formData.gst_mode === 'exclusive'
                                                            ? '✦ GST added on top of price'
                                                            : '✦ Price already includes GST'}
                                                    </p>
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
                                                    {(formData.gst_applicable && formData.gst_mode === 'exclusive') ? (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-bold text-black text-[11px] uppercase tracking-wider">Preview:</span>
                                                            <span className="font-bold text-black">₹{formData.price_per_person.toLocaleString('en-IN')}</span>
                                                            <span className="text-[var(--primary)] font-bold">+</span>
                                                            <span className="font-bold px-2 py-0.5 rounded text-[12px]" style={{ background: 'var(--primary-glow)', color: 'black' }}>
                                                                ₹{(formData.price_per_person * formData.gst_percentage / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} GST ({formData.gst_percentage}%)
                                                            </span>
                                                        </div>
                                                    ) : (formData.gst_applicable && formData.gst_mode === 'inclusive') ? (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-bold text-black text-[11px] uppercase tracking-wider">Preview:</span>
                                                            <span className="text-black opacity-50 line-through text-sm">₹{(formData.price_per_person + (formData.price_per_person * formData.gst_percentage / 100)).toLocaleString('en-IN')}</span>
                                                            <ArrowRight className="w-3 h-3 text-[var(--primary)]" />
                                                            <span className="font-bold text-black">₹{formData.price_per_person.toLocaleString('en-IN')}</span>
                                                            <span className="font-bold px-2 py-0.5 rounded text-[12px]" style={{ background: 'var(--primary-glow)', color: 'black' }}>
                                                                Includes ₹{(formData.price_per_person - (formData.price_per_person / (1 + (formData.gst_percentage / 100)))).toLocaleString('en-IN', { maximumFractionDigits: 2 })} GST
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-bold text-[#8C6B5D] text-[11px] uppercase tracking-wider">Total Base Price:</span>
                                                            <span className="font-bold text-[#1e293b]">₹{formData.price_per_person.toLocaleString('en-IN')}</span>
                                                            {!agentGstApplicable && (
                                                                <span className="text-[10px] text-gray-400 italic">(GST Not Applicable)</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="text-right flex flex-col sm:items-end">
                                                        <div className="text-[10px] font-bold text-black uppercase tracking-wider mb-0.5">Final Total</div>
                                                        <div className="text-lg font-black" style={{ color: 'var(--primary)' }}>
                                                            ₹{(formData.gst_applicable && formData.gst_mode === 'exclusive')
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
                                    <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-black group-hover:scale-110 transition-transform">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-black">Cancellation Policy</h3>
                                        <p className="text-xs text-black opacity-80">Define refund rules based on days before travel</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">

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
                                                        ? { daysBefore: '' as any, refundPercentage: '' as any, fareType: 'total_fare' as const }
                                                        : { daysBefore: '' as any, refundPercentage: '' as any }]
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
                                    <p className="text-xs text-black font-medium leading-relaxed">
                                        Refund rules are applied based on how many days before travel the cancellation is made. Rules are shown from highest to lowest days.
                                        {agentGstApplicable && <span className="ml-1"> The refund percentage depends on the selected <b>fare type</b>.</span>}
                                        {!agentGstApplicable && <span className="ml-1"> The refund percentage applies to the total amount paid.</span>}
                                    </p>

                                    {/* Column headers */}
                                    <div className={cn(
                                        "grid gap-3 px-4",
                                        agentGstApplicable ? "grid-cols-[1fr_1fr_1.4fr_auto]" : "grid-cols-[1fr_1fr_auto]"
                                    )}>
                                        <Label className="text-[10px] font-bold uppercase text-black tracking-wider">Days Before Travel</Label>
                                        <Label className="text-[10px] font-bold uppercase text-black tracking-wider">Refund %</Label>
                                        {agentGstApplicable && (
                                            <div className="flex items-center gap-1">
                                                <Label className="text-[10px] font-bold uppercase text-black opacity-80 tracking-wider">Fare Type</Label>
                                                <div className="relative group/tooltip">
                                                    <Info className="w-3 h-3 text-black cursor-help" />
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
                                                <div className="relative group/day">
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
                                                        className={cn(
                                                            "h-8 text-sm transition-all duration-300",
                                                            duplicateDayIndices.includes(idx) || unorderedRuleIndices.includes(idx) || (rule.daysBefore as any) === ''
                                                                ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/10"
                                                                : "bg-white/80"
                                                        )}
                                                        placeholder="e.g. 7"
                                                    />
                                                    {(rule.daysBefore as any) === '' && (
                                                        <div className="absolute left-0 -bottom-8 w-max z-20">
                                                            <div className="bg-red-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-lg animate-in fade-in slide-in-from-top-1 duration-300">
                                                                This field is required.
                                                            </div>
                                                        </div>
                                                    )}
                                                    {duplicateDayIndices.includes(idx) && (
                                                        <div className="absolute left-0 -bottom-8 w-max z-20">
                                                            <div className="bg-red-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-lg animate-in fade-in slide-in-from-top-1 duration-300">
                                                                This day is already used in another rule. Each rule must have a unique number of days.
                                                            </div>
                                                        </div>
                                                    )}
                                                    {unorderedRuleIndices.includes(idx) && !duplicateDayIndices.includes(idx) && (
                                                        <div className="absolute left-0 -bottom-8 w-max z-20">
                                                            <div className="bg-red-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-lg animate-in fade-in slide-in-from-top-1 duration-300">
                                                                Rules must be in descending order (e.g. 30, then 15).
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Refund % */}
                                                <div className="relative group/percentage">
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
                                                        className={cn(
                                                            "h-8 text-sm transition-all duration-300 shadow-sm",
                                                            invalidPercentageIndices.includes(idx) || (rule.refundPercentage as any) === ''
                                                                ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/10 text-red-600 font-bold"
                                                                : "bg-white/80"
                                                        )}
                                                        placeholder="0–100"
                                                    />
                                                    {invalidPercentageIndices.includes(idx) && (
                                                        <div className="absolute left-0 -bottom-8 w-max z-20">
                                                            <div className="bg-red-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-lg animate-in fade-in slide-in-from-top-1 duration-300">
                                                                Must be between 0 and 100.
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(rule.refundPercentage as any) === '' && (
                                                        <div className="absolute left-0 -bottom-8 w-max z-20">
                                                            <div className="bg-red-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-lg animate-in fade-in slide-in-from-top-1 duration-300">
                                                                This field is required.
                                                            </div>
                                                        </div>
                                                    )}
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
                                                        <SelectTrigger className="h-8 text-sm bg-white/80 text-black font-bold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="total_fare">
                                                                <span className="font-medium">Total Fare</span>
                                                                <span className="text-[10px] text-black opacity-70 ml-1">(Base + GST)</span>
                                                            </SelectItem>
                                                            <SelectItem value="base_fare">
                                                                <span className="font-medium">Base Fare</span>
                                                                <span className="text-[10px] text-black opacity-70 ml-1">(GST forfeited)</span>
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
                                                        ? { daysBefore: '' as any, refundPercentage: '' as any, fareType: 'total_fare' as const }
                                                        : { daysBefore: '' as any, refundPercentage: '' as any }
                                                ]
                                            }))
                                        }}
                                    >
                                        <Plus className="w-4 h-4" /> Add Rule
                                    </Button>

                                    {/* Example hint */}
                                    <div className="bg-black/5 border border-black/10 rounded-lg p-3 text-xs !text-black space-y-1">
                                        {agentGstApplicable ? (
                                            <>
                                                <p className="!text-black font-semibold">Example: <span className="font-normal">Package Price = ₹1,000 + ₹180 GST (18%) = ₹1,180 Total</span></p>
                                                <p className="mt-1 !text-black">1) Cancel 10 days before travel → <span className="font-bold">100% refund</span> on <b>Base Fare</b> (₹1,000 is refundable)</p>
                                                <p className="!text-black">2) Cancel 5 days before travel → <span className="font-bold">25% refund</span> on <b>Total Fare</b> (₹295 is refundable)</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="!text-black font-semibold">Example: <span className="font-normal">Package Price = ₹1,000 Total</span></p>
                                                <p className="mt-1 !text-black">1) Cancel 10 days before travel → <span className="font-bold">100% refund</span> (₹1,000 is refundable)</p>
                                                <p className="!text-black">2) Cancel 5 days before travel → <span className="font-bold">25% refund</span> (₹250 is refundable)</p>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            )}
                        </Card>


                        {/* Trip Categorization */}
                        <Card className="glass-card border-0 shadow-lg overflow-hidden group mt-8">
                            <div className="bg-gradient-to-r from-[var(--primary)]/5 to-white/20 px-6 py-4 border-b border-white/20 flex items-center gap-3">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-black group-hover:scale-110 transition-transform">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-black">Trip Style</h3>
                                    <p className="text-xs text-black opacity-60">Categorize your package for the right audience</p>
                                </div>
                            </div>
                            <CardContent className="p-6">
                                {/* Header row with label, counter pill, Clear All */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Label
                                        className={cn(
                                            "text-xs font-bold uppercase tracking-wider transition-colors",
                                            tripStyleError ? "text-red-500" : "text-black"
                                        )}
                                    >
                                        TRIP STYLE <span className="text-red-500">*</span>
                                    </Label>

                                    {/* Live counter pill */}
                                    {formData.trip_styles.length > 0 && (
                                        <span
                                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                                            style={{
                                                background: 'var(--primary-glow)',
                                                border: '1px solid var(--primary-soft)',
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
                                            className="text-[10px] font-semibold transition-colors opacity-70 hover:opacity-100"
                                            style={{ color: 'var(--primary)' }}
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>

                                <p className="text-[11px] text-black font-medium -mt-1">Who is this package designed for? Select all that apply.</p>

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
                                                        <Check className="w-3 h-3 text-black" style={{ strokeWidth: 3 }} />
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
                                                    isSelected ? "text-[var(--primary)] font-semibold" : "text-black group-hover:text-[var(--primary)]"
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
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-black group-hover:scale-110 transition-transform">
                                    <Mountain className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-black">Experiences & Activities</h3>
                                    <p className="text-xs text-black opacity-60">Help travelers discover what they will experience</p>
                                </div>
                            </div>
                            <CardContent className="p-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <Label className="text-xs font-bold text-black uppercase tracking-wider">ACTIVITIES <span className="text-black/60 font-medium normal-case">(Optional)</span></Label>
                                            <p className="text-[11px] text-black font-medium mt-0.5">What will customers do on this trip? (Helps with search & discovery)</p>
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
                                                            ? "bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] text-white border-transparent shadow-[var(--primary-glow)]"
                                                            : "bg-white/10 backdrop-blur-md text-black border-white/40 hover:bg-white/20 hover:border-[var(--primary)]/50 hover:text-[var(--primary)]"
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



                        {/* Content & Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Description Section */}
                            <Card className="glass-description-card md:col-span-2 border-0 shadow-lg rounded-3xl overflow-hidden group">
                                <div className="bg-gradient-to-r from-purple-50/10 to-transparent px-6 py-5 border-b border-white/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 orange-gradient-badge rounded-xl text-black shadow-lg group-hover:scale-110 transition-transform">
                                            <FileText className="w-5 h-5" stroke="black" />
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-lg font-bold text-black">Description</h3>
                                            <p className="text-[11px] text-black font-bold opacity-80">Craft a compelling story for your travelers</p>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-6 space-y-6">

                                    <div className="relative group/desc">
                                        <Textarea
                                            name="description"
                                            placeholder="Describe highlights, what's included..."
                                            value={formData.description || ''}
                                            maxLength={500}
                                            onChange={(e) => updateFormData('description', e.target.value)}
                                            className={cn("glass-textarea w-full relative z-10", getInputStyle(formData.description))}
                                        />

                                        {/* Character Counter Capsule */}
                                        <div className={cn(
                                            "absolute bottom-3 right-3 z-20 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border shadow-sm transition-all animate-in fade-in zoom-in",
                                            (formData.description?.length || 0) > 400
                                                ? "bg-orange-500/20 text-orange-600 border-orange-500/30"
                                                : "bg-white/20 text-black border-white/30"
                                        )}>
                                            {formData.description?.length || 0} / 500
                                        </div>
                                    </div>

                                    {/* Word Count Progress Bar */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-black/60">
                                            <span>Content Quality</span>
                                            <span>{Math.min(100, Math.round(((formData.description?.length || 0) / 500) * 100))}%</span>
                                        </div>
                                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "word-count-progress rounded-full h-full transition-all duration-300",
                                                    (formData.description?.length || 0) >= 500 ? "bg-amber-500" : ""
                                                )}
                                                style={{ width: `${Math.min(100, ((formData.description?.length || 0) / 500) * 100)}%` }}
                                            />
                                        </div>
                                        {(formData.description?.length || 0) >= 500 && (
                                            <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1 animate-pulse">
                                                <AlertCircle className="w-3 h-3" />
                                                Maximum character limit reached (500)
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Settings & Visibility */}
                            <div className="space-y-8">
                                <Card className="glass-description-card border-0 shadow-lg group">
                                    <div className="bg-gradient-to-r from-white/10 to-transparent px-6 py-4 border-b border-white/20 flex items-center gap-3">
                                        <div className="p-2 orange-gradient-badge rounded-xl text-black group-hover:scale-110 transition-transform shadow-lg">
                                            <Settings className="w-5 h-5" stroke="black" />
                                        </div>
                                        <h3 className="font-serif text-lg font-bold text-black">Settings</h3>
                                    </div>
                                    <CardContent className="p-6 space-y-8">
                                        {/* Public Visibility Toggle */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-sm font-bold text-black">Public Visibility</Label>
                                                <p className="text-[11px] text-black font-bold opacity-80 leading-relaxed">
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
                                                    <Label className="text-sm font-bold text-black">Custom Feature Image</Label>
                                                    <p className="text-[11px] text-black font-bold opacity-80 leading-relaxed">
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
                                                                <p className="text-xs font-bold text-black">Drag & drop or Click to upload</p>
                                                                <p className="text-[10px] text-black opacity-80">PNG, JPG up to 5MB</p>
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
                                                                    // Restrict image size to 5MB
                                                                    if (file.size > 5 * 1024 * 1024) {
                                                                        toast.error('Image size must be less than 5MB');
                                                                        return;
                                                                    }
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
                                                            <Link2 className="w-3.5 h-3.5 text-black" />
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
                                onDurationChange={(newDuration) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        duration_days: newDuration,
                                        duration_nights: Math.max(0, newDuration - 1)
                                    }));
                                }}
                                packageMode={formData.package_mode}
                                destinations={formData.destinations}
                                singleDestination={formData.destination}
                            />
                        ) : (
                            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-black">Package not saved</h3>
                                <p className="text-black font-medium mb-6">Please save the basic details first to start building the itinerary.</p>
                                <Button onClick={() => setActiveStep(1)} variant="outline">
                                    Go to Basic Info
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: Review */}
                {activeStep === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-3xl mx-auto overflow-hidden">
                        <Card className="glass-panel border-0 shadow-lg overflow-hidden max-w-full">
                            <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-xl p-8">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            {formData.trip_styles.map(styleId => {
                                                const style = TRIP_STYLES.find(c => c.id === styleId);
                                                return style ? (
                                                    <Badge key={styleId} className="bg-[var(--primary)]/20 text-white hover:bg-[var(--primary)]/30 border-0 flex items-center gap-1.5 py-1 px-3">
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
                                        <CardTitle className="text-3xl font-bold mb-2 text-white [overflow-wrap:anywhere]">{formData.title}</CardTitle>
                                        <div className="flex flex-wrap items-center gap-4 text-white/90 font-bold text-sm [overflow-wrap:anywhere]">
                                            <span className="flex items-center gap-1 [overflow-wrap:anywhere]">
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
                                        <p className="text-sm text-white/90 font-bold">Price per person</p>
                                        <p className="text-3xl font-bold text-white">₹{formData.price_per_person.toLocaleString()}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-10">
                                <div className="space-y-8">
                                    {/* Full Width Description */}
                                    <div className="w-full">
                                        <h3 className="font-bold text-black border-b pb-2 mb-4 uppercase tracking-wider text-xs">Description</h3>
                                        <p className="text-black whitespace-pre-wrap leading-relaxed font-medium [overflow-wrap:anywhere] w-full overflow-x-hidden">
                                            {formData.description || "No description provided."}
                                        </p>
                                    </div>

                                    {/* Activities & Inclusions - Now in a single column or horizontal flex */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-black/5">
                                        {formData.activities.length > 0 && (
                                            <div>
                                                <h3 className="font-bold text-black border-b pb-2 mb-4 uppercase tracking-wider text-xs">Activities</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {formData.activities.map(activityId => {
                                                        const activityInfo = ACTIVITIES.find(a => a.id === activityId)
                                                        return activityInfo ? (
                                                            <Badge key={activityId} variant="secondary" className="bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors rounded-full px-3 py-1">
                                                                <span className="mr-1.5">{activityInfo.icon}</span> {activityInfo.label}
                                                            </Badge>
                                                        ) : null
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        {formData.included_items.length > 0 && (
                                            <div>
                                                <h3 className="font-bold text-black border-b pb-2 mb-4 uppercase tracking-wider text-xs">Price Includes</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {formData.included_items.map(item => (
                                                        <div key={item} className="flex items-center gap-2 text-sm text-black font-bold">
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
                            className="text-black hover:text-[var(--button-bg)] font-bold px-4 h-11"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {activeStep === 1 && 'Back to Packages'}
                            {activeStep === 2 && 'Back to Basic Info'}
                            {activeStep === 3 && 'Back to Itinerary'}
                        </Button>
                        <div className="h-6 w-px bg-black/20 hidden sm:block" />
                        <span className="text-sm text-black flex items-center gap-2 font-bold bg-transparent px-3 py-1.5 rounded-full border border-black/20">
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
                                className="h-11 px-4 text-black hover:text-[var(--button-bg)] hover:bg-black/5 font-bold"
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
                                className="h-11 px-6 rounded-full border border-[var(--button-bg)]/20 text-[var(--button-bg)] bg-white/50 hover:bg-[var(--button-bg)]/5 font-medium shadow-sm mr-2"
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
                                    ? "orange-gradient-badge text-black hover:shadow-orange-500/25"
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
