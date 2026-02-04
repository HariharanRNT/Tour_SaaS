
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

    const depTime = formatTime(flight.departure_time)
    const arrTime = formatTime(flight.arrival_time)

    // Airline logo placeholder (using text/code if no image)
    // simplistic logo color generation based on code
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
                group relative bg-white rounded-lg border transition-all cursor-pointer
                ${isSelected
                    ? 'border-blue-600 ring-1 ring-blue-600 shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }
            `}
            onClick={() => onSelect(flight)}
        >
            {isBestValue && (
                <div className="absolute -top-3 left-4 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full shadow-sm">
                    Best Value
                </div>
            )}

            <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
                {/* Airline Info */}
                <div className="flex items-center gap-3 w-full md:w-1/4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${getAirlineColor(flight.airline_code)}`}>
                        {flight.airline_code}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900">{flight.airline}</div>
                        <div className="text-xs text-gray-400">{flight.airline_code}-{flight.flight_number}</div>
                    </div>
                </div>

                {/* Flight Route & Timing */}
                <div className="flex-1 flex items-center justify-between w-full md:w-2/4 px-2 md:px-6">
                    <div className="text-center">
                        <div className="text-xl font-bold text-gray-900">{depTime}</div>
                        <div className="text-xs text-gray-500">{flight.origin}</div>
                    </div>

                    <div className="flex-1 flex flex-col items-center px-4">
                        <div className="text-xs text-gray-400 mb-1">{flight.duration}</div>
                        <div className="w-full h-px bg-gray-300 relative flex items-center justify-center">
                            <Plane className="h-3 w-3 text-gray-400 rotate-90 absolute bg-white px-0.5" />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {flight.stops === 0 ? 'Non-stop' : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`}
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-xl font-bold text-gray-900">{arrTime}</div>
                        <div className="text-xs text-gray-500">{flight.destination}</div>
                    </div>
                </div>

                {/* Price & Action */}
                <div className="w-full md:w-1/4 flex items-center justify-between md:flex-col md:items-end md:justify-center gap-2 pl-4 border-l-0 md:border-l border-dashed border-gray-200">
                    <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">₹{flight.price.toLocaleString('en-IN')}</div>
                        <div className="text-xs text-gray-500">{flight.is_refundable ? 'Refundable' : 'Non-refundable'}</div>
                    </div>

                    {isSelected ? (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-3 py-1">
                            <CheckCircle className="w-3 h-3 mr-1" /> Selected
                        </Badge>
                    ) : (
                        <Button size="sm" variant="outline" className="w-full md:w-auto text-blue-600 hover:bg-blue-50 border-blue-200">
                            Select
                        </Button>
                    )}
                </div>
            </div>

            {/* Footer with baggage info */}
            <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 rounded-b-lg flex justify-between border-t border-gray-100">
                <span>{formatDate(flight.departure_time)}</span>
                <span className="flex items-center gap-1 font-medium text-xs">
                    {flight.baggage}
                </span>
            </div>
        </div>
    )
}
