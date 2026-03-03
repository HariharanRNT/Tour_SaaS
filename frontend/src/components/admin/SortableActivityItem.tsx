'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, X, Edit, Copy, ChevronDown, ChevronUp, MapPin, Clock } from 'lucide-react'
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

    const [expanded, setExpanded] = useState(false)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.5 : 1
    }

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

    const getActivityType = (title: string) => {
        const t = title.toLowerCase()
        if (t.includes('visit') || t.includes('temple') || t.includes('museum') || t.includes('heritage') || t.includes('walk')) return { accent: 'bg-violet-500', border: 'border-l-violet-500', icon: '🏛️' }
        if (t.includes('lunch') || t.includes('dinner') || t.includes('food') || t.includes('cafe') || t.includes('restaurant')) return { accent: 'bg-orange-500', border: 'border-l-orange-500', icon: '🍜' }
        if (t.includes('transfer') || t.includes('pick up') || t.includes('drop')) return { accent: 'bg-sky-500', border: 'border-l-sky-500', icon: '🚕' }
        if (t.includes('hotel') || t.includes('check-in') || t.includes('check in') || t.includes('arrival')) return { accent: 'bg-purple-500', border: 'border-l-purple-500', icon: '🏨' }
        return { accent: 'bg-emerald-500', border: 'border-l-emerald-500', icon: '✨' }
    }

    const { accent, border: borderClass, icon: typeIcon } = getActivityType(activity.title || '')

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                background: 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.65)',
                borderRadius: '16px',
            }}
            className={`relative shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group touch-none`}
        >
            {/* Left Color Accent Border */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent} rounded-l-2xl`} />

            <div className="flex items-start gap-3 p-4 pl-5">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="mt-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex flex-col gap-0.5 px-1 py-1 rounded-lg hover:bg-white/60 transition-colors flex-shrink-0"
                >
                    <GripVertical className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">{typeIcon}</span>
                        <h4 className="font-bold text-slate-800 leading-tight text-sm flex-1">{activity.title}</h4>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                        {(activity.start_time || activity.end_time) && (
                            <span className="flex items-center gap-1 font-medium text-slate-600 shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.40)', border: '1px solid rgba(255, 255, 255, 0.55)', borderRadius: '100px', padding: '4px 10px' }}>
                                <Clock className="w-3 h-3 text-violet-500" />
                                {activity.start_time || '?'} - {activity.end_time || '?'}
                                {duration && <span className="text-slate-400 font-normal">({duration})</span>}
                            </span>
                        )}
                        <span className="flex items-center gap-1 shadow-sm text-slate-500" style={{ background: 'rgba(255, 255, 255, 0.40)', border: '1px solid rgba(255, 255, 255, 0.55)', borderRadius: '100px', padding: '4px 10px' }}>
                            <MapPin className="w-3 h-3 text-rose-400" />
                            {activity.location || 'Location TBA'}
                        </span>
                        <span className="flex items-center gap-1 shadow-sm text-emerald-700 font-semibold" style={{ background: 'rgba(255, 255, 255, 0.40)', border: '1px solid rgba(255, 255, 255, 0.55)', borderRadius: '100px', padding: '4px 10px' }}>
                            <span className="text-emerald-500">₹</span>
                            {activity.price ? activity.price : 'Included'}
                        </span>
                    </div>

                    {/* Description */}
                    <div className="relative">
                        <p className={`text-xs text-slate-500 leading-relaxed transition-all duration-300 ${expanded ? '' : 'line-clamp-2'}`}>
                            {activity.description}
                        </p>
                        {activity.description && activity.description.length > 100 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
                                className="text-[11px] text-violet-600 hover:text-violet-800 font-semibold mt-1 flex items-center gap-1"
                            >
                                {expanded ? 'Show less' : 'Show more'}
                                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                        )}
                    </div>

                    {/* Feature tags */}
                    <div className="flex items-center gap-2 mt-2.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider rounded-full shadow-sm" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.35)', padding: '2px 8px' }}>✓ GUIDE</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider rounded-full shadow-sm" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.35)', padding: '2px 8px' }}>✓ TICKETS</span>
                    </div>

                    {/* Activity Images */}
                    {((Array.isArray(activity.image_url) && activity.image_url.length > 0) ||
                        (activity.image_urls && activity.image_urls.length > 0) ||
                        (activity.activities && activity.activities.length > 0) ||
                        (typeof activity.image_url === 'string' && activity.image_url)) && (
                            <div className="mt-3">
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
                                    className="w-20 h-14 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-white/60"
                                />
                            </div>
                        )}
                </div>
            </div>

            {/* Action Buttons — shown on hover */}
            <div className="flex flex-col gap-1 pr-2 pt-3 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-1">
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-violet-100 hover:text-violet-700 rounded-full bg-white/50"
                    onClick={() => onEdit(activity)}
                    title="Edit"
                >
                    <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-sky-100 hover:text-sky-700 rounded-full bg-white/50"
                    onClick={() => {
                        const duplicate = { ...activity, id: undefined, title: `${activity.title} (Copy)` }
                        onEdit(duplicate)
                    }}
                    title="Duplicate"
                >
                    <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-rose-100 hover:text-rose-600 rounded-full bg-white/50 border border-transparent shadow-sm hover:border-rose-200"
                    onClick={() => activity.id && onDelete(activity.id)}
                    title="Remove from slot"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
