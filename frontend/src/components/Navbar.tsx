'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { User, LogOut, Menu, X } from 'lucide-react'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { useTheme } from '@/context/ThemeContext'

export function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const { publicSettings } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userName, setUserName] = useState('')
    const [userRole, setUserRole] = useState('')

    // Branding derived from publicSettings
    const agencyName = publicSettings?.agency_name || 'TourSaaS';
    const logoUrl = publicSettings?.homepage_settings?.navbar_logo_image || 'https://toursaas.s3.us-east-1.amazonaws.com/logo.png';

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
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/agent') || pathname === '/login' || pathname?.startsWith('/register')) {
        return null
    }

    const NavLinks = () => {
        // Default links
        const defaultLinks = [
            { label: 'Packages', href: '/#popular-packages', show: true, requiresAuth: false, role: null },
            { label: 'Plan Trip', href: '/plan-trip?search=all', show: true, requiresAuth: false, role: null },
            { label: 'My Bookings', href: '/bookings', show: true, requiresAuth: true, role: 'customer' }
        ]

        // Use default links
        const rawLinks = defaultLinks

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
                        className={`text-sm font-bold transition-colors duration-200 px-5 py-2 rounded-full ${pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href)) ? 'text-slate-900' : 'text-[#2C2C2C] hover:text-[var(--primary)] hover:bg-white/40'}`}
                        style={pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href)) ? { 
                            background: 'rgba(0,0,0,0.08)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            border: '1px solid rgba(0,0,0,0.05)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                        } : {}}
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
        const loginLabel = 'Login'
        const signupLabel = 'Sign Up'
        const showLogin = true

        if (isAuthenticated) {
            return (
                <>
                    <ThemeSwitcher />
                    {userName && (
                        <div className="flex items-center space-x-2 text-[#2C2C2C] opacity-80">
                            <User className="h-4 w-4" />
                            <span className="text-sm font-medium">{userName}</span>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="rounded-full border-[1.5px] border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all px-6 font-bold"
                        style={{ background: 'transparent' }}
                    >
                        <LogOut className="h-4 w-4 mr-2 stroke-[2px]" />
                        Logout
                    </Button>
                </>
            )
        }

        return (
            <>
                {showLogin && (
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" size="sm">
                            {loginLabel}
                        </Button>
                    </Link>
                )}
                <Link href="/register" onClick={() => setIsOpen(false)}>
                    <Button
                        size="sm"
                        className="bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white"
                    >
                        {signupLabel}
                    </Button>
                </Link>
            </>
        )
    }


    // Global frosted style
    const textClass = 'text-[#2C2C2C]'

    return (
        <div
            className="absolute top-0 left-0 right-0 w-full z-50 pointer-events-none px-4 transition-all duration-300 flex justify-center"
            style={{ paddingTop: scrolled ? '8px' : '16px', paddingBottom: scrolled ? '6px' : '10px' }}
        >
            <nav
                className={`pointer-events-auto flex w-full max-w-4xl transition-all duration-300`}
                style={{
                    background: scrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                    borderRadius: '999px',
                    padding: scrolled ? '2px 6px' : '4px 8px'
                }}
            >
                <div className="w-full px-2 md:px-6">
                    <div className="flex h-14 items-center justify-between">
                        <Link href="/" className="flex items-center space-x-2">
                            <img
                                src={logoUrl}
                                alt="Agent Logo"
                                className="h-9 w-9 object-contain"
                            />
                            <span className={`text-xl font-bold font-display text-[#2C2C2C]`}>
                                {agencyName}
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-4">
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
                        <div className={`md:hidden mt-2 py-4 rounded-3xl border-t border-white/20 space-y-4 flex flex-col px-6 bg-white/95 backdrop-blur-3xl shadow-xl animate-in slide-in-from-top-2 duration-300`}>
                            <NavLinks />
                            <div className="pt-4 border-t border-gray-200 flex flex-col gap-3 items-start">
                                <AuthButtons />
                            </div>
                        </div>
                    )}
                </div>
            </nav>
        </div>
    )
}
