'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { PreviewBanner } from "@/components/PreviewBanner"
import { Suspense } from 'react'
import { BookingAuthModal } from "@/components/auth/BookingAuthModal"
import { useAuthModal } from "@/context/AuthModalContext"

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isOpen, mode, closeAuthModal } = useAuthModal()

    // check if current path is a dashboard/auth route
    const isDashboardOrAuth =
        pathname?.startsWith('/admin') ||
        pathname?.startsWith('/agent') ||
        pathname === '/login' ||
        pathname?.startsWith('/register')

    return (
        <div className="flex flex-col min-h-full">
            {!isDashboardOrAuth && <Navbar />}

            <Suspense fallback={null}>
                <PreviewBanner />
            </Suspense>

            <main className={`flex-1 bg-transparent ${!isDashboardOrAuth && pathname !== '/plan-trip' ? 'pt-16' : ''}`}>
                {children}
            </main>

            {!isDashboardOrAuth && <Footer />}

            <BookingAuthModal 
                isOpen={isOpen} 
                onClose={closeAuthModal} 
                initialTab={mode} 
            />
        </div>
    )
}
