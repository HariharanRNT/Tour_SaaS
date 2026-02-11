
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plane, Clock, CheckCircle } from "lucide-react"

export interface Flight {
    id: string
    airline: string
    airline_code: string
    flight_number: string
    origin: string
    destination: string
    departure_time: string
    arrival_time: string
    duration: string
    price: number
    stops: number
    segments: number
    is_refundable: boolean
    price_id?: string
    baggage: string
    route_type?: string
    raw_data?: any
}

interface FlightCardProps {
    flight: Flight
    isSelected?: boolean
    onSelect: (flight: Flight) => void
    isBestValue?: boolean
}

export function FlightCard({ flight, isSelected, onSelect, isBestValue }: FlightCardProps) {
    // Format times
    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    }

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }

    const getDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return `${h}h ${m}m`
    }

    const depTime = formatTime(flight.departure_time)
    const arrTime = formatTime(flight.arrival_time)

    // Parse duration string "2h 15m" to display if needed, or stick to string provided by backend
    // Backend provides string like "2h 45m"

    // Airline logo placeholder (using text/code if no image)
    const getAirlineColor = (code: string) => {
        const colors: Record<string, string> = {
            '6E': 'bg-blue-600', // Indigo
            'AI': 'bg-orange-600', // Air India
            'UK': 'bg-purple-700', // Vistara
            'SG': 'bg-red-600', // SpiceJet
            'IX': 'bg-red-500', // AI Express
            'QP': 'bg-purple-500', // Akasa
        }
        return colors[code] || 'bg-blue-500'
    }

    return (
        <div
            className={`
                group relative bg-white rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
                ${isSelected
                    ? 'border-blue-600 ring-2 ring-blue-600 shadow-xl scale-[1.02]'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1'
                }
            `}
            onClick={() => onSelect(flight)}
        >
            {/* Header / Badges */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />

            {isBestValue && (
                <div className="absolute -top-px left-6 px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-b-lg shadow-sm z-10 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Best Value
                </div>
            )}

            <div className="p-5 flex flex-col gap-6">

                {/* Top Row: Airline & Price */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${getAirlineColor(flight.airline_code)}`}>
                            {flight.airline_code}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 text-lg leading-tight">{flight.airline}</div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-0.5">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{flight.airline_code}-{flight.flight_number}</span>
                                <span>•</span>
                                <span>{formatDate(flight.departure_time)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-2xl font-extrabold text-slate-900">₹{flight.price.toLocaleString('en-IN')}</div>
                        <div className={`text-[10px] font-bold uppercase tracking-wide ${flight.is_refundable ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {flight.is_refundable ? 'Refundable' : 'Non-refundable'}
                        </div>
                    </div>
                </div>

                {/* Timeline Visualization */}
                <div className="flex items-center justify-between bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                    <div className="text-center min-w-[60px]">
                        <div className="text-2xl font-bold text-slate-900">{depTime}</div>
                        <div className="text-xs font-bold text-slate-500 uppercase">{flight.origin}</div>
                    </div>

                    <div className="flex-1 px-6 flex flex-col items-center">
                        <div className="text-xs font-medium text-slate-400 mb-1.5">{flight.duration}</div>
                        <div className="w-full relative flex items-center">
                            <div className="h-[2px] w-full bg-slate-300 rounded-full"></div>
                            {/* Start Dot */}
                            <div className="absolute left-0 w-2 h-2 rounded-full bg-slate-400"></div>
                            {/* Plane Icon */}
                            <div className="absolute left-1/2 -translate-x-1/2 bg-white p-1 rounded-full border border-slate-200">
                                <Plane className="h-3.5 w-3.5 text-blue-500 rotate-90" />
                            </div>
                            {/* End Dot */}
                            <div className="absolute right-0 w-2 h-2 rounded-full bg-slate-400"></div>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-full shadow-sm">
                            {flight.stops === 0 ? 'Direct' : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`}
                        </div>
                    </div>

                    <div className="text-center min-w-[60px]">
                        <div className="text-2xl font-bold text-slate-900">{arrTime}</div>
                        <div className="text-xs font-bold text-slate-500 uppercase">{flight.destination}</div>
                    </div>
                </div>

                {/* Footer Grid: Amenities & Select Button */}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            <span className="font-semibold text-slate-700">Check-in:</span> {flight.baggage}
                        </div>
                        {/* Demo Amenities (could be dynamic) */}
                        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            Meals Included
                        </div>
                    </div>

                    {isSelected ? (
                        <Badge className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-1.5 text-xs font-bold shadow-sm transition-colors">
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Selected
                        </Badge>
                    ) : (
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 font-semibold transition-all">
                            Select Flight
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
