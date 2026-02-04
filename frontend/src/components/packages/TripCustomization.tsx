import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Plane, Hotel, Car } from 'lucide-react'

interface TripCustomizationProps {
    includeFlights: boolean
    includeHotels: boolean
    includeTransfers: boolean
    onFlightsChange: (checked: boolean) => void
    onHotelsChange: (checked: boolean) => void
    onTransfersChange: (checked: boolean) => void
}

export function TripCustomization({
    includeFlights,
    includeHotels,
    includeTransfers,
    onFlightsChange,
    onHotelsChange,
    onTransfersChange
}: TripCustomizationProps) {
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                    <Plane className="mr-3 h-6 w-6" />
                    Customize Your Trip
                </CardTitle>
                <CardDescription className="text-base">
                    Select additional services to include in your itinerary
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <Checkbox
                        id="flights"
                        checked={includeFlights}
                        onCheckedChange={onFlightsChange}
                        className="h-5 w-5"
                    />
                    <label
                        htmlFor="flights"
                        className="flex items-center text-lg font-medium cursor-pointer flex-1"
                    >
                        <Plane className="mr-3 h-5 w-5 text-blue-600" />
                        Include Flights
                    </label>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                        <Checkbox
                            id="hotels"
                            checked={includeHotels}
                            onCheckedChange={onHotelsChange}
                            className="h-5 w-5"
                        />
                        <label
                            htmlFor="hotels"
                            className="flex items-center text-lg font-medium cursor-pointer flex-1"
                        >
                            <Hotel className="mr-3 h-5 w-5 text-green-600" />
                            Include Hotels
                        </label>
                    </div>
                    {includeHotels && (
                        <div className="ml-2 md:ml-12 mr-2 p-3 bg-green-50 rounded-md border border-green-100 text-sm animate-in fade-in slide-in-from-top-2">
                            <p className="text-green-800 mb-2">
                                Hotel recommendations will be included in your itinerary based on your destination and travel dates.
                            </p>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-200 text-green-800">
                                Coming Soon
                            </span>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                        <Checkbox
                            id="transfers"
                            checked={includeTransfers}
                            onCheckedChange={onTransfersChange}
                            className="h-5 w-5"
                        />
                        <label
                            htmlFor="transfers"
                            className="flex items-center text-lg font-medium cursor-pointer flex-1"
                        >
                            <Car className="mr-3 h-5 w-5 text-purple-600" />
                            Include Transfers
                        </label>
                    </div>
                    {includeTransfers && (
                        <div className="ml-2 md:ml-12 mr-2 p-3 bg-purple-50 rounded-md border border-purple-100 text-sm animate-in fade-in slide-in-from-top-2">
                            <p className="text-purple-800 mb-2">
                                Airport and city transfers will be included in your itinerary for convenient transportation.
                            </p>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-200 text-purple-800">
                                Coming Soon
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
