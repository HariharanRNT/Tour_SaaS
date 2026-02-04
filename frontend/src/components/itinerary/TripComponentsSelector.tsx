'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plane, Hotel, Car, MapPin } from 'lucide-react'

interface TripComponents {
    includeFlights: boolean
    includeHotels: boolean
    includeTransfers: boolean
    flightOrigin?: string
}

interface TripComponentsSelectorProps {
    components: TripComponents
    onComponentsChange: (components: TripComponents) => void
}

export function TripComponentsSelector({ components, onComponentsChange }: TripComponentsSelectorProps) {
    const [originInput, setOriginInput] = useState(components.flightOrigin || '')

    const handleFlightsChange = (checked: boolean) => {
        onComponentsChange({
            ...components,
            includeFlights: checked,
            flightOrigin: checked ? originInput : undefined
        })
    }

    const handleOriginChange = (value: string) => {
        setOriginInput(value)
        if (components.includeFlights) {
            onComponentsChange({
                ...components,
                flightOrigin: value
            })
        }
    }

    const handleQuickSelectOrigin = (city: string) => {
        setOriginInput(city)
        onComponentsChange({
            ...components,
            flightOrigin: city
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5" />
                    Customize Your Trip
                </CardTitle>
                <CardDescription>
                    Select additional services to include in your itinerary
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Flights Option */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="flights"
                            checked={components.includeFlights}
                            onCheckedChange={handleFlightsChange}
                        />
                        <Label
                            htmlFor="flights"
                            className="text-base font-semibold cursor-pointer flex items-center gap-2"
                        >
                            <Plane className="h-4 w-4" />
                            Include Flights
                        </Label>
                    </div>

                    {components.includeFlights && (
                        <div className="ml-7 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                            <Label htmlFor="origin" className="text-sm font-medium">
                                Where are you flying from?
                            </Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="origin"
                                        placeholder="Enter city or airport (e.g., New York, JFK)"
                                        value={originInput}
                                        onChange={(e) => handleOriginChange(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Popular origins:</p>
                                <div className="flex flex-wrap gap-2">
                                    {['New York', 'London', 'Dubai', 'Singapore', 'Tokyo', 'Los Angeles'].map((city) => (
                                        <Button
                                            key={city}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleQuickSelectOrigin(city)}
                                            className="text-xs"
                                        >
                                            {city}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {originInput && (
                                <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                                    <Plane className="h-4 w-4" />
                                    Flying from: <strong>{originInput}</strong>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Hotels Option */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="hotels"
                            checked={components.includeHotels}
                            onCheckedChange={(checked: boolean) =>
                                onComponentsChange({ ...components, includeHotels: checked })
                            }
                        />
                        <Label
                            htmlFor="hotels"
                            className="text-base font-semibold cursor-pointer flex items-center gap-2"
                        >
                            <Hotel className="h-4 w-4" />
                            Include Hotels
                        </Label>
                    </div>

                    {components.includeHotels && (
                        <div className="ml-7 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                Hotel recommendations will be included in your itinerary based on your destination and travel dates.
                            </p>
                            <Badge variant="secondary" className="mt-2">
                                Coming Soon
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Transfers Option */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="transfers"
                            checked={components.includeTransfers}
                            onCheckedChange={(checked: boolean) =>
                                onComponentsChange({ ...components, includeTransfers: checked })
                            }
                        />
                        <Label
                            htmlFor="transfers"
                            className="text-base font-semibold cursor-pointer flex items-center gap-2"
                        >
                            <Car className="h-4 w-4" />
                            Include Transfers
                        </Label>
                    </div>

                    {components.includeTransfers && (
                        <div className="ml-7 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                Airport and city transfers will be included in your itinerary for convenient transportation.
                            </p>
                            <Badge variant="secondary" className="mt-2">
                                Coming Soon
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Summary */}
                {(components.includeFlights || components.includeHotels || components.includeTransfers) && (
                    <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Selected Services:</p>
                        <div className="flex flex-wrap gap-2">
                            {components.includeFlights && (
                                <Badge variant="default" className="flex items-center gap-1">
                                    <Plane className="h-3 w-3" />
                                    Flights {originInput && `from ${originInput}`}
                                </Badge>
                            )}
                            {components.includeHotels && (
                                <Badge variant="default" className="flex items-center gap-1">
                                    <Hotel className="h-3 w-3" />
                                    Hotels
                                </Badge>
                            )}
                            {components.includeTransfers && (
                                <Badge variant="default" className="flex items-center gap-1">
                                    <Car className="h-3 w-3" />
                                    Transfers
                                </Badge>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
