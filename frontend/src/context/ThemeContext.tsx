'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { themes, Theme } from '@/lib/themes';

// Single shared key so all portals (agent + customer) stay in sync
const SHARED_THEME_KEY = 'app-theme';

interface ThemeContextType {
    activeTheme: string;
    setActiveTheme: (theme: string) => void;
    themeData: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
}: {
    children: React.ReactNode;
    storageKey?: string; // kept for API compatibility but ignored
}) {
    const [activeTheme, setActiveThemeState] = useState<string>('default');

    useEffect(() => {
        // Migrate old keys to the unified key (one-time migration)
        const savedTheme =
            localStorage.getItem(SHARED_THEME_KEY) ||
            localStorage.getItem('agent-theme') ||
            localStorage.getItem('customer-theme');

        if (savedTheme && themes[savedTheme]) {
            setActiveThemeState(savedTheme);
            localStorage.setItem(SHARED_THEME_KEY, savedTheme);
            // Clean up old keys
            localStorage.removeItem('agent-theme');
            localStorage.removeItem('customer-theme');
        }
    }, []);

    const setActiveTheme = (theme: string) => {
        if (themes[theme]) {
            setActiveThemeState(theme);
            localStorage.setItem(SHARED_THEME_KEY, theme);
        }
    };

    useEffect(() => {
        const currentTheme = themes[activeTheme] || themes.default;
        const root = document.documentElement;

        root.style.setProperty('--primary', currentTheme.primary);
        root.style.setProperty('--primary-light', currentTheme.primaryLight);
        root.style.setProperty('--primary-soft', currentTheme.primarySoft);
        root.style.setProperty('--primary-glow', currentTheme.glow);
        root.style.setProperty('--gradient-start', currentTheme.gradientStart);
        root.style.setProperty('--gradient-mid', currentTheme.gradientMid);
        root.style.setProperty('--gradient-end', currentTheme.gradientEnd);

        // Sidebar background adapts to theme
        const isBrandOrange = currentTheme.primary === '#F97316';
        root.style.setProperty('--sidebar-bg', `rgba(${isBrandOrange ? '55, 45, 100' : '40, 30, 80'}, 0.50)`);
    }, [activeTheme]);

    return (
        <ThemeContext.Provider value={{
            activeTheme,
            setActiveTheme,
            themeData: themes[activeTheme] || themes.default
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

