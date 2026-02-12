'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plane, User, LogOut } from 'lucide-react'

export function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
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

    const NavLinks = () => (
        <>
            {(!isAuthenticated || userRole !== 'customer') && (
                <Link
                    href="/"
                    className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/packages' ? 'text-primary' : 'text-muted-foreground'
                        }`}
                    onClick={() => setIsOpen(false)}
                >
                    Packages
                </Link>
            )}

            {/* Agent Subscription Link */}
            {isAuthenticated && userRole === 'agent' && (
                <Link
                    href="/agent/subscription"
                    className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/agent/subscription' ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setIsOpen(false)}
                >
                    Subscription
                </Link>
            )}

            <Link
                href="/itinerary/builder"
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname?.startsWith('/itinerary') ? 'text-primary' : 'text-muted-foreground'
                    }`}
                onClick={() => setIsOpen(false)}
            >
                Plan Trip
            </Link>

            {isAuthenticated && userRole === 'agent' && (
                <Link
                    href="/agent/dashboard"
                    className={`text-sm font-medium transition-colors hover:text-primary ${pathname?.startsWith('/agent') ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setIsOpen(false)}
                >
                    Dashboard
                </Link>
            )}

            {isAuthenticated && userRole === 'agent' && (
                <Link
                    href="/agent/settings"
                    className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/agent/settings' ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setIsOpen(false)}
                >
                    Configuration
                </Link>
            )}

            {isAuthenticated && userRole === 'admin' && (
                <Link
                    href="/admin/dashboard"
                    className={`text-sm font-medium transition-colors hover:text-primary ${pathname?.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setIsOpen(false)}
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
                        onClick={() => setIsOpen(false)}
                    >
                        My Bookings
                    </Link>
                    {userRole === 'customer' && (
                        <Link
                            href="/saved-trips"
                            className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/saved-trips' ? 'text-primary' : 'text-muted-foreground'
                                }`}
                            onClick={() => setIsOpen(false)}
                        >
                            Saved Trips
                        </Link>
                    )}
                </>
            ) : null}
        </>
    )

    const AuthButtons = () => (
        isAuthenticated ? (
            <>
                {userName && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
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
                <Link href="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" size="sm">
                        Login
                    </Button>
                </Link>
                <Link href="/register" onClick={() => setIsOpen(false)}>
                    <Button size="sm">Sign Up</Button>
                </Link>
            </>
        )
    )

    return (
        <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md transition-all supports-[backdrop-filter]:bg-white/60">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/" className="flex items-center space-x-2">
                        <Plane className="h-6 w-6 text-primary" />
                        <span className="text-xl font-bold">TourSaaS</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        <NavLinks />
                        <AuthButtons />
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-gray-600"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
                        )}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isOpen && (
                    <div className="md:hidden py-4 border-t space-y-4 flex flex-col bg-white px-2">
                        <NavLinks />
                        <div className="pt-4 border-t flex flex-col gap-3 items-start">
                            <AuthButtons />
                        </div>
                    </div>
                )}
            </div>
        </nav >
    )
}
