"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface SubscriptionGuardProps {
    children: React.ReactNode
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
    const router = useRouter()
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

    useEffect(() => {
        const checkSubscription = async () => {
            // Skip check for subscription page itself
            if (window.location.pathname === '/agent/subscription') {
                setIsAuthorized(true)
                return
            }

            const userStr = localStorage.getItem('user')
            if (!userStr) {
                setIsAuthorized(false)
                router.push('/login')
                return
            }

            try {
                let user = JSON.parse(userStr)

                // Only agents need subscription check for /agent/* routes
                if (user.role?.toLowerCase() === 'agent') {
                    let hasActiveSub = user.has_active_subscription || user.subscription_status === 'active';

                    // If local state says no active sub, try to refresh from backend once
                    if (!hasActiveSub) {
                        try {
                            const { authAPI } = await import('@/lib/api')
                            const freshUser = await authAPI.getCurrentUser()
                            localStorage.setItem('user', JSON.stringify(freshUser))
                            user = freshUser
                            hasActiveSub = user.has_active_subscription || user.subscription_status === 'active';
                        } catch (refreshError) {
                            console.error('Failed to refresh user subscription status:', refreshError)
                        }
                    }

                    if (hasActiveSub) {
                        setIsAuthorized(true)
                    } else {
                        setIsAuthorized(false)
                        router.push('/agent/subscription')
                    }
                } else {
                    setIsAuthorized(true)
                }
            } catch (error) {
                console.error('Error parsing user data:', error)
                setIsAuthorized(false)
                router.push('/login')
            }
        }

        checkSubscription()
    }, [router])

    if (isAuthorized === null) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return isAuthorized ? <>{children}</> : null
}
