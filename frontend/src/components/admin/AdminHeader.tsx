'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchAdminNotifications,
    markNotificationAsRead,
    fetchAgentNotifications,
    markAgentNotificationAsRead,
    clearAdminNotifications,
    clearAgentNotifications
} from '@/lib/api'
import { toast } from 'sonner'
import { Bell, Search, Settings, User, LogOut, Menu, Check, Plane } from 'lucide-react'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface AdminHeaderProps {
    onMenuClick?: () => void
}

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


export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
    const router = useRouter()
    const [userEmail, setUserEmail] = useState('')
    const [userData, setUserData] = useState<{ first_name?: string; last_name?: string; email?: string; role?: string } | null>(null)
    const userRole = getUserRole()

    const queryClient = useQueryClient()
    const isAdmin = userRole === 'admin' || userRole === 'ADMIN'
    const isAgent = userRole === 'agent' || userRole === 'AGENT' || userRole === 'sub_user' || userRole === 'SUB_USER'

    const { data: notifications = [] } = useQuery({
        queryKey: [isAdmin ? 'admin-notifications' : 'agent-notifications'],
        queryFn: isAdmin ? fetchAdminNotifications : fetchAgentNotifications,
        enabled: (isAdmin || isAgent),
        refetchInterval: 30000, // Poll every 30 seconds
        staleTime: 15000, // Keep data fresh for 15s to prevent refetch on navigation
        refetchOnWindowFocus: false
    })

    const markAsReadMutation = useMutation({
        mutationFn: isAdmin ? markNotificationAsRead : markAgentNotificationAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [isAdmin ? 'admin-notifications' : 'agent-notifications'] })
        }
    })

    const clearAllMutation = useMutation({
        mutationFn: isAdmin ? clearAdminNotifications : clearAgentNotifications,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [isAdmin ? 'admin-notifications' : 'agent-notifications'] })
            toast.success('All notifications cleared')
        },
        onError: () => {
            toast.error('Failed to clear notifications')
        }
    })

    const unreadCount = notifications.filter((n: any) => !n.is_read).length

    useEffect(() => {
        const userStr = localStorage.getItem('user')
        if (userStr) {
            try {
                const parsed = JSON.parse(userStr)
                setUserData(parsed)
                setUserEmail(parsed.email || '')
            } catch (e) {
                console.error("Failed to parse user data", e)
            }
        }
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('isAdmin')
        localStorage.removeItem('adminEmail')

        // If it was an agent or sub_user, go to agent login, else admin login
        const isAgentPortal = userRole === 'agent' || userRole === 'AGENT' || userRole === 'sub_user' || userRole === 'SUB_USER'
        router.push(isAgentPortal ? '/login' : '/admin/login')
    }

    // Determine branding based on role
    const logoImage = null
    const logoText = 'TourSaaS'

    // Fallback logo if no image
    const LogoIcon = () => (
        <div className="bg-blue-600 rounded-lg p-1.5 flex items-center justify-center">
            {isAgent ? (
                <Plane className="h-4 w-4 text-white" />
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white">
                    <path d="M2 12h20" />
                    <path d="M13 2v20" />
                    <path d="M16 8l4 4-4 4" />
                    <path d="M8 16l-4-4 4-4" />
                </svg>
            )}
        </div>
    )

    return (
        <header
            className="w-[calc(100%-32px)] mx-4 mt-4 h-[70px] px-6 flex items-center justify-between gap-4 transition-all duration-300 rounded-[24px] z-50 relative glass-agent"
        >

            <div className="flex items-center gap-4 flex-1">
                {onMenuClick && (
                    <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden text-black">
                        <Menu className="h-5 w-5" stroke="black" />
                    </Button>
                )}

                {/* Brand Logo & Name */}
                <div className="hidden md:flex items-center gap-2 mr-4 cursor-pointer" onClick={() => router.push('/')}>
                    {logoImage ? (
                        <img src={logoImage} alt="Logo" className="h-8 w-auto object-contain max-w-[150px]" />
                    ) : (
                        <LogoIcon />
                    )}
                    {!logoImage && (
                        <span className="font-bold text-lg tracking-tight text-black">
                            {logoText}
                        </span>
                    )}
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
                {isAgent && <ThemeSwitcher />}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-black hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors relative">
                            <Bell className="h-5 w-5" stroke="black" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--primary)] rounded-full border-2 border-white shadow-[0_0_8px_var(--primary-glow)]"></span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden shadow-2xl glass-popover">
                        <div className="p-4 border-b border-white/20 bg-white/5 flex items-center justify-between backdrop-blur-md">
                            <DropdownMenuLabel className="font-bold text-slate-800">Notifications</DropdownMenuLabel>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <Badge variant="secondary" className="bg-[var(--primary-soft)]/20 text-[var(--primary)] border-[var(--primary-soft)]/40">
                                        {unreadCount} New
                                    </Badge>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={() => clearAllMutation.mutate()}
                                        className="text-[10px] text-gray-500 hover:text-[var(--primary)] hover:underline transition-colors"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                        </div>
                        <ScrollArea className="max-h-[400px]">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-900">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No new notifications</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/10">
                                    {notifications.map((notification: any) => (
                                        <DropdownMenuItem
                                            key={notification.id}
                                            className={cn(
                                                "p-4 cursor-pointer flex flex-col items-start gap-1 glass-popover-item",
                                                !notification.is_read && "bg-white/10"
                                            )}
                                            onClick={() => {
                                                if (!notification.is_read) {
                                                    markAsReadMutation.mutate(notification.id)
                                                }
                                                if (notification.type === 'agent_registration') {
                                                    router.push('/admin/agents?status=pending')
                                                } else if (notification.type === 'success' && notification.title.includes('Booking')) {
                                                    router.push(isAgent ? '/agent/bookings' : '/admin/reports')
                                                }
                                            }}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-bold text-sm text-black">{notification.title}</span>
                                                <span className="text-[10px] text-black/80">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-black line-clamp-2">{notification.message}</p>
                                            {!notification.is_read && (
                                                <div className="w-2 h-2 bg-black rounded-full mt-1"></div>
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        <DropdownMenuSeparator />
                        <div className="p-2 border-t border-white/10">
                            <Button variant="ghost" className="w-full text-xs font-bold text-[var(--primary)] hover:bg-white/10 rounded-xl py-4"
                                onClick={() => router.push(isAgent ? '/agent/bookings' : '/admin/reports')}>
                                {isAgent ? 'View All Notifications' : 'View All Activity'}
                            </Button>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>



                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="pl-1.5 pr-3 py-1.5 gap-3 rounded-full hover:bg-white inset-shadow-sm hover:shadow transition-all duration-300 border border-transparent hover:border-[var(--primary)]/20 h-11 bg-white/20 backdrop-blur-md">
                            <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-md shadow-[var(--primary)]/30 border border-white/40">
                                {((userData?.first_name?.[0] || '') + (userData?.last_name?.[0] || (userRole === 'agent' ? 'A' : 'AD'))).toUpperCase()}
                            </div>
                            <div className="hidden sm:flex flex-col items-start gap-0.5">
                                <span className="text-sm font-bold text-black leading-tight">
                                    {(userRole === 'agent' || userRole === 'AGENT') ? 'Agent' :
                                        (userRole === 'sub_user' || userRole === 'SUB_USER') ? 'Staff' : 'Admin'}
                                </span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-black text-white rounded-md uppercase tracking-wider">
                                    {userData?.role === 'SUB_USER' ? 'Sub-User' : (userRole || 'Role')}
                                </span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56 glass-popover">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="glass-popover-item">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        {!isAdmin && (
                            <DropdownMenuItem className="glass-popover-item">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-400 glass-popover-item">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
