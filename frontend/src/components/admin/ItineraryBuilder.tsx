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
import { API_URL } from '@/lib/api'
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
    // For single-destination packages: the one selected destination city
    singleDestination?: string
}

const timeSlotConfig = {
    full_day: { icon: Calendar, label: 'Full Day', color: 'text-black', bgColor: 'bg-indigo-50', theme: 'indigo' },
    morning: { icon: Sun, label: 'Morning', color: 'text-black', bgColor: 'bg-yellow-50', theme: 'amber' },
    half_day: { icon: Clock, label: 'Half Day', color: 'text-black', bgColor: 'bg-emerald-50', theme: 'emerald' },
    afternoon: { icon: Cloud, label: 'Afternoon', color: 'text-black', bgColor: 'bg-blue-50', theme: 'blue' },
    evening: { icon: Sunset, label: 'Evening', color: 'text-black', bgColor: 'bg-orange-50', theme: 'orange' },
    night: { icon: Moon, label: 'Night', color: 'text-black', bgColor: 'bg-purple-50', theme: 'purple' }
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

const addMinutesToTime = (time: string, minutes: number) => {
    if (!time || !minutes) return '';
    try {
        const [hours, mins] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(mins)) return '';

        const totalMinutes = hours * 60 + mins + minutes;
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMins = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
    } catch (e) {
        return '';
    }
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
                boxShadow: '0 0 0 2px var(--primary-soft), 0 0 20px var(--primary-glow)',
                background: 'var(--primary-glow)',
                transform: 'scale(1.005)',
                borderRadius: '16px',
            } : {}}
        >
            {children}
        </div>
    );
}

