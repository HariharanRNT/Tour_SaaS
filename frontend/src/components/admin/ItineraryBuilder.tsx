'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActivityImageGallery } from '@/components/ui/activity-image-gallery'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit, Trash2, Sun, Cloud, Sunset, Moon, GripVertical } from 'lucide-react'
import { getValidImageUrl } from '@/lib/utils/image'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableActivityItem } from './SortableActivityItem'

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
}

interface ItineraryBuilderProps {
    packageId: string
    durationDays: number
}

const timeSlotConfig = {
    morning: { icon: Sun, label: 'Morning', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    afternoon: { icon: Cloud, label: 'Afternoon', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    evening: { icon: Sunset, label: 'Evening', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    night: { icon: Moon, label: 'Night', color: 'text-purple-600', bgColor: 'bg-purple-50' }
}

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

    useEffect(() => {
        loadItinerary()
    }, [packageId])

    const loadItinerary = async () => {
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
                    night: day.night || []
                }
            })

            setActivities(organized)
        } catch (error) {
            console.error('Failed to load itinerary:', error)
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
                setNewActivity({ title: '', description: '', image_urls: [''], start_time: '', end_time: '' })
                setCurrentImageUrl('')
                setShowAddForm(false)
                setSelectedTimeSlot('')
                setEditingId(null)
                loadItinerary()
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
            night: []
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

    const getMaxDisplayOrder = (day: number, slot: string): number => {
        const items = activities[day]?.[slot as keyof DayActivities] || []
        if (items.length === 0) return 0
        return Math.max(...items.map(i => i.display_order || 0)) + 1
    }

    const handleEditActivity = (activity: any) => {
        // Prepare form with activity data
        // Determine day and slot if not present (usually present in parent context)
        // But here activity is just the item. We need to find its metadata if missing.
        // Thankfully we render based on slot so we know it if we pass it, but `SortableActivityItem` calls this.
        // We'll rely on what's passed.

        setNewActivity({
            title: activity.title,
            description: activity.description || '',
            image_urls: (Array.isArray(activity.image_url) && activity.image_url.length > 0)
                ? activity.image_url
                : (activity.activities && activity.activities.length > 0)
                    ? activity.activities
                    : (typeof activity.image_url === 'string' && activity.image_url ? [activity.image_url] : ['']),
            start_time: activity.start_time || '',
            end_time: activity.end_time || ''
        })

        // Setup editing state
        setEditingId(activity.id)

        // We need to set the correct day and time slot to show the form correctly
        // The modal title uses `selectedTimeSlot` and `currentDay`
        // We might need to look up which day/slot this activity belongs to if not passed
        // But `ItineraryBuilder` uses tabs for days. `currentDay` is likely correct if the user is viewing that day.
        // `selectedTimeSlot` needs to be set.

        // Find the slot for this activity
        let foundSlot = ''
        const dayData = activities[currentDay]
        if (dayData) {
            for (const [slot, items] of Object.entries(dayData)) {
                if ((items as Activity[]).some(item => item.id === activity.id)) {
                    foundSlot = slot
                    break
                }
            }
        }

        // If we can't find it easily (e.g. diff day), just use what we have or default
        if (foundSlot) setSelectedTimeSlot(foundSlot)
        else setSelectedTimeSlot(activity.time_slot || 'morning') // Fallback

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
            <CardContent>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <Tabs value={`day-${currentDay}`} onValueChange={(v) => setCurrentDay(parseInt(v.split('-')[1]))}>
                        <TabsList className="w-full flex-wrap h-auto">
                            {days.map((day) => (
                                <TabsTrigger key={day} value={`day-${day}`}>
                                    Day {day}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {days.map((day) => {
                            const dayActivities = getDayActivities(day)

                            return (
                                <TabsContent key={day} value={`day-${day}`} className="mt-6 space-y-6">
                                    {Object.entries(timeSlotConfig).map(([slot, config]) => {
                                        const slotActivities = dayActivities[slot as keyof DayActivities]
                                        const Icon = config.icon

                                        return (
                                            <div key={slot} className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Icon className={`h-5 w-5 ${config.color}`} />
                                                        <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedTimeSlot(slot)
                                                            setShowAddForm(true)
                                                        }}
                                                    >
                                                        <Plus className="h-4 w-4 mr-1" />
                                                        Add Activity
                                                    </Button>
                                                </div>

                                                <div className="ml-7">
                                                    <SortableContext
                                                        id={`${day}-${slot}`}
                                                        items={slotActivities.map(a => a.id || 'temp').filter(id => id !== 'temp') as string[]}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        {slotActivities && slotActivities.length > 0 ? (
                                                            <div className="space-y-2">
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
                                                            <p className="text-sm text-gray-500">No activities added yet</p>
                                                        )}
                                                    </SortableContext>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </TabsContent>
                            )
                        })}
                    </Tabs>
                </DndContext>

                {/* Add Activity Modal */}
                {showAddForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <Card className="w-full max-w-md max-h-[90vh] flex flex-col">
                            <CardHeader>
                                <CardTitle>{editingId ? 'Edit Activity' : 'Add Activity'}</CardTitle>
                                <CardDescription>
                                    {editingId ? 'Edit activity details' : `Add a new activity to ${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig]?.label} on Day ${currentDay}`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 overflow-y-auto">
                                <div className="space-y-2">
                                    <Label htmlFor="activity-title">Activity Title</Label>
                                    <Input
                                        id="activity-title"
                                        placeholder="e.g., Visit Tokyo Tower"
                                        value={newActivity.title}
                                        onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="start-time">Start Time</Label>
                                        <Input
                                            id="start-time"
                                            type="time"
                                            value={newActivity.start_time}
                                            onChange={(e) => setNewActivity({ ...newActivity, start_time: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="end-time">End Time</Label>
                                        <Input
                                            id="end-time"
                                            type="time"
                                            value={newActivity.end_time}
                                            onChange={(e) => setNewActivity({ ...newActivity, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="activity-description">Description</Label>
                                    <Textarea
                                        id="activity-description"
                                        placeholder="Describe the activity..."
                                        value={newActivity.description}
                                        onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                                        rows={4}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Image URLs (Optional - Max 5)</Label>
                                    <div className="space-y-2">
                                        {newActivity.image_urls.map((url, index) => (
                                            <div key={index} className="flex gap-2">
                                                <Input
                                                    placeholder="https://example.com/image.jpg"
                                                    value={url}
                                                    onChange={(e) => {
                                                        const newUrls = [...newActivity.image_urls]
                                                        newUrls[index] = e.target.value
                                                        setNewActivity({ ...newActivity, image_urls: newUrls })
                                                    }}
                                                />
                                                {newActivity.image_urls.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            const newUrls = newActivity.image_urls.filter((_, i) => i !== index)
                                                            setNewActivity({ ...newActivity, image_urls: newUrls })
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}

                                        {newActivity.image_urls.length < 5 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setNewActivity({
                                                        ...newActivity,
                                                        image_urls: [...newActivity.image_urls, '']
                                                    })
                                                }}
                                                className="w-full"
                                            >
                                                <Plus className="h-4 w-4 mr-2" /> Add Another URL
                                            </Button>
                                        )}
                                    </div>

                                    {newActivity.image_urls.some(url => url) && (
                                        <div className="mt-2 text-left">
                                            <ActivityImageGallery
                                                images={newActivity.image_urls.filter(url => url)}
                                                title="Preview"
                                                className="w-32 h-20"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowAddForm(false)
                                            setNewActivity({ title: '', description: '', image_urls: [''], start_time: '', end_time: '' })
                                            setCurrentImageUrl('')
                                            setSelectedTimeSlot('')
                                            setEditingId(null)
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button onClick={handleAddActivity} disabled={loading}>
                                        {loading ? 'Saving...' : (editingId ? 'Update Activity' : 'Add Activity')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
