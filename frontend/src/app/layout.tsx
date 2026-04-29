import type { Metadata } from "next";
import { API_URL } from "@/lib/api";
import { Inter, Plus_Jakarta_Sans, Fraunces, DM_Sans, Sora, Playfair_Display, JetBrains_Mono, Dancing_Script, Quicksand } from "next/font/google";
import "./globals.css";
import { MainLayout } from "@/components/MainLayout";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: '--font-jakarta' });
const fraunces = Fraunces({ subsets: ["latin"], variable: '--font-fraunces', display: 'swap' });
const dmSans = DM_Sans({ subsets: ["latin"], variable: '--font-dm-sans', display: 'swap' });
const sora = Sora({ subsets: ["latin"], variable: '--font-sora', display: 'swap' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: '--font-mono', display: 'swap' });
const script = Dancing_Script({ subsets: ["latin"], weight: ['400', '500', '600', '700'], variable: '--font-script', display: 'swap' });
const rounded = Quicksand({ subsets: ["latin"], variable: '--font-rounded', display: 'swap' });

export const metadata: Metadata = {
    title: "TourSaaS - Book Your Dream Vacation",
    description: "Discover and book amazing tour packages worldwide",
};

import { Providers } from "@/components/Providers";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { headers } from "next/headers";
import { FaviconHandler } from "@/components/FaviconHandler";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";

export const dynamic = 'force-dynamic';

async function getInitialTheme() {
    try {
        const headersList = headers();
        const host = headersList.get('host') || 'localhost';
        const hostname = host.split(':')[0]; // Remove port if present

        const res = await fetch(`${API_URL}/api/v1/agent/settings/public`, {
            headers: { 'X-Domain': hostname },
            cache: 'no-store'
        });

        console.log(`[SSR] Theme fetch status: ${res.status} for ${hostname}`);

        if (res.status === 403) {
            return { error: 'DEACTIVATED' };
        }

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[SSR] Theme fetch failed: ${errorText}`);
            return null;
        }
        return await res.json();
    } catch (err) {
        return null;
    }
}

function generateThemeStyles(settings: any) {
    if (!settings) return "";

    const hexToRgba = (hex: string, alpha: number) => {
        if (!hex || hex.length < 7) return `rgba(0,0,0,${alpha})`;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    };

    const hexToHsl = (hex: string) => {
        if (!hex || hex.length < 7) return "24 95% 53%";
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;
        if (max === min) h = s = 0;
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const lightenHex = (hex: string, amount: number) => {
        if (!hex || hex.length < 7) return hex;
        let r_ = parseInt(hex.slice(1, 3), 16);
        let g_ = parseInt(hex.slice(3, 5), 16);
        let b_ = parseInt(hex.slice(5, 7), 16);
        r_ = Math.min(255, Math.floor(r_ + (255 - r_) * amount));
        g_ = Math.min(255, Math.floor(g_ + (255 - g_) * amount));
        b_ = Math.min(255, Math.floor(b_ + (255 - b_) * amount));
        const getHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${getHex(r_)}${getHex(g_)}${getHex(b_)}`;
    };

    const p = settings.primaryColor || settings.primary_color || settings.primary || '#F97316';
    const sec = settings.secondaryColor || settings.secondary_color || settings.secondary || '#FB923C';
    const soft = settings.primarySoft || settings.glass || hexToRgba(p, 0.45);
    const hsl = hexToHsl(p);
    const btnBg = settings.buttonStyle?.bgColor || p;

    return `
        body.is-branded {
            --primary: ${p};
            --primary-hsl: ${hsl};
            --ring: ${hsl};
            --primary-color: ${p};
            --primary-light: ${sec};
            --secondary-color: ${sec};
            --primary-glow: ${hexToRgba(p, 0.25)};
            --primary-soft: ${soft};
            --gradient-start: ${p};
            --gradient-mid: ${sec};
            
            /* Navbar Settings */
            --navbar-bg: ${settings.navbarSettings?.bgColor || 'rgba(255, 237, 213, 0.55)'};
            --navbar-text: ${settings.navbarSettings?.textColor || '#0a0a0a'};
            
            /* Button Settings */
            --button-bg: ${btnBg};
            --button-bg-light: ${lightenHex(btnBg, 0.2)};
            --button-glow: ${hexToRgba(btnBg, 0.25)};
            --button-text: ${settings.buttonStyle?.textColor || '#ffffff'};
            --button-radius: ${settings.buttonStyle?.borderRadius || '0.75rem'};
            
            /* Page Settings */
            --page-bg: ${settings.bg_color || 'transparent'};
            --accent-color: ${settings.accent_color || p};

            ${settings.font_family ? `--project-font-family: ${settings.font_family};` : ''}
            ${settings.font_color ? `--color-primary-font: ${settings.font_color};` : ''}
        }
    `.replace(/\s+/g, ' ');
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const initialTheme = await getInitialTheme();
    const isDeactivated = initialTheme?.error === 'DEACTIVATED';
    const homepageSettings = initialTheme?.homepage_settings || null;

    return (
        <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${dmSans.variable} ${inter.variable} ${jakarta.variable} ${sora.variable} ${playfair.variable} ${mono.variable} ${script.variable} ${rounded.variable}`}>
            <head>
                {initialTheme?.agent_id && <meta name="agent-id" content={initialTheme.agent_id} />}
                <ThemeInitializer initialSettings={homepageSettings} />
                <FaviconHandler 
                    agentLogo={homepageSettings?.navbar_logo_image} 
                    agentFavicon={homepageSettings?.favicon_url} 
                />
                {homepageSettings && (
                    <style dangerouslySetInnerHTML={{ __html: generateThemeStyles(homepageSettings) }} />
                )}
            </head>
            <body className="antialiased">
                {isDeactivated ? (
                    <ServiceUnavailable />
                ) : (
                    <ThemeProvider storageKey="customer-theme" initialSettings={homepageSettings}>
                        <Providers>
                            <ScrollToTop />
                            <MainLayout>
                                {children}
                            </MainLayout>
                            <Toaster richColors position="top-right" />
                        </Providers>
                    </ThemeProvider>
                )}
            </body>
        </html>
    );
}
