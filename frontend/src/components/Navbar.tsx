'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { User, LogOut, Menu, X } from 'lucide-react'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { useTheme } from '@/context/ThemeContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { useAuth } from '@/context/AuthContext'

export function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const { publicSettings } = useTheme()
    const { openAuthModal } = useAuthModal()
    const { user, logout } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    // Derive auth state directly from AuthContext — updates instantly on login/logout
    const isAuthenticated = !!user
    const userName = user?.first_name || user?.email?.split('@')[0] || 'Traveler'
    const userRole = user?.role || ''

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

    const handleLogout = () => {
        localStorage.removeItem('agent_theme') // Clear theme cache on logout
        logout()
        router.push('/')
    }

    // Hide global navbar for all admin and agent pages, and auth pages
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/agent') || pathname === '/login' || pathname?.startsWith('/register')) {
        return null
    }

    const NavLinks = ({ isMobile }: { isMobile?: boolean }) => {
        const [isDropdownOpen, setIsDropdownOpen] = useState(false)
        
        const defaultLinks = [
            { label: 'Packages', href: '/#popular-packages', always: true },
            { label: 'Plan Trip', href: '/plan-trip?search=all', always: true },
            { label: 'About', href: '/about', show: publicSettings?.website_pages_config?.about_page?.enabled ?? false },
            { label: 'Contact', href: '/contact', show: publicSettings?.website_pages_config?.contact_page?.enabled ?? false },
            { label: 'My Bookings', href: '/bookings', requiresAuth: true, role: 'customer' },
            { label: 'Dashboard', href: userRole?.toLowerCase() === 'admin' ? '/admin/dashboard' : '/agent/dashboard', requiresAuth: true, role: ['agent', 'admin'] }
        ]

        const filteredLinks = defaultLinks.filter((link: any) => {
            if (link.always) return true;
            if (link.show === false) return false;
            if (link.requiresAuth && !isAuthenticated) return false;
            if (link.role) {
                const roles = Array.isArray(link.role) ? link.role : [link.role];
                if (!roles.map((r: string) => r.toLowerCase()).includes(userRole?.toLowerCase())) return false;
            }
            return true;
        })

        const showOverflow = !isMobile && filteredLinks.length >= 7
        const visibleLinks = showOverflow ? filteredLinks.slice(0, 5) : filteredLinks
        const overflowLinks = showOverflow ? filteredLinks.slice(5) : []

        return (
            <div className={isMobile ? "flex flex-col gap-1 w-full" : "flex items-center gap-1 justify-center overflow-hidden flex-shrink-0"}>
                {visibleLinks.map((link: any, i: number) => (
                    <Link
                        key={i}
                        href={link.href}
                        className={`text-[13px] font-bold transition-colors duration-200 px-2.5 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 ${isMobile ? 'w-full text-left hover:bg-slate-50' : 'text-center'} ${pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href)) ? 'text-slate-900 bg-white/40 shadow-sm border border-black/5' : 'text-[#2C2C2C] hover:text-[var(--primary)] hover:bg-white/40'}`}
                        onClick={() => setIsOpen(false)}
                    >
                        {link.label}
                    </Link>
                ))}
                
                {showOverflow && (
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="text-[13px] font-bold transition-colors duration-200 px-2.5 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 text-[#2C2C2C] hover:text-[var(--primary)] hover:bg-white/40 flex items-center gap-1"
                        >
                            More <span className="text-[10px]">▾</span>
                        </button>
                        
                        {isDropdownOpen && (
                            <div className="absolute top-full right-0 mt-1 bg-white shadow-lg rounded-xl border border-slate-100 py-2 z-50 min-w-[150px]">
                                {overflowLinks.map((link: any, i: number) => (
                                    <Link
                                        key={i}
                                        href={link.href}
                                        className={`text-[13px] font-bold transition-colors duration-200 px-4 py-2 hover:bg-slate-50 block whitespace-nowrap ${pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href)) ? 'text-[var(--primary)]' : 'text-[#2C2C2C]'}`}
                                        onClick={() => {
                                            setIsOpen(false);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }


    const AuthButtons = () => {
        const loginLabel = 'Login'
        const signupLabel = 'Sign Up'

        if (isAuthenticated) {
            return (
                <div className="flex-shrink-0 flex items-center gap-2">
                    <ThemeSwitcher />
                    {userName && (
                        <div className="flex items-center space-x-1 text-[#2C2C2C] opacity-80 max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="text-xs font-medium truncate">{userName}</span>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="rounded-full border-[1.5px] border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all px-3 h-8 text-[13px] font-bold whitespace-nowrap"
                        style={{ background: 'transparent' }}
                    >
                        <LogOut className="h-3 w-3 mr-1 stroke-[2px]" />
                        Logout
                    </Button>
                </div>
            )
        }

        return (
            <div className="flex-shrink-0 flex items-center gap-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setIsOpen(false); openAuthModal({ mode: 'login' }); }}
                    className="text-black font-bold hover:text-black hover:bg-black/5 h-8 text-[13px]"
                >
                    {loginLabel}
                </Button>
                <Button
                    size="sm"
                    className="bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white h-8 text-[13px]"
                    onClick={() => { setIsOpen(false); openAuthModal({ mode: 'register' }); }}
                >
                    {signupLabel}
                </Button>
            </div>
        )
    }


    // Global frosted style
    const textClass = 'text-[var(--color-primary-font)]'

    return (
        <div
            className="absolute top-0 left-0 right-0 w-full z-50 pointer-events-none px-4 transition-all duration-300 flex justify-center"
            style={{ paddingTop: scrolled ? '8px' : '16px', paddingBottom: scrolled ? '6px' : '10px' }}
        >
            <nav
                className="pointer-events-auto inline-flex items-center justify-between mx-auto px-4 py-2 rounded-full bg-white shadow-md gap-4 max-w-[95vw] min-w-[400px] transition-all duration-300"
                style={{
                    background: scrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.9)',
                }}
            >
                {/* Logo - never shrinks */}
                <Link href="/" className="flex-shrink-0 flex items-center space-x-2 min-w-fit">
                    <img
                        src={logoUrl}
                        alt="Agent Logo"
                        className="h-8 w-8 object-contain flex-shrink-0"
                    />
                    <span className="text-sm font-bold font-display text-[var(--color-primary-font)] whitespace-nowrap">
                        {agencyName}
                    </span>
                </Link>

                {/* Desktop Navigation - takes available space, centered */}
                <div className="hidden md:flex flex-1 overflow-hidden">
                    <NavLinks />
                </div>

                {/* Right section - never shrinks */}
                <div className="hidden md:flex items-center gap-2">
                    <AuthButtons />
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-[var(--color-primary-font)]"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Mobile Menu Dropdown */}
                {isOpen && (
                    <div className="md:hidden absolute top-full left-0 right-0 mt-2 py-4 rounded-3xl border border-white/20 space-y-4 flex flex-col px-6 bg-white/95 backdrop-blur-3xl shadow-xl animate-in slide-in-from-top-2 duration-300 pointer-events-auto">
                        <NavLinks isMobile />
                        <div className="pt-4 border-t border-gray-200 flex flex-col gap-3 items-start">
                            <AuthButtons />
                        </div>
                    </div>
                )}
            </nav>
        </div>
    )
}
