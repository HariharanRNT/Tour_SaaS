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
    BarChart2,
    MessageSquare
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
    const { user, logout, isSubUser, hasPermission } = useAuth()
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
                    { icon: MessageSquare, label: 'Enquiries', href: '/agent/enquiries', module: 'packages' }, // Using packages permission as fallback
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
                ...((userRole === 'agent' && !isSubUser) ? [
                    { icon: Users, label: 'Sub-Users', href: '/agent/settings/sub-users', module: 'settings' },
                ] : []),
            ].filter(item => {
                // If sub-user, check permissions explicitly using the AuthContext
                if (isSubUser && item.module) {
                    return hasPermission(item.module, 'view');
                }
                if (isSubUser && !item.module) {
                    return false; // Sub-users shouldn't see modules without explicit permissions defined
                }
                return true;
            }).filter(item => {
                // Remove Settings for Admin
                if (userRole === 'admin' && item.label === 'Settings') {
                    return false;
                }
                return true;
            })
        }
    ]

    return (
        <aside
            className={cn(
                "sidebar flex flex-col z-[100] transition-all duration-300",
                "fixed top-0 bottom-0 left-0",
                collapsed ? "w-[70px]" : "w-[260px]",
                className
            )}
        >
            {/* Logo Section */}
            <div className="shrink-0">
                {!collapsed && (
                    <Link 
                        href={(userRole === 'agent' || userRole === 'sub_user' || userRole === 'staff') ? '/agent/dashboard' : '/admin/dashboard'} 
                        className="sidebar-header group"
                    >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white/20 backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform">
                            <Briefcase className="w-6 h-6 text-black" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="title truncate">
                                {(userRole === 'agent' || userRole === 'sub_user' || userRole === 'staff') ? 'Agent Portal' : 'Admin Portal'}
                            </h2>
                            <p className="subtitle truncate">
                                Tour Operations
                            </p>
                        </div>
                    </Link>
                )}

                {collapsed && (
                    <div className="w-full flex justify-center py-6">
                        <div className="relative group">
                            <div className="absolute inset-0 blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-xl" style={{ backgroundColor: 'var(--primary)' }} />
                            <div className="p-2.5 rounded-xl border border-white/20 relative group-hover:scale-110 transition-transform duration-300 shadow-xl" style={{ backgroundColor: 'var(--primary)' }}>
                                <Plane className="h-5 w-5 text-black" />
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
                        className="h-8 w-8 !text-black hover:bg-black/10 rounded-lg transition-all duration-300"
                        title="Collapse sidebar"
                    >
                        <ChevronLeft className="h-4 w-4" stroke="black" />
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
                                            "nav-item flex items-center transition-all duration-300 relative group gap-[12px]",
                                            isActive && "active",
                                            collapsed ? "justify-center p-3 mx-3 my-1.5" : "px-[16px] py-[10.5px] mx-3 my-1.5"
                                        )}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        {/* Icon */}
                                        <item.icon
                                            className={cn(
                                                "icon transition-all duration-300 flex-shrink-0",
                                                isActive && "scale-110"
                                            )}
                                        />

                                        {/* Label & Indicator */}
                                        {!collapsed && (
                                            <div className="flex items-center gap-3 flex-1">
                                                <span className="nav-label tracking-tight">{item.label}</span>
                                            </div>
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
                            className="h-8 w-8 !text-black hover:bg-black/10 rounded-full"
                            title="Expand sidebar"
                        >
                            <ChevronRight className="h-4 w-4" stroke="black" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Bottom Actions (Footer Section) */}
            <div className="shrink-0 mt-auto">

                {/* User Avatar & Name */}
                {!collapsed ? (
                    <div className="sidebar-user transform transition-all hover:bg-white/20">
                        {/* Avatar circle with branded background */}
                        <div className="user-avatar h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                            {((user?.first_name?.[0] || '') + (user?.last_name?.[0] || 'U')).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="user-name truncate">
                                {user?.first_name} {user?.last_name}
                            </p>
                            <p className="user-role truncate uppercase tracking-wider font-bold">
                                {isSubUser ? `Staff | ${user?.agency_name || 'Agent'}` : (userRole === 'admin' ? 'Administrator' : 'Agent Owner')}
                            </p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                                className="h-8 w-8 text-black hover:text-[var(--primary)] hover:bg-black/10 rounded-lg shrink-0 transition-colors" 
                            onClick={() => {
                                logout()
                                window.location.href = userRole === 'admin' ? '/admin/login' : '/login'
                            }}
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex justify-center p-3 border-t border-white/30">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-black hover:text-[var(--primary)] hover:bg-black/10 rounded-xl transition-all" 
                            onClick={() => {
                                logout()
                                window.location.href = userRole === 'admin' ? '/admin/login' : '/login'
                            }}
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </aside>
    )
}
