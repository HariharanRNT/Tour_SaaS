'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { PreviewBanner } from "@/components/PreviewBanner"
import { Suspense } from 'react'

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // check if current path is a dashboard/auth route
    const isDashboardOrAuth =
        pathname?.startsWith('/admin') ||
        pathname?.startsWith('/agent') ||
        pathname === '/login' ||
        pathname === '/register'

    return (
        <div className="flex flex-col min-h-full">
            {!isDashboardOrAuth && <Navbar />}

            <Suspense fallback={null}>
                <PreviewBanner />
            </Suspense>

            <main className={`flex-1 bg-transparent ${!isDashboardOrAuth ? 'pt-16' : ''}`}>
                {children}
            </main>

            {!isDashboardOrAuth && <Footer />}
        </div>
    )
}
