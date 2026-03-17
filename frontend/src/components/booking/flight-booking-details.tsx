import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plane, Calendar, Clock, MapPin, User, Mail, Phone } from "lucide-react"

interface FlightBookingDetailsProps {
    details: any // Raw TripJack booking response or confirmation object
    travelers?: any[] // Fallback travelers list
    contactInfo?: { email: string, phone: string } // Fallback contact info
}

export function FlightBookingDetails({ details, travelers = [], contactInfo }: FlightBookingDetailsProps) {
    if (!details) return null

    // Extract Order Info
    const orderId = details.order?.bookingId || details.bookingId || "N/A"
    const pnr = details.itemInfos?.AIR?.tripInfos?.[0]?.sI?.[0]?.pnr || details.order?.pnr || "Pending"
    const status = details.status?.success ? "Confirmed" : "Pending"

    // Extract Contact
    const deliveryInfo = details.deliveryInfo || {}
    const email = deliveryInfo.emails?.[0] || contactInfo?.email || "N/A"
    const phone = deliveryInfo.contacts?.[0] || contactInfo?.phone || "N/A"

    // Extract Passengers
    // TripJack uses 'travellerInfo', our internal uses 'travelers'
    let displayPassengers = details.travellerInfo || []

    // Fallback if API hasn't returned passengers yet (e.g. pending state) but we have them from local state
    if (displayPassengers.length === 0 && travelers.length > 0) {
        displayPassengers = travelers.map(t => ({
            ti: t.title,
            fN: t.first_name,
            lN: t.last_name,
            pt: t.type
        }))
    }

    // Extract Trips (Onward/Return)
    // TripJack structure: itemInfos.AIR.tripInfos (Array of trips)
    const trips = details.itemInfos?.AIR?.tripInfos || []

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "N/A"
        try {
            return new Date(dateStr).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                weekday: 'short'
            })
        } catch { return dateStr }
    }

    const formatTime = (dateStr: string) => {
        if (!dateStr) return "N/A"
        try {
            return new Date(dateStr).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit'
            })
        } catch { return dateStr }
    }

    const getDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return `${h}h ${m}m`
    }

    return (
        <div className="space-y-6 w-full max-w-2xl mx-auto">
            {/* Booking Summary Card */}
            <Card className="rounded-[24px] border border-white/35 shadow-[0_8px_32px_var(--primary-glow)] overflow-hidden bg-white/15 backdrop-blur-xl border-l-[6px] border-l-green-500/80">
                <CardHeader className="glass-panel border-b border-white/20 pb-4 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl text-green-700 flex items-center gap-2">
                                <Plane className="h-5 w-5" />
                                Booking {status}
                            </CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Order ID: {orderId}</p>
                        </div>
                        <div className="text-right">
                            <span className="block text-xs text-gray-400 uppercase tracking-wider">PNR</span>
                            <span className="text-2xl font-mono font-bold text-gray-800">{pnr}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" /> Passengers
                        </h4>
                        <div className="space-y-1">
                            {displayPassengers.map((p: any, idx: number) => (
                                <div key={idx} className="text-sm text-gray-600 pl-6">
                                    {p.ti} {p.fN} {p.lN} <Badge variant="outline" className="text-[10px] ml-1">{p.pt}</Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" /> Contact Details
                        </h4>
                        <div className="text-sm text-gray-600 space-y-1 pl-6">
                            <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {email}</div>
                            <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {phone}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Trips */}
            {trips.map((trip: any, tripIdx: number) => {
                const segments = trip.sI || []
                if (segments.length === 0) return null

                const firstSeg = segments[0]
                const lastSeg = segments[segments.length - 1]
                const origin = firstSeg.da.city || firstSeg.da.code
                const dest = lastSeg.aa.city || lastSeg.aa.code
                const totalDuration = trip.totalDuration || segments.reduce((acc: number, s: any) => acc + s.duration, 0)

                return (
                    <Card key={tripIdx} className="rounded-[24px] border border-white/35 shadow-[0_8px_32px_var(--primary-glow)] overflow-hidden bg-white/15 backdrop-blur-xl">
                        <div className="bg-blue-500/10 px-4 py-3 border-b border-white/20 flex justify-between items-center backdrop-blur-md">
                            <span className="font-bold text-blue-900 flex items-center gap-2">
                                <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {tripIdx === 0 ? "ONWARD" : "RETURN"}
                                </span>
                                {origin} <span className="text-blue-500/60">→</span> {dest}
                            </span>
                            <span className="text-sm text-blue-600 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {formatDate(firstSeg.dt)}
                            </span>
                        </div>

                        <CardContent className="p-0">
                            <div className="divide-y">
                                {segments.map((seg: any, segIdx: number) => {
                                    const isLayover = segIdx > 0
                                    // Calculate layover if needed (diff between prev arr and curr dep)
                                    let layoverText = null
                                    if (isLayover) {
                                        const prevArr = new Date(segments[segIdx - 1].at)
                                        const currDep = new Date(seg.dt)
                                        const diffMins = (currDep.getTime() - prevArr.getTime()) / 60000
                                        layoverText = `${Math.floor(diffMins / 60)}h ${Math.floor(diffMins % 60)}m Layover at ${seg.da.city}`
                                    }

                                    return (
                                        <div key={segIdx}>
                                            {layoverText && (
                                                <div className="bg-gray-50 py-2 px-4 text-xs text-gray-500 text-center border-dashed border-b">
                                                    <Clock className="h-3 w-3 inline mr-1" /> {layoverText}
                                                </div>
                                            )}
                                            <div className="p-4 flex flex-col sm:flex-row gap-4">
                                                {/* Airline Logo/Info */}
                                                <div className="flex items-center gap-3 sm:w-1/4">
                                                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                                                        {seg.fD.aI.code}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-sm">{seg.fD.aI.name}</div>
                                                        <div className="text-xs text-gray-500">{seg.fD.aI.code}-{seg.fD.fN}</div>
                                                        <div className="text-xs text-gray-400 mt-1">{getDuration(seg.duration)}</div>
                                                    </div>
                                                </div>

                                                {/* Route Timing */}
                                                <div className="flex-1 flex justify-between items-center relative">
                                                    {/* Line visual */}
                                                    <div className="hidden sm:block absolute top-1/2 left-20 right-20 h-0.5 bg-gray-200 -z-10"></div>

                                                    <div className="text-left">
                                                        <div className="text-lg font-bold">{formatTime(seg.dt)}</div>
                                                        <div className="text-xs text-gray-500 font-medium">{seg.da.city} ({seg.da.code})</div>
                                                        <div className="text-[10px] text-gray-400">{formatDate(seg.dt)}</div>
                                                        <div className="text-[10px] text-gray-400">Term {seg.da.terminal || '-'}</div>
                                                    </div>

                                                    <div className="text-xs text-gray-400 bg-white px-2">
                                                        <Clock className="h-3 w-3 mx-auto mb-1 opacity-50" />
                                                        {getDuration(seg.duration)}
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-lg font-bold">{formatTime(seg.at)}</div>
                                                        <div className="text-xs text-gray-500 font-medium">{seg.aa.city} ({seg.aa.code})</div>
                                                        <div className="text-[10px] text-gray-400">{formatDate(seg.at)}</div>
                                                        <div className="text-[10px] text-gray-400">Term {seg.aa.terminal || '-'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
