'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActivityImageGallery } from '@/components/ui/activity-image-gallery'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit, Trash2, Sun, Cloud, Sunset, Moon, GripVertical, Calendar, Clock, BarChart3, ListChecks, Utensils, Car, Map, MapPin, MoreVertical, Copy as CopyIcon, RotateCcw, Target, FileText, Image as ImageIcon, Bold, Italic, List, Smile, Zap, ArrowRight, Upload, Link, X, Settings, CheckCircle2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
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
    DragEndEvent,
    useDroppable,
    Active
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
import { ActivityLibrary } from './ActivityLibrary'
import { Activity as ActivityMaster } from '@/types/activities'

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
    is_optional?: boolean
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
    packageMode?: string
    destinations?: { city: string; country: string; days: number }[]
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
        emoji: '🍳',
        icon: Utensils,
        title: 'Morning Breakfast',
        description: 'Start the day with a delicious breakfast at the hotel or a local cafe.',
        slot: 'morning'
    },
    {
        id: 'sightseeing',
        label: 'Sightseeing',
        emoji: '🏛️',
        icon: Map,
        title: 'Local Sightseeing Tour',
        description: 'Explore the key landmarks and hidden gems with a guided tour.',
        slot: 'morning'
    },
    {
        id: 'lunch',
        label: 'Lunch',
        emoji: '🍱',
        icon: Utensils,
        title: 'Local Lunch Experience',
        description: 'Enjoy authentic local cuisine at a highly-rated restaurant.',
        slot: 'afternoon'
    },
    {
        id: 'free_time',
        label: 'Free Time',
        emoji: '🌿',
        icon: Clock,
        title: 'Leisure & Exploration',
        description: 'Free time to explore the city at your own pace or relax.',
        slot: 'afternoon'
    },
    {
        id: 'dinner',
        label: 'Dinner',
        emoji: '🍷',
        icon: Moon,
        title: 'Gourmet Dinner',
        description: 'A relaxing evening meal featuring local specialties and fine dining.',
        slot: 'evening'
    },
    {
        id: 'transfer',
        label: 'Transfer',
        emoji: '🚗',
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

function DroppableTimeSlot({ id, children }: { id: string, children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: {
            type: 'time-slot',
            day: id.split('-')[0],
            slot: id.split('-')[1]
        }
    });

    return (
        <div
            ref={setNodeRef}
            className="transition-all duration-200 rounded-2xl"
            style={isOver ? {
                boxShadow: '0 0 0 2px rgba(255,107,43,0.50), 0 0 20px rgba(255,107,43,0.15)',
                background: 'rgba(255,107,43,0.05)',
                transform: 'scale(1.005)',
                borderRadius: '16px',
            } : {}}
        >
            {children}
        </div>
    );
}

