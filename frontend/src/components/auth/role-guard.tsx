import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface RoleGuardProps {
    children: React.ReactNode
    allowedRoles: string[]
    publicRoutes?: string[] // Routes that bypass auth check
}

export function RoleGuard({ children, allowedRoles, publicRoutes = [] }: RoleGuardProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { user, loading } = useAuth()

    useEffect(() => {
        if (loading) return

        // Bypass check for public routes
        if (publicRoutes.includes(pathname)) {
            return
        }

        if (!user) {
            console.warn('[RoleGuard] No user found. Redirecting to login.')
            if (pathname.includes('/admin')) {
                router.push('/admin/login')
            } else {
                router.push('/login')
            }
            return
        }

        const role = user.role?.toUpperCase()
        const upperAllowedRoles = allowedRoles.map(r => r.toUpperCase())

        if (!upperAllowedRoles.includes(role)) {
            console.warn(`[RoleGuard] Role mismatch! User has '${role}' but needs one of:`, upperAllowedRoles)
            router.push('/unauthorized')
            return
        }
    }, [user, loading, allowedRoles, router, pathname, publicRoutes])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Direct check for render
    const role = user?.role?.toUpperCase()
    const upperAllowedRoles = allowedRoles.map(r => r.toUpperCase())
    const isAuthorized = publicRoutes.includes(pathname) || (role && upperAllowedRoles.includes(role))

    if (!isAuthorized) return null

    return <>{children}</>
}
