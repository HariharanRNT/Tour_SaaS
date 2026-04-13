'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

type AuthMode = 'login' | 'register'

export interface SelectedCustomer {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string | null
}

interface AuthModalContextType {
    // Standard auth modal
    isOpen: boolean
    mode: AuthMode
    openAuthModal: (options?: { mode?: AuthMode, redirectUrl?: string }) => void
    closeAuthModal: () => void

    // Agent customer selector
    isAgentSelectorOpen: boolean
    selectedCustomer: SelectedCustomer | null
    openAgentSelector: (onConfirm: (customer: SelectedCustomer) => void) => void
    closeAgentSelector: () => void
    confirmCustomerSelection: (customer: SelectedCustomer) => void
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

export function AuthModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<AuthMode>('login')

    const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
    const [_onConfirmCallback, setOnConfirmCallback] = useState<((c: SelectedCustomer) => void) | null>(null)

    const openAuthModal = (options?: { mode?: AuthMode, redirectUrl?: string }) => {
        if (options?.mode) setMode(options.mode)
        if (options?.redirectUrl) {
            sessionStorage.setItem('redirectAfterLogin', options.redirectUrl)
        }
        setIsOpen(true)
    }

    const closeAuthModal = () => {
        setIsOpen(false)
    }

    const openAgentSelector = (onConfirm: (customer: SelectedCustomer) => void) => {
        setSelectedCustomer(null)
        setOnConfirmCallback(() => onConfirm)
        setIsAgentSelectorOpen(true)
    }

    const closeAgentSelector = () => {
        setIsAgentSelectorOpen(false)
        setOnConfirmCallback(null)
    }

    const confirmCustomerSelection = (customer: SelectedCustomer) => {
        setSelectedCustomer(customer)
        setIsAgentSelectorOpen(false)
        if (_onConfirmCallback) {
            _onConfirmCallback(customer)
        }
        setOnConfirmCallback(null)
    }

    return (
        <AuthModalContext.Provider value={{
            isOpen, mode, openAuthModal, closeAuthModal,
            isAgentSelectorOpen, selectedCustomer,
            openAgentSelector, closeAgentSelector, confirmCustomerSelection,
        }}>
            {children}
        </AuthModalContext.Provider>
    )
}

export function useAuthModal() {
    const context = useContext(AuthModalContext)
    if (context === undefined) {
        throw new Error('useAuthModal must be used within an AuthModalProvider')
    }
    return context
}
