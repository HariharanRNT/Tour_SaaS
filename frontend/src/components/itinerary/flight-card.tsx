
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

    // Airline logo placeholder
    const getAirlineBadgeStyle = () => {
        return "w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md bg-white/25 backdrop-blur-[8px] border border-white/40 ring-1 ring-white/10"
    }

    return (
        <div
            className={`
                group relative bg-white/15 backdrop-blur-[12px] -webkit-backdrop-blur-[12px] rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
                ${isSelected
                    ? 'border-[var(--primary)]/85 ring-0 shadow-[0_0_12px_var(--primary-glow)] scale-[1.02]'
                    : 'border-white/35 hover:border-[var(--primary)]/50 hover:shadow-lg hover:-translate-y-1'
                }
            `}
            style={{
                borderWidth: isSelected ? '2px' : '1px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '16px'
            }}
            onClick={() => onSelect(flight)}
        >
            {isBestValue && (
                <div className="absolute -top-3 left-6 px-4 py-1.5 bg-gradient-to-r from-[var(--primary)] to-[#FB923C] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_4px_12px_var(--primary-glow)] z-20 flex items-center gap-1.5 border border-white/20">
                    <CheckCircle className="w-3.5 h-3.5" /> Best Value
                </div>
            )}

            <div className="p-5 flex flex-col gap-6">

                {/* Top Row: Airline & Price */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className={getAirlineBadgeStyle()}>
                            {flight.airline_code}
                        </div>
                        <div>
                            <div className="font-extrabold text-black text-lg leading-tight">{flight.airline}</div>
                            <div className="flex items-center gap-2 text-xs font-bold text-black mt-0.5">
                                <span className="bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded text-black ring-1 ring-white/10">{flight.airline_code}-{flight.flight_number}</span>
                                <span>•</span>
                                <span>{formatDate(flight.departure_time)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-2xl font-extrabold text-black">₹{flight.price.toLocaleString('en-IN')}</div>
                        <div className={`text-[10px] font-bold uppercase tracking-wide ${flight.is_refundable ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {flight.is_refundable ? 'Refundable' : 'Non-refundable'}
                        </div>
                    </div>
                </div>

                {/* Timeline Visualization */}
                <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="text-center min-w-[60px]">
                        <div className="text-2xl font-bold text-black">{depTime}</div>
                        <div className="text-xs font-bold text-black uppercase">{flight.origin}</div>
                    </div>

                    <div className="flex-1 px-6 flex flex-col items-center">
                        <div className="text-xs font-bold text-black mb-2">{flight.duration}</div>
                        <div className="w-full relative flex items-center">
                            <div className="h-[3px] w-full bg-gradient-to-r from-[var(--primary)] via-[#FB923C] to-[var(--primary)] rounded-full opacity-60"></div>
                            {/* Start Dot */}
                            <div className="absolute left-0 w-2.5 h-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary-glow)]"></div>
                            {/* Plane Icon */}
                                <div className="absolute left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md p-1.5 rounded-full border border-[var(--primary)]/20 shadow-sm z-10">
                                    <Plane className="h-3.5 w-3.5 text-[var(--primary)] rotate-90" />
                                </div>
                            {/* End Dot */}
                            <div className="absolute right-0 w-2.5 h-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary-glow)]"></div>
                        </div>
                        <div className="text-[10px] font-black text-[var(--primary)] mt-2 px-3 py-0.5 bg-white/30 backdrop-blur-md border border-white/40 rounded-full shadow-sm">
                            {flight.stops === 0 ? 'Direct' : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`}
                        </div>
                    </div>

                    <div className="text-center min-w-[60px]">
                        <div className="text-2xl font-bold text-black">{arrTime}</div>
                        <div className="text-xs font-bold text-black uppercase">{flight.destination}</div>
                    </div>
                </div>

                {/* Two-Row Footer Layout */}
                <div className="flex flex-col gap-4 mt-auto">
                    {/* Row 1: Amenity Pills */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-1.5 text-[10px] text-black bg-white/20 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/30 shadow-sm font-black whitespace-nowrap">
                            <span>🧳</span> {flight.baggage.split(',')[0]}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-black bg-white/20 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/30 shadow-sm font-black whitespace-nowrap">
                            <span>📦</span> {flight.raw_data?.class || 'Economy'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-black bg-white/20 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/30 shadow-sm font-black whitespace-nowrap">
                            <span>🍽️</span> Meals
                        </div>
                    </div>

                    {/* Row 2: Action Button */}
                    <div className="flex justify-end pr-1">
                        {isSelected ? (
                            <Badge className="bg-gradient-to-r from-[var(--primary)] to-[#FB923C] text-white hover:opacity-90 px-6 py-2.5 text-xs font-black shadow-[0_4px_12px_var(--primary-glow)] transition-all border-0 rounded-full flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" /> Selected
                            </Badge>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-[var(--primary)] border-[var(--primary)]/40 bg-white/20 hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] font-black transition-all rounded-full px-8 h-10 shadow-sm"
                            >
                                Select Flight
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div >
    )
}
