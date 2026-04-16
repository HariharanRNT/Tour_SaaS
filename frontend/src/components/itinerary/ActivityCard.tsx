'use client'

import { useState } from 'react'
import { Activity } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActivityDetailsModal } from './ActivityDetailsModal'
import Image from 'next/image'
import { MapPin, Clock, Star, Plus } from 'lucide-react'

interface ActivityCardProps {
    activity: Activity
    onAddToDay: (activity: Activity) => void
    compact?: boolean
}

export function ActivityCard({ activity, onAddToDay, compact = false }: ActivityCardProps) {
    const [showDetails, setShowDetails] = useState(false)
    const hasImage = activity.images && activity.images.length > 0

    return (
        <>
            <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
                {hasImage ? (
                    <div
                        className="relative aspect-video rounded-t-lg overflow-hidden cursor-pointer group"
                        onClick={() => setShowDetails(true)}
                    >
                        <Image
                            src={activity.images[0]}
                            alt={activity.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            unoptimized
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-semibold">
                                View Details
                            </span>
                        </div>
                    </div>
                ) : (
                    <div
                        className="aspect-video bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] rounded-t-lg flex items-center justify-center cursor-pointer"
                        onClick={() => setShowDetails(true)}
                    >
                        <MapPin className="h-16 w-16 text-white" />
                    </div>
                )}

                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className={`line-clamp-2 ${compact ? 'text-base' : 'text-lg'}`}>
                            {activity.title}
                        </CardTitle>
                        {activity.rating > 0 && (
                            <div className="flex items-center gap-1 text-sm font-semibold shrink-0">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                {activity.rating.toFixed(1)}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        {activity.category && (
                            <Badge variant="secondary" className="text-xs">
                                {activity.category}
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.duration || 'Flexible'}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col pt-0">
                    <p className="text-sm text-black font-semibold line-clamp-2 mb-4 flex-1">
                        {activity.description.replace(/<[^>]*>/g, '').substring(0, 120)}...
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                            <p className="text-xl font-bold text-black font-display">
                                {activity.currency} {activity.price_per_person}
                            </p>
                            <p className="text-xs text-black font-bold uppercase tracking-wider">per person</p>
                        </div>
                        <Button
                            onClick={() => onAddToDay(activity)}
                            size="sm"
                            className="gap-1"
                        >
                            <Plus className="h-4 w-4" />
                            Add to Day
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <ActivityDetailsModal
                activity={activity}
                open={showDetails}
                onOpenChange={setShowDetails}
                onAddToDay={onAddToDay}
            />
        </>
    )
}
