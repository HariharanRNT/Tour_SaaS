import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PassengerCounter } from './PassengerCounter'
import { Calendar, Plane, Hotel, Car } from 'lucide-react'

export interface SearchFilters {
    destination: string
    includeFlights: boolean
    includeHotels: boolean
    includeTransfers: boolean
    startDate: string
    duration: number
    adults: number
    children: number
    infants: number
}

interface SearchFiltersProps {
    filters: SearchFilters
    onFilterChange: (filters: SearchFilters) => void
    onSearch: () => void
    onClear: () => void
}

export function SearchFiltersComponent({
    filters,
    onFilterChange,
    onSearch,
    onClear
}: SearchFiltersProps) {
    const updateFilter = (key: keyof SearchFilters, value: any) => {
        onFilterChange({ ...filters, [key]: value })
    }

    const totalPassengers = filters.adults + filters.children + filters.infants

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="text-lg">Search Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Trip Components */}
                <div>
                    <Label className="text-base font-semibold mb-3 block">
                        Trip Components
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="flights"
                                checked={filters.includeFlights}
                                onCheckedChange={(checked) => updateFilter('includeFlights', checked)}
                            />
                            <label
                                htmlFor="flights"
                                className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                <Plane className="h-4 w-4 text-blue-600" />
                                Flights
                            </label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="hotels"
                                checked={filters.includeHotels}
                                onCheckedChange={(checked) => updateFilter('includeHotels', checked)}
                            />
                            <label
                                htmlFor="hotels"
                                className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                <Hotel className="h-4 w-4 text-green-600" />
                                Hotels
                            </label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="transfers"
                                checked={filters.includeTransfers}
                                onCheckedChange={(checked) => updateFilter('includeTransfers', checked)}
                            />
                            <label
                                htmlFor="transfers"
                                className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                <Car className="h-4 w-4 text-purple-600" />
                                Transfers
                            </label>
                        </div>
                    </div>
                </div>

                {/* Travel Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="startDate" className="text-base font-semibold mb-2 block">
                            <Calendar className="h-4 w-4 inline mr-2" />
                            Start Date
                        </Label>
                        <Input
                            id="startDate"
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => updateFilter('startDate', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div>
                        <Label htmlFor="duration" className="text-base font-semibold mb-2 block">
                            Duration (Days)
                        </Label>
                        <Input
                            id="duration"
                            type="number"
                            value={filters.duration}
                            onChange={(e) => updateFilter('duration', parseInt(e.target.value) || 1)}
                            min={1}
                            max={30}
                        />
                    </div>
                </div>

                {/* Passengers */}
                <div>
                    <Label className="text-base font-semibold mb-3 block">
                        Passengers ({totalPassengers} total)
                    </Label>
                    <div className="space-y-2 border rounded-lg p-4">
                        <PassengerCounter
                            label="Adults"
                            sublabel="Age 12+"
                            value={filters.adults}
                            min={1}
                            max={10}
                            onChange={(value) => updateFilter('adults', value)}
                        />
                        <PassengerCounter
                            label="Children"
                            sublabel="Age 2-11"
                            value={filters.children}
                            min={0}
                            max={5}
                            onChange={(value) => updateFilter('children', value)}
                        />
                        <PassengerCounter
                            label="Infants"
                            sublabel="Under 2"
                            value={filters.infants}
                            min={0}
                            max={2}
                            onChange={(value) => updateFilter('infants', value)}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Button onClick={onSearch} className="flex-1">
                        Apply Filters
                    </Button>
                    <Button onClick={onClear} variant="outline">
                        Clear All
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
