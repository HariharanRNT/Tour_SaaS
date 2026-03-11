'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { ReactNode } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'

export function Providers({ children }: { children: ReactNode }) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id'

    return (
        <GoogleOAuthProvider clientId={clientId}>
            <AuthProvider>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </AuthProvider>
        </GoogleOAuthProvider>
    )
}
