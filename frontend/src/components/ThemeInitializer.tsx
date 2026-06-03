'use client';

import { API_URL } from '@/lib/api';

/**
 * ThemeInitializer
 * 
 * This component injects a blocking script in the <head> to prevent FOUC (Flash of Unstyled Content).
 * It reads theme settings from localStorage and applies CSS variables before React mounts.
 */
export function ThemeInitializer({ initialSettings }: { initialSettings: any }) {
    const scriptContent = `
        (function() {
            try {
                const root = document.documentElement;
                const path = window.location.pathname;

                // EXEMPT PATHS: Do not apply agent branding to Admin or Registration
                if (path.startsWith('/admin') || path.startsWith('/register/agent')) {
                    console.log('ThemeInitializer: Exempt path detected, skipping agent branding');
                    return;
                }

                const CUSTOM_COLORS_KEY = 'agent_custom_theme';
                const UI_STYLE_KEY = 'ui-style-settings';

                const body = document.body;

                const hexToRgba = (hex, alpha) => {
                    if (!hex || hex.length < 7) return 'rgba(0,0,0,' + alpha + ')';
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
                };

                const hexToHsl = (hex) => {
                    if (!hex || hex.length < 7) return "24 95% 53%";
                    let r = parseInt(hex.slice(1, 3), 16) / 255;
                    let g = parseInt(hex.slice(3, 5), 16) / 255;
                    let b = parseInt(hex.slice(4, 7), 16) / 255;
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
                    return Math.round(h * 360) + " " + Math.round(s * 100) + "% " + Math.round(l * 100) + "%";
                };

                const lightenHex = (hex, amount) => {
                    if (!hex || hex.length < 7) return hex;
                    let r = parseInt(hex.slice(1, 3), 16);
                    let g = parseInt(hex.slice(3, 5), 16);
                    let b = parseInt(hex.slice(5, 7), 16);
                    r = Math.min(255, Math.floor(r + (255 - r) * amount));
                    g = Math.min(255, Math.floor(g + (255 - g) * amount));
                    b = Math.min(255, Math.floor(b + (255 - b) * amount));
                    const getHex = (n) => n.toString(16).padStart(2, '0');
                    return '#' + getHex(r) + getHex(g) + getHex(b);
                };

                let globalUiStyles = {};
                try {
                    const uiStyleStr = localStorage.getItem(UI_STYLE_KEY);
                    if (uiStyleStr) globalUiStyles = JSON.parse(uiStyleStr);
                } catch(e) {}

                const applyClasses = () => {
                    const b = document.body;
                    if (b) {
                        if (path.startsWith('/admin') || path.startsWith('/register/agent')) {
                            b.classList.remove('is-branded');
                            b.classList.add('admin-panel');
                            return;
                        }
                        
                        b.classList.add('is-branded');
                        
                        // Clear existing UI style classes
                        ['btn', 'icon', 'card', 'density', 'font'].forEach(prefix => {
                            Array.from(b.classList).forEach(cls => {
                                if (cls.startsWith(prefix + '-')) b.classList.remove(cls);
                            });
                        });
                        
                        if (globalUiStyles.buttonShape) b.classList.add('btn-' + globalUiStyles.buttonShape);
                        if (globalUiStyles.iconStyle) b.classList.add('icon-' + globalUiStyles.iconStyle);
                        if (globalUiStyles.cardStyle) b.classList.add('card-' + globalUiStyles.cardStyle);
                        if (globalUiStyles.density) b.classList.add('density-' + globalUiStyles.density);
                        if (globalUiStyles.fontPairing) b.classList.add('font-' + globalUiStyles.fontPairing);
                    }
                };

                const apply = (s) => {
                    if (!s) return;
                    const r = document.documentElement;
                    
                    const p = s.primaryColor || s.primary_color || s.primary || '#F97316';
                    const sec = s.secondaryColor || s.secondary_color || s.secondary || '#FB923C';
                    const soft = s.primarySoft || s.glass || hexToRgba(p, 0.45);
                    const hsl = hexToHsl(p);
                    
                    r.style.setProperty('--primary', p);
                    r.style.setProperty('--primary-hsl', hsl);
                    r.style.setProperty('--ring', hsl);
                    r.style.setProperty('--primary-color', p);
                    r.style.setProperty('--primary-light', sec);
                    r.style.setProperty('--secondary-color', sec);
                    r.style.setProperty('--primary-glow', hexToRgba(p, 0.25));
                    r.style.setProperty('--primary-soft', soft);
                    r.style.setProperty('--gradient-start', p);
                    r.style.setProperty('--gradient-mid', sec);
                    
                    if (s.navbarSettings?.bgColor) r.style.setProperty('--navbar-bg', s.navbarSettings.bgColor);
                    if (s.navbarSettings?.textColor) r.style.setProperty('--navbar-text', s.navbarSettings.textColor);
                    
                    const btnBg = s.buttonStyle?.bgColor || s.button_color;
                    if (btnBg) {
                        r.style.setProperty('--button-bg', btnBg);
                        r.style.setProperty('--button-bg-light', lightenHex(btnBg, 0.2));
                        r.style.setProperty('--button-glow', hexToRgba(btnBg, 0.25));
                    }
                    if (s.buttonStyle?.textColor) r.style.setProperty('--button-text', s.buttonStyle.textColor);
                    if (s.buttonStyle?.borderRadius) r.style.setProperty('--button-radius', s.buttonStyle.borderRadius);

                    if (s.bg_color) r.style.setProperty('--page-bg', s.bg_color);
                    if (s.accent_color) r.style.setProperty('--accent-color', s.accent_color);

                    if (s.font_family || s.fontFamily) {
                        const ff = s.font_family || s.fontFamily;
                        r.style.setProperty('--font-family', ff);
                        r.style.setProperty('--font-primary', ff);
                        r.style.setProperty('--project-font-family', ff);
                    }
                    if (s.font_color || s.fontColor) {
                        r.style.setProperty('--color-primary-font', s.font_color || s.fontColor);
                    }
                    
                    if (s.buttonShape) globalUiStyles.buttonShape = s.buttonShape;
                    if (s.iconStyle) globalUiStyles.iconStyle = s.iconStyle;
                    if (s.cardStyle) globalUiStyles.cardStyle = s.cardStyle;
                    if (s.density) globalUiStyles.density = s.density;
                    if (s.fontPairing) globalUiStyles.fontPairing = s.fontPairing;
                    
                    if (document.readyState !== 'loading') applyClasses();
                };

                // 1. apply initial server settings first (Highest Priority for SSR)
                const init = ${initialSettings ? JSON.stringify(initialSettings).replace(/</g, '\\u003c') : 'null'};
                if (init) {
                    apply(init);
                    // Update cache so client navigations stay fresh
                    try { localStorage.setItem('agentTheme', JSON.stringify(init)); } catch(e) {}
                } else {
                    // 2. Load from cache (For faster subsequent navigation)
                    const cachedTheme = localStorage.getItem('agentTheme');
                    if (cachedTheme) {
                        try { apply(JSON.parse(cachedTheme)); } catch(e) {}
                    }
                    
                    // 4. Legacy Cache compatibility
                    try {
                        const customThemeStr = localStorage.getItem(CUSTOM_COLORS_KEY);
                        if (customThemeStr) apply(JSON.parse(customThemeStr));
                    } catch(e) {}
                }

                // 3. Background Sync (Always fetch fresh if possible to keep client updated)
                const metaAgent = document.querySelector('meta[name="agent-id"]');
                const agentId = metaAgent ? metaAgent.content : null;
                
                if (agentId) {
                    const apiUrl = '${API_URL}';
                    fetch(apiUrl + '/api/v1/agent/settings/public', {
                         headers: { 
                            'X-Agent-ID': agentId,
                            'X-Domain': window.location.hostname
                         } 
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data && data.homepage_settings) {
                            apply(data.homepage_settings);
                            try {
                                localStorage.setItem('agentTheme', JSON.stringify(data.homepage_settings));
                            } catch(e) {}
                        }
                    })
                    .catch(function() {});
                }

                // 5. Apply initial classes (Safe for <head>)
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', applyClasses);
                } else {
                    applyClasses();
                }
            } catch (e) {
                console.warn('Theme initialization failed', e);
            }

        })();
    `;

    return (
        <script
            dangerouslySetInnerHTML={{ __html: scriptContent }}
        />
    );
}
