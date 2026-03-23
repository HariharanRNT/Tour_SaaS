'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { themes, Theme } from '@/lib/themes';

// Single shared key so all portals (agent + customer) stay in sync
const SHARED_THEME_KEY = 'app-theme';
const PAGE_SETTINGS_KEY = 'agentTheme'; // Aligned with Design File
const CUSTOM_THEME_KEY = 'agent_custom_theme';

interface ThemeContextType {
    activeTheme: string;
    setActiveTheme: (theme: string) => void;
    themeData: any;
    isLoading: boolean;
    publicSettings: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    initialSettings
}: {
    children: React.ReactNode;
    storageKey?: string; // kept for API compatibility but ignored
    initialSettings?: any;
}) {
    const pathname = usePathname();
    const [activeTheme, setActiveThemeState] = useState<string>('default');
    const [isLoading, setIsLoading] = useState(true);
    const [publicSettings, setPublicSettings] = useState<any>(initialSettings || null);
    const hasSynced = useRef(false);

    // Determine if we are on an exempt path
    const isExemptPath = pathname?.startsWith('/admin') || pathname === '/register/agent';

    // Helper to apply root variables
    const applyColors = (s: any) => {
        const root = document.documentElement;
        if (!s) return;

        const hexToRgba = (hex: string, alpha: number) => {
            if (!hex || hex.length < 7) return `rgba(0,0,0,${alpha})`;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        // Direct mappings from Design File
        if (s.primaryColor) root.style.setProperty('--primary-color', s.primaryColor);
        if (s.secondaryColor) root.style.setProperty('--secondary-color', s.secondaryColor);
        
        if (s.navbarSettings?.bgColor) root.style.setProperty('--navbar-bg', s.navbarSettings.bgColor);
        if (s.navbarSettings?.textColor) root.style.setProperty('--navbar-text', s.navbarSettings.textColor);
        
        if (s.buttonStyle?.bgColor) root.style.setProperty('--button-bg', s.buttonStyle.bgColor);
        if (s.buttonStyle?.textColor) root.style.setProperty('--button-text', s.buttonStyle.textColor);
        if (s.buttonStyle?.borderRadius) root.style.setProperty('--button-radius', s.buttonStyle.borderRadius);

        // Backward compatibility / Legacy mappings
        const p = s.primaryColor || s.primary_color || s.primary || '#F97316';
        const sec = s.secondaryColor || s.secondary_color || s.secondary || '#FB923C';
        
        root.style.setProperty('--primary', p);
        root.style.setProperty('--primary-light', sec);
        root.style.setProperty('--primary-glow', hexToRgba(p, 0.25));
        root.style.setProperty('--primary-soft', hexToRgba(p, 0.45));
        root.style.setProperty('--gradient-start', p);
        root.style.setProperty('--gradient-mid', sec);

        if (s.font_family || s.fontFamily) root.style.setProperty('--font-family', s.font_family || s.fontFamily);
        if (s.font_size || s.fontSize) root.style.setProperty('--font-size', s.font_size || s.fontSize);
    };

    const setActiveTheme = (theme: string) => {
        if (themes[theme] || theme === 'custom' || theme === 'default') {
            setActiveThemeState(theme);
            localStorage.setItem(SHARED_THEME_KEY, theme);
        }
    };

    useEffect(() => {
        if (isExemptPath) {
            console.log('ThemeProvider: Exempt path detected, enforcing default theme');
            setActiveThemeState('default');
            // Remove any potential root variables applied by ThemeInitializer
            const root = document.documentElement;
            root.style.removeProperty('--primary-color');
            root.style.removeProperty('--secondary-color');
            root.style.removeProperty('--navbar-bg');
            root.style.removeProperty('--navbar-text');
            root.style.removeProperty('--button-bg');
            root.style.removeProperty('--button-text');
            root.style.removeProperty('--button-radius');
            return;
        }

        // 1. Initial LocalSync (Instant for returning users)
        const savedTheme = localStorage.getItem(SHARED_THEME_KEY);
        
        if (savedTheme) {
            setActiveThemeState(savedTheme);
        } else if (initialSettings?.activeTheme) {
            // FALLBACK to server-provided active theme (Crucial for Edge/Incognito)
            setActiveThemeState(initialSettings.activeTheme);
        }

        // 2. apply initial server settings immediately to root variables (Base branding)
        if (initialSettings && !isExemptPath) {
            applyColors(initialSettings);
        }

        // 3. Background API Sync
        const syncThemeWithAPI = async () => {
            if (hasSynced.current) return;
            
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${API_URL}/api/v1/agent/settings/public`, {
                    cache: 'no-store',
                    headers: {
                        'X-Domain': window.location.hostname
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    hasSynced.current = true; // Mark as synced successfully or at least attempted
                    
                    if (data.homepage_settings && !isExemptPath) {
                        const hs = data.homepage_settings;
                        
                        // Check if we need to update localStorage
                        const currentLocal = localStorage.getItem(PAGE_SETTINGS_KEY);
                        if (JSON.stringify(hs) !== currentLocal) {
                            try {
                                localStorage.setItem(PAGE_SETTINGS_KEY, JSON.stringify(hs));
                            } catch (e) {
                                console.warn("Failed to save theme settings to localStorage (quota exceeded)", e);
                            }
                            
                            // If user is on 'default' or has NO local theme, the server settings ARE the theme
                            if (activeTheme === 'default' || !savedTheme) {
                                applyColors(hs);
                                if (hs.activeTheme && hs.activeTheme !== activeTheme) {
                                    setActiveTheme(hs.activeTheme); // Use setActiveTheme to update localStorage too!
                                }
                            }
                        }
                    }
                    
                    // Always update publicSettings state with freshest data from sync
                    setPublicSettings(data);
                }
            } catch (err) {
                console.error("Theme background sync failed", err);
            }
        };

        syncThemeWithAPI();
    }, [activeTheme, initialSettings, isExemptPath]);

    useEffect(() => {
        // Stop loading once we have some theme state (even if default)
        if (activeTheme) {
            setIsLoading(false);
        }
    }, [activeTheme]);

    useEffect(() => {
        const root = document.documentElement;

        if (isExemptPath) {
            const currentTheme = themes.default;
            root.style.setProperty('--primary', currentTheme.primary);
            root.style.setProperty('--primary-light', currentTheme.primaryLight);
            root.style.setProperty('--primary-soft', currentTheme.primarySoft);
            root.style.setProperty('--primary-glow', currentTheme.glow);
            root.style.setProperty('--gradient-start', currentTheme.gradientStart);
            root.style.setProperty('--gradient-mid', currentTheme.gradientMid);
            root.style.setProperty('--gradient-end', currentTheme.gradientEnd);
            return;
        }

        if (activeTheme === 'custom') {
            try {
                const saved = localStorage.getItem(CUSTOM_THEME_KEY);
                if (saved) {
                    applyColors(JSON.parse(saved));
                } else if (initialSettings) {
                    applyColors(initialSettings);
                }
            } catch { /* ignore */ }
            return;
        }

        if (activeTheme === 'default' && initialSettings) {
            applyColors(initialSettings);
            return;
        }

        const currentTheme = themes[activeTheme] || themes.default;
        root.style.setProperty('--primary', currentTheme.primary);
        root.style.setProperty('--primary-light', currentTheme.primaryLight);
        root.style.setProperty('--primary-soft', currentTheme.primarySoft);
        root.style.setProperty('--primary-glow', currentTheme.glow);
        root.style.setProperty('--gradient-start', currentTheme.gradientStart);
        root.style.setProperty('--gradient-mid', currentTheme.gradientMid);
        root.style.setProperty('--gradient-end', currentTheme.gradientEnd);

        const isBrandOrange = currentTheme.primary === '#F97316';
        root.style.setProperty('--sidebar-bg', `rgba(${isBrandOrange ? '55, 45, 100' : '40, 30, 80'}, 0.50)`);
    }, [activeTheme, initialSettings, isExemptPath]);

    // Construct common theme data for the app to consume
    const getThemeData = () => {
        if (activeTheme === 'custom') {
            const p = initialSettings?.primaryColor || initialSettings?.primary_color || initialSettings?.primary || '#F97316';
            const sec = initialSettings?.secondaryColor || initialSettings?.secondary_color || initialSettings?.secondary || '#FB923C';
            
            return {
                name: "Custom",
                primary: p,
                primaryLight: sec,
                primarySoft: initialSettings?.primarySoft || initialSettings?.glass || p + '73', // fallback to ~45% opacity
                gradientStart: p,
                gradientMid: sec,
                gradientEnd: sec,
                glow: `rgba(0,0,0,0.1)`, // Standardized
                preview: [p, sec, p] as [string, string, string]
            };
        }
        return themes[activeTheme] || themes.default;
    }

    return (
        <ThemeContext.Provider value={{
            activeTheme,
            setActiveTheme,
            themeData: getThemeData(),
            isLoading,
            publicSettings
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

