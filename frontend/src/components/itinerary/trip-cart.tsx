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
    gstSettings?: {
        inclusive: boolean
        percentage: number
    }
    onCheckout: () => void
    loading?: boolean
    disabled?: boolean
    // Theme Props
    sidebarBg?: string
    priceColor?: string
    ctaColor?: string
    ctaTextColor?: string
}

export function TripCart({
    travelers,
    duration = { days: 0, nights: 0 },
    basePrice,
    services = [],
    currency = 'INR',
    gstSettings,
    onCheckout,
    loading = false,
    disabled = false,
    sidebarBg,
    priceColor,
    ctaColor,
    ctaTextColor
}: TripCartProps) {
    const totalTravelers = travelers.adults + travelers.children + (travelers.infants || 0)

    // Calculate totals
    const totalBasePrice = basePrice * totalTravelers
    const totalServicesPrice = services.reduce((sum, service) => sum + service.price, 0)

    // GST Calculation
    let gstAmount = 0
    let subTotal = totalBasePrice + totalServicesPrice
    let grandTotal = subTotal

    if (gstSettings && !gstSettings.inclusive) {
        gstAmount = (subTotal * gstSettings.percentage) / 100
        grandTotal = subTotal + gstAmount
    }

    return (
        <Card
            className="sticky top-24 shadow-xl border-0 bg-white/95 backdrop-blur-xl overflow-hidden rounded-[1.5rem] transition-all duration-300 ring-1 ring-black/5"
            style={{ backgroundColor: sidebarBg || '' }}
        >
            {/* Header */}
            <CardHeader className="bg-gradient-to-r from-gray-900 to-slate-800 pb-8 pt-8 border-b border-gray-100/10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <CardTitle className="flex items-center gap-3 text-2xl font-bold relative z-10">
                    <div className="p-2.5 bg-white/10 rounded-xl text-white backdrop-blur-md shadow-inner ring-1 ring-white/20">
                        <ShoppingCart className="h-6 w-6" />
                    </div>
                    Trip Summary
                </CardTitle>
                <CardDescription className="text-blue-100/80 font-medium pl-1 relative z-10 text-base">
                    Review your complete itinerary details
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-8 space-y-8">
                {/* Traveler & Duration Info - Pill Style */}
                <div className="flex items-center justify-between bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                    <div className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white shadow-sm border border-gray-100">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Travelers</span>
                            <span className="font-bold text-gray-900">{totalTravelers} Person{totalTravelers !== 1 && 's'}</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl ml-1.5">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Duration</span>
                            <span className="font-bold text-gray-900">{duration.days}D / {duration.nights}N</span>
                        </div>
                    </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-4">
                    {/* Base Price Section */}
                    <div className="group">
                        <div className="flex justify-between text-gray-600 text-sm mb-1">
                            <span className="font-medium text-gray-500">Base Package (Per Person)</span>
                            <span className="text-gray-900">₹{basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-900 font-semibold flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">x {totalTravelers} Travelers</span>
                            </span>
                            <span className="font-bold text-lg" style={{ color: priceColor || '#111827' }}>₹{totalBasePrice.toLocaleString()}</span>
                        </div>
                    </div>

                    <Separator className="bg-dashed border-t border-gray-200" />

                    {/* Services Section */}
                    {services.length > 0 && (
                        <div className="space-y-3 pt-1">
                            {services.map((service, index) => (
                                <div key={index} className="flex justify-between items-center text-sm group">
                                    <span className="flex items-center gap-2 text-gray-600 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-blue-100"></span>
                                        {service.name}
                                    </span>
                                    <span className="font-bold" style={{ color: priceColor || '#111827' }}>₹{service.price.toLocaleString()}</span>
                                </div>
                            ))}
                            <Separator className="bg-dashed border-t border-gray-200 my-2" />
                        </div>
                    )}

                    {/* GST Section (Exclusive) */}
                    {gstSettings && !gstSettings.inclusive && (
                        <div className="flex justify-between items-center text-sm group bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                            <span className="flex items-center gap-2 text-blue-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                GST ({gstSettings.percentage}%)
                            </span>
                            <span className="font-bold" style={{ color: priceColor || '#1e3a8a' }}>₹{gstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                        <span className="text-gray-600 font-medium text-sm">
                            {gstSettings && !gstSettings.inclusive ? "Subtotal" : "Taxes & Fees"}
                        </span>
                        {gstSettings && !gstSettings.inclusive ? (
                            <span className="font-bold" style={{ color: priceColor || '#111827' }}>₹{subTotal.toLocaleString()}</span>
                        ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 font-bold px-2.5 shadow-sm">
                                INCLUDED
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Total */}
                <div className="bg-gray-900 -mx-6 -mb-6 p-6 pb-8 text-white mt-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="text-gray-400 font-medium mb-1">Total Amount</span>
                                {gstSettings && gstSettings.inclusive && (
                                    <span className="text-xs text-gray-500">(Includes GST)</span>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="text-sm text-gray-400 font-medium mr-1">INR</span>
                                <span className="text-4xl font-extrabold tracking-tight" style={{ color: priceColor || 'white' }}>
                                    ₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </div>

                        <Button
                            id="checkout-trigger"
                            className="w-full h-16 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] border border-white/10"
                            style={{
                                backgroundColor: ctaColor || '',
                                color: ctaTextColor || '',
                                backgroundImage: ctaColor ? 'none' : ''
                            }}
                            onClick={onCheckout}
                            disabled={loading || disabled}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <div className="flex items-center justify-center w-full gap-3">
                                    <ShieldCheck className="h-5 w-5" />
                                    <span>Confirm & Pay Securely</span>
                                </div>
                            )}
                        </Button>

                        <div className="flex items-center justify-center gap-4 pt-2 opacity-60">
                            {/* Simple trust indicators since we don't have actual logos imported */}
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                                <Lock className="h-3 w-3" /> 256-bit SSL
                            </div>
                            <div className="h-3 w-px bg-white/20"></div>
                            <div className="text-xs font-medium">Instant Confirmation</div>
                        </div>
                    </div>
                </div>
            </CardContent>
            {/* Footer padding compensation for negative margin above */}
            <div className="h-2 bg-gray-900"></div>
        </Card>
    )
}
