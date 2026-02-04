'use client'

import { TimeSlot } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sunrise, Sunset, Sun } from 'lucide-react'

interface TimeSlotSelectorProps {
    onSelect: (timeSlot: TimeSlot) => void
    onCancel: () => void
    occupiedSlots: TimeSlot[]
}

export function TimeSlotSelector({ onSelect, onCancel, occupiedSlots }: TimeSlotSelectorProps) {
    const slots: { value: TimeSlot; label: string; icon: React.ReactNode; description: string }[] = [
        {
            value: 'morning',
            label: 'Morning',
            icon: <Sunrise className="h-6 w-6 text-amber-500" />,
            description: '6 AM - 12 PM'
        },
        {
            value: 'evening',
            label: 'Evening',
            icon: <Sunset className="h-6 w-6 text-purple-500" />,
            description: '12 PM - 10 PM'
        },
        {
            value: 'full_day',
            label: 'Full Day',
            icon: <Sun className="h-6 w-6 text-orange-500" />,
            description: '6 AM - 10 PM (occupies both slots)'
        }
    ]

    const isSlotOccupied = (slot: TimeSlot) => {
        if (occupiedSlots.includes(slot)) return true
        // If full_day is occupied, morning and evening are also occupied
        if (occupiedSlots.includes('full_day') && (slot === 'morning' || slot === 'evening')) return true
        // If trying to select full_day but morning or evening is occupied
        if (slot === 'full_day' && (occupiedSlots.includes('morning') || occupiedSlots.includes('evening'))) return true
        return false
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Select Time Slot</CardTitle>
                    <CardDescription>
                        Choose when you'd like to schedule this activity
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {slots.map((slot) => {
                        const occupied = isSlotOccupied(slot.value)
                        return (
                            <Button
                                key={slot.value}
                                variant={occupied ? 'outline' : 'default'}
                                className="w-full h-auto py-4 justify-start"
                                onClick={() => !occupied && onSelect(slot.value)}
                                disabled={occupied}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    {slot.icon}
                                    <div className="text-left flex-1">
                                        <div className="font-semibold">{slot.label}</div>
                                        <div className="text-xs opacity-80">
                                            {occupied ? 'Already occupied' : slot.description}
                                        </div>
                                    </div>
                                </div>
                            </Button>
                        )
                    })}

                    <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
