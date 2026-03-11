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
        <div className="space-y-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm">
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
                            className="h-4 w-4 border-white/30 bg-white/10 text-[#F97316] focus:ring-[#F97316] focus:ring-offset-0"
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
                            className="h-4 w-4 border-white/30 bg-white/10 text-[#F97316] focus:ring-[#F97316] focus:ring-offset-0"
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
                            className="h-4 w-4 border-white/30 bg-white/10 text-[#F97316] focus:ring-[#F97316] focus:ring-offset-0"
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
                                className="border-white/30 data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316] shadow-sm"
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
                                "flex flex-col items-center justify-center p-3 rounded-xl border text-sm transition-all duration-300",
                                filters.timeRanges.includes(opt.id)
                                    ? "border-[#F97316] bg-[#F97316] text-white font-black shadow-[0_4px_12px_rgba(249,115,22,0.4)] scale-105"
                                    : "border-white/20 bg-white/15 hover:bg-white/25 text-slate-700 hover:border-white/40"
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
                                    className="border-white/30 data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316] shadow-sm"
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
