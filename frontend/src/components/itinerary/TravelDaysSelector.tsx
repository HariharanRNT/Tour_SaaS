'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

interface TravelDaysSelectorProps {
    numberOfDays: number
    onDaysChange: (days: number) => void
}

export function TravelDaysSelector({ numberOfDays, onDaysChange }: TravelDaysSelectorProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Select Travel Duration
                </CardTitle>
                <CardDescription>
                    How many days will your trip be?
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Label htmlFor="days-select">Number of Days</Label>
                    <Select
                        value={numberOfDays.toString()}
                        onValueChange={(value) => onDaysChange(parseInt(value))}
                    >
                        <SelectTrigger id="days-select">
                            <SelectValue placeholder="Select number of days" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                                <SelectItem key={day} value={day.toString()}>
                                    {day} {day === 1 ? 'Day' : 'Days'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {numberOfDays > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                            You'll be planning activities for {numberOfDays} {numberOfDays === 1 ? 'day' : 'days'}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
