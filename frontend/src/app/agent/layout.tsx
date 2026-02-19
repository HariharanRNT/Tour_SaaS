'use client'

import { useState } from 'react'
import { RoleGuard } from "@/components/auth/role-guard"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminHeader } from "@/components/admin/AdminHeader"

export default function AgentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return (
        <RoleGuard allowedRoles={['agent', 'AGENT']}>
            <div className="min-h-screen bg-gray-50 flex">
                <AdminSidebar className={isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} />

                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <AdminHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
                        {children}
                    </main>
                </div>

                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </div>
        </RoleGuard>
    )
}
