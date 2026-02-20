'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Search,
    Bell,
    HelpCircle,
    Settings,
    User,
    LogOut,
    Menu
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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


import { useTheme } from '@/context/ThemeContext'
import { Plane } from 'lucide-react'

// ...

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
    const router = useRouter()
    const { theme } = useTheme() // Get theme context
    const [userEmail, setUserEmail] = useState('')
    const userRole = getUserRole()

    // ... (useEffect remains same) ...

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('isAdmin')
        localStorage.removeItem('adminEmail')
        router.push(userRole === 'agent' ? '/login' : '/admin/login')
    }

    // Determine branding based on role
    const isAgent = userRole === 'agent'
    const logoImage = isAgent ? theme.navbar_logo_image : null
    const logoText = isAgent ? (theme.navbar_logo_text || 'TourSaaS') : 'TourSaaS'

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
        <header className="bg-[#F0FAFF] border-b border-gray-200 sticky top-0 z-40 h-16 px-6 flex items-center justify-between gap-4 shadow-sm backdrop-blur-md bg-opacity-80">

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

                {/* Visit Website Button */}
                <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex gap-2 text-slate-600 border-slate-200 hover:bg-white hover:text-blue-600"
                    onClick={() => window.open('/', '_blank')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Visit Website
                </Button>

                {/* Search Bar */}
                <div className="relative max-w-md w-full hidden lg:block group ml-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#0EA5E9] transition-colors" />
                    <Input
                        placeholder={userRole === 'agent' ? "Search..." : "Search bookings, agents, customers..."}
                        className="pl-11 bg-white border-transparent rounded-full shadow-sm group-hover:shadow-md focus:shadow-md focus:border-[#0EA5E9]/20 transition-all duration-300"
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </Button>

                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 hidden sm:flex">
                    <HelpCircle className="h-5 w-5" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="pl-1.5 pr-3 py-1.5 gap-3 rounded-xl hover:bg-white shadow-sm hover:shadow transition-all duration-300 border border-transparent hover:border-blue-100 h-11">
                            <div className="bg-gradient-to-br from-[#0EA5E9] to-[#6366F1] w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                                {userRole === 'agent' ? 'A' : 'AD'}
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
