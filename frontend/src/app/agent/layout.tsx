'use client'

import { useState } from 'react'
import { RoleGuard } from "@/components/auth/role-guard"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { useAuth } from '@/context/AuthContext'
import { SubscriptionGuard } from "@/components/auth/subscription-guard"


export default function AgentLayout({
    children }: {
    children: React.ReactNode
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const { user } = useAuth()

    return (
        <RoleGuard allowedRoles={['agent', 'AGENT', 'sub_user', 'SUB_USER']}>
            <SubscriptionGuard>
                <div className="agent-portal-root min-h-screen relative">
                    {/* Enhanced Radial blob overlays for better glass contrast */}
                    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-gradient-radial from-[var(--primary)]/20 to-transparent rounded-full blur-[120px] animate-pulse" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-radial from-[var(--primary-light)]/20 to-transparent rounded-full blur-[100px] animate-blob" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-gradient-radial from-[var(--primary-soft)]/20 to-transparent rounded-full blur-[150px] opacity-50" />
                    </div>

                    <div className="flex min-h-[100vh] relative z-10 w-full bg-transparent">
                        <AdminSidebar
                            className={isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                            onCollapsedChange={setIsSidebarCollapsed}
                        />

                        <div
                            className="flex-1 flex flex-col min-w-0 min-h-[100vh] w-full transition-all duration-300 ease-in-out max-lg:!ml-0 overflow-hidden"
                        style={{ marginLeft: isSidebarCollapsed ? '70px' : '260px' }}
                    >
                        {/* Header */}
                        <div
                            className="z-50 transition-all duration-300 ease-in-out w-full"
                        >
                            <AdminHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                        </div>

                        {/* Sub-User Identity Banner */}
                        {user?.role === 'SUB_USER' && (
                            <div className="bg-gradient-to-r from-orange-500/20 to-transparent border-b border-orange-500/20 px-6 py-2 flex items-center gap-2 mt-[70px]">
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white px-1.5 py-0.5 rounded">Sub-User</span>
                                <span className="text-sm text-black/70 font-medium">
                                    Acting on behalf of <span className="text-black font-bold">{user?.agency_name || 'Agent Account'}</span>
                                </span>
                            </div>
                        )}

                        {/* Main Content */}
                        <main className="flex-1 w-full">
                            {children}
                        </main>
                    </div>

                        {isSidebarOpen && (
                            <div
                                className="fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity"
                                onClick={() => setIsSidebarOpen(false)}
                            />
                        )}
                    </div>
                </div>
            </SubscriptionGuard>
        </RoleGuard>
    )
}
