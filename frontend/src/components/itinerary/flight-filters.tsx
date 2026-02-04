import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Sun, Moon, Sunrise, Sunset } from 'lucide-react'

export interface FlightFilterState {
    refundType: 'all' | 'refundable' | 'non_refundable'
    stops: number[]
    dates: Date[]
    timeRanges: string[]
    airlines: string[]
}

interface FlightFiltersProps {
    filters: FlightFilterState
    onChange: (filters: FlightFilterState) => void
    availableAirlines: string[]
    minPrice?: number
    maxPrice?: number
}

export function FlightFilters({ filters, onChange, availableAirlines }: FlightFiltersProps) {

    const updateFilter = (key: keyof FlightFilterState, value: any) => {
        onChange({ ...filters, [key]: value })
    }

    const toggleStop = (stop: number) => {
        const current = filters.stops
        const next = current.includes(stop)
            ? current.filter(s => s !== stop)
            : [...current, stop]
        updateFilter('stops', next)
    }

    const toggleTime = (range: string) => {
        const current = filters.timeRanges
        const next = current.includes(range)
            ? current.filter(t => t !== range)
            : [...current, range]
        updateFilter('timeRanges', next)
    }

    const toggleAirline = (airline: string) => {
        const current = filters.airlines
        const next = current.includes(airline)
            ? current.filter(a => a !== airline)
            : [...current, airline]
        updateFilter('airlines', next)
    }

    const timeOptions = [
        { id: '00-06', label: 'Early', sub: '12am-6am', icon: Moon },
        { id: '06-12', label: 'Morning', sub: '6am-12pm', icon: Sunrise },
        { id: '12-18', label: 'Mid-Day', sub: '12pm-6pm', icon: Sun },
        { id: '18-24', label: 'Night', sub: '6pm-12am', icon: Sunset },
    ]

    return (
        <div className="space-y-6 p-4 bg-white rounded-lg border border-gray-100">
            {/* Refund Type */}
            <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900">Refund Type</h4>
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                        <input
                            type="radio"
                            id="rt-all"
                            name="refundType"
                            value="all"
                            checked={filters.refundType === 'all'}
                            onChange={() => updateFilter('refundType', 'all')}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor="rt-all" className="font-normal text-sm cursor-pointer">All Flights</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="radio"
                            id="rt-ref"
                            name="refundType"
                            value="refundable"
                            checked={filters.refundType === 'refundable'}
                            onChange={() => updateFilter('refundType', 'refundable')}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor="rt-ref" className="font-normal text-sm cursor-pointer">Refundable Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="radio"
                            id="rt-non"
                            name="refundType"
                            value="non_refundable"
                            checked={filters.refundType === 'non_refundable'}
                            onChange={() => updateFilter('refundType', 'non_refundable')}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor="rt-non" className="font-normal text-sm cursor-pointer">Non-Refundable Only</Label>
                    </div>
                </div>
            </div>

            {/* Stops */}
            <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900">Stops</h4>
                <div className="space-y-2">
                    {[0, 1, 2].map((stop) => (
                        <div key={stop} className="flex items-center space-x-2">
                            <Checkbox
                                id={`stop-${stop}`}
                                checked={filters.stops.includes(stop)}
                                onCheckedChange={() => toggleStop(stop)}
                            />
                            <Label htmlFor={`stop-${stop}`} className="font-normal text-sm cursor-pointer">
                                {stop === 0 ? 'Non-stop (Direct)' : stop === 1 ? '1 Stop' : '2+ Stops'}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Time Filter */}
            <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900">Departure Time</h4>
                <div className="grid grid-cols-2 gap-2">
                    {timeOptions.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => toggleTime(opt.id)}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-md border text-sm transition-all",
                                filters.timeRanges.includes(opt.id)
                                    ? "border-blue-500 bg-blue-50 text-blue-700 font-medium shadow-sm transition-all"
                                    : "border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            <opt.icon className="h-4 w-4 mb-1" />
                            <span>{opt.label}</span>
                            <span className="text-[10px] text-gray-400">{opt.sub}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Airlines */}
            <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900">Airlines</h4>
                {availableAirlines.length === 0 ? (
                    <p className="text-xs text-gray-500">No airlines available for current selection</p>
                ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {availableAirlines.map((airline) => (
                            <div key={airline} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`al-${airline}`}
                                    checked={filters.airlines.includes(airline)}
                                    onCheckedChange={() => toggleAirline(airline)}
                                />
                                <Label htmlFor={`al-${airline}`} className="font-normal text-sm cursor-pointer">
                                    {airline}
                                </Label>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
