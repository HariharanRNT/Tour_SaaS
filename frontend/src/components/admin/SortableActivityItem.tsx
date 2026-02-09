'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Edit, Copy, ChevronDown, ChevronUp, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActivityImageGallery } from '@/components/ui/activity-image-gallery'

interface SortableActivityItemProps {
    activity: any
    config: any
    idx: number
    onDelete: (id: string) => void
    onEdit: (activity: any) => void
}

export function SortableActivityItem({ activity, config, idx, onDelete, onEdit }: SortableActivityItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: activity.id || `temp-${idx}` })

    // State for description expansion
    const [expanded, setExpanded] = useState(false)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.5 : 1
    }

    // Helper to calculate duration from time strings (HH:mm)
    const getDuration = (start?: string, end?: string) => {
        if (!start || !end) return null
        try {
            const [h1, m1] = start.split(':').map(Number)
            const [h2, m2] = end.split(':').map(Number)
            const diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1)
            if (diffMinutes <= 0) return null
            const hours = Math.floor(diffMinutes / 60)
            const mins = diffMinutes % 60
            return `${hours > 0 ? `${hours}h` : ''} ${mins > 0 ? `${mins}m` : ''}`.trim()
        } catch (e) {
            return null
        }
    }

    const duration = getDuration(activity.start_time, activity.end_time)

    // Determine activity type color/icon (mock logic based on keywords or default)
    const getActivityType = (title: string) => {
        const t = title.toLowerCase()
        if (t.includes('visit') || t.includes('temple') || t.includes('museum')) return { color: 'border-l-indigo-500', icon: '🏛️' }
        if (t.includes('lunch') || t.includes('dinner') || t.includes('food')) return { color: 'border-l-orange-500', icon: '🍜' }
        if (t.includes('transfer') || t.includes('pick up') || t.includes('drop')) return { color: 'border-l-blue-500', icon: '🚕' }
        if (t.includes('hotel') || t.includes('check-in')) return { color: 'border-l-purple-500', icon: '🏨' }
        return { color: 'border-l-emerald-500', icon: '✨' }
    }

    const { color: borderClass, icon: typeIcon } = getActivityType(activity.title || '')

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative pl-0 rounded-lg border border-gray-200 flex items-start justify-between group touch-none hover:shadow-md transition-all duration-200 bg-white overflow-hidden`}
        >
            {/* Left Color Border */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderClass.replace('border-l-', 'bg-')}`} />

            <div className="flex items-start gap-3 flex-1 p-4 pl-5">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex flex-col gap-0.5 px-1 py-1 rounded hover:bg-gray-100"
                >
                    <GripVertical className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1 w-full">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{typeIcon}</span>
                                <h4 className="font-bold text-gray-900 leading-tight text-base">{activity.title}</h4>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 mt-2">
                                {(activity.start_time || activity.end_time) && (
                                    <span className="flex items-center gap-1 font-medium bg-gray-50 px-2 py-1 rounded text-gray-700 border border-gray-100 shadow-sm">
                                        <Clock className="w-3 h-3 text-indigo-500" />
                                        {activity.start_time || '?'} - {activity.end_time || '?'}
                                        {duration && <span className="text-gray-400 font-normal">({duration})</span>}
                                    </span>
                                )}
                                <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                    <MapPin className="w-3 h-3 text-red-500" />
                                    {activity.location || 'Location TBA'}
                                </span>
                                <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                    <span className="text-emerald-600 font-bold">₹</span>
                                    {activity.price ? activity.price : 'Included'}
                                </span>
                            </div>

                            <div className="relative group/desc">
                                <p
                                    className={`text-sm text-gray-600 mt-2 transition-all duration-300 ${expanded ? '' : 'line-clamp-2'}`}
                                >
                                    {activity.description}
                                </p>
                                {activity.description && activity.description.length > 100 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1 flex items-center gap-1"
                                    >
                                        {expanded ? 'Show less' : 'Show more'}
                                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                )}
                            </div>

                            {/* Features / Tags */}
                            <div className="flex items-center gap-2 mt-3">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm">✓ Guide</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm">✓ Tickets</span>
                            </div>
                        </div>
                    </div>

                    {((Array.isArray(activity.image_url) && activity.image_url.length > 0) ||
                        (activity.image_urls && activity.image_urls.length > 0) ||
                        (activity.activities && activity.activities.length > 0) ||
                        (typeof activity.image_url === 'string' && activity.image_url)) && (
                            <div className="mt-4">
                                <ActivityImageGallery
                                    images={
                                        (Array.isArray(activity.image_url) && activity.image_url.length > 0)
                                            ? activity.image_url
                                            : (activity.image_urls && activity.image_urls.length > 0)
                                                ? activity.image_urls
                                                : (activity.activities && activity.activities.length > 0)
                                                    ? activity.activities
                                                    : (typeof activity.image_url === 'string' && activity.image_url)
                                                        ? [activity.image_url]
                                                        : []
                                    }
                                    title={activity.title}
                                    className="w-24 h-16 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                                />
                            </div>
                        )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1 pr-2 pt-4 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-1">
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 rounded-full"
                    onClick={() => onEdit(activity)}
                    title="Edit"
                >
                    <Edit className="h-4 w-4" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-indigo-50 hover:text-indigo-600 rounded-full"
                    onClick={() => {
                        // Duplicate logic: Call onEdit but with cleared ID to treat as new
                        const duplicate = { ...activity, id: undefined, title: `${activity.title} (Copy)` }
                        onEdit(duplicate)
                    }}
                    title="Duplicate"
                >
                    <Copy className="h-4 w-4" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 rounded-full"
                    onClick={() => activity.id && onDelete(activity.id)}
                    title="Delete"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
