"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface SubscriptionGuardProps {
    children: React.ReactNode
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
    const router = useRouter()
    const pathname = usePathname()
    const { user, loading, refreshUser } = useAuth()

    useEffect(() => {
        if (loading) return

        const checkSubscription = async () => {
            // Skip check for subscription page itself
            if (pathname === '/agent/subscription') {
                return
            }

            if (!user) {
                router.push('/login')
                return
            }

            // Only agents need subscription check for /agent/* routes
            if (user.role?.toLowerCase() === 'agent') {
                let hasActiveSub = user.has_active_subscription || user.subscription_status === 'active';

                // If context says no active sub, try to refresh from backend once
                if (!hasActiveSub) {
                    await refreshUser()
                }
            }
        }

        checkSubscription()
    }, [user, loading, pathname, router, refreshUser])

    useEffect(() => {
        // Redirection logic if still not authorized after refresh
        if (!loading && user && user.role?.toLowerCase() === 'agent' && pathname !== '/agent/subscription') {
            const hasActiveSub = user.has_active_subscription || user.subscription_status === 'active';
            if (!hasActiveSub) {
                router.push('/agent/subscription')
            }
        }
    }, [user, loading, pathname, router])

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Direct check for render
    const isAgent = user?.role?.toLowerCase() === 'agent'
    const hasActiveSub = user?.has_active_subscription || user?.subscription_status === 'active'
    const isAuthorized = !isAgent || pathname === '/agent/subscription' || hasActiveSub

    if (!user) return null
    if (!isAuthorized) return null

    return <>{children}</>
}
