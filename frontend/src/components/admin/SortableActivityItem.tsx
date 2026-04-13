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
        if (t.includes('lunch') || t.includes('dinner') || t.includes('food') || t.includes('cafe') || t.includes('restaurant')) return { accent: 'bg-black', border: 'border-l-black', icon: '🍜' }
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
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '16px' }}
            className={`relative shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group touch-none hover:translate-x-1`}
        >
            {/* Left Color Accent Border */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-black rounded-l-2xl`} />

            <div className="flex items-start gap-3 p-4 pl-5">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="mt-1 cursor-grab active:cursor-grabbing text-black/40 hover:text-black flex flex-col gap-0.5 px-1 py-1 rounded-lg hover:bg-white/30 transition-colors flex-shrink-0"
                >
                    <GripVertical className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">✨</span>
                        <h4 className="font-bold text-black leading-tight text-[15px] font-serif tracking-tight flex-1">{activity.title}</h4>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                        {(activity.start_time || activity.end_time) && (
                            <span className="flex items-center gap-1.5 font-bold text-black shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.20)', border: '1px solid rgba(255, 255, 255, 0.30)', borderRadius: '100px', padding: '4px 12px' }}>
                                <Clock className="w-3 h-3 text-black" />
                                {activity.start_time || '?'} - {activity.end_time || '?'}
                                {duration && <span className="text-black/60 font-medium">({duration})</span>}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 shadow-sm text-black font-bold" style={{ background: 'rgba(255, 255, 255, 0.20)', border: '1px solid rgba(255, 255, 255, 0.30)', borderRadius: '100px', padding: '4px 12px' }}>
                            <MapPin className="w-3 h-3 text-black" />
                            {activity.location || 'Location TBA'}
                        </span>
                        {activity.is_optional && (
                            <span className="flex items-center gap-1 shadow-sm text-teal-700 font-black tracking-widest text-[9px]" style={{ background: 'rgba(20, 184, 166, 0.15)', border: '1px solid rgba(20, 184, 166, 0.30)', borderRadius: '100px', padding: '4px 10px' }}>
                                <span className="text-teal-600">●</span>
                                OPTIONAL
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="relative">
                        <p className={`text-xs text-slate-900 leading-relaxed transition-all duration-300 ${expanded ? '' : 'line-clamp-2'}`}>
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
                    <div className="flex items-center gap-2 mt-3">
                        <span className="text-[9px] uppercase font-black tracking-widest rounded-full shadow-sm" style={{ background: 'rgba(16, 185, 129, 0.10)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.20)', padding: '3px 10px' }}>✓ GUIDE</span>
                        <span className="text-[9px] uppercase font-black tracking-widest rounded-full shadow-sm" style={{ background: 'rgba(16, 185, 129, 0.10)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.20)', padding: '3px 10px' }}>✓ TICKETS</span>
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
                    className="h-8 w-8 p-0 hover:bg-black/10 hover:text-black rounded-xl bg-white/20 transition-all duration-300"
                    onClick={() => onEdit(activity)}
                    title="Edit"
                >
                    <Edit className="h-4 w-4" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-sky-100/50 hover:text-sky-700 rounded-xl bg-white/20 transition-all duration-300"
                    onClick={() => {
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
                    className="h-8 w-8 p-0 hover:bg-rose-100/50 hover:text-rose-600 rounded-xl bg-white/20 border border-transparent transition-all duration-300 shadow-sm hover:border-rose-200"
                    onClick={() => activity.id && onDelete(activity.id)}
                    title="Remove from slot"
                >
                    <X className="h-4.5 w-4.5" />
                </Button>
            </div>
        </div>
    )
}
