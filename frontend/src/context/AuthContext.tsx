'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { authAPI } from '@/lib/api'

interface User {
    id: string
    email: string
    first_name: string
    last_name: string
    role: string
    has_active_subscription?: boolean
    subscription_status?: string
    // Sub-User fields
    permissions?: Array<{ module: string, access_level: string }>
    agent_id?: string
    sub_user_id?: string
    agency_name?: string // Added for sub-user context banner
}

interface AuthContextType {
    user: User | null
    loading: boolean
    isSubUser: boolean
    login: (token: string, userData: User) => void
    logout: () => void
    refreshUser: () => Promise<void>
    hasPermission: (module: string, level: 'view' | 'edit' | 'full') => boolean
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

    const login = useCallback((token: string, userData: User) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }, [])

    const refreshUser = useCallback(async () => {
        try {
            const freshUser = await authAPI.getCurrentUser()
            localStorage.setItem('user', JSON.stringify(freshUser))
            setUser(freshUser)
        } catch (error) {
            console.error('Failed to refresh user:', error)
        }
    }, [])

    const isSubUser = user?.role?.toUpperCase() === 'SUB_USER'

    const hasPermission = (module: string, requiredLevel: 'view' | 'edit' | 'full'): boolean => {
        if (!user) return false;
        
        const role = user.role?.toUpperCase();
        // Admins and primary Agents have full access to everything
        if (role === 'ADMIN' || role === 'AGENT') return true;
        
        if (role === 'SUB_USER' && user.permissions) {
            const modulePerm = user.permissions.find(p => p.module === module);
            if (!modulePerm) return false;
            
            const levelMap = { 'view': 1, 'edit': 2, 'full': 3 };
            const userLevel = levelMap[modulePerm.access_level as keyof typeof levelMap] || 0;
            const reqLevel = levelMap[requiredLevel];
            
            return userLevel >= reqLevel;
        }
        
        return false;
    };

    return (
        <AuthContext.Provider value={{ user, loading, isSubUser, login, logout, refreshUser, hasPermission }}>
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
