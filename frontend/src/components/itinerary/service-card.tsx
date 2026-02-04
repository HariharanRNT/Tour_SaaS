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
}

export function ServiceCard({
    type,
    status,
    title,
    description,
    price,
    details,
    onAction
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
        <Card className={`border-l-4 transition-all hover:shadow-md ${status === 'selected' ? 'border-l-green-500' : 'border-l-yellow-400'}`}>
            <CardContent className="p-5">
                <div className="flex items-start gap-4">
                    {/* Icon Box */}
                    <div className={`p-3 rounded-lg ${status === 'selected' ? 'bg-green-50' : 'bg-gray-100'}`}>
                        <Icon className={`h-6 w-6 ${status === 'selected' ? 'text-green-600' : 'text-gray-500'}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
                            {price !== undefined && (
                                <span className="font-medium text-gray-900">
                                    ${price.toLocaleString()}
                                </span>
                            )}
                        </div>

                        <p className="text-gray-500 text-sm mb-3">{description}</p>

                        {/* Details Grid */}
                        {details && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded mb-3">
                                {details.from && details.to && (
                                    <div className="col-span-full flex items-center gap-2">
                                        <span className="font-medium">{details.from}</span>
                                        <ArrowRight className="h-3 w-3 text-gray-400" />
                                        <span className="font-medium">{details.to}</span>
                                    </div>
                                )}
                                {details.date && (
                                    <div>📅 {details.date}</div>
                                )}
                                {details.duration && (
                                    <div>⏱️ {details.duration}</div>
                                )}
                                {details.rating && (
                                    <div>⭐ {details.rating} / 5</div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className={`${statusColors[status]} border`}>
                                {status === 'selected' ? (
                                    <div className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Selected
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <Circle className="h-3 w-3" />
                                        Pending
                                    </div>
                                )}
                            </Badge>

                            {onAction && (
                                <Button variant="ghost" size="sm" onClick={onAction} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    <Edit2 className="h-4 w-4 mr-1" />
                                    {status === 'selected' ? 'Change' : 'Select'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