export function ItineraryBuilder({ packageId, durationDays, packageMode = 'single', destinations = [] }: ItineraryBuilderProps) {
    const [currentDay, setCurrentDay] = useState(1)
    const [activities, setActivities] = useState<Record<number, DayActivities>>({})
    const [showAddForm, setShowAddForm] = useState(false)
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
    const [newActivity, setNewActivity] = useState({
        title: '',
        description: '',
        image_urls: [''] as string[],
        start_time: '',
        end_time: '',
        is_optional: false
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
    const [activeDragItem, setActiveDragItem] = useState<Active | null>(null)

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
        if (newActivity.title === template.title) {
            // Toggle off
            setNewActivity({
                ...newActivity,
                title: '',
                description: ''
            });
            return;
        }
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
                                is_optional: activity.is_optional || false
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
                                image_urls: activity.imageUrls || [],  // Use Unsplash images from AI
                                is_optional: false
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
                is_optional: newActivity.is_optional
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (response.ok) {
                setIsSuccess(true)
                toast.success(editingId ? "Activity updated! ✓" : "Activity added! ✓")

                setTimeout(() => {
                    setNewActivity({ title: '', description: '', image_urls: [''], start_time: '', end_time: '', is_optional: false })
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

    const uploadImage = async (file: File): Promise<string> => {
        setIsUploading(true)
        setUploadProgress(10)

        try {
            const formData = new FormData()
            formData.append('file', file)
            // Optional: Append folder if needed, e.g., 'itinerary-items'
            // formData.append('folder', 'itinerary-items')

            const token = localStorage.getItem('token')

            // Mock progress for better UX since fetch doesn't support progress events easily
            const timer = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) return 90
                    return prev + 10
                })
            }, 200)

            const response = await fetch('http://localhost:8000/api/v1/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            clearInterval(timer)
            setUploadProgress(100)

            if (!response.ok) {
                throw new Error('Upload failed')
            }

            const data = await response.json()
            return data.url
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Failed to upload image')
            throw error
        } finally {
            setTimeout(() => {
                setIsUploading(false)
                setUploadProgress(0)
            }, 500)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const newUrls: string[] = []

        for (let i = 0; i < files.length; i++) {
            if (newActivity.image_urls.filter(url => url).length + newUrls.length >= 5) {
                alert("Maximum 5 images allowed")
                break
            }
            try {
                const url = await uploadImage(files[i])
                newUrls.push(url)
            } catch (error) {
                // Already handled in uploadImage
            }
        }

        if (newUrls.length > 0) {
            const currentUrls = [...newActivity.image_urls].filter(u => u)
            setNewActivity({ ...newActivity, image_urls: [...currentUrls, ...newUrls] })
        }

        // Reset input value to allow selecting same file again
        e.target.value = ''
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (!files || files.length === 0) return

        const newUrls: string[] = []

        for (let i = 0; i < files.length; i++) {
            if (newActivity.image_urls.filter(url => url).length + newUrls.length >= 5) {
                alert("Maximum 5 images allowed")
                break
            }
            try {
                const url = await uploadImage(files[i])
                newUrls.push(url)
            } catch (error) {
                // Already handled in uploadImage
            }
        }

        if (newUrls.length > 0) {
            const currentUrls = [...newActivity.image_urls].filter(u => u)
            setNewActivity({ ...newActivity, image_urls: [...currentUrls, ...newUrls] })
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

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragItem(event.active)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveDragItem(null)
        const { active, over } = event
        if (!over) return

        // Handle dropping from Library to Itinerary
        if (active.data.current?.type === 'library-activity') {
            const activityMaster = active.data.current.activity as ActivityMaster

            let targetDayStr: string | undefined
            let targetSlotStr: string | undefined

            // Check if hovered over a droppable zone (which has id "day-slot")
            if ((over.id as string).includes('-') && (over.id as string).split('-')[0].length <= 3) {
                const parts = (over.id as string).split('-')
                targetDayStr = parts[0]
                targetSlotStr = parts[1]
            } else {
                // Check if hovering over another SortableActivityItem. Walk the activities list to find which day/slot it belongs to.
                Object.keys(activities).forEach(dayKey => {
                    const day = parseInt(dayKey)
                    const dayData = activities[day]
                    Object.keys(dayData).forEach(slotKey => {
                        const slot = slotKey as keyof DayActivities
                        const items = dayData[slot]
                        if (items.some((item) => item.id === over.id)) {
                            targetDayStr = day.toString()
                            targetSlotStr = slot
                        }
                    })
                })
            }

            if (targetDayStr && targetSlotStr) {
                const day = parseInt(targetDayStr)
                const slot = targetSlotStr as keyof DayActivities

                const image_urls = activityMaster.images && activityMaster.images.length > 0
                    ? activityMaster.images.sort((a, b) => a.display_order - b.display_order).map(img => img.image_url)
                    : [];

                // Add to itinerary
                const newItineraryActivity: Activity = {
                    title: activityMaster.name,
                    description: activityMaster.description || '',
                    time_slot: slot,
                    start_time: '', // User can set later
                    end_time: '',
                    display_order: getMaxDisplayOrder(day, slot),
                    image_urls: image_urls
                }

                try {
                    const response = await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            day_number: day,
                            ...newItineraryActivity,
                            image_url: newItineraryActivity.image_urls,
                            activities: [],
                            is_optional: false
                        })
                    })

                    if (response.ok) {
                        toast.success(`Added ${activityMaster.name} to Day ${day}`)
                        loadItinerary()
                    }
                } catch (error) {
                    console.error('Failed to add activity from library:', error)
                    toast.error('Failed to add activity')
                }
                return
            }
        }

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
            end_time: activity.end_time || '',
            is_optional: activity.is_optional || false
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
            end_time: endTime,
            is_optional: false
        })
        setShowAddForm(true)
    }

    const renderDayTab = (day: number) => {
        const dayActivities = activities[day] || {}
        const activityCount = Object.values(dayActivities).reduce((acc: number, curr: any) => acc + (curr?.length || 0), 0)
        const hasActivities = activityCount > 0
        const isActive = currentDay === day

        return (
            <button
                key={day}
                onClick={() => setCurrentDay(day)}
                className={cn(
                    "relative flex flex-col items-start min-w-[120px] transition-all duration-300 group flex-shrink-0"
                )}
                style={isActive ? {
                    background: 'linear-gradient(135deg, #FF6B2B, #FF9A5C)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(255,107,43,0.3)',
                    color: 'white',
                    borderRadius: '50px',
                    padding: '8px 20px',
                } : {
                    background: 'transparent',
                    border: 'none',
                    color: '#5C2500',
                    borderRadius: '50px',
                    padding: '8px 20px',
                }}
            >
                {isActive && activityCount > 0 && (
                    <div className="absolute top-1.5 right-4 w-1.5 h-1.5 rounded-full bg-[#22c55e]" style={{ boxShadow: '0 0 8px #22c55e' }} />
                )}
                <div className="flex items-center gap-2">
                    <span className={cn("text-[13px] whitespace-nowrap", isActive ? "font-bold text-white" : "font-semibold text-[#5C2500]")}>Day {day}</span>
                    {!isActive && activityCount > 0 && (
                        <div className="w-1 h-1 rounded-full bg-[#22c55e]" />
                    )}
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
    }

    const getDayCity = (day: number) => {
        if (packageMode !== 'multi' || !destinations.length) return ''
        let currentDayCounter = 1
        for (const dest of destinations) {
            const destDays = parseInt(dest.days as any) || 1
            if (day >= currentDayCounter && day < currentDayCounter + destDays) {
                return dest.city
            }
            currentDayCounter += destDays
        }
        return ''
    }

    return (
        <div className="h-[calc(100vh-180px)] min-h-[700px] flex flex-col">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 flex overflow-hidden rounded-[32px] bg-white/12 backdrop-blur-2xl border border-white/20 shadow-2xl">

                    {/* COLUMN 1: Activity Library */}
                    <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-white/40">
                        <ActivityLibrary currentCity={getDayCity(currentDay) || 'All Cities'} />
                    </div>

                    {/* COLUMN 2: Itinerary Builder */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white/5">
                        <div className="px-8 py-6 border-b border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-[#5C2500] font-serif tracking-tight">Day-wise Itinerary</h2>
                                <p className="text-[10px] text-[#A0522D]/60 font-bold uppercase tracking-wider mt-0.5">Craft the perfect journey</p>
                            </div>

                            {/* Itinerary Overview Stats */}
                            <div className="hidden lg:flex items-center gap-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/18 backdrop-blur-md border border-white/30 rounded-full text-[11px] font-bold text-[#FF6B2B] shadow-sm">
                                    <BarChart3 className="w-4 h-4" />
                                    {Object.values(activities).reduce((acc, day) => acc + Object.values(day).reduce((dAcc, slot) => dAcc + slot.length, 0), 0)} Activities
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <Tabs value={`day-${currentDay}`} onValueChange={(v) => setCurrentDay(parseInt(v.split('-')[1]))}>
                                <div className="mb-8 overflow-hidden">
                                    <div className="flex items-center gap-1 overflow-x-auto p-1 bg-white/15 backdrop-blur-md rounded-full border border-white/20 scrollbar-hide">
                                        {packageMode === 'multi' && destinations.length > 0 ? (
                                            (() => {
                                                let currentDayCounter = 1;
                                                return destinations.map((dest, destIndex) => {
                                                    const destDaysCount = parseInt(dest.days as any) || 1;
                                                    const legDays = Array.from({ length: destDaysCount }, (_, i) => currentDayCounter + i);
                                                    currentDayCounter += destDaysCount;
                                                    const validLegDays = legDays.filter(d => d <= durationDays);
                                                    if (validLegDays.length === 0) return null;
                                                    return (
                                                        <div key={`dest-${destIndex}`} className="flex items-center gap-2 mr-2 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-white/60 flex-shrink-0 shadow-sm">
                                                            <div className="flex flex-col items-center justify-center min-w-[110px] h-[80px] px-3 bg-indigo-600/5 backdrop-blur-sm border border-indigo-100 rounded-xl whitespace-nowrap shadow-sm space-y-1">
                                                                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                                                                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                                                </div>
                                                                <span className="text-[11px] font-black text-slate-800 truncate max-w-[100px]" title={dest.city}>{dest.city || 'Unnamed'}</span>
                                                                <span className="text-[9px] text-indigo-700 font-bold bg-indigo-50 px-2 rounded-full border border-indigo-100">{destDaysCount} Days</span>
                                                            </div>
                                                            {validLegDays.map((day) => renderDayTab(day))}
                                                        </div>
                                                    );
                                                });
                                            })()
                                        ) : (
                                            days.map((day) => renderDayTab(day))
                                        )}
                                    </div>
                                </div>

                                {days.map((day) => {
                                    const dayActivities = getDayActivities(day)
                                    return (
                                        <TabsContent key={day} value={`day-${day}`} className="m-0 focus-visible:outline-none">
                                            {/* City/Destination Label for the day */}
                                            {packageMode === 'multi' && (
                                                <div className="mb-6 flex items-center gap-2 px-4 py-2 bg-indigo-50/50 border border-indigo-100 rounded-xl w-fit">
                                                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                                    <span className="text-xs font-bold text-indigo-700">Currently in {getDayCity(day) || 'Unknown Destination'}</span>
                                                </div>
                                            )}

                                            <div className="space-y-6">
                                                {Object.entries(timeSlotConfig).map(([slot, config]) => {
                                                    const slotActivities = dayActivities[slot as keyof DayActivities]
                                                    const Icon = config.icon
                                                    const totalCapacityHours = slot === 'full_day' ? 12 : slot === 'morning' ? 4 : slot === 'half_day' ? 6 : 4
                                                    const estimatedHoursUsed = slotActivities.length * 2
                                                    const progressPercentage = Math.min((estimatedHoursUsed / totalCapacityHours) * 100, 100)

                                                    return (
                                                        <DroppableTimeSlot key={slot} id={`${day}-${slot}`}>
                                                            <div className="space-y-4">
                                                                {/* Drop-enabled Time Slot Header */}
                                                                <div className="shadow-lg transition-all duration-500 hover:bg-white/18 rounded-[24px] group" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.25)', padding: '20px 24px' }}>

                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="flex justify-center items-center shadow-inner" style={{ background: 'rgba(255,107,43,0.08)', borderRadius: '12px', padding: '10px', border: '1px solid rgba(255,107,43,0.15)' }}>
                                                                                <Icon className={`h-5 w-5 ${config.color.replace('indigo', '[#FF6B2B]').replace('sky', '[#0EA5E9]').replace('orange', '[#F59E0B]').replace('emerald', '[#10B981]')}`} style={{ color: config.color.includes('indigo') ? '#FF6B2B' : undefined }} />
                                                                            </div>
                                                                            <div>
                                                                                <h3 className="font-bold text-[#5C2500] flex items-center gap-2.5 text-[15px] font-serif tracking-tight">
                                                                                    {config.label}
                                                                                    <span className="text-[10px] font-bold text-[#A0522D]/60 bg-white/20 px-2.5 py-1 rounded-full border border-white/30 uppercase tracking-widest">
                                                                                        {totalCapacityHours}h Limit
                                                                                    </span>
                                                                                </h3>
                                                                                {slotActivities.length > 0 && (
                                                                                    <p className="text-[10px] text-[#A0522D]/60 mt-1 font-bold uppercase tracking-wider">
                                                                                        Usage: {estimatedHoursUsed}h / {totalCapacityHours}h
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                onClick={() => handleOpenAddForm(slot)}
                                                                                className="h-9 gap-2 bg-white/10 border-2 border-dashed border-[#FF6B2B]/30 hover:bg-[#FF6B2B]/5 text-[#FF6B2B] font-bold rounded-xl text-[11px] transition-all px-4"
                                                                            >
                                                                                <Plus className="w-3.5 h-3.5" />
                                                                                Add Manual
                                                                            </Button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Glowing Progress Bar */}
                                                                    {slotActivities.length > 0 && (
                                                                        <div className="w-full mt-4 overflow-hidden bg-white/10 rounded-full h-1.5 border border-white/10">
                                                                            <div
                                                                                className="transition-all duration-1000 shadow-[0_0_10px_rgba(255,107,43,0.3)] h-full"
                                                                                style={{ width: `${progressPercentage}%`, background: 'linear-gradient(90deg, #FF6B2B, #FF9A5C)', borderRadius: '100px' }}
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    <div className={cn("space-y-3 mt-3")}>
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
                                                                                <div
                                                                                    id={`${day}-${slot}`}
                                                                                    className="py-12 border-2 border-dashed border-white/30 rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-white/5 backdrop-blur-sm hover:bg-[#FF6B2B]/5 hover:border-[#FF6B2B]/30 transition-all duration-500 group/drop mt-4"
                                                                                >
                                                                                    <div className="w-12 h-12 rounded-2xl bg-white/10 shadow-lg flex items-center justify-center mb-4 group-hover/drop:scale-110 group-hover/drop:rotate-6 transition-all duration-500 backdrop-blur-md border border-white/20">
                                                                                        <Icon className={cn("h-5 w-5 opacity-40 group-hover/drop:opacity-100 transition-opacity", config.color)} style={{ color: config.color.includes('indigo') ? '#FF6B2B' : undefined }} />
                                                                                    </div>
                                                                                    <p className="text-[11px] font-bold text-[#5C2500]/40 uppercase tracking-[0.2em]">Ready for activities</p>
                                                                                    <p className="text-[10px] text-[#FF6B2B]/60 mt-1 font-black underline decoration-dashed underline-offset-4">DRAG & DROP</p>
                                                                                </div>
                                                                            )}
                                                                        </SortableContext>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </DroppableTimeSlot>
                                                    )
                                                })}
                                            </div>
                                        </TabsContent>
                                    )
                                })}
                            </Tabs>
                        </div>
                    </div>
                </div>

                <DragOverlay>
                    {activeDragItem && activeDragItem.data.current?.type === 'library-activity' ? (
                        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl p-5 shadow-[0_20px_50px_rgba(255,107,43,0.3)] border-2 border-[#FF6B2B] scale-105 pointer-events-none w-[360px] flex items-center gap-5 rotate-2">
                            <div className="w-16 h-16 rounded-2xl bg-[#FFF5EB] flex items-center justify-center flex-shrink-0 border border-[#FFD4B0]">
                                <span className="text-2xl">✨</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[15px] font-bold text-[#5C2500] font-serif line-clamp-1">{activeDragItem.data.current.activity.name}</h4>
                                <p className="text-[10px] text-[#FF6B2B] font-black uppercase tracking-widest mt-1">Ready to post</p>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Redesigned Add Activity Modal */}
            <AnimatePresence>
                {
                    showAddForm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 backdrop-blur-[8px] flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4"
                        >
                            <motion.div
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "100%", opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="w-full max-w-[700px] max-h-[92vh] sm:max-h-[85vh] flex flex-col"
                            >
                                <Card
                                    className="w-full h-full flex flex-col border-[2px] border-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden rounded-[28px]"
                                    style={{
                                        background: 'rgba(255,255,255,0.65)',
                                        backdropFilter: 'blur(40px) brightness(1.2) saturate(60%)',
                                        WebkitBackdropFilter: 'blur(40px) brightness(1.2) saturate(60%)',
                                    }}
                                >
                                    {/* Mobile Drag Handle */}
                                    <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 sm:hidden opacity-40" />

                                    {/* Header - transparent, inherits glass */}
                                    <div className="p-8 pb-4 relative" style={{ background: 'transparent' }}>
                                        <button
                                            onClick={() => {
                                                setShowAddForm(false)
                                                setNewActivity({ title: '', description: '', image_urls: [''], start_time: '', end_time: '', is_optional: false })
                                                setCurrentImageUrl('')
                                                setSelectedTimeSlot('')
                                                setEditingId(null)
                                            }}
                                            className="absolute top-6 right-6 p-2.5 bg-white/25 backdrop-blur-md hover:bg-[#FF6B2B]/20 text-[#FF6B2B] rounded-full transition-all hover:rotate-90 duration-300 border border-white/40"
                                        >
                                            <Plus className="w-5 h-5 rotate-45" />
                                        </button>
                                        <div className="flex items-center gap-4">
                                            <div className="space-y-1 text-left">
                                                <h2 className="text-[28px] font-bold tracking-tight text-[#1A0800] font-serif leading-tight" style={{ fontWeight: 700 }}>
                                                    {editingId ? 'Edit Activity' : 'Add Activity'}
                                                </h2>
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2.5 py-0.5 rounded-full bg-[#FF6B2B]/20 border border-[#FF6B2B]/50 flex items-center gap-1.5">
                                                        <span className="w-1 h-1 rounded-full bg-[#FF6B2B] animate-pulse" />
                                                        <span className="text-[9px] font-black text-[#FF6B2B] uppercase tracking-[0.15em]">
                                                            {editingId ? 'Updating Entry' : `NEW ${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig]?.label} ACTIVITY`}
                                                        </span>
                                                        {selectedTimeSlot === 'night' && <Moon className="w-2.5 h-2.5 text-[#FF6B2B]" />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <CardContent className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                                        {/* Quick Templates Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-[#FF6B2B]/10 rounded-lg">
                                                    <Zap className="w-3.5 h-3.5 text-[#FF6B2B] animate-pulse" />
                                                </div>
                                                <span className="text-[11px] font-black text-[#FF6B2B] opacity-90 uppercase tracking-[0.2em]">Quick Templates</span>
                                            </div>

                                            <div className="space-y-3">
                                                {isSuggestedLunch && !newActivity.title && (
                                                    <div className="flex items-center gap-3 p-4 bg-orange-50/50 backdrop-blur-md border border-orange-100/50 rounded-2xl animate-in fade-in slide-in-from-left-4 duration-500">
                                                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                                            <Utensils className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-orange-900 leading-none">It's lunchtime! 🍱</p>
                                                            <p className="text-[11px] text-orange-700/70 mt-1">Shall we add a local culinary break?</p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-[11px] font-black border-orange-200 bg-white/80 text-orange-600 hover:bg-[#FF6B2B] hover:text-white hover:border-[#FF6B2B] rounded-xl transition-all shadow-sm"
                                                            onClick={() => setNewActivity({ ...newActivity, title: 'Local Lunch Experience' })}
                                                        >
                                                            AUTO-FILL
                                                        </Button>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                                                    {ACTIVITY_TEMPLATES.map((template) => {
                                                        const Icon = template.icon;
                                                        const isActive = newActivity.title === template.title;
                                                        return (
                                                            <button
                                                                key={template.id}
                                                                onClick={() => handleApplyTemplate(template)}
                                                                className={cn(
                                                                    "flex items-center gap-3 px-4 py-3 rounded-[16px] border transition-all active:scale-[0.98] group/template",
                                                                    isActive
                                                                        ? "bg-gradient-to-br from-[#FF6B2B] to-[#FF9A5C] border-transparent text-white shadow-[0_8px_20px_rgba(255,107,43,0.3)]"
                                                                        : "border-white/40 text-[#2D1A0E] hover:bg-[#FF6B2B]/10 hover:border-[#FF6B2B]/40 hover:-translate-y-0.5 shadow-sm"
                                                                )}
                                                                style={!isActive ? { background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } : {}}
                                                            >
                                                                <div className={cn(
                                                                    "text-lg transition-transform group-hover/template:scale-125 duration-300",
                                                                    isActive ? "filter brightness-0 invert" : ""
                                                                )}>
                                                                    {template.emoji}
                                                                </div>
                                                                <span className={cn(
                                                                    "text-xs font-bold tracking-tight transition-colors",
                                                                    isActive ? "text-white" : "text-[#2D1A0E] group-hover/template:text-[#FF6B2B]"
                                                                )}>{template.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Section 1: Basic Info */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-white/20 pb-2">
                                                <div className="flex items-center gap-1.5 opacity-90">
                                                    <span className="text-[#FF6B2B] text-lg">●</span>
                                                    <h3 className="text-[11px] font-black text-[#FF6B2B] uppercase tracking-[0.2em]">Basic Information</h3>
                                                </div>
                                                <button
                                                    onClick={() => setNewActivity({ ...newActivity, is_optional: !newActivity.is_optional })}
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 flex items-center gap-2",
                                                        newActivity.is_optional
                                                            ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-transparent shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
                                                            : "bg-white/15 text-[#A0522D]/60 border-white/30 hover:border-teal-500/40 hover:text-teal-600"
                                                    )}
                                                >
                                                    {newActivity.is_optional ? (
                                                        <>
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            OPTIONAL ENTRY
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#A0522D]/40" />
                                                            SET AS OPTIONAL
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="space-y-2 relative">
                                                <div className="flex justify-between items-center ml-1">
                                                    <Label htmlFor="activity-title" className="text-[10px] font-bold text-[#A0522D]/60 uppercase tracking-wider">Activity Title</Label>
                                                </div>
                                                <div className="relative group/title">
                                                    <Input
                                                        id="activity-title"
                                                        placeholder="e.g., Grand Tour of Tokyo Sky Tree"
                                                        className="h-[52px] text-base font-bold bg-white/12 border-white/25 focus:border-[#FF6B2B]/50 focus:ring-4 focus:ring-[#FF6B2B]/5 transition-all rounded-2xl placeholder:text-[#A0522D]/30 text-[#3A1A08] shadow-inner"
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
                                                    <div className={cn(
                                                        "absolute right-3 bottom-0 -translate-y-[15px] text-[9px] font-black px-1.5 py-0.5 rounded-md border backdrop-blur-md",
                                                        newActivity.title.length > 80 ? "bg-red-50/80 text-red-600 border-red-100" : "bg-white/40 text-[#A0522D]/60 border-white/40"
                                                    )}>
                                                        {newActivity.title.length}/100
                                                    </div>

                                                    {showSuggestions && (
                                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-2xl z-[120] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                                                            <div className="p-3 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
                                                                <Zap className="w-3.5 h-3.5 text-orange-500" />
                                                                <span className="text-[10px] font-black text-[#A0522D]/50 uppercase tracking-widest">Powered Suggestions</span>
                                                            </div>
                                                            <div className="max-h-[220px] overflow-y-auto p-1.5 custom-scrollbar">
                                                                {ACTIVITY_SUGGESTIONS
                                                                    .filter(s => !newActivity.title || s.toLowerCase().includes(newActivity.title.toLowerCase()))
                                                                    .map((suggestion, i) => (
                                                                        <button
                                                                            key={i}
                                                                            onClick={() => {
                                                                                setNewActivity({ ...newActivity, title: suggestion })
                                                                                setShowSuggestions(false)
                                                                            }}
                                                                            className="w-full text-left px-3 py-2.5 text-[13px] font-bold text-[#5C2500] hover:bg-[#FF6B2B] hover:text-white rounded-xl transition-all flex items-center gap-3 group/sug"
                                                                        >
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B]/30 group-hover/sug:bg-white/50" />
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
                                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 bg-[#FF6B2B]/10 rounded-lg">
                                                        <Clock className="w-3.5 h-3.5 text-[#FF6B2B]" />
                                                    </div>
                                                    <h3 className="text-[11px] font-black text-[#5C2500] uppercase tracking-[0.2em]">Timing</h3>
                                                </div>
                                                <button
                                                    onClick={toggleAllDay}
                                                    className={cn(
                                                        "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95",
                                                        isAllDay
                                                            ? "bg-gradient-to-r from-[#FF6B2B] to-[#FF9A5C] text-white border-transparent shadow-[0_4px_12px_rgba(255,107,43,0.3)]"
                                                            : "bg-white/15 text-[#A0522D]/60 border-white/30 hover:border-[#FF6B2B]/40 hover:text-[#FF6B2B]"
                                                    )}
                                                >
                                                    {isAllDay ? '✨ ALL DAY' : 'ALL DAY'}
                                                </button>
                                            </div>

                                            <div className="bg-transparent p-6 rounded-[28px] border border-white/20 space-y-6 shadow-inner">
                                                <div className="grid grid-cols-2 gap-8 relative">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="start-time" className="text-[10px] font-black text-[#A0522D]/40 uppercase tracking-widest ml-1">START TIME</Label>
                                                        <div className="relative group/time">
                                                            <Input
                                                                id="start-time"
                                                                type="time"
                                                                className="h-[52px] border-white/40 bg-white/22 focus:border-[#FF6B2B]/50 transition-all pl-12 text-base font-black text-[#3A1A08] rounded-[14px] shadow-sm"
                                                                value={newActivity.start_time}
                                                                onChange={(e) => setNewActivity({ ...newActivity, start_time: e.target.value })}
                                                            />
                                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#FF6B2B]/10">
                                                                <Sun className="w-3.5 h-3.5 text-[#FF6B2B]" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF9A5C] border border-white/40 shadow-lg flex items-center justify-center text-white">
                                                            <ArrowRight className="w-4 h-4" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="end-time" className="text-[10px] font-black text-[#A0522D]/40 uppercase tracking-widest ml-1">END TIME</Label>
                                                        <div className="relative group/time">
                                                            <Input
                                                                id="end-time"
                                                                type="time"
                                                                className="h-[52px] border-white/40 bg-white/22 focus:border-[#FF6B2B]/50 transition-all pl-12 text-base font-black text-[#3A1A08] rounded-[14px] shadow-sm"
                                                                value={newActivity.end_time}
                                                                onChange={(e) => setNewActivity({ ...newActivity, end_time: e.target.value })}
                                                            />
                                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#A0522D]/10">
                                                                <Sunset className="w-3.5 h-3.5 text-[#A0522D]" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-[#FF6B2B] uppercase tracking-widest mr-1">Presets:</span>
                                                        <div className="flex gap-1.5">
                                                            {[1, 2, 3].map((h) => (
                                                                <button
                                                                    key={h}
                                                                    onClick={() => handlePresetTime(h)}
                                                                    className="px-3 py-1.5 rounded-xl bg-white/20 border border-white/40 text-[11px] font-black text-[#2D1A0E] hover:bg-[#FF6B2B] hover:text-white hover:border-[#FF6B2B] transition-all shadow-sm active:scale-95"
                                                                >
                                                                    +{h}H
                                                                </button>
                                                            ))}
                                                            <button
                                                                onClick={() => handlePresetTime(12)}
                                                                className="px-4 py-1.5 rounded-xl bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 text-[11px] font-black text-[#FF6B2B] hover:bg-gradient-to-r hover:from-[#FF6B2B] hover:to-[#FF9A5C] hover:text-white transition-all shadow-sm active:scale-95"
                                                            >
                                                                HALF DAY
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {durationMinutes > 0 && (
                                                        <div className="flex items-center gap-2.5 bg-[#FF6B2B] text-white px-5 py-2 rounded-full shadow-lg shadow-[#FF6B2B]/20 animate-in zoom-in-95 duration-300">
                                                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">DURATION: {formatDuration(durationMinutes)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-5 rounded-[24px] border transition-all active:scale-[0.98] group/adv",
                                                    showAdvancedOptions
                                                        ? "bg-[#FF6B2B]/10 border-[#FF6B2B]/25 text-[#FF6B2B] shadow-inner"
                                                        : "bg-white/10 border-white/20 text-[#A0522D]/60 hover:bg-white/15 hover:border-[#FF6B2B]/30"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "p-2.5 rounded-xl transition-all duration-500",
                                                        showAdvancedOptions ? "bg-[#FF6B2B] text-white shadow-[0_4px_12px_rgba(255,107,43,0.3)]" : "bg-white/20 text-[#A0522D]/40 group-hover/adv:text-[#FF6B2B]"
                                                    )}>
                                                        <Settings className={cn("w-4.5 h-4.5", showAdvancedOptions && "animate-spin-slow")} />
                                                    </div>
                                                    <span className="text-[11px] font-black uppercase tracking-[0.15em]">Advanced Experience Options</span>
                                                </div>
                                                <div className={cn(
                                                    "p-1.5 rounded-full transition-transform duration-500",
                                                    showAdvancedOptions ? "rotate-180 bg-white shadow-sm" : "bg-white/10 group-hover/adv:bg-white/20"
                                                )}>
                                                    <ChevronDown className="w-4 h-4" />
                                                </div>
                                            </button>
                                        </div>

                                        {showAdvancedOptions && (
                                            <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-[#FF6B2B]/10 rounded-lg">
                                                                <FileText className="w-4 h-4 text-[#FF6B2B]" />
                                                            </div>
                                                            <h3 className="text-[11px] font-black text-[#5C2500] uppercase tracking-[0.2em]">Experience Details</h3>
                                                        </div>
                                                    </div>

                                                    <div className="relative overflow-hidden rounded-[24px] border border-white/35 focus-within:ring-4 focus-within:ring-[#FF6B2B]/5 focus-within:border-[#FF6B2B]/40 transition-all bg-white/12 shadow-inner">
                                                        <div className="relative">
                                                            <Textarea
                                                                id="activity-description"
                                                                placeholder="Craft a compelling narrative for this activity..."
                                                                className="min-h-[140px] border-none focus-visible:ring-0 shadow-none text-[15px] font-medium leading-relaxed p-5 bg-transparent resize-none overflow-hidden placeholder:text-[#A0522D]/30 text-[#3A1A08]"
                                                                value={newActivity.description}
                                                                onChange={(e) => {
                                                                    if (e.target.value.length <= 500) {
                                                                        setNewActivity({ ...newActivity, description: e.target.value })
                                                                        e.target.style.height = 'auto';
                                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                                    }
                                                                }}
                                                            />
                                                            <div className={cn(
                                                                "absolute right-4 bottom-4 text-[9px] font-black px-1.5 py-0.5 rounded-md border backdrop-blur-md",
                                                                newActivity.description.length > 450 ? "bg-red-50/80 text-red-600 border-red-100" : "bg-white/40 text-[#FF6B2B] border-[#FF6B2B]/40"
                                                            )}>
                                                                {newActivity.description.length}/500
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-[#FF6B2B]/10 rounded-lg">
                                                                <ImageIcon className="w-4 h-4 text-[#FF6B2B]" />
                                                            </div>
                                                            <h3 className="text-[11px] font-black text-[#5C2500] uppercase tracking-[0.2em]">Gallery Assets</h3>
                                                        </div>
                                                        <div className="flex items-center gap-3 bg-white/20 px-3 py-1 rounded-full border border-white/30 backdrop-blur-md">
                                                            <span className="text-[9px] font-black text-[#A0522D]/50 uppercase tracking-widest">Storage:</span>
                                                            <div className="w-16 h-1 bg-white/30 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-[#FF6B2B] transition-all duration-700 ease-out"
                                                                    style={{ width: `${(newActivity.image_urls.filter(u => u).length / 5) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-black text-[#FF6B2B]">{newActivity.image_urls.filter(u => u).length}/5</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-5">
                                                        <div
                                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                                            onDragLeave={() => setIsDragging(false)}
                                                            onDrop={handleDrop}
                                                            className={cn(
                                                                "relative group/dropzone border-2 border-dashed rounded-[20px] transition-all p-10 flex flex-col items-center justify-center gap-4 bg-white/30 shadow-inner overflow-hidden",
                                                                isDragging
                                                                    ? "border-[#FF6B2B] bg-[#FF6B2B]/5 scale-[0.985]"
                                                                    : "border-[#FF6B2B]/40 hover:bg-white/18 hover:border-[#FF6B2B]/60"
                                                            )}
                                                        >
                                                            <input
                                                                type="file"
                                                                multiple
                                                                accept="image/*"
                                                                onChange={handleFileChange}
                                                                className="absolute inset-0 opacity-0 cursor-pointer z-50"
                                                            />

                                                            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-[#FF6B2B] to-[#FF9A5C] shadow-lg shadow-[#FF6B2B]/30 flex items-center justify-center text-white group-hover/dropzone:scale-110 group-hover/dropzone:rotate-6 transition-all duration-500">
                                                                <Upload className="w-7 h-7" />
                                                            </div>

                                                            <div className="text-center space-y-1.5">
                                                                <p className="text-[15px] font-black text-[#3A1A08] tracking-tight">Drop your visual story here</p>
                                                                <p className="text-[11px] text-[#A0522D]/60 font-medium uppercase tracking-[0.1em]">or click to browse library</p>
                                                            </div>

                                                            <div className="w-full max-w-[280px] relative mt-2 z-[60]">
                                                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                                    <Link className="w-3.5 h-3.5 text-[#FF6B2B]" />
                                                                </div>
                                                                <Input
                                                                    placeholder="ENTER ASSET URL..."
                                                                    className="h-11 pl-11 text-[10px] font-black tracking-widest border-white/65 border-[1px] bg-white/50 focus:bg-white/90 focus:border-[#FF6B2B] rounded-full shadow-inner placeholder:text-[#B4501E]/45"
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
                                                                <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-[70] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                                                                    <div className="w-full max-w-[220px] space-y-4">
                                                                        <div className="flex justify-between items-center text-[10px] font-black text-[#FF6B2B] uppercase tracking-widest">
                                                                            <span>Optimizing Asset...</span>
                                                                            <span>{uploadProgress}%</span>
                                                                        </div>
                                                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-50">
                                                                            <div
                                                                                className="h-full bg-gradient-to-r from-[#FF6B2B] to-[#FF9A5C] rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,107,43,0.4)]"
                                                                                style={{ width: `${uploadProgress}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-5 gap-4 px-1">
                                                            {newActivity.image_urls.filter(url => url).map((url, index) => (
                                                                <div key={index} className="relative aspect-square group/thumb rounded-2xl overflow-hidden border-2 border-white/50 shadow-sm bg-white cursor-zoom-in">
                                                                    <img
                                                                        src={url}
                                                                        alt={`Preview ${index}`}
                                                                        className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-700"
                                                                        onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f8fafc/cbd5e1?text=INVALID+ASSET'}
                                                                    />
                                                                    <div className="absolute inset-0 bg-[#FF6B2B]/40 opacity-0 group-hover/thumb:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                                                        <button
                                                                            onClick={() => {
                                                                                const newUrls = newActivity.image_urls.filter((_, i) => i !== index);
                                                                                setNewActivity({ ...newActivity, image_urls: newUrls.length > 0 ? newUrls : [''] });
                                                                            }}
                                                                            className="w-9 h-9 bg-white text-[#FF6B2B] rounded-xl flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow-xl active:scale-90"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {newActivity.image_urls.filter(url => url).length < 5 && (
                                                                <button
                                                                    className="aspect-square rounded-2xl border-2 border-dashed border-white/30 bg-white/5 flex flex-col items-center justify-center text-white/30 hover:border-[#FF6B2B]/40 hover:text-[#FF6B2B] hover:bg-white/10 transition-all group/add-thumb active:scale-[0.96]"
                                                                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                                                                >
                                                                    <Plus className="w-8 h-8 group-hover/add-thumb:scale-110 transition-transform duration-500" />
                                                                    <span className="text-[8px] font-black mt-1 uppercase tracking-tighter opacity-0 group-hover/add-thumb:opacity-100 transition-opacity">ADD PHOTO</span>
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex items-start gap-4 p-5 bg-[#FFD700]/10 border border-[#FFD700]/25 rounded-[24px] backdrop-blur-md">
                                                            <div className="w-10 h-10 rounded-2xl bg-[#FFD700]/20 flex items-center justify-center">
                                                                <Zap className="w-5 h-5 text-[#B8860B]" />
                                                            </div>
                                                            <div className="flex-1 space-y-1">
                                                                <p className="text-[12px] font-black text-[#8B4513] uppercase tracking-widest">Optimization Hints</p>
                                                                <p className="text-[11px] text-[#A0522D]/70 font-medium leading-relaxed">High-resolution JPGs (up to 5MB) provide the best premium experience for travelers. Recommended width: 1920px.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>

                                    <div
                                        className="p-8 border-t border-white/65 flex gap-4"
                                        style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                                    >
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setShowAddForm(false)
                                                setNewActivity({ title: '', description: '', image_urls: [''], start_time: '', end_time: '', is_optional: false })
                                                setCurrentImageUrl('')
                                                setSelectedTimeSlot('')
                                                setEditingId(null)
                                                setIsSuggestedLunch(false)
                                            }}
                                            className="h-[52px] px-8 text-[#FF6B2B] font-black uppercase tracking-widest border-[#FF6B2B]/45 hover:bg-[#FF6B2B]/10 rounded-[50px] group border-[1.5px]"
                                            style={{ background: 'rgba(255,255,255,0.60)' }}
                                        >
                                            Cancel
                                            <span className="ml-3 text-[10px] font-black text-[#FF6B2B]/60 group-hover:text-[#FF6B2B] px-2 py-1 rounded-lg border border-white/40 hidden sm:inline-block bg-white/20 backdrop-blur-md">ESC</span>
                                        </Button>
                                        <Button
                                            onClick={handleAddActivity}
                                            disabled={loading || !newActivity.title || isSuccess}
                                            className={cn(
                                                "flex-1 h-[54px] font-black uppercase tracking-widest transition-all active:scale-[0.98] group relative overflow-hidden rounded-[50px]",
                                                isSuccess
                                                    ? "bg-[#10B981] text-white"
                                                    : "text-white font-bold hover:scale-[1.02]"
                                            )}
                                            style={!isSuccess ? {
                                                background: 'linear-gradient(135deg, #FF6B2B, #FF9A5C)',
                                                boxShadow: '0 8px 24px rgba(255,107,43,0.50)'
                                            } : {}}
                                        >
                                            {loading ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                    <span>PROCESSING...</span>
                                                </div>
                                            ) : isSuccess ? (
                                                <motion.div
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    <span>SUCCESS!</span>
                                                </motion.div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2.5">
                                                    <span>{editingId ? 'SAVE CHANGES' : 'CREATE ACTIVITY'}</span>
                                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                        <span className="text-[10px] bg-white/30 px-2 py-1 rounded-lg border border-white/40 hidden sm:inline-block text-white backdrop-blur-md">ENTER</span>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Glow Effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </div >
    );
}