'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActivityImageGallery } from '@/components/ui/activity-image-gallery'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit, Trash2, Sun, Cloud, Sunset, Moon, GripVertical, Calendar, Clock, BarChart3, ListChecks, Utensils, Car, Map, MoreVertical, Copy as CopyIcon, RotateCcw, Target, FileText, Image as ImageIcon, Bold, Italic, List, Smile, Zap, ArrowRight, Upload, Link, X, Settings, CheckCircle2, ChevronDown } from 'lucide-react'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { getValidImageUrl } from '@/lib/utils/image'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableActivityItem } from './SortableActivityItem'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Copy, Import, MoreVertical as MoreIcon } from "lucide-react"
import { AnimatePresence, motion } from 'framer-motion'

type ActivityType = Activity;


interface Activity {
    id?: string
    title: string
    description: string
    image_urls?: string[]  // Changed from image_url
    time_slot: string
    start_time?: string
    end_time?: string
    display_order: number
}

interface DayActivities {
    morning: Activity[]
    afternoon: Activity[]
    evening: Activity[]
    night: Activity[]
    half_day: Activity[]
    full_day: Activity[]
}

interface ItineraryBuilderProps {
    packageId: string
    durationDays: number
}

const timeSlotConfig = {
    full_day: { icon: Calendar, label: 'Full Day', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    morning: { icon: Sun, label: 'Morning', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    half_day: { icon: Clock, label: 'Half Day', color: 'text-teal-600', bgColor: 'bg-teal-50' },
    afternoon: { icon: Cloud, label: 'Afternoon', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    evening: { icon: Sunset, label: 'Evening', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    night: { icon: Moon, label: 'Night', color: 'text-purple-600', bgColor: 'bg-purple-50' }
}

const ACTIVITY_SUGGESTIONS = [
    "Grand Tour of Kyoto Sky Tree",
    "Traditional Tea Ceremony Experience",
    "Morning Visit to Tsukiji Outer Market",
    "Sunset Cruise at Odaiba Bay",
    "Robot Restaurant Dinner Show",
    "Guided Walk through Shinjuku Gyoen",
    "Sushi Making Masterclass",
    "Meiji Jingu Shrine Exploration",
    "Shopping Spree at Ginza District",
    "Mount Fuji Day Trip from Tokyo",
    "Akihabara Electric Town Tour",
    "Ghibli Museum Visit",
    "Edo-Tokyo Museum Exploration",
    "Roppongi Hills Observation Deck",
    "Shibuya Crossing Photography"
]

const ACTIVITY_TEMPLATES = [
    {
        id: 'breakfast',
        label: 'Breakfast',
        icon: Utensils,
        title: 'Morning Breakfast',
        description: 'Start the day with a delicious breakfast at the hotel or a local cafe.',
        slot: 'morning'
    },
    {
        id: 'sightseeing',
        label: 'Sightseeing',
        icon: Map,
        title: 'Local Sightseeing Tour',
        description: 'Explore the key landmarks and hidden gems with a guided tour.',
        slot: 'morning'
    },
    {
        id: 'lunch',
        label: 'Lunch',
        icon: Utensils,
        title: 'Local Lunch Experience',
        description: 'Enjoy authentic local cuisine at a highly-rated restaurant.',
        slot: 'afternoon'
    },
    {
        id: 'free_time',
        label: 'Free Time',
        icon: Clock,
        title: 'Leisure & Exploration',
        description: 'Free time to explore the city at your own pace or relax.',
        slot: 'afternoon'
    },
    {
        id: 'dinner',
        label: 'Dinner',
        icon: Moon,
        title: 'Gourmet Dinner',
        description: 'A relaxing evening meal featuring local specialties and fine dining.',
        slot: 'evening'
    },
    {
        id: 'transfer',
        label: 'Transfer',
        icon: Car,
        title: 'Hotel/Airport Transfer',
        description: 'Safe and comfortable transfer between locations.',
        slot: 'full_day'
    }
]

const formatDuration = (minutes: number) => {
    if (minutes <= 0) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
};

const calculateDurationMinutes = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    const startTotal = sH * 60 + sM;
    const endTotal = eH * 60 + eM;
    return endTotal - startTotal;
};

export function ItineraryBuilder({ packageId, durationDays }: ItineraryBuilderProps) {
    const [currentDay, setCurrentDay] = useState(1)
    const [activities, setActivities] = useState<Record<number, DayActivities>>({})
    const [showAddForm, setShowAddForm] = useState(false)
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
    const [newActivity, setNewActivity] = useState({
        title: '',
        description: '',
        image_urls: [''] as string[],
        start_time: '',
        end_time: ''
    })
    const [currentImageUrl, setCurrentImageUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<number>(0)
    const [isUploading, setIsUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isSuggestedLunch, setIsSuggestedLunch] = useState(false)

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!showAddForm) return;

            if (e.key === 'Escape') {
                setShowAddForm(false);
            }

            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                if (!loading && newActivity.title && selectedTimeSlot) {
                    handleAddActivity();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showAddForm, loading, newActivity, selectedTimeSlot]);

    const durationMinutes = calculateDurationMinutes(newActivity.start_time, newActivity.end_time)
    const isAllDay = newActivity.start_time === '00:00' && newActivity.end_time === '23:59'

    const handlePresetTime = (hours: number) => {
        if (!newActivity.start_time) return;
        const [h, m] = newActivity.start_time.split(':').map(Number);
        let newH = h + hours;
        let newM = m;
        if (newH >= 24) newH = 23, newM = 59;
        const formattedH = String(newH).padStart(2, '0');
        const formattedM = String(newM).padStart(2, '0');
        setNewActivity({ ...newActivity, end_time: `${formattedH}:${formattedM}` });
    };

    const toggleAllDay = () => {
        if (isAllDay) {
            setNewActivity({ ...newActivity, start_time: '', end_time: '' });
        } else {
            setNewActivity({ ...newActivity, start_time: '00:00', end_time: '23:59' });
        }
    };

    const handleApplyTemplate = (template: typeof ACTIVITY_TEMPLATES[0]) => {
        setNewActivity({
            ...newActivity,
            title: template.title,
            description: template.description
        });
        setSelectedTimeSlot(template.slot);
    };

    const loadingRef = useRef(false)

    useEffect(() => {
        if (packageId && !loadingRef.current) {
            loadItinerary()
        }
    }, [packageId])

    const saveAIActivitiesToDatabase = async (organized: Record<number, DayActivities>) => {
        // Check if we've already saved these AI activities
        const savedFlag = localStorage.getItem(`ai_activities_saved_${packageId}`)
        if (savedFlag === 'true') {
            console.log('[ItineraryBuilder] AI activities already saved, skipping duplicate save')
            return
        }

        console.log('[ItineraryBuilder] Checking if activities already exist in database...')

        try {
            // First, check if there are already activities in the database
            const checkResponse = await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}`)
            if (checkResponse.ok) {
                const packageData = await checkResponse.json()
                const existingActivities = packageData.itinerary_by_day || []

                // Count total existing activities
                let existingCount = 0
                existingActivities.forEach((day: any) => {
                    const dayActivities = [
                        ...(day.morning || []),
                        ...(day.afternoon || []),
                        ...(day.evening || []),
                        ...(day.night || []),
                        ...(day.half_day || []),
                        ...(day.full_day || [])
                    ]
                    existingCount += dayActivities.length
                })

                if (existingCount > 0) {
                    console.log(`[ItineraryBuilder] Found ${existingCount} existing activities, skipping save to prevent duplicates`)
                    // Mark as saved to prevent future attempts
                    localStorage.setItem(`ai_activities_saved_${packageId}`, 'true')
                    return
                }
            }

            console.log('[ItineraryBuilder] No existing activities found, proceeding with save...')
            let savedCount = 0

            // Iterate through each day
            for (const [dayNumber, dayActivities] of Object.entries(organized)) {
                // Iterate through each time slot
                for (const [timeSlot, activities] of Object.entries(dayActivities)) {
                    // Save each activity
                    for (const activity of activities as Activity[]) {
                        try {
                            const body = {
                                day_number: parseInt(dayNumber),
                                title: activity.title,
                                description: activity.description,
                                image_url: activity.image_urls || [],
                                time_slot: timeSlot,
                                start_time: activity.start_time || '',
                                end_time: activity.end_time || '',
                                display_order: activity.display_order,
                                activities: [],
                                is_optional: false
                            }

                            const response = await fetch(
                                `http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items`,
                                {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(body)
                                }
                            )

                            if (response.ok) {
                                savedCount++
                                console.log(`[ItineraryBuilder] Saved: Day ${dayNumber} - ${activity.title}`)
                            } else {
                                const error = await response.json()
                                console.error(`[ItineraryBuilder] Failed to save activity:`, error)
                            }
                        } catch (error) {
                            console.error(`[ItineraryBuilder] Error saving activity:`, error)
                        }
                    }
                }
            }

            console.log(`[ItineraryBuilder] Successfully saved ${savedCount} activities to database`)

            // Mark as saved to prevent duplicate saves
            localStorage.setItem(`ai_activities_saved_${packageId}`, 'true')

        } catch (error) {
            console.error('[ItineraryBuilder] Error in bulk save:', error)
        }
    }

    const loadItinerary = async () => {
        if (loadingRef.current) return
        loadingRef.current = true

        try {
            // First, check if there's AI-generated itinerary data
            const aiItineraryData = localStorage.getItem('ai_itinerary_data')

            console.log('[ItineraryBuilder] Checking for AI itinerary data:', aiItineraryData ? 'Found' : 'Not found')

            if (aiItineraryData) {
                // Do NOT clear immediately - let it persist until processed or explicit cleanup
                // because StrictMode or remounts might cause the first mount to wipe it
                // and the second mount to find nothing.

                try {
                    const aiItinerary = JSON.parse(aiItineraryData)

                    console.log('[ItineraryBuilder] Parsed AI itinerary:', aiItinerary)

                    // Convert AI itinerary format to ItineraryBuilder format
                    const organized: Record<number, DayActivities> = {}

                    aiItinerary.forEach((dayData: any) => {
                        const dayNumber = dayData.day

                        console.log(`[ItineraryBuilder] Processing day ${dayNumber}:`, dayData)

                        // Initialize day structure
                        organized[dayNumber] = {
                            morning: [],
                            afternoon: [],
                            evening: [],
                            night: [],
                            half_day: [],
                            full_day: []
                        }

                        // Convert AI activities to our format
                        dayData.activities?.forEach((activity: any, index: number) => {
                            const timeSlot = activity.timeSlot?.toLowerCase() || 'full_day'

                            console.log(`[ItineraryBuilder] Activity ${index}: ${activity.title} (${timeSlot})`)

                            const convertedActivity: Activity = {
                                title: activity.title || '',
                                description: activity.description || '',
                                time_slot: timeSlot,
                                start_time: activity.startTime || '',
                                end_time: activity.endTime || '',
                                display_order: index,
                                image_urls: activity.imageUrls || []  // Use Unsplash images from AI
                            }

                            // Add to appropriate time slot
                            if (organized[dayNumber][timeSlot as keyof DayActivities]) {
                                (organized[dayNumber][timeSlot as keyof DayActivities] as Activity[]).push(convertedActivity)
                            } else {
                                // Default to full_day if time slot not recognized
                                console.warn(`[ItineraryBuilder] Unknown time slot '${timeSlot}', defaulting to full_day`)
                                organized[dayNumber].full_day.push(convertedActivity)
                            }
                        })
                    })

                    console.log('[ItineraryBuilder] Final organized activities:', organized)
                    setActivities(organized)

                    // Save all AI-generated activities to the database
                    await saveAIActivitiesToDatabase(organized)

                    // Clear the AI itinerary data after a short delay to ensure state update completes
                    setTimeout(() => {
                        localStorage.removeItem('ai_itinerary_data')
                        // Also clear the saved flag for next time - actually better to keep it?
                        // If we clear it, a refresh might re-trigger save.
                        // But if we keep it, a NEW package with same ID (unlikely) might be blocked.
                        // Since new packaging = new ID, it's fine.
                        // But if user clicks "Back" and comes forward again?
                        // Let's keep the saved flag to prevent duplicates on refresh.
                        console.log('[ItineraryBuilder] Cleared AI itinerary data from localStorage')
                    }, 2000)

                    toast.success('AI-generated itinerary loaded successfully!')
                    return
                } catch (error) {
                    console.error('[ItineraryBuilder] Error loading AI itinerary:', error)
                    toast.error('Failed to load AI itinerary, loading from server...')
                }
            }

            // Fall back to loading from API if no AI data or if AI data failed
            console.log('[ItineraryBuilder] Loading itinerary from API for packageId:', packageId)
            try {
                const response = await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}`)
                const data = await response.json()

                // Organize activities by day
                const organized: Record<number, DayActivities> = {}
                data.itinerary_by_day?.forEach((day: any) => {
                    organized[day.day_number] = {
                        morning: day.morning || [],
                        afternoon: day.afternoon || [],
                        evening: day.evening || [],
                        night: day.night || [],
                        half_day: day.half_day || [],
                        full_day: day.full_day || []
                    }
                })

                setActivities(organized)
            } catch (error) {
                console.error('Failed to load itinerary:', error)
            }
        } finally {
            loadingRef.current = false
        }
    }

    const [editingId, setEditingId] = useState<string | null>(null)

    // ... (rest of imports/state)

    const handleAddActivity = async () => {
        if (!newActivity.title || !selectedTimeSlot) {
            alert('Please fill in all fields')
            return
        }

        setLoading(true)
        try {
            const url = editingId
                ? `http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items/${editingId}`
                : `http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items`

            const method = editingId ? 'PATCH' : 'POST'

            // map image_urls to activities field for storage, and first one to image_url
            // Filter out empty strings
            const validImages = newActivity.image_urls.filter(url => url && url.trim() !== '')

            const body = {
                day_number: currentDay,
                title: newActivity.title,
                description: newActivity.description,
                image_url: validImages, // Send list directly to image_url
                time_slot: selectedTimeSlot,
                start_time: newActivity.start_time,
                end_time: newActivity.end_time,
                display_order: editingId ? undefined : getMaxDisplayOrder(currentDay, selectedTimeSlot),
                activities: [], // Clear activities field as per requirement
                is_optional: false
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (response.ok) {
                setIsSuccess(true)
                toast.success(editingId ? "Activity updated! ✓" : "Activity added! ✓", {
                    position: "bottom-center",
                    autoClose: 2000,
                    hideProgressBar: true,
                    closeOnClick: true,
                    pauseOnHover: false,
                    draggable: true,
                    theme: "colored",
                })

                setTimeout(() => {
                    setNewActivity({ title: '', description: '', image_urls: [''], start_time: '', end_time: '' })
                    setCurrentImageUrl('')
                    setShowAddForm(false)
                    setSelectedTimeSlot('')
                    setEditingId(null)
                    setUploadProgress(0)
                    setIsSuccess(false)
                    loadItinerary()
                }, 1000)
            } else {
                const err = await response.json()
                console.error("API Error:", err)
                alert(`Failed to save: ${err.detail || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Failed to add/edit activity:', error)
            alert('Failed to save activity')
        } finally {
            setLoading(false)
        }
    }

    const simulateUpload = async (file: File) => {
        setIsUploading(true)
        setUploadProgress(10)

        // Mock progress
        const timer = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) {
                    clearInterval(timer)
                    return 90
                }
                return prev + 15
            })
        }, 300)

        // Mock completion
        return new Promise<string>((resolve) => {
            setTimeout(() => {
                clearInterval(timer)
                setUploadProgress(100)
                setTimeout(() => {
                    setIsUploading(false)
                    setUploadProgress(0)
                    // In a real app, this would be the URL from the server
                    resolve(URL.createObjectURL(file))
                }, 400)
            }, 2000)
        })
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        for (let i = 0; i < files.length; i++) {
            if (newActivity.image_urls.filter(url => url).length >= 5) {
                alert("Maximum 5 images allowed")
                break
            }
            const url = await simulateUpload(files[i])
            const currentUrls = [...newActivity.image_urls].filter(u => u)
            setNewActivity({ ...newActivity, image_urls: [...currentUrls, url] })
        }
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (!files || files.length === 0) return

        for (let i = 0; i < files.length; i++) {
            if (newActivity.image_urls.filter(url => url).length >= 5) {
                alert("Maximum 5 images allowed")
                break
            }
            const url = await simulateUpload(files[i])
            const currentUrls = [...newActivity.image_urls].filter(u => u)
            setNewActivity({ ...newActivity, image_urls: [...currentUrls, url] })
        }
    }

    const handleDeleteActivity = async (activityId: string) => {
        if (!confirm('Delete this activity?')) return

        try {
            await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items/${activityId}`, {
                method: 'DELETE'
            })
            loadItinerary()
        } catch (error) {
            console.error('Failed to delete activity:', error)
        }
    }

    const getDayActivities = (day: number): DayActivities => {
        return activities[day] || {
            morning: [],
            afternoon: [],
            evening: [],
            night: [],
            half_day: [],
            full_day: []
        }
    }

    const days = Array.from({ length: durationDays }, (_, i) => i + 1)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (active.id !== over?.id) {
            // Find which day and slot these items belong to
            let targetDay: number | null = null
            let targetSlot: keyof DayActivities | null = null

            // Search for the activity to find its context
            Object.keys(activities).forEach(dayKey => {
                const day = parseInt(dayKey)
                const dayData = activities[day]
                Object.keys(dayData).forEach(slotKey => {
                    const slot = slotKey as keyof DayActivities
                    const items: Activity[] = dayData[slot]
                    if (items.some((item: Activity) => item.id === active.id)) {
                        targetDay = day
                        targetSlot = slot
                    }
                })
            })

            if (targetDay !== null && targetSlot !== null) {
                const day = targetDay
                const slot = targetSlot
                const items: Activity[] = activities[day][slot]
                const oldIndex = items.findIndex((item: Activity) => item.id === active.id)
                const newIndex = items.findIndex((item: Activity) => item.id === over?.id)

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newItems = arrayMove(items, oldIndex, newIndex)

                    // Optimistic update
                    setActivities(prev => ({
                        ...prev,
                        [day]: {
                            ...prev[day],
                            [slot]: newItems
                        }
                    }))

                    // Persist order to backend
                    try {
                        // Update display_order for all affected items
                        const updates = newItems.map((item, index) => ({
                            id: item.id,
                            display_order: index
                        }))

                        await Promise.all(updates.map(update =>
                            fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items/${update.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ display_order: update.display_order })
                            })
                        ))
                    } catch (error) {
                        console.error('Failed to persist order:', error)
                        // Revert on failure (optional, but good practice)
                        loadItinerary()
                    }
                }
            }
        }
    }

    const getMaxDisplayOrder = (day: number, slot: string) => {
        const slotActivities = activities[day]?.[slot as keyof DayActivities] || []
        if (slotActivities.length === 0) return 0
        return Math.max(...slotActivities.map(a => a.display_order || 0)) + 1
    }

    const getLastActivityEndTime = (day: number) => {
        const dayActivities = activities[day]
        if (!dayActivities) return null

        const allDayActivities = [
            ...(dayActivities.morning || []),
            ...(dayActivities.afternoon || []),
            ...(dayActivities.evening || []),
            ...(dayActivities.night || []),
            ...(dayActivities.half_day || []),
            ...(dayActivities.full_day || [])
        ]

        if (allDayActivities.length === 0) return null

        // Sort by end time
        return allDayActivities.reduce((latest, current) => {
            if (!current.end_time) return latest
            if (!latest || current.end_time > latest) return current.end_time
            return latest
        }, null as string | null)
    }

    const handleEditActivity = (activity: any) => {
        setEditingId(activity.id)
        setSelectedTimeSlot(activity.time_slot)
        setNewActivity({
            title: activity.title,
            description: activity.description || '',
            image_urls: activity.image_url ? (Array.isArray(activity.image_url) ? activity.image_url : [activity.image_url]) : [''],
            start_time: activity.start_time || '',
            end_time: activity.end_time || ''
        })
        setShowAddForm(true)
    }

    const handleOpenAddForm = (slot: string) => {
        setSelectedTimeSlot(slot)
        const lastEnd = getLastActivityEndTime(currentDay)

        let startTime = ''
        let endTime = ''
        let suggestLunch = false

        if (lastEnd) {
            startTime = lastEnd
            const [hours, minutes] = lastEnd.split(':').map(Number)
            endTime = `${String((hours + 1) % 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

            // Suggest lunch if last activity ends between 11:30 and 13:30
            const totalMinutes = hours * 60 + minutes
            if (totalMinutes >= 690 && totalMinutes <= 810) {
                suggestLunch = true
            }
        }

        setIsSuggestedLunch(suggestLunch)
        setNewActivity({
            title: suggestLunch ? 'Lunch' : '',
            description: '',
            image_urls: [''],
            start_time: startTime,
            end_time: endTime
        })
        setShowAddForm(true)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Day-wise Itinerary</CardTitle>
                <CardDescription>
                    Build your package itinerary with activities organized by time slots
                </CardDescription>
            </CardHeader>
            {/* Itinerary Overview Stats */}
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium leading-none mb-1">Total Activities</p>
                            <p className="text-lg font-bold text-gray-900 leading-none">
                                {Object.values(activities).reduce((acc: number, day: DayActivities) =>
                                    acc + Object.values(day).reduce((dAcc: number, slot: Activity[]) => dAcc + slot.length, 0)
                                    , 0)}
                            </p>
                        </div>
                    </div>

                    <div className="h-10 w-px bg-gray-200 hidden sm:block" />

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm text-sm">
                            <Utensils className="w-4 h-4 text-orange-500" />
                            <span className="font-semibold text-gray-700">
                                {Object.values(activities).reduce((acc: number, day: DayActivities) =>
                                    acc + (day.morning.filter((a: Activity) => a.title.toLowerCase().includes('breakfast')).length || 0) +
                                    (day.afternoon.filter((a: Activity) => a.title.toLowerCase().includes('lunch')).length || 0) +
                                    (day.evening.filter((a: Activity) => a.title.toLowerCase().includes('dinner')).length || 0)
                                    , 0)}
                            </span>
                            <span className="text-gray-500">Meals</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm text-sm">
                            <Map className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold text-gray-700">
                                {Object.values(activities).reduce((acc: number, day: DayActivities) =>
                                    acc + Object.values(day).reduce((dAcc: number, slot: Activity[]) =>
                                        dAcc + slot.filter((a: Activity) => a.title.toLowerCase().includes('tour') || a.title.toLowerCase().includes('visit')).length
                                        , 0)
                                    , 0)}
                            </span>
                            <span className="text-gray-500">Tours</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm text-sm">
                            <Car className="w-4 h-4 text-emerald-500" />
                            <span className="font-semibold text-gray-700">
                                {Object.values(activities).reduce((acc: number, day: DayActivities) =>
                                    acc + Object.values(day).reduce((dAcc: number, slot: Activity[]) =>
                                        dAcc + slot.filter((a: Activity) => a.title.toLowerCase().includes('transfer') || a.title.toLowerCase().includes('pick')).length
                                        , 0)
                                    , 0)}
                            </span>
                            <span className="text-gray-500">Transfers</span>
                        </div>
                    </div>
                </div>
            </div>

            <CardContent className="p-6">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <Tabs value={`day-${currentDay}`} onValueChange={(v) => setCurrentDay(parseInt(v.split('-')[1]))}>
                        <div className="mb-6">
                            <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-2 px-1 scrollbar-hide">
                                {days.map((day) => {
                                    const dayActivities = activities[day] || {}
                                    const activityCount = Object.values(dayActivities).reduce((acc: number, curr: any) => acc + (curr?.length || 0), 0)
                                    const hasActivities = activityCount > 0
                                    const isActive = currentDay === day

                                    return (
                                        <button
                                            key={day}
                                            onClick={() => setCurrentDay(day)}
                                            className={cn(
                                                "relative flex flex-col items-start min-w-[120px] p-4 rounded-2xl border transition-all duration-300 group",
                                                isActive
                                                    ? "bg-gradient-to-br from-indigo-500 to-blue-600 border-transparent text-white shadow-lg shadow-indigo-200 scale-105"
                                                    : "bg-white border-gray-100 text-gray-600 hover:border-indigo-200 hover:shadow-md"
                                            )}
                                        >
                                            <div className="flex items-center justify-between w-full mb-2">
                                                <span className={cn("text-sm font-bold", isActive ? "text-white" : "text-gray-900")}>Day {day}</span>
                                                <div className={cn(
                                                    "w-2.5 h-2.5 rounded-full ring-2 ring-white/20",
                                                    hasActivities ? (isActive ? "bg-emerald-400" : "bg-emerald-500") : "bg-gray-200"
                                                )} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-xs", isActive ? "text-indigo-100" : "text-gray-400")}>
                                                    {activityCount} activities
                                                </span>
                                            </div>

                                            {/* Context Menu Action */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            className={cn(
                                                                "p-1 rounded-md transition-colors",
                                                                isActive ? "bg-white/20 text-white hover:bg-white/30" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                            )}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreVertical className="w-3 h-3" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <div className="p-1">
                                                            <DropdownMenuItem onClick={() => alert("Duplicate day coming soon")} className="gap-2 cursor-pointer">
                                                                <CopyIcon className="w-4 h-4" />
                                                                <span>Duplicate Day</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => alert("Copy to another day coming soon")} className="gap-2 cursor-pointer">
                                                                <ListChecks className="w-4 h-4" />
                                                                <span>Copy to Day...</span>
                                                            </DropdownMenuItem>
                                                        </div>
                                                        <DropdownMenuSeparator />
                                                        <div className="p-1">
                                                            <DropdownMenuItem onClick={() => alert("Clear all activities coming soon")} className="gap-2 cursor-pointer text-orange-600 focus:text-orange-700">
                                                                <RotateCcw className="w-4 h-4" />
                                                                <span>Clear Day</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => alert("Delete day coming soon")} className="gap-2 cursor-pointer text-red-600 focus:text-red-700">
                                                                <Trash2 className="w-4 h-4" />
                                                                <span>Delete Day</span>
                                                            </DropdownMenuItem>
                                                        </div>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </button>
                                    )
                                })}

                                <button className="flex flex-col items-center justify-center min-w-[60px] h-[70px] rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all font-medium text-xs gap-1"
                                    onClick={() => alert("Please increase duration in Basic Info to add days.")}
                                >
                                    <Plus className="w-5 h-5" />
                                    Add
                                </button>
                            </div>
                        </div>
                        <TabsList className="hidden">
                            {days.map((day) => (
                                <TabsTrigger key={day} value={`day-${day}`}>Day {day}</TabsTrigger>
                            ))}
                        </TabsList>

                        {days.map((day) => {
                            const dayActivities = getDayActivities(day)

                            return (
                                <TabsContent key={day} value={`day-${day}`} className="mt-6 space-y-6">
                                    {Object.entries(timeSlotConfig).map(([slot, config]) => {
                                        const slotActivities = dayActivities[slot as keyof DayActivities]
                                        const Icon = config.icon

                                        // Calculate duration metadata (mocking capacity for now as per design)
                                        // In a real app, this would be computed from start/end times if available
                                        const totalCapacityHours = slot === 'full_day' ? 12 : slot === 'morning' ? 4 : slot === 'half_day' ? 6 : 4
                                        const activitiesCount = slotActivities.length
                                        const estimatedHoursUsed = activitiesCount * 2 // Mock: assuming 2 hours per activity
                                        const progressPercentage = Math.min((estimatedHoursUsed / totalCapacityHours) * 100, 100)
                                        const isOverCapacity = estimatedHoursUsed > totalCapacityHours

                                        return (
                                            <div key={slot} className="space-y-3">
                                                {/* Enhanced Time Slot Header */}
                                                <div className={cn(
                                                    "border rounded-xl p-4 transition-all duration-300",
                                                    slotActivities.length > 0 ? "bg-white border-gray-200 shadow-sm" : `${config.bgColor} border-transparent bg-opacity-50`
                                                )}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("p-2 rounded-lg", config.bgColor)}>
                                                                <Icon className={`h-5 w-5 ${config.color}`} />
                                                            </div>
                                                            <div>
                                                                <h3 className={cn("font-bold text-gray-900 flex items-center gap-2")}>
                                                                    {config.label}
                                                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                        {totalCapacityHours} hours
                                                                    </span>
                                                                </h3>
                                                                {slotActivities.length > 0 && (
                                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                                        {estimatedHoursUsed} / {totalCapacityHours} hours used
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 gap-1.5 border-dashed border-gray-300 text-gray-600 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                    Add Activity
                                                                    <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-56">
                                                                <DropdownMenuLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider">Add to {config.label}</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => handleOpenAddForm(slot)}
                                                                    className="cursor-pointer gap-2"
                                                                >
                                                                    <div className="p-1 rounded bg-indigo-50 text-indigo-600">
                                                                        <Plus className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">Create New Activity</span>
                                                                        <span className="text-xs text-gray-500">Starts form from scratch</span>
                                                                    </div>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="cursor-pointer gap-2" disabled>
                                                                    <div className="p-1 rounded bg-orange-50 text-orange-600">
                                                                        <Copy className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">Choose from Template</span>
                                                                        <span className="text-xs text-gray-500">Use pre-made activity</span>
                                                                    </div>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="cursor-pointer gap-2" disabled>
                                                                    <div className="p-1 rounded bg-emerald-50 text-emerald-600">
                                                                        <Import className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">Import from Library</span>
                                                                        <span className="text-xs text-gray-500">Pick from your defaults</span>
                                                                    </div>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    {slotActivities.length > 0 && (
                                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
                                                            <div
                                                                className={cn("h-full rounded-full transition-all duration-500", config.color.replace('text-', 'bg-'))}
                                                                style={{ width: `${progressPercentage}%` }}
                                                            />
                                                        </div>
                                                    )}

                                                    <div className={cn("space-y-3", slotActivities.length > 0 ? "pl-2" : "")}>
                                                        <SortableContext
                                                            id={`${day}-${slot}`}
                                                            items={slotActivities.map(a => a.id || 'temp').filter(id => id !== 'temp') as string[]}
                                                            strategy={verticalListSortingStrategy}
                                                        >
                                                            {slotActivities && slotActivities.length > 0 ? (
                                                                <div className="space-y-3">
                                                                    {slotActivities.map((activity, idx) => (
                                                                        <SortableActivityItem
                                                                            key={activity.id || idx}
                                                                            activity={activity}
                                                                            config={config}
                                                                            idx={idx}
                                                                            onDelete={handleDeleteActivity}
                                                                            onEdit={handleEditActivity}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="py-8 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 group/drop bg-gray-50/30 hover:bg-indigo-50/30 hover:border-indigo-100 transition-all duration-300">
                                                                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 group-hover/drop:scale-110 transition-transform">
                                                                        <Icon className={cn("h-5 w-5 opacity-40", config.color)} />
                                                                    </div>
                                                                    <p className="text-xs font-medium">No {config.label} activities</p>
                                                                    <p className="text-[10px] opacity-60">Drop here or click Add Activity</p>
                                                                </div>
                                                            )}
                                                        </SortableContext>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </TabsContent>
                            )
                        })}
                    </Tabs>
                </DndContext >

                {/* Redesigned Add Activity Modal */}
                <AnimatePresence>
                    {showAddForm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4"
                        >
                            <motion.div
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "100%", opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col"
                            >
                                <Card className="w-full h-full flex flex-col shadow-2xl border-none overflow-hidden rounded-t-3xl sm:rounded-3xl">
                                    {/* Mobile Drag Handle */}
                                    <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 sm:hidden opacity-40" />

                                    <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white relative">
                                        <button
                                            onClick={() => {
                                                setShowAddForm(false)
                                                setNewActivity({ title: '', description: '', image_urls: [''], start_time: '', end_time: '' })
                                                setCurrentImageUrl('')
                                                setSelectedTimeSlot('')
                                                setEditingId(null)
                                            }}
                                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                                        >
                                            <Plus className="w-5 h-5 rotate-45" />
                                        </button>
                                        <div className="space-y-1">
                                            <h2 className="text-2xl font-bold tracking-tight">
                                                {editingId ? 'Edit Activity' : 'Add Activity'}
                                            </h2>
                                            <p className="text-indigo-100/80 text-sm font-medium">
                                                {editingId ? 'Refine activity details' : `Creating new ${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig]?.label} activity for Day ${currentDay}`}
                                            </p>
                                        </div>
                                    </div>

                                    <CardContent className="p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                        {/* Quick Templates Section */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Templates</span>
                                                {/* Suggestions Logic */}
                                                <div className="space-y-3">
                                                    {isSuggestedLunch && !newActivity.title && (
                                                        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl animate-in fade-in slide-in-from-left-2 duration-500">
                                                            <Utensils className="w-4 h-4 text-orange-600" />
                                                            <div className="flex-1">
                                                                <p className="text-xs font-bold text-orange-900">It's lunchtime! 🍱</p>
                                                                <p className="text-[10px] text-orange-700/80">Suggesting a lunch break based on your previous activity.</p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-[10px] font-bold border-orange-200 bg-white text-orange-600 hover:bg-orange-50"
                                                                onClick={() => setNewActivity({ ...newActivity, title: 'Local Lunch Experience' })}
                                                            >
                                                                Auto-fill "Lunch"
                                                            </Button>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-2">
                                                        {ACTIVITY_TEMPLATES.map((template) => {
                                                            const Icon = template.icon;
                                                            return (
                                                                <button
                                                                    key={template.id}
                                                                    onClick={() => handleApplyTemplate(template)}
                                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-100 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all shadow-sm active:scale-95 group/template"
                                                                >
                                                                    <div className="p-1 bg-gray-50 text-gray-400 group-hover/template:bg-white group-hover/template:text-indigo-600 rounded-lg">
                                                                        <Icon className="w-3 h-3" />
                                                                    </div>
                                                                    <span className="text-xs font-bold">{template.label}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Section 1: Basic Info */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                                        <Target className="w-4 h-4" />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Basic Information</h3>
                                                </div>
                                                <div className="space-y-2 relative">
                                                    <div className="flex justify-between items-center">
                                                        <Label htmlFor="activity-title" className="text-xs font-semibold text-gray-500 ml-1">Title</Label>
                                                        <span className={cn(
                                                            "text-[10px] font-medium px-1.5 py-0.5 rounded",
                                                            newActivity.title.length > 80 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400"
                                                        )}>
                                                            {newActivity.title.length}/100
                                                        </span>
                                                    </div>
                                                    <div className="relative group/title">
                                                        <Input
                                                            id="activity-title"
                                                            placeholder="e.g., Grand Tour of Tokyo Sky Tree"
                                                            className="h-12 text-base font-medium border-gray-200 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                                                            value={newActivity.title}
                                                            onChange={(e) => {
                                                                if (e.target.value.length <= 100) {
                                                                    setNewActivity({ ...newActivity, title: e.target.value })
                                                                    setShowSuggestions(true)
                                                                }
                                                            }}
                                                            onFocus={() => setShowSuggestions(true)}
                                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                        />
                                                        {showSuggestions && (
                                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-xl z-[120] overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                                                <div className="p-2 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
                                                                    <Zap className="w-3 h-3 text-orange-500" />
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Suggestions</span>
                                                                </div>
                                                                <div className="max-h-[200px] overflow-y-auto p-1 py-1 px-1">
                                                                    {ACTIVITY_SUGGESTIONS
                                                                        .filter(s => !newActivity.title || s.toLowerCase().includes(newActivity.title.toLowerCase()))
                                                                        .map((suggestion, i) => (
                                                                            <button
                                                                                key={i}
                                                                                onClick={() => {
                                                                                    setNewActivity({ ...newActivity, title: suggestion })
                                                                                    setShowSuggestions(false)
                                                                                }}
                                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors flex items-center gap-2"
                                                                            >
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 group-hover:bg-indigo-400" />
                                                                                {suggestion}
                                                                            </button>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                                                            <Clock className="w-4 h-4" />
                                                        </div>
                                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Timing</h3>
                                                    </div>
                                                    <button
                                                        onClick={toggleAllDay}
                                                        className={cn(
                                                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                                                            isAllDay
                                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                                : "bg-white text-gray-400 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                                                        )}
                                                    >
                                                        All Day
                                                    </button>
                                                </div>

                                                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                                                    <div className="grid grid-cols-2 gap-6 relative">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="start-time" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Start</Label>
                                                            <div className="relative group/time">
                                                                <Input
                                                                    id="start-time"
                                                                    type="time"
                                                                    className="h-12 border-gray-200 focus:ring-2 focus:ring-indigo-500/20 transition-all pl-10 text-base font-medium"
                                                                    value={newActivity.start_time}
                                                                    onChange={(e) => setNewActivity({ ...newActivity, start_time: e.target.value })}
                                                                />
                                                                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/time:text-indigo-500 transition-colors" />
                                                            </div>
                                                        </div>

                                                        <div className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:block">
                                                            <div className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-300">
                                                                <ArrowRight className="w-4 h-4" />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="end-time" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">End</Label>
                                                            <div className="relative group/time">
                                                                <Input
                                                                    id="end-time"
                                                                    type="time"
                                                                    className="h-12 border-gray-200 focus:ring-2 focus:ring-indigo-500/20 transition-all pl-10 text-base font-medium"
                                                                    value={newActivity.end_time}
                                                                    onChange={(e) => setNewActivity({ ...newActivity, end_time: e.target.value })}
                                                                />
                                                                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/time:text-indigo-500 transition-colors" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Presets:</span>
                                                            {[1, 2, 3, 4].map((h) => (
                                                                <button
                                                                    key={h}
                                                                    onClick={() => handlePresetTime(h)}
                                                                    className="px-2.5 py-1 rounded-md bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm active:scale-95"
                                                                >
                                                                    +{h}h
                                                                </button>
                                                            ))}
                                                            <button
                                                                onClick={() => handlePresetTime(12)}
                                                                className="px-2.5 py-1 rounded-md bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm active:scale-95"
                                                            >
                                                                Half Day
                                                            </button>
                                                        </div>

                                                        {durationMinutes > 0 && (
                                                            <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full border border-orange-200 animate-in zoom-in-95 duration-200">
                                                                <Clock className="w-3 h-3" />
                                                                <span className="text-xs font-bold uppercase tracking-tight">Duration: {formatDuration(durationMinutes)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <button
                                                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                                                        showAdvancedOptions
                                                            ? "bg-indigo-50 border-indigo-100 text-indigo-700 shadow-inner"
                                                            : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100 hover:border-gray-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "p-2 rounded-xl transition-colors",
                                                            showAdvancedOptions ? "bg-white text-indigo-600 shadow-sm" : "bg-white text-gray-400"
                                                        )}>
                                                            <Settings className={cn("w-4 h-4", showAdvancedOptions && "animate-spin-slow")} />
                                                        </div>
                                                        <span className="text-sm font-bold uppercase tracking-tight">Advanced Options</span>
                                                    </div>
                                                    <div className={cn(
                                                        "p-1.5 rounded-full transition-transform duration-300",
                                                        showAdvancedOptions ? "rotate-180 bg-white" : "bg-gray-200/50"
                                                    )}>
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </button>
                                            </div>

                                            {showAdvancedOptions && (
                                                <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                                                                    <FileText className="w-4 h-4" />
                                                                </div>
                                                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Experience Details</h3>
                                                            </div>
                                                            <span className={cn(
                                                                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                                                                newActivity.description.length > 450 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400"
                                                            )}>
                                                                {newActivity.description.length}/500
                                                            </span>
                                                        </div>

                                                        <div className="space-y-3 relative overflow-hidden rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all bg-white shadow-sm">
                                                            <div className="flex items-center gap-1 p-2 bg-gray-50/80 border-b border-gray-100">
                                                                <button
                                                                    className="p-1.5 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded transition-all text-gray-400"
                                                                    title="Bold (Selection)"
                                                                    onClick={() => {
                                                                        const selection = window.getSelection()?.toString();
                                                                        if (selection) setNewActivity({ ...newActivity, description: newActivity.description.replace(selection, `**${selection}**`) });
                                                                    }}
                                                                >
                                                                    <Bold className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    className="p-1.5 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded transition-all text-gray-400"
                                                                    title="Italic (Selection)"
                                                                    onClick={() => {
                                                                        const selection = window.getSelection()?.toString();
                                                                        if (selection) setNewActivity({ ...newActivity, description: newActivity.description.replace(selection, `*${selection}*`) });
                                                                    }}
                                                                >
                                                                    <Italic className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    className="p-1.5 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded transition-all text-gray-400"
                                                                    title="Bullets"
                                                                    onClick={() => setNewActivity({ ...newActivity, description: newActivity.description + "\n- " })}
                                                                >
                                                                    <List className="w-3.5 h-3.5" />
                                                                </button>
                                                                <div className="w-px h-4 bg-gray-200 mx-1" />
                                                                <button
                                                                    className="p-1.5 hover:bg-white hover:text-orange-600 hover:shadow-sm rounded transition-all text-gray-400 flex items-center gap-1"
                                                                    onClick={() => setNewActivity({ ...newActivity, description: newActivity.description + " ✨" })}
                                                                >
                                                                    <Smile className="w-3.5 h-3.5" />
                                                                    <span className="text-[10px] font-bold">Emojis</span>
                                                                </button>
                                                            </div>
                                                            <Textarea
                                                                id="activity-description"
                                                                placeholder="Write a compelling description for this activity..."
                                                                className="min-h-[140px] border-none focus-visible:ring-0 shadow-none text-base leading-relaxed p-4 bg-transparent resize-none overflow-hidden"
                                                                value={newActivity.description}
                                                                onChange={(e) => {
                                                                    if (e.target.value.length <= 500) {
                                                                        setNewActivity({ ...newActivity, description: e.target.value })
                                                                        // Auto-expand textarea
                                                                        e.target.style.height = 'auto';
                                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                                                                    <ImageIcon className="w-4 h-4" />
                                                                </div>
                                                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Gallery</h3>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Storage:</span>
                                                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-sky-500 transition-all duration-500"
                                                                        style={{ width: `${(newActivity.image_urls.filter(u => u).length / 5) * 100}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-gray-400">{newActivity.image_urls.filter(u => u).length}/5</span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div
                                                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                                                onDragLeave={() => setIsDragging(false)}
                                                                onDrop={handleDrop}
                                                                className={cn(
                                                                    "relative group/dropzone border-2 border-dashed rounded-2xl transition-all p-6 flex flex-col items-center justify-center gap-3",
                                                                    isDragging
                                                                        ? "border-sky-500 bg-sky-50/50 scale-[0.99]"
                                                                        : "border-gray-200 bg-gray-50/30 hover:bg-gray-50 hover:border-sky-300"
                                                                )}
                                                            >
                                                                <input
                                                                    type="file"
                                                                    multiple
                                                                    accept="image/*"
                                                                    onChange={handleFileChange}
                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                                                />

                                                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-sky-500 group-hover/dropzone:scale-110 transition-transform">
                                                                    <Upload className="w-6 h-6" />
                                                                </div>

                                                                <div className="text-center space-y-1">
                                                                    <p className="text-sm font-bold text-gray-700">Drag & drop images here</p>
                                                                    <p className="text-xs text-gray-400 font-medium">or click to browse from device</p>
                                                                </div>

                                                                <div className="w-full max-w-[240px] relative mt-2 z-30">
                                                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                                        <Link className="w-3.5 h-3.5 text-gray-400" />
                                                                    </div>
                                                                    <Input
                                                                        placeholder="Paste image URL..."
                                                                        className="h-10 pl-10 text-xs border-gray-200 bg-white/80 focus:bg-white rounded-lg"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                const val = (e.target as HTMLInputElement).value;
                                                                                if (val && newActivity.image_urls.filter(u => u).length < 5) {
                                                                                    setNewActivity({ ...newActivity, image_urls: [...newActivity.image_urls.filter(u => u), val] });
                                                                                    (e.target as HTMLInputElement).value = '';
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>

                                                                {isUploading && (
                                                                    <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
                                                                        <div className="w-full max-w-[180px] space-y-3">
                                                                            <div className="flex justify-between items-center text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                                                                                <span>Uploading...</span>
                                                                                <span>{uploadProgress}%</span>
                                                                            </div>
                                                                            <div className="h-2 bg-sky-100 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className="h-full bg-sky-500 transition-all duration-300 ease-out"
                                                                                    style={{ width: `${uploadProgress}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-5 gap-3">
                                                                {newActivity.image_urls.filter(url => url).map((url, index) => (
                                                                    <div key={index} className="relative aspect-square group/thumb rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white">
                                                                        <img
                                                                            src={url}
                                                                            alt={`Preview ${index}`}
                                                                            className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-500"
                                                                            onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f8fafc/cbd5e1?text=Invalid+Image'}
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <button
                                                                                onClick={() => {
                                                                                    const newUrls = newActivity.image_urls.filter((_, i) => i !== index);
                                                                                    setNewActivity({ ...newActivity, image_urls: newUrls.length > 0 ? newUrls : [''] });
                                                                                }}
                                                                                className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg active:scale-90"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {newActivity.image_urls.filter(url => url).length < 5 && (
                                                                    <button
                                                                        className="aspect-square rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 flex items-center justify-center text-gray-300 hover:border-sky-200 hover:text-sky-300 transition-all group/add-thumb"
                                                                        onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                                                                    >
                                                                        <Plus className="w-6 h-6 group-hover/add-thumb:scale-110 transition-transform" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="flex items-start gap-2 p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                                                                <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[10px] font-bold text-amber-900 uppercase tracking-tight">Optimization Hints</p>
                                                                    <p className="text-[10px] text-amber-700/80 leading-tight">Use JPG or PNG for faster loading. Max 5MB per file. High-resolution images (1920px width) look best.</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>

                                    <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/30">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setShowAddForm(false)
                                                setNewActivity({ title: '', description: '', image_urls: [''], start_time: '', end_time: '' })
                                                setCurrentImageUrl('')
                                                setSelectedTimeSlot('')
                                                setEditingId(null)
                                                setIsSuggestedLunch(false)
                                            }}
                                            className="flex-1 h-12 text-gray-500 font-bold hover:text-gray-900 group"
                                        >
                                            Cancel
                                            <span className="ml-2 text-[10px] text-gray-400 group-hover:text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 hidden sm:inline-block">Esc</span>
                                        </Button>
                                        <Button
                                            onClick={handleAddActivity}
                                            disabled={loading || !newActivity.title || isSuccess}
                                            className={cn(
                                                "flex-[2] h-12 font-bold shadow-lg transition-all active:scale-[0.98] group relative overflow-hidden",
                                                isSuccess
                                                    ? "bg-emerald-500 text-white shadow-emerald-200"
                                                    : "bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-200 hover:scale-[1.02]"
                                            )}
                                        >
                                            {loading ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Saving...
                                                </div>
                                            ) : isSuccess ? (
                                                <motion.div
                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    Saved!
                                                </motion.div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>{editingId ? 'Save Changes' : 'Create Activity'}</span>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded border border-white/30 hidden sm:inline-block">⌘Enter</span>
                                                    </div>
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <ToastContainer />
            </CardContent>
        </Card>
    );
}
