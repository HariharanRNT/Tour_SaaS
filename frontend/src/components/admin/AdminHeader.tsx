'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAdminNotifications, markNotificationAsRead } from '@/lib/api'
import { Bell, Search, HelpCircle, Settings, User, LogOut, Menu, Check } from 'lucide-react'
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
    DropdownMenuTrigger,
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


import { Plane } from 'lucide-react'

// ...

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
    const router = useRouter()
    const [userEmail, setUserEmail] = useState('')
    const [userData, setUserData] = useState<{ first_name?: string; last_name?: string } | null>(null)
    const userRole = getUserRole()

    const queryClient = useQueryClient()
    const { data: notifications = [] } = useQuery({
        queryKey: ['admin-notifications'],
        queryFn: fetchAdminNotifications,
        enabled: userRole === 'admin' || userRole === 'ADMIN',
        refetchInterval: 30000 // Poll every 30 seconds
    })

    const markAsReadMutation = useMutation({
        mutationFn: markNotificationAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
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
        router.push(userRole === 'agent' ? '/login' : '/admin/login')
    }

    // Determine branding based on role
    const isAgent = userRole === 'agent'
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
            className="w-[calc(100%-32px)] mx-4 mt-4 h-[70px] px-6 flex items-center justify-between gap-4 transition-all duration-300 rounded-[24px] z-50 relative"
            style={{
                background: 'rgba(255,255,255,0.20)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--primary-light)',
                boxShadow: '0 8px 32px var(--primary-glow)'
            }}
        >

            <div className="flex items-center gap-4 flex-1">
                {onMenuClick && (
                    <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
                        <Menu className="h-5 w-5" />
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
                        <span className="font-bold text-lg tracking-tight text-slate-900">
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
                        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors relative">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--primary)] rounded-full border-2 border-white shadow-[0_0_8px_rgba(255,107,43,0.6)]"></span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden rounded-2xl border-indigo-100 shadow-2xl glass-card">
                        <div className="p-4 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
                            <DropdownMenuLabel className="font-bold text-slate-800">Notifications</DropdownMenuLabel>
                            {unreadCount > 0 && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-600 border-orange-200">
                                    {unreadCount} New
                                </Badge>
                            )}
                        </div>
                        <ScrollArea className="max-h-[400px]">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-indigo-50">
                                    {notifications.map((notification: any) => (
                                        <DropdownMenuItem 
                                            key={notification.id}
                                            className={cn(
                                                "p-4 cursor-pointer focus:bg-indigo-50/50 flex flex-col items-start gap-1 transition-colors",
                                                !notification.is_read && "bg-indigo-50/30"
                                            )}
                                            onClick={() => {
                                                if (!notification.is_read) {
                                                    markAsReadMutation.mutate(notification.id)
                                                }
                                                if (notification.type === 'agent_registration') {
                                                    router.push('/admin/agents?status=pending')
                                                }
                                            }}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-bold text-sm text-slate-800">{notification.title}</span>
                                                <span className="text-[10px] text-slate-400">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-2">{notification.message}</p>
                                            {!notification.is_read && (
                                                <div className="w-2 h-2 bg-orange-500 rounded-full mt-1"></div>
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        <DropdownMenuSeparator />
                        <div className="p-2">
                             <Button variant="ghost" className="w-full text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl py-4" onClick={() => router.push('/admin/reports')}>
                                View All Activity
                             </Button>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 hidden sm:flex">
                    <HelpCircle className="h-5 w-5" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="pl-1.5 pr-3 py-1.5 gap-3 rounded-full hover:bg-white inset-shadow-sm hover:shadow transition-all duration-300 border border-transparent hover:border-[var(--primary)]/20 h-11 bg-white/20 backdrop-blur-md">
                            <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-md shadow-[var(--primary)]/30 border border-white/40">
                                {((userData?.first_name?.[0] || '') + (userData?.last_name?.[0] || (userRole === 'agent' ? 'A' : 'AD'))).toUpperCase()}
                            </div>
                            <div className="hidden sm:flex flex-col items-start gap-0.5">
                                <span className="text-sm font-bold text-gray-800 leading-tight">
                                    {userRole === 'agent' ? 'Agent' : 'Admin'}
                                </span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md uppercase tracking-wider">
                                    {userRole || 'Role'}
                                </span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
