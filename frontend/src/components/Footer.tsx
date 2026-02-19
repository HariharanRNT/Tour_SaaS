'use client'

import { usePathname } from 'next/navigation'

export function Footer() {
    const pathname = usePathname()

    // Hide footer for all admin and agent pages, and auth pages if needed
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/agent') || pathname === '/login' || pathname === '/register') {
        return null
    }

    return (
        <footer className="border-t bg-white py-8">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                © 2026 RNT TourSaaS. All rights reserved.
            </div>
        </footer>
    )
}
