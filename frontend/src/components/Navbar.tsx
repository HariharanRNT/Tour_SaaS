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
            { label: 'Plan Trip', href: '/plan-trip', show: true, requiresAuth: false, role: null },
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
                        className={`text-sm font-medium transition-all px-4 py-2 rounded-full ${pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href)) ? 'text-white shadow-md drop-shadow-sm' : 'text-[#7C3A10] hover:text-[#FF7A45] hover:bg-white/40'}`}
                        style={pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href)) ? { background: 'linear-gradient(135deg,#FF7A45,#FFB38A)', boxShadow: '0 8px 24px rgba(255,122,69,0.45)' } : {}}
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
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="rounded-full border-2 border-[#FF7A45] text-[#FF7A45] hover:bg-[#FF7A45] hover:text-white transition-all px-6 font-black"
                        style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)' }}
                    >
                        <LogOut className="h-4 w-4 mr-2 stroke-[3px]" />
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
    const textClass = navbarStyle === 'dark' ? 'text-white' : (isTransparent ? 'text-white' : 'text-[#7C3A10]')
    const bgClass = isTransparent
        ? 'bg-transparent'
        : (navbarStyle === 'dark' ? 'bg-gray-900' : 'glass-navbar')
    const borderClass = isTransparent ? 'border-transparent' : ''

    return (
        <div
            className="fixed top-0 left-0 right-0 w-full z-50 pointer-events-none px-4 transition-all duration-300 flex justify-center"
            style={{ paddingTop: scrolled ? '8px' : '16px', paddingBottom: scrolled ? '6px' : '10px' }}
        >
            <nav
                className={`pointer-events-auto flex w-full max-w-4xl transition-all duration-500 ${scrolled ? 'shadow-[0_12px_40px_rgba(0,0,0,0.12)]' : 'shadow-[0_8px_32px_rgba(0,0,0,0.08)]'} ${navbarStyle === 'dark' ? 'bg-gray-900 border-gray-800' : ''}`}
                style={{
                    background: navbarStyle === 'dark' ? undefined : (isTransparent ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.28)'),
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: navbarStyle === 'dark' ? undefined : (scrolled ? '1px solid rgba(255,122,69,0.15)' : '1px solid rgba(255,255,255,0.35)'),
                    borderRadius: '999px',
                    padding: scrolled ? '2px 6px' : '4px 8px'
                }}
            >
                <div className="w-full px-2 md:px-6">
                    <div className="flex h-14 items-center justify-between">
                        <Link href="/" className="flex items-center space-x-2">
                            {theme.navbar_logo_image ? (
                                <img src={theme.navbar_logo_image} alt="Logo" className="h-8 w-auto object-contain" />
                            ) : (
                                <Plane className="h-6 w-6" style={{ color: '#C2440A' }} />
                            )}
                            <span className={`text-xl font-bold font-display ${textClass === 'text-white' ? 'text-white' : 'text-[#C2440A]'}`}>
                                {theme.navbar_logo_text || 'TourSaaS'}
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
                        <div className={`md:hidden mt-2 py-4 rounded-3xl border-t border-white/20 space-y-4 flex flex-col px-6 ${navbarStyle === 'dark' ? 'bg-gray-900' : 'bg-white/80 backdrop-blur-3xl shadow-xl'}`}>
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
