'use client'

import { useState } from 'react'
import { Activity } from '@/types'
import { ActivityCard } from './ActivityCard'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'

interface ActivityBrowserProps {
    activities: Activity[]
    loading: boolean
    onAddToDay: (activity: Activity) => void
}

export function ActivityBrowser({ activities, loading, onAddToDay }: ActivityBrowserProps) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredActivities = activities.filter(activity =>
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-black mb-4" />
                <p className="text-lg font-bold text-black">Loading activities...</p>
            </div>
        )
    }

    if (activities.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-xl font-black text-black mb-2">No activities available</p>
                <p className="text-black font-bold">
                    Please search for a destination first
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="sticky top-0 bg-background z-10 pb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search activities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <p className="text-sm text-black font-bold mt-2">
                    {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'} available
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {filteredActivities.map((activity) => (
                    <ActivityCard
                        key={activity.id}
                        activity={activity}
                        onAddToDay={onAddToDay}
                        compact
                    />
                ))}
            </div>

            {filteredActivities.length === 0 && searchTerm && (
                <div className="text-center py-8">
                    <p className="text-black font-bold">
                        No activities match "{searchTerm}"
                    </p>
                </div>
            )}
        </div>
    )
}
