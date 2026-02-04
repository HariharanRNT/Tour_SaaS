'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Users, FileText, CheckCircle2, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityItemProps {
    icon: React.ReactNode
    iconBg: string
    iconColor: string
    title: string
    description: string
    time: string
    isLast?: boolean
}

function ActivityItem({ icon, iconBg, iconColor, title, description, time, isLast }: ActivityItemProps) {
    return (
        <div className="flex gap-4 relative">
            {!isLast && (
                <div className="absolute left-[19px] top-10 bottom-0 w-px bg-gray-100" />
            )}
            <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm",
                iconBg
            )}>
                <div className={iconColor}>
                    {icon}
                </div>
            </div>
            <div className="pb-6">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-[10px] font-medium text-gray-400 uppercase">{time}</span>
                </div>
            </div>
        </div>
    )
}

export function RecentActivityFeed({ packages = [] }: { packages?: any[] }) {
    // Combine real package events with some mock events for a rich feed
    const packageActivities = packages.map(pkg => ({
        icon: <Package className="h-4 w-4" />,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        title: "Package Created/Updated",
        description: pkg.title,
        time: pkg.date ? `${pkg.date.toUpperCase()}` : "RECENTLY"
    }))

    const mockActivities = [
        {
            icon: <CheckCircle2 className="h-4 w-4" />,
            iconBg: "bg-green-50",
            iconColor: "text-green-600",
            title: "Booking Confirmed",
            description: "Booking #BK-8291 for Bali Escape was confirmed",
            time: "5 HOURS AGO"
        },
        {
            icon: <Users className="h-4 w-4" />,
            iconBg: "bg-purple-50",
            iconColor: "text-purple-600",
            title: "New Agent Registered",
            description: "Siddharth Malhotra joined as a certified agent",
            time: "1 DAY AGO"
        },
        {
            icon: <FileText className="h-4 w-4" />,
            iconBg: "bg-orange-50",
            iconColor: "text-orange-600",
            title: "Payment Received",
            description: "₹45,000 received for Booking #BK-7721",
            time: "1 DAY AGO"
        }
    ]

    // Priority to real data, append mock for visual fullness
    const displayActivities = [...packageActivities, ...mockActivities].slice(0, 5)

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from across the platform</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mt-2 text-left">
                    {displayActivities.length > 0 ? (
                        displayActivities.map((activity, index) => (
                            <ActivityItem
                                key={index}
                                {...activity}
                                isLast={index === displayActivities.length - 1}
                            />
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 py-4 text-center">No recent activity</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
