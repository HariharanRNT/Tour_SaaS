'use client'

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
        <div className="flex gap-4 relative group">
            {!isLast && (
                <div className="absolute left-[19px] top-10 bottom-0 w-px bg-gray-100 group-hover:bg-gray-200 transition-colors" />
            )}
            <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm border border-white transition-transform group-hover:scale-110",
                iconBg
            )}>
                <div className={iconColor}>
                    {icon}
                </div>
            </div>
            <div className="pb-6 flex-1">
                <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</p>
                    <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap ml-2">{time}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
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
                    title: "Agent Created"
                }
            case 'UPDATED':
                return {
                    icon: <UserCog className="h-4 w-4" />,
                    bg: "bg-blue-50",
                    color: "text-blue-600",
                    title: "Agent Updated"
                }
            case 'DEACTIVATED':
                return {
                    icon: <UserX className="h-4 w-4" />,
                    bg: "bg-red-50",
                    color: "text-red-600",
                    title: "Agent Deactivated"
                }
            case 'ACCOUNT_CREATED':
                return {
                    icon: <Building className="h-4 w-4" />,
                    bg: "bg-purple-50",
                    color: "text-purple-600",
                    title: "Account Created"
                }
            case 'PERMISSION_UPDATED':
                return {
                    icon: <ShieldCheck className="h-4 w-4" />,
                    bg: "bg-amber-50",
                    color: "text-amber-600",
                    title: "Permission Updated"
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
            title: details.title,
            description: act.description,
            time: act.time || "Just now"
        }
    })

    return (
        <div className="mt-2 text-left h-full">
            {displayActivities.length > 0 ? (
                displayActivities.slice(0, 5).map((activity, index) => (
                    <ActivityItem
                        key={index}
                        {...activity}
                        isLast={index === Math.min(displayActivities.length, 5) - 1}
                    />
                ))
            ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-gray-500">
                    <Clock className="h-8 w-8 text-gray-200 mb-2" />
                    <p className="text-sm">No recent activity</p>
                </div>
            )}
        </div>
    )
}
