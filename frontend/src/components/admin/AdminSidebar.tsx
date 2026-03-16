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
    Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Utility to get user role
function getUserRole(): string | null {
    if (typeof window === 'undefined') return null
    try {
        const user = localStorage.getItem('user')
        if (!user) return null
        return JSON.parse(user).role?.toLowerCase() || null
    } catch {
        return null
    }
}


interface SidebarProps {
    className?: string
    onCollapsedChange?: (collapsed: boolean) => void
}

export function AdminSidebar({ className, onCollapsedChange }: SidebarProps) {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)
    const [userData, setUserData] = useState<{ first_name?: string; last_name?: string; email?: string; role?: string } | null>(null)

    useEffect(() => {
        const userStr = localStorage.getItem('user')
        if (userStr) {
            try {
                setUserData(JSON.parse(userStr))
            } catch (e) {
                console.error("Failed to parse user data", e)
            }
        }
    }, [])

    const userRole = userData?.role?.toLowerCase() || (pathname?.startsWith('/agent') ? 'agent' : 'admin')

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
                { icon: LayoutDashboard, label: 'Dashboard', href: userRole === 'agent' ? '/agent/dashboard' : '/admin/dashboard' },

                // Agent Specific Items
                ...(userRole === 'agent' ? [
                    { icon: Package, label: 'Manage Packages', href: '/agent/packages' },
                    { icon: Map, label: 'Activity Master', href: '/agent/activities' },
                    { icon: Calendar, label: 'My Bookings', href: '/agent/bookings' },
                ] : []),

                // Admin Specific Items
                ...(userRole !== 'agent' ? [
                    { icon: Users, label: 'Agents', href: '/admin/agents' },
                ] : []),

                { icon: Receipt, label: 'Billing & Finance', href: userRole === 'agent' ? '/agent/subscription' : '/admin/billing' },

                // More Admin Specific Items
                ...(userRole !== 'agent' ? [
                    { icon: BarChart3, label: 'Reports', href: '/admin/reports' },
                ] : []),

                { icon: Settings, label: 'Settings', href: userRole === 'agent' ? '/agent/settings' : '/admin/settings' },
            ]
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
                background: 'var(--sidebar-bg)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRightColor: 'rgba(255,255,255,0.12)',
            }}
        >
            {/* Subtle inner glow on right edge */}
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[var(--primary-light)]/40 to-transparent" />

            {/* Logo Section */}
            <div className="h-20 flex px-5 items-center justify-between border-b border-white/30 shrink-0">
                {!collapsed && (
                    <div className="flex-1 flex flex-col min-w-0 pr-2">
                        <Link href={userRole === 'agent' ? '/agent/dashboard' : '/admin/dashboard'} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.10)' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--primary)' }}>
                                <Briefcase className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-bold text-white tracking-tight leading-tight block truncate text-[15px]">
                                    {userRole === 'agent' ? 'Agent Portal' : 'Admin Portal'}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-slate-300 font-medium block truncate">
                                    Tour Operations
                                </span>
                            </div>
                        </Link>
                    </div>
                )}

                {collapsed && (
                    <div className="w-full flex justify-center">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-[var(--primary)] blur-lg opacity-30 group-hover:opacity-50 transition-opacity rounded-xl" />
                            <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] p-2.5 rounded-xl relative group-hover:scale-105 transition-transform duration-300">
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
                                            "flex items-center text-[14px] transition-all duration-200 relative group gap-[10px]",
                                            isActive
                                                ? "text-white"
                                                : "hover:bg-white/10 hover:text-white",
                                            collapsed ? "justify-center p-3 rounded-xl mx-3 my-1" : "px-[16px] py-[10px] rounded-[10px] mx-3 my-1"
                                        )}
                                        style={isActive ? {
                                            color: '#ffffff',
                                            background: 'linear-gradient(135deg, var(--primary), var(--gradient-mid))',
                                            borderLeft: collapsed ? 'none' : '3px solid rgba(255,255,255,0.80)',
                                            fontWeight: 600,
                                            boxShadow: '0 4px 16px var(--primary-glow)',
                                        } : {
                                            color: 'rgba(255, 255, 255, 0.70)',
                                            fontWeight: 500,
                                        }}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        {/* Icon */}
                                        <item.icon
                                            className={cn(
                                                "h-5 w-5 transition-all duration-300 flex-shrink-0",
                                                isActive
                                                    ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] scale-110"
                                                    : "group-hover:text-white group-hover:scale-110"
                                            )}
                                            style={isActive ? {
                                                fill: 'rgba(255, 255, 255, 0.2)', // Subtle fill for active outline icons
                                                strokeWidth: 2.5 // Thicker for active state
                                            } : {
                                                color: 'rgba(255,255,255,0.60)',
                                                strokeWidth: 2 // Standard outline for inactive
                                            }}
                                        />

                                        {/* Label */}
                                        {!collapsed && <span>{item.label}</span>}

                                        {/* Hover glow bubble for inactive */}
                                        {!isActive && (
                                            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/10 pointer-events-none" />
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
                            {((userData?.first_name?.[0] || '') + (userData?.last_name?.[0] || 'A')).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white/90 truncate">
                                {userData?.first_name || (userRole === 'agent' ? 'Agent' : 'Admin')}
                            </p>
                            <p className="text-xs text-white/60 truncate">
                                {userData?.email || (userRole === 'agent' ? 'agent@toursaas.com' : 'admin@toursaas.com')}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/20 rounded-lg flex-shrink-0 transition-colors" onClick={() => {
                            localStorage.removeItem('token')
                            localStorage.removeItem('user')
                            localStorage.removeItem('isAdmin')
                            localStorage.removeItem('adminEmail')
                            window.location.href = userRole === 'agent' ? '/login' : '/admin/login'
                        }}>
                            <LogOut className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex justify-center mt-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-white/60 hover:text-white hover:bg-white/20 rounded-xl transition-colors" onClick={() => {
                            localStorage.removeItem('token')
                            localStorage.removeItem('user')
                            localStorage.removeItem('isAdmin')
                            localStorage.removeItem('adminEmail')
                            window.location.href = userRole === 'agent' ? '/login' : '/admin/login'
                        }}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </aside>
    )
}
