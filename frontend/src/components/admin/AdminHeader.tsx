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


export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
    const router = useRouter()
    const [userEmail, setUserEmail] = useState('')
    const userRole = getUserRole()


    useEffect(() => {
        const userStr = localStorage.getItem('user')
        if (userStr) {
            try {
                const user = JSON.parse(userStr)
                setUserEmail(user.email || 'user@toursaas.com')
            } catch {
                setUserEmail('user@toursaas.com')
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


    return (
        <header className="bg-[#F0FAFF] border-b border-gray-200 sticky top-0 z-40 h-16 px-6 flex items-center justify-between gap-4 shadow-sm backdrop-blur-md bg-opacity-80">

            <div className="flex items-center gap-4 flex-1">
                {onMenuClick && (
                    <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
                        <Menu className="h-5 w-5" />
                    </Button>
                )}

                {/* Search Bar */}
                <div className="relative max-w-md w-full hidden md:block group">
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