export function ItineraryBuilder({ packageId, durationDays, packageMode = 'single', destinations = [], singleDestination = '' }: ItineraryBuilderProps) {
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
        if (newH >= 24) {
            newH = 23;
            newM = 59;
        }
        const formattedH = String(newH).padStart(2, '0');
        const formattedM = String(newM).padStart(2, '0');
        setNewActivity({ ...newActivity, end_time: `${formattedH}:${formattedM}` });
        setIsAutoCalculated(false);
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
            const checkResponse = await fetch(`${API_URL}/api/v1/admin-simple/packages-simple/${packageId}`)
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
                                `${API_URL}/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items`,
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
                const response = await fetch(`${API_URL}/api/v1/admin-simple/packages-simple/${packageId}`)
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
    const [activityDuration, setActivityDuration] = useState<number | null>(null)
    const [isAutoCalculated, setIsAutoCalculated] = useState(false)

    // ... (rest of imports/state)

    const handleAddActivity = async () => {
        if (!newActivity.title || !selectedTimeSlot) {
            alert('Please fill in all fields')
            return
        }

        setLoading(true)
        try {
            const url = editingId
                ? `${API_URL}/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items/${editingId}`
                : `${API_URL}/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items`

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

            const response = await fetch(`${API_URL}/api/v1/upload`, {
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
            await fetch(`${API_URL}/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items/${activityId}`, {
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
                
                // Switch to the drop target day
                setCurrentDay(day)

                const image_urls = activityMaster.images && activityMaster.images.length > 0
                    ? activityMaster.images.sort((a, b) => a.display_order - b.display_order).map(img => img.image_url)
                    : [];

                // Store duration for auto-calculation (convert hours to minutes)
                const isVeryLong = activityMaster.duration_hours && activityMaster.duration_hours >= 24;
                
                if (activityMaster.duration_hours) {
                    setActivityDuration(activityMaster.duration_hours * 60)
                } else {
                    setActivityDuration(null)
                }
                setIsAutoCalculated(false)

                setSelectedTimeSlot(slot)
                setNewActivity({
                    title: activityMaster.name,
                    description: activityMaster.description || '',
                    image_urls: image_urls,
                    start_time: isVeryLong ? '00:00' : '',
                    end_time: isVeryLong ? '23:59' : '',
                    is_optional: false
                })
                setShowAddForm(true)
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
                            fetch(`${API_URL}/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items/${update.id}`, {
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
        setActivityDuration(null)
        setIsAutoCalculated(false)
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
        setActivityDuration(null)
        setIsAutoCalculated(false)
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
                    background: 'black',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    color: 'white',
                    borderRadius: '50px',
                    padding: '8px 20px',
                } : {
                    background: 'transparent',
                    border: 'none',
                    color: '#000000',
                    borderRadius: '50px',
                    padding: '8px 20px',
                }}
            >
                {isActive && activityCount > 0 && (
                    <div className="absolute top-1.5 right-4 w-1.5 h-1.5 rounded-full bg-[#22c55e]" style={{ boxShadow: '0 0 8px #22c55e' }} />
                )}
                <div className="flex items-center gap-2">
                    <span className={cn("text-[13px] whitespace-nowrap", isActive ? "font-bold text-white" : "font-semibold text-black")}>Day {day}</span>
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
                                    isActive ? "bg-white/20 text-white hover:bg-white/30" : "bg-gray-100 text-slate-900 hover:bg-gray-200"
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
        // Single-destination package: always show only that destination in the library
        if (packageMode === 'single') {
            return singleDestination || ''
        }
        // Multi-destination: map day number to the correct leg's city
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
                        <ActivityLibrary currentCity={getDayCity(currentDay) || undefined} />
                    </div>

                    {/* COLUMN 2: Itinerary Builder */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white/5">
                        <div className="px-8 py-6 border-b border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-black font-serif tracking-tight">Day-wise Itinerary</h2>
                                <p className="text-[10px] text-black/60 font-bold uppercase tracking-wider mt-0.5">Craft the perfect journey</p>
                            </div>

                            {/* Itinerary Overview Stats */}
                            <div className="hidden lg:flex items-center gap-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/18 backdrop-blur-md border border-white/30 rounded-full text-[11px] font-bold text-black shadow-sm">
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
                                                                            <div className="flex justify-center items-center shadow-inner" style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '12px', padding: '10px', border: '1px solid rgba(0,0,0,0.1)' }}>
                                                                                <Icon className="h-5 w-5 text-black" style={{ color: 'black' }} />
                                                                            </div>
                                                                            <div>
                                                                                <h3 className="font-bold text-black flex items-center gap-2.5 text-[15px] font-serif tracking-tight">
                                                                                    {config.label}
                                                                                    <span className="text-[10px] font-bold text-black/60 bg-white/20 px-2.5 py-1 rounded-full border border-white/30 uppercase tracking-widest">
                                                                                        {totalCapacityHours}h Limit
                                                                                    </span>
                                                                                </h3>
                                                                                {slotActivities.length > 0 && (
                                                                                    <p className="text-[10px] text-black/60 mt-1 font-bold uppercase tracking-wider">
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
                                                                                className="h-9 gap-2 bg-white/10 border-2 border-dashed border-black/30 hover:bg-black/5 text-black font-bold rounded-xl text-[11px] transition-all px-4"
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
                                                                                className="transition-all duration-1000 shadow-[0_0_10px_var(--primary-glow)] h-full"
                                                                                style={{ width: `${progressPercentage}%`, background: 'linear-gradient(90deg, var(--primary), var(--primary-light))', borderRadius: '100px' }}
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
                                                                                    className="py-12 border-2 border-dashed border-white/30 rounded-3xl flex flex-col items-center justify-center text-slate-700 bg-white/5 backdrop-blur-sm hover:bg-black/5 hover:border-black/30 transition-all duration-500 group/drop mt-4"
                                                                                >
                                                                                    <div className="w-12 h-12 rounded-2xl bg-white/10 shadow-lg flex items-center justify-center mb-4 group-hover/drop:scale-110 group-hover/drop:rotate-6 transition-all duration-500 backdrop-blur-md border border-white/20">
                                                                                        <Icon className={cn("h-5 w-5 opacity-40 group-hover/drop:opacity-100 transition-opacity", config.color)} style={{ color: config.color.includes('indigo') ? 'var(--primary)' : undefined }} />
                                                                                    </div>
                                                                                    <p className="text-[11px] font-bold text-black/40 uppercase tracking-[0.2em]">Ready for activities</p>
                                                                                    <p className="text-[10px] text-black/60 mt-1 font-black underline decoration-dashed underline-offset-4">DRAG & DROP</p>
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
                        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl p-5 shadow-[0_20px_50px_var(--primary-glow)] border-2 border-black scale-105 pointer-events-none w-[360px] flex items-center gap-5 rotate-2">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--primary-soft)]/20 flex items-center justify-center flex-shrink-0 border border-[var(--primary-soft)]/40">
                                <span className="text-2xl">✨</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[15px] font-bold text-black font-serif line-clamp-1">{activeDragItem.data.current.activity.name}</h4>
                                <p className="text-[10px] text-black font-black uppercase tracking-widest mt-1">Ready to post</p>
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
                                    className="w-full h-full flex flex-col glass-pearl border-none shadow-[0_32px_80px_rgba(42,157,143,0.15)] overflow-hidden rounded-[28px]"
                                >
                                    {/* Mobile Drag Handle */}
                                    <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 sm:hidden opacity-40" />

                                    {/* Header - transparent, inherits glass */}
                                    <div className="p-8 pb-4 relative shrink-0">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1.5 text-left">
                                                <h2 className="text-4xl font-black tracking-tight text-black font-playfair leading-tight">
                                                    {editingId ? 'Edit Activity' : 'Add Activity'}
                                                </h2>
                                                {selectedTimeSlot && (
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("px-4 py-1.5 rounded-full border flex items-center gap-2 shadow-sm", `bg-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-50 border-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-100`)}>
                                                            <div className={cn("w-1.5 h-1.5 rounded-full", `bg-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-400`)} />
                                                            <span className={cn("text-[10px] font-black uppercase tracking-[0.1em]", `text-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-600`)}>
                                                                {editingId ? 'EDITING' : 'NEW'} {timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].label} ACTIVITY
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setShowAddForm(false)
                                                    setNewActivity({ title: '', description: '', image_urls: [''], start_time: '', end_time: '', is_optional: false })
                                                    setCurrentImageUrl('')
                                                    setSelectedTimeSlot('')
                                                    setEditingId(null)
                                                }}
                                                className="h-10 w-10 rounded-full bg-slate-100/40 hover:bg-slate-200/60 text-slate-500 transition-all duration-300"
                                            >
                                                <X className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <CardContent className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                                        {/* Section 1: Basic Info */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-black shadow-[0_0_8px_rgba(0,0,0,0.1)]" />
                                                        <h3 className="text-[11px] font-black text-black uppercase tracking-[0.2em] font-playfair">Activity Information</h3>
                                                    </div>
                                                    <button
                                                        onClick={() => setNewActivity({ ...newActivity, is_optional: !newActivity.is_optional })}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 flex items-center gap-2",
                                                            newActivity.is_optional
                                                                ? ("text-[var(--primary)]")
                                                                : ("text-[var(--primary)]")
                                                        )}
                                                    >
                                                        {newActivity.is_optional ? (
                                                            <>
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                OPTIONAL ENTRY
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className={cn("w-1.5 h-1.5 rounded-full", "bg-[var(--primary)]")} />
                                                                SET AS OPTIONAL
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="space-y-2 relative">
                                                    <div className="relative group/title">
                                                        <Input
                                                            id="activity-title"
                                                            placeholder="e.g., Majestic Sunset at Tokyo Sky Tree..."
                                                            className={cn(
                                                                "h-[60px] text-lg font-bold bg-white/30 backdrop-blur-md border-white/60 transition-all rounded-[20px] placeholder:text-slate-400 placeholder:italic text-slate-800 shadow-inner px-6",
                                                                "text-[var(--primary)]"
                                                            )}
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
                                                            "absolute right-5 bottom-0 -translate-y-[18px] text-[10px] font-black px-2 py-0.5 rounded-md border backdrop-blur-md",
                                                            newActivity.title.length > 80 ? "bg-red-50 text-red-600 border-red-100" : ("text-[var(--primary)]")
                                                        )}>
                                                            {newActivity.title.length}/100
                                                        </div>
 
                                                        {showSuggestions && (
                                                            <div className={cn("absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border shadow-2xl rounded-2xl z-[120] overflow-hidden animate-in slide-in-from-top-2 duration-300", "border-[var(--primary)]")}>
                                                                <div className={cn("p-3 border-b flex items-center gap-2", "text-[var(--primary)]")}>
                                                                    <Zap className={cn("w-3.5 h-3.5", "text-[var(--primary)]")} />
                                                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", "text-[var(--primary)]")}>Smart Suggestions</span>
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
                                                                                className={cn(
                                                                                    "w-full text-left px-4 py-3 text-[13px] font-bold text-slate-700 rounded-xl transition-all flex items-center gap-3 group/sug",
                                                                                    "text-[var(--primary)]"
                                                                                )}
                                                                            >
                                                                                <div className={cn("w-1.5 h-1.5 rounded-full group-hover/sug:bg-white/50", "bg-[var(--primary)]")} />
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
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1 px-1.5 bg-slate-50 rounded-lg">
                                                            <Clock className="w-3.5 h-3.5 text-black" />
                                                        </div>
                                                        <h3 className="text-[11px] font-black text-black uppercase tracking-[0.2em] font-playfair">Timing & Duration</h3>
                                                    </div>
                                                    <button
                                                        onClick={toggleAllDay}
                                                        className={cn(
                                                            "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95",
                                                            isAllDay
                                                                ? ("text-[var(--primary)]")
                                                                : ("text-[var(--primary)]")
                                                        )}
                                                    >
                                                        {isAllDay ? '✨ ALL DAY' : 'ALL DAY'}
                                                    </button>
                                                </div>

                                            <div className="bg-emerald-50/20 p-6 rounded-[28px] border border-white/60 space-y-6 relative overflow-hidden group/timing-container">
                                                <div className="grid grid-cols-2 gap-8 relative items-end">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="start-time" className="text-[10px] font-black text-emerald-700/40 uppercase tracking-widest ml-1">START TIME</Label>
                                                        <div className="relative group/time">
                                                            <Input
                                                                id="start-time"
                                                                type="time"
                                                                className="h-[56px] border-white/60 bg-white/40 backdrop-blur-md focus:border-emerald-400/50 transition-all pl-12 text-base font-black text-slate-800 rounded-[18px] shadow-sm"
                                                                value={newActivity.start_time}
                                                                onChange={(e) => {
                                                                    const startTime = e.target.value;
                                                                    let endTime = newActivity.end_time;
                                                                    let autoCalc = isAutoCalculated;

                                                                    if (startTime && activityDuration) {
                                                                        endTime = addMinutesToTime(startTime, activityDuration);
                                                                        autoCalc = true;
                                                                    } else if (!startTime) {
                                                                        endTime = '';
                                                                        autoCalc = false;
                                                                    }

                                                                    setNewActivity({ ...newActivity, start_time: startTime, end_time: endTime });
                                                                    setIsAutoCalculated(autoCalc);
                                                                }}
                                                            />
                                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-emerald-500/10 transition-colors group-focus-within/time:bg-emerald-500 group-focus-within/time:text-white text-emerald-600">
                                                                <Sun className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center">
                                                        <div className={cn("w-10 h-10 rounded-full bg-white border shadow-xl flex items-center justify-center animate-in zoom-in-0 duration-500 delay-300", "text-[var(--primary)]")}>
                                                            <ArrowRight className="w-5 h-5 animate-pulse" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="end-time" className="text-[10px] font-black text-emerald-700/40 uppercase tracking-widest ml-1">END TIME</Label>
                                                        <div className="relative group/time">
                                                            <Input
                                                                id="end-time"
                                                                type="time"
                                                                className="h-[56px] border-white/60 bg-white/40 backdrop-blur-md focus:border-emerald-400/50 transition-all pl-12 text-base font-black text-slate-800 rounded-[18px] shadow-sm"
                                                                value={newActivity.end_time}
                                                                onChange={(e) => {
                                                                    setNewActivity({ ...newActivity, end_time: e.target.value });
                                                                    setIsAutoCalculated(false);
                                                                }}
                                                            />
                                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/5 transition-colors group-focus-within/time:bg-black group-focus-within/time:text-white text-black">
                                                                <Sunset className="w-4 h-4" />
                                                            </div>
                                                            {isAutoCalculated && activityDuration && (
                                                                <p className={cn("absolute -bottom-5 left-1 text-[9px] font-medium italic animate-in fade-in slide-in-from-top-1 duration-300", "text-[var(--primary)]")}>
                                                                    ⚡ Calculated from activity duration ({formatDuration(activityDuration)})
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mr-1">Presets:</span>
                                                        <div className="flex gap-2">
                                                            {[1, 2, 3].map((h) => (
                                                                <button
                                                                    key={h}
                                                                    onClick={() => handlePresetTime(h)}
                                                                    className={cn(
                                                                        "px-4 py-1.5 rounded-full bg-white/40 border text-[11px] font-black transition-all shadow-sm active:scale-95",
                                                                        selectedTimeSlot 
                                                                            ? `border-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-100 text-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-700 hover:bg-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-500 hover:text-white hover:border-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-500`
                                                                            : "border-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
                                                                    )}
                                                                >
                                                                    +{h}H
                                                                </button>
                                                            ))}
                                                            <button
                                                                onClick={() => handlePresetTime(12)}
                                                                className={cn(
                                                                    "px-4 py-1.5 rounded-full border text-[11px] font-black transition-all shadow-sm active:scale-95",
                                                                    selectedTimeSlot
                                                                        ? `bg-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-50 border-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-200 text-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-600 hover:bg-gradient-to-r hover:from-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-500 hover:to-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-600 hover:text-white hover:border-transparent`
                                                                        : "bg-emerald-50 border border-emerald-200 text-[11px] font-black text-emerald-600 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-cyan-500 hover:text-white hover:border-transparent"
                                                                )}
                                                            >
                                                                HALF DAY
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {durationMinutes > 0 && (
                                                        <div className={cn("flex items-center gap-2.5 text-white px-5 py-2.5 rounded-full shadow-lg animate-in zoom-in-95 duration-500", "text-[var(--primary)]")}>
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
                                                    "w-full flex items-center justify-between p-5 rounded-[24px] border transition-all duration-500 active:scale-[0.98] group/adv",
                                                    showAdvancedOptions
                                                        ? ("text-[var(--primary)]")
                                                        : ("text-[var(--primary)]")
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "p-2.5 rounded-xl transition-all duration-700",
                                                        showAdvancedOptions 
                                                            ? ("bg-[var(--primary)] text-white shadow-[0_8px_20px_var(--primary)]")
                                                            : ("bg-[var(--primary)]/10 text-[var(--primary)] group-hover/adv:text-[var(--primary)]")
                                                    )}>
                                                        <Settings className={cn("w-5 h-5", showAdvancedOptions && "animate-spin-slow")} />
                                                    </div>
                                                    <span className="text-[12px] font-black uppercase tracking-[0.15em] font-playfair">Advanced Experience Customization</span>
                                                </div>
                                                <div className={cn(
                                                    "p-1.5 rounded-full transition-transform duration-500",
                                                    showAdvancedOptions ? "rotate-180 bg-white shadow-sm" : "bg-white/40 group-hover/adv:bg-white/60"
                                                )}>
                                                    <ChevronDown className={cn("w-5 h-5", "text-[var(--primary)]")} />
                                                </div>
                                            </button>
                                        </div>

                                        {showAdvancedOptions && (
                                            <div className="space-y-8 animate-in slide-in-from-top-4 duration-700">
                                                <div className="space-y-4">
                                                    <div className={cn("flex items-center gap-2 px-1 border-b pb-2", "border-[var(--primary)]")}>
                                                        <div className={cn("p-1.5 rounded-lg", "bg-[var(--primary)]")}>
                                                            <FileText className={cn("w-4 h-4", "text-[var(--primary)]")} />
                                                        </div>
                                                        <h3 className="text-[11px] font-black text-black uppercase tracking-[0.2em] font-playfair">Experience Narrative</h3>
                                                    </div>

                                                    <div className="relative overflow-hidden rounded-[24px] border border-white/60 focus-within:ring-4 focus-within:ring-emerald-400/5 focus-within:border-emerald-400/40 transition-all bg-white/30 backdrop-blur-md shadow-inner">
                                                        <div className="relative">
                                                            <Textarea
                                                                id="activity-description"
                                                                placeholder="Craft a compelling story for this experience..."
                                                                className="min-h-[160px] border-none focus-visible:ring-0 shadow-none text-base font-medium leading-relaxed p-6 bg-transparent resize-none overflow-hidden placeholder:text-slate-400 placeholder:italic text-slate-700"
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
                                                                "absolute right-4 bottom-4 text-[9px] font-black px-2 py-0.5 rounded-md border backdrop-blur-md",
                                                                newActivity.description.length > 450 ? "bg-red-50 text-red-600 border-red-100" : ("text-[var(--primary)]")
                                                            )}>
                                                                {newActivity.description.length}/500
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className={cn("flex items-center justify-between border-b pb-2 px-1", "border-[var(--primary)]")}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("p-1.5 rounded-lg", "bg-[var(--primary)]")}>
                                                                <ImageIcon className={cn("w-4 h-4", "text-[var(--primary)]")} />
                                                            </div>
                                                            <h3 className="text-[11px] font-black text-black uppercase tracking-[0.2em] font-playfair">Visual Gallery</h3>
                                                        </div>
                                                        <div className={cn("flex items-center gap-3 bg-white/40 px-3 py-1.5 rounded-full border backdrop-blur-md", "border-[var(--primary)]")}>
                                                            <span className={cn("text-[9px] font-black uppercase tracking-widest", "text-[var(--primary)]")}>Assets:</span>
                                                            <div className="w-16 h-1 bg-white/50 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn("h-full transition-all duration-700 ease-out", "bg-[var(--primary)]")}
                                                                    style={{ width: `${(newActivity.image_urls.filter(u => u).length / 5) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className={cn("text-[10px] font-black", "text-[var(--primary)]")}>{newActivity.image_urls.filter(u => u).length}/5</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-5">
                                                        <div
                                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                                            onDragLeave={() => setIsDragging(false)}
                                                            onDrop={handleDrop}
                                                            className={cn(
                                                                "relative group/dropzone border-2 border-dashed rounded-[24px] transition-all p-12 flex flex-col items-center justify-center gap-5 bg-white/20 shadow-inner overflow-hidden",
                                                                isDragging
                                                                    ? ("text-[var(--primary)]")
                                                                    : ("text-[var(--primary)]")
                                                            )}
                                                        >
                                                            <input
                                                                type="file"
                                                                multiple
                                                                accept="image/*"
                                                                onChange={handleFileChange}
                                                                className="absolute inset-0 opacity-0 cursor-pointer z-50"
                                                            />

                                                            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-emerald-500 to-cyan-400 shadow-xl shadow-emerald-500/30 flex items-center justify-center text-white group-hover/dropzone:scale-110 group-hover/dropzone:rotate-12 transition-all duration-700">
                                                                <Upload className="w-7 h-7" />
                                                            </div>

                                                            <div className="text-center space-y-2">
                                                                <p className="text-[16px] font-black text-slate-800 tracking-tight">Showcase the visual story</p>
                                                                <p className="text-[11px] text-emerald-700/40 font-bold uppercase tracking-[0.2em] italic">Drop images here or click to browse</p>
                                                            </div>

                                                            <div className="w-full max-w-[300px] relative mt-2 z-[60]">
                                                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                                    <Link className="w-3.5 h-3.5 text-emerald-500" />
                                                                </div>
                                                                <Input
                                                                    placeholder="PASTE ASSET URL HERE..."
                                                                    className="h-12 pl-12 text-[10px] font-black tracking-widest border-white/60 bg-white/50 focus:bg-white/80 focus:border-emerald-400 rounded-full shadow-inner placeholder:text-emerald-900/30"
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
                                                                <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-[70] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                                                                    <div className="w-full max-w-[240px] space-y-4">
                                                                        <div className="flex justify-between items-center text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                                                            <span>Optimizing Asset...</span>
                                                                            <span>{uploadProgress}%</span>
                                                                        </div>
                                                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50 shadow-inner">
                                                                            <div
                                                                                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(42,157,143,0.4)]"
                                                                                style={{ width: `${uploadProgress}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-5 gap-4 px-1">
                                                            {newActivity.image_urls.filter(url => url).map((url, index) => (
                                                                <div key={index} className="relative aspect-square group/thumb rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-white cursor-zoom-in transition-transform hover:scale-105 duration-500">
                                                                    <img
                                                                        src={url}
                                                                        alt={`Preview ${index}`}
                                                                        className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-1000"
                                                                        onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f1f5f9/94a3b8?text=INVALID+ASSET'}
                                                                    />
                                                                    <div className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover/thumb:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-[2px]">
                                                                        <button
                                                                            onClick={() => {
                                                                                const newUrls = newActivity.image_urls.filter((_, i) => i !== index);
                                                                                setNewActivity({ ...newActivity, image_urls: newUrls.length > 0 ? newUrls : [''] });
                                                                            }}
                                                                            className={cn(
                                                                                "w-10 h-10 bg-white rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:scale-110 transition-all shadow-xl active:scale-90",
                                                                                "text-[var(--primary)]"
                                                                            )}
                                                                        >
                                                                            <Trash2 className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {newActivity.image_urls.filter(url => url).length < 5 && (
                                                                <button
                                                                    className={cn(
                                                                        "aspect-square rounded-2xl border-2 border-dashed bg-white/10 flex flex-col items-center justify-center transition-all group/add-thumb active:scale-[0.96] duration-500",
                                                                        selectedTimeSlot 
                                                                            ? `border-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-200 text-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-300 hover:border-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-500 hover:text-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-500 hover:bg-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-50/50`
                                                                            : "border-emerald-200 text-emerald-300 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/50"
                                                                    )}
                                                                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                                                                >
                                                                    <Plus className="w-10 h-10 group-hover/add-thumb:rotate-90 group-hover/add-thumb:scale-110 transition-all duration-700" />
                                                                    <span className="text-[8px] font-black mt-1 uppercase tracking-widest opacity-0 group-hover/add-thumb:opacity-100 transition-opacity">ADD PHOTO</span>
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className={cn("flex items-start gap-4 p-5 rounded-[24px] backdrop-blur-md border", "text-[var(--primary)]")}>
                                                            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", "bg-[var(--primary)]")}>
                                                                <Zap className={cn("w-5 h-5", "text-[var(--primary)]")} />
                                                            </div>
                                                            <div className="flex-1 space-y-1">
                                                                <p className="text-[12px] font-black text-black uppercase tracking-widest">Premium Asset Tips</p>
                                                                <p className="text-[11px] text-black/60 font-medium leading-relaxed">High-resolution JPGs (up to 5MB) provide the best premium experience. We recommend 1920px wide visuals for optimal clarity.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>

                                    <div
                                        className="p-8 border-t border-slate-100 flex gap-4 bg-white/60 backdrop-blur-2xl"
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
                                            className={cn(
                                                "h-[56px] px-8 font-black uppercase tracking-widest border-2 rounded-full group transition-all",
                                                selectedTimeSlot 
                                                    ? `text-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-600 border-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-100 hover:bg-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-50/50`
                                                    : "text-emerald-600 border-emerald-100 hover:bg-emerald-50/50"
                                            )}
                                        >
                                            Cancel
                                            <span className={cn("ml-3 text-[10px] font-black px-2 py-1 rounded-lg border hidden sm:inline-block bg-white/20", "text-[var(--primary)]")}>ESC</span>
                                        </Button>
                                        <Button
                                            onClick={handleAddActivity}
                                            disabled={loading || !newActivity.title || isSuccess}
                                            className={cn(
                                                "flex-1 h-[56px] font-black uppercase tracking-widest transition-all active:scale-[0.98] group relative overflow-hidden rounded-full shadow-lg",
                                                isSuccess
                                                    ? "bg-emerald-500 text-white"
                                                    : (selectedTimeSlot 
                                                        ? `bg-gradient-to-r from-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-500 to-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-600 text-white shadow-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-500/30 hover:shadow-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-500/40`
                                                        : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-emerald-500/30 hover:shadow-emerald-500/40")
                                            )}
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
                                                        <span className="text-[10px] bg-white/20 px-2 py-1 rounded-lg border border-white/30 hidden sm:inline-block text-white backdrop-blur-md">ENTER</span>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Shimmer Effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:animate-shimmer-sweep" />
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </div>
    );
}
