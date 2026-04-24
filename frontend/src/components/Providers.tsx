'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { ReactNode, useState } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { AuthModalProvider } from '@/context/AuthModalContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AgentCustomerSelectorModal } from '@/components/auth/AgentCustomerSelectorModal'

export function Providers({ children }: { children: ReactNode }) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id'
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 0, // Fetch fresh data every time
                gcTime: 1000 * 60 * 5,   // 5 minutes
                refetchOnWindowFocus: true,
                refetchOnMount: true,
                retry: 1,
            }
        }
    }))

    return (
        <QueryClientProvider client={queryClient}>
            <GoogleOAuthProvider clientId={clientId}>
                <AuthModalProvider>
                    <AuthProvider>
                        {children}
                        {/* Global Agent Customer Selector Modal */}
                        <AgentCustomerSelectorModal />
                    </AuthProvider>
                </AuthModalProvider>
            </GoogleOAuthProvider>
        </QueryClientProvider>
    )
}
