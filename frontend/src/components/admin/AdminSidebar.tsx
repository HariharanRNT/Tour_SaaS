'use client'

import { useState, useEffect } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Calendar,
    Users,
    User,
    Map,
    Receipt,
    BarChart3,
    Activity,
    Settings,
    HelpCircle,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Plane,
    Package,
    Briefcase,
    BarChart2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useAuth } from '@/context/AuthContext'

interface SidebarProps {
    className?: string
    onCollapsedChange?: (collapsed: boolean) => void
}

export function AdminSidebar({ className, onCollapsedChange }: SidebarProps) {
    const pathname = usePathname()
    const { user, logout, isSubUser } = useAuth()
    const [collapsed, setCollapsed] = useState(false)

    const userRole = user?.role?.toLowerCase() || (pathname?.startsWith('/agent') ? 'agent' : 'admin')

    const toggleSidebar = () => {
        const newCollapsed = !collapsed
        setCollapsed(newCollapsed)
        if (onCollapsedChange) {
            onCollapsedChange(newCollapsed)
        }
    }

    const menuItems = [
        {
            group: 'Primary',
            items: [
                { 
                    icon: LayoutDashboard, 
                    label: 'Dashboard', 
                    href: userRole === 'admin' ? '/admin/dashboard' : '/agent/dashboard',
                    module: 'dashboard'
                },

                // Agent / Sub-User Specific Items
                ...(userRole !== 'admin' ? [
                    { icon: Package, label: 'Manage Packages', href: '/agent/packages', module: 'packages' },
                    { icon: Map, label: 'Activity Master', href: '/agent/activities', module: 'activities' },
                    { icon: Calendar, label: 'Booking Report', href: '/agent/bookings', module: 'bookings' },
                ] : []),

                // Admin Specific Items
                ...(userRole === 'admin' ? [
                    { icon: Users, label: 'Agents', href: '/admin/agents' },
                ] : []),

                { 
                    icon: Receipt, 
                    label: 'Billing', 
                    href: userRole === 'admin' ? '/admin/billing' : '/agent/subscription',
                    module: 'billing'
                },

                { 
                    icon: BarChart2, 
                    label: 'Finance Reports', 
                    href: userRole === 'admin' ? '/admin/reports' : '/agent/reports',
                    module: 'finance_reports'
                },

                { 
                    icon: Settings, 
                    label: 'Settings', 
                    href: userRole === 'admin' ? '/admin/settings' : '/agent/settings',
                    module: 'settings'
                },

                // Sub-Users management
                ...((userRole === 'agent' && !isSubUser) || (isSubUser && user?.permissions?.some(p => p.module === 'settings')) ? [
                    { icon: Users, label: 'Sub-Users', href: '/agent/settings/sub-users', module: 'settings' },
                ] : []),
            ].filter(item => {
                // If sub-user, check permissions array
                if (isSubUser && item.module) {
                    return user?.permissions?.some(p => p.module === item.module);
                }
                return true;
            })
        }
    ]

    return (
        <aside
            className={cn(
                "flex flex-col z-[100] border-r",
                "fixed top-0 bottom-0 left-0",
                collapsed ? "w-[70px]" : "w-[260px]",
                className
            )}
            style={{
                background: 'rgba(255, 255, 255, 0.35)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                borderRight: '1px solid rgba(255, 250, 245, 0.2)'
            }}
        >
            {/* Subtle inner glow on right edge */}
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[var(--primary-light)]/40 to-transparent" />

            {/* Logo Section */}
            <div className="h-20 flex px-5 items-center justify-between border-b border-white/30 shrink-0">
                {!collapsed && (
                    <div className="flex-1 flex flex-col min-w-0 pr-2">
                        <Link href={userRole === 'agent' ? '/agent/dashboard' : '/admin/dashboard'} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/40 shadow-xl transition-all hover:scale-[1.02] relative group" style={{ background: 'linear-gradient(135deg, #FF8C5A, #E06830)', boxShadow: '0 4px 15px rgba(224, 104, 48, 0.35)' }}>
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/20 backdrop-blur-sm shadow-inner">
                                <Briefcase className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-bold text-white tracking-tight leading-tight block truncate text-[14px]">
                                    {userRole === 'agent' ? 'Agent Portal' : 'Admin Portal'}
                                </span>
                                <span className="text-[9px] uppercase tracking-widest text-white/80 font-black block truncate">
                                    Tour Operations
                                </span>
                            </div>
                        </Link>
                    </div>
                )}

                {collapsed && (
                    <div className="w-full flex justify-center">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-[#FF8C5A] blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-xl" />
                            <div className="bg-gradient-to-br from-[#FF8C5A] to-[#E06830] p-2.5 rounded-xl border border-white/20 relative group-hover:scale-110 transition-transform duration-300 shadow-xl">
                                <Plane className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Toggle Button */}
                {!collapsed && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                        title="Collapse sidebar"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Navigation Items (Middle Section) */}
            <div className="flex-1 overflow-y-auto py-5">
                <nav className="space-y-1 px-3">
                    {menuItems.map((group, groupIndex) => (
                        <div key={groupIndex} className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center text-[13px] transition-all duration-300 relative group gap-[12px]",
                                            isActive
                                                ? "text-white"
                                                : "hover:bg-white/5 hover:text-white",
                                            collapsed ? "justify-center p-3 rounded-xl mx-3 my-1.5" : "px-[16px] py-[10.5px] rounded-full mx-3 my-1.5"
                                        )}
                                        style={isActive ? {
                                            color: '#ffffff',
                                            background: 'linear-gradient(135deg, rgba(255, 140, 90, 0.25), rgba(255, 179, 138, 0.15))',
                                            border: '1px solid rgba(255, 140, 90, 0.3)',
                                            fontWeight: 700,
                                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)'
                                        } : {
                                            color: 'rgba(60, 40, 30, 0.65)',
                                            fontWeight: 500
                                        }}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        {/* Icon */}
                                        <item.icon
                                            className={cn(
                                                "h-5 w-5 transition-all duration-300 flex-shrink-0",
                                                isActive
                                                    ? "text-[#FF8C5A] drop-shadow-[0_0_8px_rgba(255,140,90,0.4)] scale-110"
                                                    : "group-hover:text-white group-hover:scale-110"
                                            )}
                                            style={isActive ? {
                                                strokeWidth: 2.5
                                            } : {
                                                color: 'rgba(255,255,255,0.50)',
                                                strokeWidth: 2
                                            }}
                                        />

                                        {/* Label & Indicator */}
                                        {!collapsed && (
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                    isActive
                                                        ? "bg-[#FF8C5A] shadow-[0_0_8px_rgba(255,140,90,0.8)] scale-125"
                                                        : "bg-black/10"
                                                )} />
                                                <span className="tracking-tight">{item.label}</span>
                                            </div>
                                        )}

                                        {/* Hover glow bubble for inactive */}
                                        {!isActive && (
                                            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[#FF8C5A]/5 pointer-events-none border border-transparent group-hover:border-[#FF8C5A]/10" />
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    ))}
                </nav>

                {/* Expand button when collapsed — shown in nav area */}
                {collapsed && (
                    <div className="mt-4 flex justify-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="h-8 w-8 hover:bg-white/10 rounded-full"
                            style={{ color: 'rgba(255,255,255,0.60)' }}
                            title="Expand sidebar"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Bottom Actions (Footer Section) */}
            <div className="p-3 border-t border-white/30 space-y-1 shrink-0 mt-auto">
                <Link
                    href="/admin/help"
                    className={cn(
                        "flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group hover:bg-white/10",
                        collapsed && "justify-center px-0"
                    )}
                    style={{ color: 'rgba(255,255,255,0.50)', fontSize: '13px' }}
                    title="Help & Support"
                >
                    <HelpCircle className={cn("h-4 w-4 transition-colors group-hover:text-white", !collapsed && "mr-2")} style={{ color: 'rgba(255,255,255,0.50)' }} />
                    {!collapsed && <span>Help & Support</span>}
                </Link>

                {/* User Avatar & Name */}
                {!collapsed ? (
                    <div className="flex items-center gap-3 px-3 py-3 mt-1 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm shadow-sm hover:bg-white/20 transition-colors">
                        {/* Avatar circle with branded background */}
                        <div className="h-8 w-8 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm shadow-md shadow-[var(--primary)]/20 flex-shrink-0">
                            {((user?.first_name?.[0] || '') + (user?.last_name?.[0] || 'U')).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white/90 truncate">
                                {user?.first_name} {user?.last_name}
                            </p>
                            <p className="text-[10px] text-white/60 truncate uppercase tracking-wider font-bold">
                                {isSubUser ? `Staff | ${user?.agency_name || 'Agent'}` : (userRole === 'admin' ? 'Administrator' : 'Agent Owner')}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/20 rounded-lg flex-shrink-0 transition-colors" onClick={() => {
                            logout()
                            window.location.href = userRole === 'admin' ? '/admin/login' : '/login'
                        }}>
                            <LogOut className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex justify-center mt-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-white/60 hover:text-white hover:bg-white/20 rounded-xl transition-colors" onClick={() => {
                            logout()
                            window.location.href = userRole === 'admin' ? '/admin/login' : '/login'
                        }}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </aside>
    )
}
