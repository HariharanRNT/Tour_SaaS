'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, ShoppingCart, Lock, ShieldCheck, Clock, Users, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TripCartProps {
    travelers: {
        adults: number
        children: number
        infants: number
    }
    duration?: {
        days: number
        nights: number
    }
    basePrice: number
    services?: { name: string; price: number }[]
    currency?: string
    onCheckout: () => void
    loading?: boolean
    disabled?: boolean
}

export function TripCart({
    travelers,
    duration = { days: 0, nights: 0 },
    basePrice,
    services = [],
    currency = 'INR',
    onCheckout,
    loading = false,
    disabled = false
}: TripCartProps) {
    const totalTravelers = travelers.adults + travelers.children + (travelers.infants || 0)

    // Calculate totals
    const totalBasePrice = basePrice * totalTravelers
    const totalServicesPrice = services.reduce((sum, service) => sum + service.price, 0)

    // Assuming base price includes tax for simplicity in this flow, or we can separate it.
    // For "All-inclusive" feel, we will show Taxes as Included.
    const grandTotal = totalBasePrice + totalServicesPrice

    return (
        <Card className="sticky top-24 shadow-2xl border-blue-50/50 bg-white/90 backdrop-blur-xl overflow-hidden rounded-3xl transition-all duration-300 ring-1 ring-blue-100">
            {/* Header */}
            <CardHeader className="bg-gradient-to-br from-slate-50 to-white pb-6 border-b border-gray-100">
                <CardTitle className="flex items-center gap-2.5 text-xl font-bold text-gray-900">
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
                        <ShoppingCart className="h-5 w-5" />
                    </div>
                    Trip Summary
                </CardTitle>
                <CardDescription className="text-gray-500 font-medium pl-1">
                    Review your trip details before proceeding
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
                {/* Traveler & Duration Info */}
                <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full text-blue-600 shadow-sm">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Travelers</p>
                            <p className="font-bold text-gray-900">{totalTravelers} Person{totalTravelers !== 1 && 's'}</p>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-blue-200/50"></div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full text-blue-600 shadow-sm">
                            <Clock className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Duration</p>
                            <p className="font-bold text-gray-900">{duration.days}D / {duration.nights}N</p>
                        </div>
                    </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-3">
                    <div className="flex justify-between text-gray-600 text-sm">
                        <span>Base Package ({totalTravelers}x)</span>
                        <span className="font-medium text-gray-900">₹{totalBasePrice.toLocaleString()}</span>
                    </div>

                    {services.map((service, index) => (
                        <div key={index} className="flex justify-between text-gray-600 text-sm">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                {service.name}
                            </span>
                            <span className="font-medium text-gray-900">₹{service.price.toLocaleString()}</span>
                        </div>
                    ))}

                    <div className="flex justify-between text-gray-600 text-sm">
                        <span>Taxes & Fees</span>
                        <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded-full">INCLUDED</span>
                    </div>
                </div>

                <Separator className="bg-gray-100" />

                {/* Total */}
                <div className="space-y-1">
                    <div className="flex justify-between items-end">
                        <span className="text-gray-500 font-medium">Total Amount</span>
                        <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            ₹{grandTotal.toLocaleString()}
                        </span>
                    </div>
                    <p className="text-right text-xs text-gray-400 font-medium flex items-center justify-end gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        All-inclusive · No hidden charges
                    </p>
                </div>
            </CardContent>

            <CardFooter className="bg-gray-50/50 p-6 flex flex-col gap-4">
                <Button
                    className="w-full h-14 text-white font-bold text-lg rounded-xl shadow-xl shadow-blue-600/20 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    onClick={onCheckout}
                    disabled={loading || disabled}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            Confirm & Pay Securely
                        </div>
                    )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                    <Lock className="h-3 w-3" />
                    100% Secure Payment · Instant Confirmation
                </div>
            </CardFooter>
        </Card>
    )
}
