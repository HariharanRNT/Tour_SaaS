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
    Package
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
}

export function AdminSidebar({ className }: SidebarProps) {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)
    const [userData, setUserData] = useState<{ first_name?: string; email?: string; role?: string } | null>(null)

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
        setCollapsed(!collapsed)
    }

    const startNewPlan = () => {
        // Functionality for "Start New Plan" if needed globally, 
        // or just a visual element as per design file (though design file mentions it for user dashboard, 
        // useful to have a primary action here too if relevant, otherwise skip).
        // For Admin, maybe "Create Booking" or "Add Agent"
    }

    const menuItems = [
        {
            group: 'Primary',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', href: userRole === 'agent' ? '/agent/dashboard' : '/admin/dashboard' },

                // Agent Specific Items
                ...(userRole === 'agent' ? [
                    { icon: Package, label: 'Manage Packages', href: '/agent/packages' },
                    { icon: Users, label: 'Customers', href: '/agent/customers' },
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
                    { icon: Activity, label: 'System Health', href: '/admin/system-health' },
                ] : []),

                { icon: Settings, label: 'Settings', href: userRole === 'agent' ? '/agent/settings' : '/admin/settings' },
            ]
        }
    ]




    return (
        <aside
            className={cn(
                "bg-[#111827] border-r border-white/5 h-screen sticky top-0 flex flex-col transition-all duration-300 z-50 shadow-2xl",
                collapsed ? "w-20" : "w-64",
                className
            )}
        >
            {/* Logo Section */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-black/20 backdrop-blur-sm">

                {!collapsed && (
                    <Link href="/admin/dashboard" className="flex items-center gap-3">
                        <div className="bg-[#6366F1] p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                            <Plane className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-black text-xl text-white tracking-tight uppercase">TourSaaS</span>
                    </Link>
                )}

                {collapsed && (
                    <div className="w-full flex justify-center">
                        <div className="bg-[#6366F1] p-2 rounded-xl">
                            <Plane className="h-5 w-5 text-white" />
                        </div>
                    </div>
                )}

                {/* Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className={cn(
                        "h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300",
                        collapsed && "mx-auto"
                    )}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? (
                        <ChevronRight className="h-5 w-5" />
                    ) : (
                        <ChevronLeft className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto py-6">
                <nav className="space-y-2 px-4">
                    {menuItems.map((group, groupIndex) => (
                        <div key={groupIndex} className="space-y-1">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 relative group mb-1",
                                            isActive
                                                ? "bg-[#6366F1] text-white shadow-lg shadow-indigo-500/30 scale-[1.02]"
                                                : "text-slate-400 hover:bg-white/5 hover:text-white",
                                            collapsed && "justify-center px-0"
                                        )}
                                        title={collapsed ? item.label : undefined}
                                    >

                                        {isActive && !collapsed && (
                                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-full" />
                                        )}

                                        <item.icon className={cn(
                                            "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                                            isActive ? "text-white" : "text-slate-500 group-hover:text-white",
                                            !collapsed && "mr-3"
                                        )} />

                                        {!collapsed && <span>{item.label}</span>}
                                    </Link>
                                )
                            })}
                        </div>
                    ))}
                </nav>
            </div>


            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-100 space-y-1">
                <Link
                    href="/admin/help"
                    className={cn(
                        "flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all duration-300 mx-2",
                        collapsed && "justify-center px-0 mx-2"
                    )}
                    title="Help & Support"
                >
                    <HelpCircle className={cn("h-5 w-5 text-white/60", !collapsed && "mr-3")} />
                    {!collapsed && <span>Help & Support</span>}
                </Link>


                {/* Admin Profile - Simplified for sidebar */}
                {!collapsed ? (
                    <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm mx-2 shadow-inner shadow-white/5">
                        <div className="bg-white/20 p-2 rounded-xl border border-white/20">
                            <User className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                                {userData?.first_name || (userRole === 'agent' ? 'Agent' : 'Admin')}
                            </p>
                            <p className="text-xs text-white/50 truncate">
                                {userData?.email || (userRole === 'agent' ? 'agent@toursaas.com' : 'admin@toursaas.com')}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-red-300 hover:bg-white/10 rounded-lg" onClick={() => {
                            localStorage.removeItem('token')
                            localStorage.removeItem('user')
                            localStorage.removeItem('isAdmin')
                            localStorage.removeItem('adminEmail')
                            window.location.href = userRole === 'agent' ? '/login' : '/admin/login'
                        }}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>

                ) : (
                    <div className="flex justify-center mt-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-white/40 hover:text-red-300 hover:bg-white/10 rounded-xl" onClick={() => {
                            localStorage.removeItem('token')
                            localStorage.removeItem('user')
                            localStorage.removeItem('isAdmin')
                            localStorage.removeItem('adminEmail')
                            window.location.href = userRole === 'agent' ? '/login' : '/admin/login'
                        }}>
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                )}

            </div>
        </aside>
    )
}
