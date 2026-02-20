'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plane, User, LogOut, Menu, X } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export function Navbar() {
    const { theme } = useTheme()
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userName, setUserName] = useState('')
    const [userRole, setUserRole] = useState('')

    // Handle scroll for transparent navbar
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])


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
        localStorage.removeItem('agent_theme') // Clear theme cache on logout
        setIsAuthenticated(false)
        setUserName('')
        setUserRole('')
        router.push('/login')
    }

    // Hide global navbar for all admin and agent pages, and auth pages
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/agent') || pathname === '/login' || pathname === '/register') {
        return null
    }

    const NavLinks = () => {
        // Default links if none provided in theme
        const defaultLinks = [
            { label: 'Packages', href: '/', show: true, requiresAuth: false, role: null },
            { label: 'Plan Trip', href: '/itinerary/builder', show: true, requiresAuth: false, role: null },
            { label: 'My Bookings', href: '/bookings', show: true, requiresAuth: true, role: 'customer' }
        ]

        // Merge theme links with logic
        const rawLinks = theme.navbar_links || defaultLinks

        // Filter based on auth and role
        const filteredLinks = rawLinks.filter((link: any) => {
            if (link.show === false) return false
            if (link.requiresAuth && !isAuthenticated) return false
            if (link.role && userRole?.toLowerCase() !== link.role?.toLowerCase()) return false
            return true
        })

        return (
            <>
                {filteredLinks.map((link: any, i: number) => (
                    <Link
                        key={i}
                        href={link.href}
                        className={`text-sm font-medium transition-colors hover:text-primary ${pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                            }`}
                        style={{ color: pathname === link.href ? (theme.navbar_links_color || theme.primary_color) : undefined }}
                        onClick={() => setIsOpen(false)}
                    >
                        {link.label}
                    </Link>
                ))}

                {/* Additional dynamic links not in main list (like agent dashboard) */}
                {isAuthenticated && !filteredLinks.some(l => l.href === '/bookings') && (
                    <Link
                        href="/bookings"
                        className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/bookings' ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setIsOpen(false)}
                    >
                        My Bookings
                    </Link>
                )}

                {isAuthenticated && (userRole?.toLowerCase() === 'agent' || userRole?.toLowerCase() === 'admin') && (
                    <>
                        <Link
                            href={userRole?.toLowerCase() === 'admin' ? '/admin/dashboard' : '/agent/dashboard'}
                            className={`text-sm font-medium transition-colors hover:text-primary ${pathname?.startsWith(userRole?.toLowerCase() === 'admin' ? '/admin' : '/agent') ? 'text-primary' : 'text-muted-foreground'}`}
                            onClick={() => setIsOpen(false)}
                        >
                            Dashboard
                        </Link>
                    </>
                )}
            </>
        )
    }


    const AuthButtons = () => {
        const loginLabel = theme.navbar_login_label || 'Login'
        const signupLabel = theme.navbar_signup_label || 'Sign Up'
        const showLogin = theme.navbar_login_show !== false

        if (isAuthenticated) {
            return (
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
            )
        }

        return (
            <>
                {showLogin && (
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                        <Button variant={theme.navbar_login_style === 'outline' ? 'outline' : 'ghost'} size="sm">
                            {loginLabel}
                        </Button>
                    </Link>
                )}
                <Link href="/register" onClick={() => setIsOpen(false)}>
                    <Button
                        size="sm"
                        style={{
                            backgroundColor: theme.navbar_signup_bg_color || theme.primary_color,
                            color: theme.navbar_signup_text_color || '#fff'
                        }}
                    >
                        {signupLabel}
                    </Button>
                </Link>
            </>
        )
    }


    const isTransparent = theme.navbar_transparent_on_hero && pathname === '/' && !scrolled
    const navbarStyle = theme.navbar_style_preset || 'light'

    // Base styles for colors based on light/dark/transparent
    const textClass = navbarStyle === 'dark' ? 'text-white' : (isTransparent ? 'text-white' : 'text-gray-900')
    const bgClass = isTransparent
        ? 'bg-transparent'
        : (navbarStyle === 'dark' ? 'bg-gray-900' : 'bg-white/80 backdrop-blur-md')
    const borderClass = isTransparent ? 'border-transparent' : (theme.navbar_border_color ? '' : 'border-b')

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${bgClass} ${borderClass}`}
            style={{
                backgroundColor: !isTransparent && theme.navbar_bg_color ? theme.navbar_bg_color : undefined,
                borderColor: !isTransparent && theme.navbar_border_color ? theme.navbar_border_color : undefined,
                borderBottomWidth: !isTransparent && theme.navbar_border_color ? '1px' : undefined,
                position: theme.navbar_sticky !== false ? 'fixed' : 'relative'
            }}
        >
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/" className="flex items-center space-x-2">
                        {theme.navbar_logo_image ? (
                            <img src={theme.navbar_logo_image} alt="Logo" className="h-8 w-auto object-contain" />
                        ) : (
                            <Plane className="h-6 w-6" style={{ color: theme.navbar_logo_color || theme.primary_color }} />
                        )}
                        <span className={`text-xl font-bold ${textClass}`}>
                            {theme.navbar_logo_text || 'TourSaaS'}
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        <NavLinks />
                        <AuthButtons />
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className={`md:hidden p-2 ${textClass}`}
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isOpen && (
                    <div className={`md:hidden py-4 border-t space-y-4 flex flex-col px-2 ${navbarStyle === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
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
