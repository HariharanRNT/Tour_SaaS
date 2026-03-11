'use client'

import { useState } from 'react'
import { RoleGuard } from "@/components/auth/role-guard"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { SubscriptionGuard } from "@/components/auth/subscription-guard"

export default function AgentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    return (
        <RoleGuard allowedRoles={['agent', 'AGENT']}>
            <SubscriptionGuard>
                {/* Radial blob overlays add depth on top of the body gradient */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-radial from-[#FFE0CC]/60 to-transparent rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-radial from-[#E8C8B8]/60 to-transparent rounded-full blur-[100px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-gradient-radial from-[#F0D4B8]/50 to-transparent rounded-full blur-[80px]" />
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
                        {/* Fixed Header */}
                        <div
                            className="fixed top-0 right-0 z-40 transition-all duration-300 ease-in-out max-lg:!left-0 max-lg:!w-full"
                            style={{
                                left: isSidebarCollapsed ? '70px' : '260px',
                                width: isSidebarCollapsed ? 'calc(100% - 70px)' : 'calc(100% - 260px)'
                            }}
                        >
                            <AdminHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                        </div>

                        {/* Main Content with pt-[70px] to account for fixed header */}
                        <main className="flex-1 w-full pt-[70px]">
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
            </SubscriptionGuard>
        </RoleGuard>
    )
}
