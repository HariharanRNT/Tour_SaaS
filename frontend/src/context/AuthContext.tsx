'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI } from '@/lib/api'

interface User {
    id: string
    email: string
    first_name: string
    last_name: string
    role: string
    has_active_subscription?: boolean
    subscription_status?: string
}

interface AuthContextType {
    user: User | null
    loading: boolean
    login: (token: string, userData: User) => void
    logout: () => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const initAuth = async () => {
            let token = localStorage.getItem('token')
            const storedUser = localStorage.getItem('user')

            // Sanity check: Clear if somehow set to string "null"
            if (token === 'null' || token === 'undefined') {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                token = null
            }

            if (token && storedUser) {
                try {
                    setUser(JSON.parse(storedUser))
                    // Optionally verify token with backend here if needed
                    // For now, we trust the stored session and will refresh on demand
                } catch (error) {
                    console.error('Failed to parse stored user:', error)
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                }
            }
            setLoading(false)
        }

        initAuth()
    }, [])

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }

    const refreshUser = async () => {
        try {
            const freshUser = await authAPI.getCurrentUser()
            localStorage.setItem('user', JSON.stringify(freshUser))
            setUser(freshUser)
        } catch (error) {
            console.error('Failed to refresh user:', error)
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
