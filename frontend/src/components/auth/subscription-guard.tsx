"use client"

import React, { useEffect, useRef } from 'react'
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
    const lastCheckedPath = useRef<string | null>(null)

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

            // Both agents and sub_users need subscription check for /agent/* routes
            const isAgentType = user.role?.toLowerCase() === 'agent' || user.role?.toLowerCase() === 'sub_user';
            if (isAgentType && lastCheckedPath.current !== pathname) {
                lastCheckedPath.current = pathname;
                // Always refresh from backend to ensure the subscription hasn't expired
                // since the local storage was last updated.
                await refreshUser()
            }
        }

        checkSubscription()
    }, [user, loading, pathname, router, refreshUser])

    useEffect(() => {
        const isAgentType = user?.role?.toLowerCase() === 'agent' || user?.role?.toLowerCase() === 'sub_user';
        // Redirection logic if still not authorized after refresh
        if (!loading && user && isAgentType && !pathname.startsWith('/agent/subscription')) {
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
    const isAgentTypeRender = user?.role?.toLowerCase() === 'agent' || user?.role?.toLowerCase() === 'sub_user'
    const hasActiveSub = user?.has_active_subscription || user?.subscription_status === 'active'
    const isAuthorized = !isAgentTypeRender || pathname.startsWith('/agent/subscription') || hasActiveSub

    if (!user) return null
    if (!isAuthorized) return null

    return <>{children}</>
}
