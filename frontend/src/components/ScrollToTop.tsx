'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export function ScrollToTop() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        // Scroll to top on pathname or searchParams change
        window.scrollTo(0, 0)
    }, [pathname, searchParams])

    return null
}
