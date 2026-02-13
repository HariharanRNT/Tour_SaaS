'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, UserCog, UserX, ShieldCheck, Building, Clock } from 'lucide-react'
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

export function RecentActivityFeed({ activities = [] }: { activities?: any[] }) {

    const getIconDetails = (type: string) => {
        switch (type) {
            case 'CREATED':
                return {
                    icon: <UserPlus className="h-4 w-4" />,
                    bg: "bg-green-50",
                    color: "text-green-600",
                    title: "🆕 Agent Created"
                }
            case 'UPDATED':
                return {
                    icon: <UserCog className="h-4 w-4" />,
                    bg: "bg-blue-50",
                    color: "text-blue-600",
                    title: "✏️ Agent Updated"
                }
            case 'DEACTIVATED':
                return {
                    icon: <UserX className="h-4 w-4" />,
                    bg: "bg-red-50",
                    color: "text-red-600",
                    title: "🚫 Agent Deactivated"
                }
            case 'ACCOUNT_CREATED':
                return {
                    icon: <Building className="h-4 w-4" />,
                    bg: "bg-purple-50",
                    color: "text-purple-600",
                    title: "🏢 Account Created"
                }
            case 'PERMISSION_UPDATED':
                return {
                    icon: <ShieldCheck className="h-4 w-4" />,
                    bg: "bg-amber-50",
                    color: "text-amber-600",
                    title: "🔐 Permission Updated"
                }
            default:
                return {
                    icon: <UserCog className="h-4 w-4" />,
                    bg: "bg-gray-50",
                    color: "text-gray-600",
                    title: "Activity"
                }
        }
    }

    const displayActivities = activities.map(act => {
        const details = getIconDetails(act.type);
        return {
            icon: details.icon,
            iconBg: details.bg,
            iconColor: details.color,
            title: details.title, // Use mapped title or fallback to backend title if unique
            description: act.description,
            time: act.time || "JUST NOW"
        }
    })

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Agent & Account Activity</CardTitle>
                <CardDescription>Recent high-level control actions</CardDescription>
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
