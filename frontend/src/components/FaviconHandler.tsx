'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface FaviconHandlerProps {
    agentLogo?: string;
    agentFavicon?: string;
}

export function FaviconHandler({ agentLogo, agentFavicon }: FaviconHandlerProps) {
    const pathname = usePathname();

    useEffect(() => {
        const updateFavicon = () => {
            const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/login/admin');
            
            // Priority Logic:
            // 1. Admin Route -> System Logo
            // 2. Agent Favicon (Uploaded)
            // 3. Agent Logo (Uploaded)
            // 4. Default Fallback
            
            let faviconUrl = '/images/RnT logo.png'; // Default / Admin

            if (!isAdminRoute) {
                if (agentFavicon) {
                    faviconUrl = agentFavicon;
                } else if (agentLogo) {
                    faviconUrl = agentLogo;
                }
            }

            // Cache busting
            const cacheBuster = `v=${new Date().getTime()}`;
            const finalUrl = faviconUrl.includes('?') 
                ? `${faviconUrl}&${cacheBuster}` 
                : `${faviconUrl}?${cacheBuster}`;

            // Update <link rel="icon">
            let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
            
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            
            link.href = finalUrl;
            
            // Also update apple-touch-icon if needed
            let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
            if (appleLink) {
                appleLink.href = finalUrl;
            }
        };

        updateFavicon();
    }, [pathname, agentLogo, agentFavicon]);

    return null; // Side-effect only component
}
