'use client'

import { RoleGuard } from "@/components/auth/role-guard"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { usePathname } from "next/navigation"
import { useState } from "react"

export default function AdminLayout({
    children }: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isLoginPage = pathname === '/admin/login'
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    if (isLoginPage) {
        return <>{children}</>
    }

    return (
        <RoleGuard allowedRoles={['admin', 'ADMIN']} publicRoutes={['/admin/login']}>
            <div className="flex bg-transparent min-h-[100vh] font-sans admin-panel">
                <AdminSidebar onCollapsedChange={setIsSidebarCollapsed} />
                <div
                    className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ marginLeft: isSidebarCollapsed ? '70px' : '260px' }}
                >
                    {/* Header - dynamically positioned based on sidebar state */}
                    <div
                        className="z-40 transition-all duration-300 ease-in-out w-full"
                    >
                        <AdminHeader />
                    </div>
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </RoleGuard>
    )
}
