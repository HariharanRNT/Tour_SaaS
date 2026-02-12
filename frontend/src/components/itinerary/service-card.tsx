'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plane, Hotel, Car, CheckCircle2, Circle, ArrowRight, Edit2 } from 'lucide-react'

export type ServiceType = 'flight' | 'hotel' | 'transfer'
export type ServiceStatus = 'pending' | 'selected' | 'confirmed'

interface ServiceCardProps {
    type: ServiceType
    status: ServiceStatus
    title: string
    description?: string
    price?: number
    details?: {
        from?: string
        to?: string
        date?: string
        duration?: string
        rating?: number
    }
    onAction?: () => void
    disabled?: boolean
}

export function ServiceCard({
    type,
    status,
    title,
    description,
    price,
    details,
    onAction,
    disabled = false
}: ServiceCardProps) {
    const icons = {
        flight: Plane,
        hotel: Hotel,
        transfer: Car
    }
    const Icon = icons[type]

    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        selected: 'bg-green-100 text-green-700 border-green-200',
        confirmed: 'bg-blue-100 text-blue-700 border-blue-200'
    }

    const typeLabels = {
        flight: 'Flights',
        hotel: 'Accommodation',
        transfer: 'Transfers'
    }

    return (
        <Card className={`
            overflow-hidden transition-all duration-300 border hover:shadow-lg rounded-2xl
            ${status === 'selected'
                ? 'bg-gradient-to-br from-green-50 to-white border-green-200 shadow-green-100 ring-1 ring-green-100'
                : 'bg-white border-gray-100 hover:border-blue-100'
            }
        `}>
            <CardContent className="p-5">
                <div className="flex items-start gap-4">
                    {/* Icon Box */}
                    <div className={`p-3 rounded-xl transition-colors ${status === 'selected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className={`font-bold text-lg ${status === 'selected' ? 'text-green-900' : 'text-gray-900'}`}>{title}</h3>
                            {price !== undefined && (
                                <span className="font-bold text-gray-900">
                                    ₹{price.toLocaleString()}
                                </span>
                            )}
                        </div>

                        <p className="text-gray-500 text-sm mb-4 font-medium">{description}</p>

                        {/* Details Grid */}
                        {details && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600 bg-white/60 p-3 rounded-lg border border-gray-100/50 mb-4">
                                {details.from && details.to && (
                                    <div className="col-span-full flex items-center gap-2">
                                        <span className="font-semibold text-gray-700">{details.from}</span>
                                        <ArrowRight className="h-3 w-3 text-gray-400" />
                                        <span className="font-semibold text-gray-700">{details.to}</span>
                                    </div>
                                )}
                                {details.date && (
                                    <div className="flex items-center gap-2"><span className="opacity-75">📅</span> {details.date}</div>
                                )}
                                {details.duration && (
                                    <div className="flex items-center gap-2"><span className="opacity-75">⏱️</span> {details.duration}</div>
                                )}
                                {details.rating && (
                                    <div className="flex items-center gap-2"><span className="opacity-75">⭐</span> {details.rating} / 5</div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100/50">
                            <Badge variant="outline" className={`px-3 py-1 ${statusColors[status]} border-0 bg-opacity-50`}>
                                {status === 'selected' ? (
                                    <div className="flex items-center gap-1.5 font-semibold">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Selected
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <Circle className="h-3.5 w-3.5" />
                                        Pending
                                    </div>
                                )}
                            </Badge>

                            {onAction && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onAction}
                                    disabled={disabled}
                                    className={`
                                        font-medium text-sm hover:bg-white
                                        ${status === 'selected' ? 'text-green-700 hover:text-green-800' : 'text-blue-600 hover:text-blue-700'}
                                    `}
                                >
                                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                                    {status === 'selected' ? 'Change Selection' : 'Select Option'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
