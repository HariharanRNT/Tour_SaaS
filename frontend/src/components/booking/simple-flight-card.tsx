
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plane, Calendar, Clock, ArrowRight } from "lucide-react"

interface FlightSegment {
    origin?: string
    destination?: string
    fromCity?: string // Legacy fallback
    toCity?: string // Legacy fallback
    fromCode?: string // Legacy fallback
    toCode?: string // Legacy fallback
    airline?: string
    airline_code?: string
    flight_number?: string
    departure?: string
    arrival?: string
    date?: string // Legacy fallback
    duration?: string
    stops?: number
}

interface SimpleFlightCardProps {
    type: 'ONWARD' | 'RETURN'
    details: FlightSegment
}

export function SimpleFlightCard({ type, details }: SimpleFlightCardProps) {
    if (!details) return null

    // Normalize Data
    const origin = details.origin || details.fromCity || details.fromCode || 'N/A'
    const destination = details.destination || details.toCity || details.toCode || 'N/A'
    const airline = details.airline || 'Airline'
    const airlineCode = details.airline_code || 'FL'
    const flightNumber = details.flight_number || ''

    // Format Dates/Times
    const formatTime = (isoString?: string) => {
        if (!isoString) return "--:--"
        try {
            return new Date(isoString).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', hour12: true
            })
        } catch { return isoString }
    }

    const formatDate = (isoString?: string) => {
        if (!isoString) return details.date || "Date Pending"
        try {
            return new Date(isoString).toLocaleDateString('en-GB', {
                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
            })
        } catch { return isoString }
    }

    const depTime = formatTime(details.departure)
    const arrTime = formatTime(details.arrival)
    const depDate = formatDate(details.departure)

    // Airline Logo Color Generator (Simple hash fallback)
    const getAirlineColor = (code: string) => {
        const colors: Record<string, string> = {
            '6E': 'bg-blue-600',
            'AI': 'bg-[var(--primary)]',
            'UK': 'bg-purple-700',
            'SG': 'bg-red-600',
            'IX': 'bg-red-500',
            'QP': 'bg-purple-500',
            'EK': 'bg-red-700',
            'EY': 'bg-yellow-600',
            'QR': 'bg-purple-800' }
        return colors[code] || 'bg-blue-500'
    }

    return (
        <Card className="overflow-hidden border-gray-200 mb-4">
            {/* Header */}
            <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${type === 'ONWARD' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                        {type}
                    </span>
                    <span className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
                        {origin} <ArrowRight className="h-3 w-3 text-gray-400" /> {destination}
                    </span>
                </div>
                <span className="text-xs text-blue-600 flex items-center gap-1 font-medium">
                    <Calendar className="h-3 w-3" /> {depDate}
                </span>
            </div>

            <CardContent className="p-0">
                <div className="p-5 flex flex-col md:flex-row gap-6 items-center">

                    {/* Airline Identity */}
                    <div className="flex items-center gap-3 w-full md:w-1/4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${getAirlineColor(airlineCode)}`}>
                            {airlineCode}
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 text-sm">{airline}</div>
                            <div className="text-xs text-gray-500">{airlineCode}-{flightNumber}</div>
                            {details.duration && (
                                <div className="text-[10px] text-gray-400 mt-1 md:hidden">{details.duration}</div>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 flex justify-between items-center w-full md:w-2/4 px-0 md:px-4 relative">

                        {/* Visual Line (Desktop) */}
                        <div className="hidden md:block absolute top-1/2 left-16 right-16 h-px bg-gray-200 -z-10"></div>

                        <div className="text-center min-w-[80px]">
                            <div className="text-lg font-bold text-gray-900">{depTime}</div>
                            <div className="text-xs text-gray-500 font-medium">{origin}</div>
                            {/* <div className="text-[10px] text-gray-400 mt-0.5">Term -</div> */}
                        </div>

                        <div className="flex flex-col items-center bg-white px-2">
                            <Clock className="h-3 w-3 text-gray-300 mb-1" />
                            <div className="text-xs text-gray-500 font-medium">{details.duration || 'Direct'}</div>
                            {details.stops !== undefined && (
                                <div className="text-[10px] text-gray-400">
                                    {details.stops === 0 ? 'Non-stop' : `${details.stops} Stop${details.stops > 1 ? 's' : ''}`}
                                </div>
                            )}
                        </div>

                        <div className="text-center min-w-[80px]">
                            <div className="text-lg font-bold text-gray-900">{arrTime}</div>
                            <div className="text-xs text-gray-500 font-medium">{destination}</div>
                            {/* <div className="text-[10px] text-gray-400 mt-0.5">Term -</div> */}
                        </div>
                    </div>

                    {/* Status/Pending Note */}
                    <div className="w-full md:w-1/4 text-right pl-4 border-l-0 md:border-l border-gray-100 border-dashed">
                        {/* Only show "Pending" or standard message as this isn't confirmed PNR yet */}
                        <div className="flex md:flex-col justify-between md:items-end items-center">
                            <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700 font-normal">
                                Requested
                            </Badge>
                            <span className="text-[10px] text-gray-400 mt-1 md:mt-2 block max-w-[100px] ml-auto">
                                PNR Pending
                            </span>
                        </div>
                    </div>

                </div>

                {/* Footer Info if any */}
                {/* <div className="bg-gray-50/50 px-4 py-2 text-[10px] text-gray-400 border-t flex justify-between">
                     <span>Operating airline might vary</span>
                     <span>Baggage info pending</span>
                 </div> */}
            </CardContent>
        </Card>
    )
}
