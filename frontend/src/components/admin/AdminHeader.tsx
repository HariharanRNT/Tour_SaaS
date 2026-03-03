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
    const [userData, setUserData] = useState<{ first_name?: string; last_name?: string } | null>(null)
    const userRole = getUserRole()

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
        <header
            className="w-full h-[70px] px-6 flex items-center justify-between gap-4 shadow-sm transition-all duration-300"
            style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.20)',
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
                            <div className="bg-[#6c47ff] w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-purple-500/20">
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
