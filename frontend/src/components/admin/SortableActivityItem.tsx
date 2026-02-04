'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Edit } from 'lucide-react'
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

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.5 : 1
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`p-4 rounded-lg border ${config.bgColor} flex items-start justify-between group touch-none`}
        >
            <div className="flex items-start gap-3 flex-1">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                >
                    <GripVertical className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                        {(activity.start_time || activity.end_time) && (
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {activity.start_time || '?'} - {activity.end_time || '?'}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    {((Array.isArray(activity.image_url) && activity.image_url.length > 0) ||
                        (activity.image_urls && activity.image_urls.length > 0) ||
                        (activity.activities && activity.activities.length > 0) ||
                        (typeof activity.image_url === 'string' && activity.image_url)) && (
                            <div className="mt-2">
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
                                    className="w-24 h-16"
                                />
                            </div>
                        )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(activity)}
                >
                    <Edit className="h-4 w-4 text-blue-600" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => activity.id && onDelete(activity.id)}
                >
                    <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
            </div>
        </div>
    )
}
