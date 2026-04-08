'use client'

import React, { useState } from 'react'
import { UserPlus, UserCog, UserX, ShieldCheck, Building, Clock, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react'
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
        <div className="flex gap-6 relative group">
            {/* Timeline Connector */}
            <div className="absolute left-[23px] top-0 bottom-0 w-px flex flex-col items-center">
                {!isLast && (
                    <div className="w-px h-full bg-gradient-to-b from-slate-200 via-slate-100 to-transparent flex-1" />
                )}
            </div>

            {/* Icon Container with specific color rings */}
            <div className={cn(
                "h-12 w-12 rounded-[18px] flex items-center justify-center shrink-0 z-10 shadow-lg border-2 border-white transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl relative",
                iconBg
            )}>
                {/* Visual pulse for important events */}
                {(title.includes('Failed') || title.includes('Alert')) && (
                    <div className="absolute inset-0 rounded-[18px] animate-ping opacity-20 bg-current pointer-events-none" />
                )}

                <div className={cn("transform transition-transform duration-500 group-hover:rotate-12", iconColor)}>
                    {icon}
                </div>
            </div>

            {/* Content Area */}
            <div className="pb-10 flex-1 relative">
                <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-[900] text-black group-hover:text-[#FF692B] transition-colors tracking-tight">
                        {title}
                    </h4>
                    <span className="text-[9px] font-black text-black whitespace-nowrap ml-4 bg-white/80 border border-slate-50 px-2.5 py-1 rounded-lg shadow-sm group-hover:border-orange-100 transition-colors">
                        {time}
                    </span>
                </div>
                <p className="text-[11px] text-black line-clamp-2 leading-relaxed font-bold group-hover:opacity-100 transition-opacity">
                    {description}
                </p>

                {/* Micro-interaction: visual dot on hover */}
                <div className="absolute -left-[30px] top-5 h-1.5 w-1.5 rounded-full bg-white border-2 border-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-0 group-hover:scale-150 z-20" />
            </div>
        </div>
    )
}

export function RecentActivityFeed({ activities = [] }: { activities?: any[] }) {
    const [filter, setFilter] = useState('ALL')

    const getIconDetails = (type: string) => {
        switch (type) {
            case 'AGENT_REGISTERED':
            case 'CREATED':
                return {
                    icon: <UserPlus className="h-4 w-4" />,
                    bg: "bg-emerald-50",
                    color: "text-emerald-600",
                    title: "New Agent Registered",
                    category: 'AGENTS'
                }
            case 'SUBSCRIPTION_PURCHASED':
                return {
                    icon: <CheckCircle2 className="h-4 w-4" />,
                    bg: "bg-indigo-50",
                    color: "text-indigo-600",
                    title: "Subscription Purchased",
                    category: 'PAYMENTS'
                }
            case 'PLAN_RENEWED':
                return {
                    icon: <CreditCard className="h-4 w-4" />,
                    bg: "bg-blue-50",
                    color: "text-blue-600",
                    title: "Plan Renewed",
                    category: 'PAYMENTS'
                }
            case 'PAYMENT_FAILED':
                return {
                    icon: <AlertCircle className="h-4 w-4" />,
                    bg: "bg-rose-50",
                    color: "text-rose-600",
                    title: "Payment Failed",
                    category: 'PAYMENTS'
                }
            case 'AGENT_DEACTIVATED':
                return {
                    icon: <UserX className="h-4 w-4" />,
                    bg: "bg-slate-100",
                    color: "text-black",
                    title: "Agent Deactivated",
                    category: 'AGENTS'
                }
            case 'SYSTEM_ALERT':
                return {
                    icon: <AlertCircle className="h-4 w-4" />,
                    bg: "bg-amber-50",
                    color: "text-amber-600",
                    title: "System Alert",
                    category: 'SYSTEM'
                }
            default:
                return {
                    icon: <Clock className="h-4 w-4" />,
                    bg: "bg-slate-50",
                    color: "text-black",
                    title: type || "System Event",
                    category: 'SYSTEM'
                }
        }
    }

    const processedActivities = activities.map(act => {
        const details = getIconDetails(act.type);
        return {
            ...act,
            icon: details.icon,
            iconBg: details.bg,
            iconColor: details.color,
            title: details.title,
            category: details.category
        }
    });

    const filteredActivities = filter === 'ALL'
        ? processedActivities
        : processedActivities.filter(act => act.category === filter);

    return (
        <div className="flex flex-col h-full">
            {/* SaaS Activity Filters */}
            <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {['ALL', 'PAYMENTS', 'AGENTS', 'SYSTEM'].map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all border shrink-0",
                            filter === cat
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                                : "bg-white/50 text-black border-white hover:bg-white hover:text-indigo-600"
                        )}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-1">
                {filteredActivities.length > 0 ? (
                    filteredActivities.slice(0, 8).map((activity, index) => (
                        <ActivityItem
                            key={index}
                            {...activity}
                            isLast={index === Math.min(filteredActivities.length, 8) - 1}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-[150px] text-black">
                        <Clock className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-[11px] font-black uppercase tracking-widest">No activity recorded</p>
                    </div>
                )}
            </div>
        </div>
    )
}
