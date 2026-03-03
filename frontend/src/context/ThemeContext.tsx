"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AgentTheme } from "@/types/theme";
import axios from "axios";
import { usePathname } from "next/navigation";
import { isTokenExpired } from "@/utils/auth";

// Default Theme
const defaultTheme: AgentTheme = {
    id: "default",
    agent_id: "default",
    primary_color: "hsl(221.2 83.2% 53.3%)",
    secondary_color: "hsl(210 40% 96.1%)",
    accent_color: "hsl(210 40% 96.1%)",
    background_color: "hsl(0 0% 100%)",
    foreground_color: "hsl(222.2 84% 4.9%)",
    font_family: "Inter",
    radius: "0.5rem",
    button_radius: "0.5rem",
    card_radius: "0.75rem",
    hero_background_type: "image",
    section_spacing: "comfortable",
    wcu_title: "Everything You Need",
    wcu_accent_title: "For a Perfect Trip",
    hero_overlay_opacity: 0.6,
    show_feature_cards: true,
    show_wcu_section: true,
    created_at: new Date().toISOString(),
};

// Helper for safe localStorage access
const getCachedTheme = (key: string): AgentTheme | null => {
    if (typeof window === "undefined") return null;
    try {
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
};

interface ThemeContextType {
    theme: AgentTheme;
    isLoading: boolean;
    refreshTheme: () => Promise<void>;
    updateTheme: (updates: Partial<AgentTheme>) => void; // Optimistic update
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<AgentTheme>(defaultTheme);
    const [isLoading, setIsLoading] = useState(true);
    const pathname = usePathname();

    const applyTheme = (themeToApply: AgentTheme) => {
        const root = document.documentElement;

        // Helper to extract HSL values if they are wrapped in hsl()
        const extractValues = (color: string) => {
            if (!color) return "";
            return color.replace(/hsl\(|\)/g, "");
        };

        if (themeToApply.primary_color) root.style.setProperty("--primary", extractValues(themeToApply.primary_color));
        if (themeToApply.secondary_color) root.style.setProperty("--secondary", extractValues(themeToApply.secondary_color));
        if (themeToApply.accent_color) root.style.setProperty("--accent", extractValues(themeToApply.accent_color));
        if (themeToApply.background_color) root.style.setProperty("--background", extractValues(themeToApply.background_color));
        if (themeToApply.foreground_color) root.style.setProperty("--foreground", extractValues(themeToApply.foreground_color));

        if (themeToApply.heading_color) root.style.setProperty("--heading", extractValues(themeToApply.heading_color));
        if (themeToApply.body_text_color) root.style.setProperty("--body-text", extractValues(themeToApply.body_text_color));

        if (themeToApply.button_bg_color) root.style.setProperty("--button-bg", extractValues(themeToApply.button_bg_color));
        if (themeToApply.button_text_color) root.style.setProperty("--button-text", extractValues(themeToApply.button_text_color));
        if (themeToApply.button_radius) root.style.setProperty("--button-radius", themeToApply.button_radius);

        if (themeToApply.card_bg_color) root.style.setProperty("--card-bg", extractValues(themeToApply.card_bg_color));
        if (themeToApply.card_shadow) root.style.setProperty("--card-shadow", themeToApply.card_shadow);
        if (themeToApply.card_radius) root.style.setProperty("--card-radius", themeToApply.card_radius);

        if (themeToApply.radius) root.style.setProperty("--radius", themeToApply.radius);

        // Handle spacing variables based on preset
        const spacingMap: Record<string, string> = {
            compact: "2rem",
            comfortable: "4rem",
            spacious: "8rem"
        };
        root.style.setProperty("--section-spacing", spacingMap[themeToApply.section_spacing || "comfortable"]);

        if (themeToApply.hero_overlay_opacity !== undefined) {
            root.style.setProperty("--hero-overlay-opacity", themeToApply.hero_overlay_opacity.toString());
        }
    };

    const fetchTheme = async () => {
        setIsLoading(true);
        try {
            let fetchedTheme: AgentTheme | null = null;

            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
            let role = null;

            if (token && userStr) {
                try {
                    const userData = JSON.parse(userStr);
                    role = userData.role;
                } catch (e) {
                    // Silently ignore parse errors
                }
            }

            const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const isPreview = searchParams?.get('preview') === 'true';

            // 1. Priority One: Try localStorage for instant preview (if in preview mode)
            if (isPreview) {
                try {
                    const previewData = localStorage.getItem('preview_theme') || sessionStorage.getItem('preview_theme');
                    if (previewData) {
                        fetchedTheme = JSON.parse(previewData);
                    }
                } catch (e) {
                    console.error("Error parsing preview theme from storage", e);
                }
            }

            // 2. If Agent is logged in and no preview theme in session, fetch their specific theme settings
            if (!fetchedTheme && role === 'agent' && token && !isTokenExpired(token)) {
                try {
                    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/theme/agent`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    fetchedTheme = response.data;
                } catch (error: any) {
                    if (error.response?.status === 401) {
                        // Token rejected by backend despite expiration check - likely stale session
                        if (typeof window !== 'undefined') {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            // We don't reload here to avoid infinite loops, just proceed to public fetch
                        }
                    } else {
                        // Non-401 errors are still potentially important for debugging
                        console.warn("Agent theme fetch failed:", error.message);
                    }
                }
            }

            // 3. Fallback: If Public OR if preview/agent fetch failed
            if (!fetchedTheme) {
                const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

                // Check if we are on a custom domain (non-localhost)
                if (hostname && !hostname.includes("localhost") && !hostname.includes("vercel.app") && !hostname.includes("127.0.0.1")) {
                    try {
                        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/theme/public`, {
                            params: {
                                domain: hostname,
                                preview: isPreview
                            },
                            // Add token if available for preview verification
                            headers: token && isPreview ? { Authorization: `Bearer ${token}` } : undefined
                        });
                        fetchedTheme = response.data;
                    } catch (e: any) {
                        // Silently fallback
                    }
                }
            }

            if (fetchedTheme && fetchedTheme.id !== "00000000-0000-0000-0000-000000000000") {
                setTheme(fetchedTheme);
                applyTheme(fetchedTheme);
                if (typeof window !== 'undefined') {
                    localStorage.setItem("agent_theme", JSON.stringify(fetchedTheme));
                }
            } else {
                setTheme(defaultTheme);
                applyTheme(defaultTheme);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem("agent_theme");
                }
            }
        } catch (error) {
            // Very critical errors only
            setTheme(defaultTheme);
            applyTheme(defaultTheme);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Load from cache first for immediate branding after mount
        const cached = getCachedTheme("agent_theme");
        if (cached) {
            setTheme(cached);
            applyTheme(cached);
        } else {
            // Re-apply current theme (default) on mount
            applyTheme(theme);
        }
        fetchTheme();

        // ─── Real-time Preview Sync ──────────────────────────────────────────
        const handleStorageChange = (e: StorageEvent) => {
            const searchParams = new URLSearchParams(window.location.search);
            const isPreview = searchParams.get('preview') === 'true';

            if (isPreview && e.key === 'preview_theme' && e.newValue) {
                try {
                    const newTheme = JSON.parse(e.newValue);
                    setTheme(newTheme);
                    applyTheme(newTheme);
                } catch (err) {
                    console.error("Failed to sync theme from storage event", err);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [pathname]); // Refetch on route change to catch login/logout or domain change simulation

    const updateTheme = (updates: Partial<AgentTheme>) => {
        const newTheme = { ...theme, ...updates } as AgentTheme;
        setTheme(newTheme);
        applyTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, isLoading, refreshTheme: fetchTheme, updateTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
