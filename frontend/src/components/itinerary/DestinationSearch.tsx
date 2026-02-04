'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Loader2, MapPin, CheckCircle } from 'lucide-react'

interface LocationInfo {
    city: string
    country: string
    country_code: string
    latitude: number
    longitude: number
    formatted_address: string
}

interface DestinationSearchProps {
    onDestinationSelected: (destination: string, locationInfo: LocationInfo) => void
    loading: boolean
}

export function DestinationSearch({ onDestinationSelected, loading }: DestinationSearchProps) {
    const [searchInput, setSearchInput] = useState('')
    const [selectedDestination, setSelectedDestination] = useState<string | null>(null)

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchInput.trim()) {
            setSelectedDestination(searchInput.trim())
            // Call the parent component's handler to trigger API call
            onDestinationSelected(searchInput.trim(), {} as LocationInfo)
        }
    }

    const handleQuickSelect = (city: string) => {
        setSearchInput(city)
        setSelectedDestination(city)
        // Trigger the search immediately
        onDestinationSelected(city, {} as LocationInfo)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Choose Your Destination
                </CardTitle>
                <CardDescription>
                    Search for a city or destination to start planning your itinerary
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Enter destination (e.g., Singapore, Paris, Tokyo)..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="pl-10"
                                disabled={loading}
                            />
                        </div>
                        <Button type="submit" disabled={loading || !searchInput.trim()}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Searching...
                                </>
                            ) : (
                                'Search'
                            )}
                        </Button>
                    </div>

                    {selectedDestination && !loading && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Destination selected: {selectedDestination}
                        </div>
                    )}
                </form>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium mb-1">💡 Popular destinations:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {['Singapore', 'Paris', 'Tokyo', 'Dubai', 'New York', 'Barcelona'].map((city) => (
                            <Button
                                key={city}
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickSelect(city)}
                                disabled={loading}
                                className="text-xs"
                            >
                                {city}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
