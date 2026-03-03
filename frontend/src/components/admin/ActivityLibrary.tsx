'use client'

import { useState, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search, MapPin, Clock, Plus, Filter, LayoutGrid, List as ListIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { activitiesAPI } from '@/lib/api'
import { Activity } from '@/types/activities'
import { cn } from '@/lib/utils'

interface ActivityDraggableCardProps {
    activity: Activity
}

function ActivityDraggableCard({ activity }: ActivityDraggableCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `library-${activity.id}`,
        data: {
            type: 'library-activity',
            activity
        }
    })

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
    } : undefined

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "group relative bg-white/40 backdrop-blur-md border border-white/60 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-indigo-300",
                isDragging && "opacity-50 scale-95 shadow-2xl ring-2 ring-indigo-500 border-transparent"
            )}
        >
            <div className="flex gap-3">
                {(activity.images && activity.images.length > 0) ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-white/40">
                        <img
                            src={activity.images[0].image_url}
                            alt={activity.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-16 h-16 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                        <LayoutGrid className="w-6 h-6 text-indigo-200" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate mb-1">{activity.name}</h4>
                    <div className="flex flex-wrap gap-1 items-center">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-medium bg-white/50 border-white/80">
                            {activity.category}
                        </Badge>
                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {activity.duration_hours}h
                        </span>
                    </div>
                    {activity.price_per_person && (
                        <div className="mt-1 text-[10px] font-bold text-indigo-600">
                            ₹{activity.price_per_person.toLocaleString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity rounded-xl flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-[9px] font-bold text-indigo-600 shadow-sm border border-indigo-100 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    Drag to Itinerary
                </div>
            </div>
        </div>
    )
}

interface ActivityLibraryProps {
    onAddActivity?: (activity: Activity) => void
    currentCity?: string
}

export function ActivityLibrary({ onAddActivity, currentCity }: ActivityLibraryProps) {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('All')

    const categories = ['All', 'Sightseeing', 'Adventure', 'Cultural', 'Food', 'Beach', 'Nature', 'Wellness']

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
        }, 500)

        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => {
        const fetchActivities = async () => {
            if (debouncedSearchQuery.length > 0 && debouncedSearchQuery.length < 3) {
                setActivities([])
                return
            }

            setLoading(true)
            try {
                // Fetch with city filter if we have a valid search or if a specific city tab is selected
                // (Currently, currentCity acts as a global filter from the parent component)
                const data = await activitiesAPI.getAll({
                    city: currentCity === 'All Cities' ? undefined : currentCity
                })
                setActivities(data)
            } catch (error) {
                console.error('Failed to fetch activities:', error)
            } finally {
                setLoading(false)
            }
        }

        // Only fetch if search is empty or has at least 3 chars
        if (debouncedSearchQuery.length === 0 || debouncedSearchQuery.length >= 3) {
            fetchActivities()
        } else {
            setActivities([]) // clear on 1-2 chars
        }
    }, [currentCity, debouncedSearchQuery])

    const filteredActivities = debouncedSearchQuery.length >= 3 ? activities.filter(activity => {
        const searchLower = debouncedSearchQuery.toLowerCase()
        const matchesSearch = (activity.destination_city || '').toLowerCase().includes(searchLower) ||
            activity.name.toLowerCase().includes(searchLower) ||
            (activity.description && activity.description.toLowerCase().includes(searchLower))
        const matchesCategory = selectedCategory === 'All' || activity.category === selectedCategory
        return matchesSearch && matchesCategory
    }) : []

    return (
        <div className="flex flex-col h-full bg-slate-50/50 backdrop-blur-xl border-r border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white/40">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Activity Library</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Drag activities into your itinerary</p>
                    </div>
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <LayoutGrid className="w-4 h-4" />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                            placeholder="Search activities..."
                            className="pl-9 h-9 text-xs bg-white/60 border-slate-200 focus:bg-white transition-all shadow-sm rounded-lg"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border",
                                    selectedCategory === cat
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                        : "bg-white/60 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : debouncedSearchQuery.length < 3 ? (
                    <div className="text-center py-12 opacity-60 flex flex-col items-center">
                        <div className="w-14 h-14 bg-slate-100/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                            <MapPin className="w-6 h-6 text-indigo-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-600">Search a destination</p>
                        <p className="text-xs text-slate-500 mt-1">Type at least 3 characters</p>
                    </div>
                ) : filteredActivities.length > 0 ? (
                    filteredActivities.map(activity => (
                        <ActivityDraggableCard key={activity.id} activity={activity} />
                    ))
                ) : (
                    <div className="text-center py-12 opacity-60 flex flex-col items-center px-4">
                        <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                            <Search className="w-6 h-6 text-rose-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-600">No activities found.</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                            Create activities for this destination in Activity Master first.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer / Create New shortcut */}
            <div className="p-4 bg-white/40 border-t border-slate-200">
                <Button
                    variant="outline"
                    className="w-full h-9 text-[11px] font-bold gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg shadow-sm"
                    onClick={() => window.open('/agent/activities', '_blank')}
                >
                    <Plus className="w-3.5 h-3.5" />
                    Create New Activity Master
                </Button>
            </div>
        </div>
    )
}
