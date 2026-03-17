import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Fraunces, DM_Sans, Sora, Playfair_Display } from "next/font/google";
import "./globals.css";
import { MainLayout } from "@/components/MainLayout";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: '--font-jakarta' });
const fraunces = Fraunces({ subsets: ["latin"], variable: '--font-fraunces', display: 'swap' });
const dmSans = DM_Sans({ subsets: ["latin"], variable: '--font-dm-sans', display: 'swap' });
const sora = Sora({ subsets: ["latin"], variable: '--font-sora', display: 'swap' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair', display: 'swap' });

export const metadata: Metadata = {
    title: "TourSaaS - Book Your Dream Vacation",
    description: "Discover and book amazing tour packages worldwide",
};

import { Providers } from "@/components/Providers";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { headers } from "next/headers";

async function getInitialTheme() {
    try {
        const headersList = headers();
        const host = headersList.get('host') || 'localhost';
        const hostname = host.split(':')[0]; // Remove port if present
        
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        const res = await fetch(`${API_URL}/api/v1/agent/settings/public`, {
            headers: {
                'X-Domain': hostname
            },
            cache: 'no-store'
        });
        
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.error("Failed to fetch initial theme:", err);
        return null;
    }
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const initialTheme = await getInitialTheme();
    const homepageSettings = initialTheme?.homepage_settings || null;

    return (
        <html lang="en">
            <head>
                {initialTheme?.id && <meta name="agent-id" content={initialTheme.id} />}
            </head>
            <body className={`${dmSans.className} ${fraunces.variable} ${dmSans.variable} ${inter.variable} ${jakarta.variable} ${sora.variable} ${playfair.variable}`}>
                <ThemeInitializer initialSettings={homepageSettings} />
                <ThemeProvider storageKey="customer-theme" initialSettings={homepageSettings}>
                    <Providers>
                        <ScrollToTop />
                        <MainLayout>
                            {children}
                        </MainLayout>
                        <ToastContainer position="top-right" autoClose={3000} />
                    </Providers>
                </ThemeProvider>
            </body>
        </html>
    );
}
