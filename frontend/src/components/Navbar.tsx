'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plane, User, LogOut } from 'lucide-react'

export function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userName, setUserName] = useState('')
    const [userRole, setUserRole] = useState('')

    useEffect(() => {
        // Only access localStorage on client side
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')

        if (token && user) {
            setIsAuthenticated(true)
            try {
                const userData = JSON.parse(user)
                setUserName(userData?.first_name || '')
                setUserRole(userData?.role || '')
            } catch (e) {
                console.error('Error parsing user data:', e)
            }
        } else {
            setIsAuthenticated(false)
            setUserName('')
        }
    }, [pathname]) // Re-check auth state when route changes

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setIsAuthenticated(false)
        setUserName('')
        setUserRole('')
        router.push('/login')
    }

    // Hide global navbar for all admin and agent pages, and auth pages
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/agent') || pathname === '/login' || pathname === '/register') {
        return null
    }

    return (
        <nav className="border-b bg-white">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/" className="flex items-center space-x-2">
                        <Plane className="h-6 w-6 text-primary" />
                        <span className="text-xl font-bold">TourSaaS</span>
                    </Link>

                    <div className="flex items-center space-x-6">
                        {(!isAuthenticated || userRole !== 'customer') && (
                            <Link
                                href="/"
                                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/packages' ? 'text-primary' : 'text-muted-foreground'
                                    }`}
                            >
                                Packages
                            </Link>
                        )}

                        {/* Agent Subscription Link */}
                        {isAuthenticated && userRole === 'agent' && (
                            <Link
                                href="/agent/subscription"
                                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/agent/subscription' ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                                Subscription
                            </Link>
                        )}

                        <Link
                            href="/itinerary/builder"
                            className={`text-sm font-medium transition-colors hover:text-primary ${pathname?.startsWith('/itinerary') ? 'text-primary' : 'text-muted-foreground'
                                }`}
                        >
                            Plan Trip
                        </Link>

                        {isAuthenticated && userRole === 'agent' && (
                            <Link
                                href="/agent/dashboard"
                                className={`text-sm font-medium transition-colors hover:text-primary ${pathname?.startsWith('/agent') ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                                Dashboard
                            </Link>
                        )}

                        {isAuthenticated && userRole === 'agent' && (
                            <Link
                                href="/agent/settings"
                                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/agent/settings' ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                                Configuration
                            </Link>
                        )}

                        {isAuthenticated && userRole === 'admin' && (
                            <Link
                                href="/admin/dashboard"
                                className={`text-sm font-medium transition-colors hover:text-primary ${pathname?.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                                Admin Panel
                            </Link>
                        )}

                        {isAuthenticated ? (
                            <>
                                <Link
                                    href="/bookings"
                                    className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/bookings' ? 'text-primary' : 'text-muted-foreground'
                                        }`}
                                >
                                    My Bookings
                                </Link>
                                {userName && (
                                    <div className="flex items-center space-x-2">
                                        <User className="h-4 w-4" />
                                        <span className="text-sm">{userName}</span>
                                    </div>
                                )}
                                <Button variant="ghost" size="sm" onClick={handleLogout}>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Link href="/login">
                                    <Button variant="ghost" size="sm">
                                        Login
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button size="sm">Sign Up</Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav >
    )
}
