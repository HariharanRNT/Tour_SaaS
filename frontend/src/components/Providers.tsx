'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { ReactNode, useState } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function Providers({ children }: { children: ReactNode }) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id'
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                gcTime: 1000 * 60 * 10,   // 10 minutes
                refetchOnWindowFocus: false,
                retry: 1,
            }
        }
    }))

    return (
        <QueryClientProvider client={queryClient}>
            <GoogleOAuthProvider clientId={clientId}>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </GoogleOAuthProvider>
        </QueryClientProvider>
    )
}

