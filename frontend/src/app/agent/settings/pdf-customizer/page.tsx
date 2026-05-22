'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Loader2, FileType } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { fetchAgentSettings } from '@/lib/api'
import PdfCustomizerPanel from '@/components/agent/PdfCustomizerPanel'
import { Button } from '@/components/ui/button'

export default function PdfCustomizerPage() {
    const router = useRouter()
    const { hasPermission, isSubUser } = useAuth()

    // Guard: sub-users without view permission go back to dashboard
    useEffect(() => {
        if (isSubUser && !hasPermission('settings', 'view')) {
            router.push('/agent/dashboard')
        }
    }, [isSubUser, hasPermission, router])

    // Re-use the existing agent settings query — shares the cache with the
    // parent settings page so no extra network request is made when navigating
    // between tabs in the same browser session.
    const { data: settingsData, isLoading } = useQuery({
        queryKey: ['agent-settings'],
        queryFn: fetchAgentSettings,
    })

    return (
        <div className="min-h-screen">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

                {/* Header */}
                <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                        {/* Breadcrumbs */}
                        <nav className="flex items-center text-sm font-medium text-[var(--color-primary-font)]">
                            <button
                                onClick={() => router.push('/agent/dashboard')}
                                className="hover:text-[var(--primary)] transition-colors"
                            >
                                Dashboard
                            </button>
                            <ChevronRight className="h-4 w-4 mx-2 text-[var(--color-primary-font)]/40" />
                            <button
                                onClick={() => router.push('/agent/settings')}
                                className="hover:text-[var(--primary)] transition-colors"
                            >
                                Settings
                            </button>
                            <ChevronRight className="h-4 w-4 mx-2 text-[var(--color-primary-font)]/40" />
                            <span className="text-[var(--color-primary-font)]">PDF Customizer</span>
                        </nav>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-1">
                                <h1 className="text-4xl font-extrabold tracking-tight text-[var(--color-primary-font)]">
                                    PDF Customizer
                                </h1>
                                <p className="text-lg text-[var(--color-primary-font)] max-w-2xl font-medium">
                                    Customise the branding, layout, and content of every travel quote PDF generated for your clients.
                                </p>
                            </div>
                            <div className="shrink-0">
                                <Button
                                    variant="outline"
                                    className="font-semibold px-6 border-slate-200 hover:bg-transparent text-[var(--color-primary-font)]/70"
                                    onClick={() => router.push('/agent/settings')}
                                >
                                    ← Back to Settings
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Tab pill nav — same style as parent settings page */}
                    <div className="glass-navbar rounded-full p-1.5 flex gap-1 overflow-x-auto scrollbar-hide shadow-sm">
                        {[
                            { name: 'General', id: 'general' },
                            { name: 'Email', id: 'email' },
                            { name: 'Payment', id: 'payment' },
                            { name: 'Notifications', id: 'notifications' },
                            { name: 'Master Data', id: 'master-data' },
                            { name: 'Theme', id: 'theme' },
                            { name: 'PDF Customizer', id: 'pdf-customizer', active: true },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (tab.active) return
                                    if (tab.id === 'master-data') router.push('/agent/settings/master-data')
                                    else if (tab.id === 'theme') router.push('/agent/settings/theme')
                                    else router.push('/agent/settings')
                                }}
                                className={
                                    tab.active
                                        ? 'px-5 py-2 text-sm font-bold rounded-full whitespace-nowrap bg-white/70 text-[var(--primary)] shadow-sm'
                                        : 'px-5 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-all text-[var(--color-primary-font)] hover:text-[var(--color-primary-font)]/70 hover:bg-white/50'
                                }
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
                            <p className="text-sm font-semibold text-[var(--color-primary-font)]/60">
                                Loading your PDF settings…
                            </p>
                        </div>
                    </div>
                ) : (
                    <PdfCustomizerPanel
                        savedSettings={settingsData?.homepage_settings?.pdf_customizer ?? null}
                    />
                )}
            </div>

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
