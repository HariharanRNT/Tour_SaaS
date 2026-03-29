'use client';

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
                if (path.startsWith('/admin') || path === '/register/agent') {
                    console.log('ThemeInitializer: Exempt path detected, skipping agent branding');
                    return;
                }

                const SHARED_THEME_KEY = 'app-theme';
                const CUSTOM_COLORS_KEY = 'agent_custom_theme';
                const UI_STYLE_KEY = 'ui-style-settings';
                const PAGE_SETTINGS_KEY = 'page-settings-v2';

                const body = document.body;

                const hexToRgba = (hex, alpha) => {
                    if (!hex || hex.length < 7) return 'rgba(0,0,0,' + alpha + ')';
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
                };

                const apply = (s) => {
                    if (!s) return;
                    const r = document.documentElement;
                    
                    // Direct mappings from Design File & Agent Portal
                    const p = s.primaryColor || s.primary_color || s.primary || '#F97316';
                    const sec = s.secondaryColor || s.secondary_color || s.secondary || '#FB923C';
                    const soft = s.primarySoft || s.glass || hexToRgba(p, 0.45);
                    
                    r.style.setProperty('--primary', p);
                    r.style.setProperty('--primary-color', p);
                    r.style.setProperty('--primary-light', sec);
                    r.style.setProperty('--secondary-color', sec);
                    r.style.setProperty('--primary-glow', hexToRgba(p, 0.25));
                    r.style.setProperty('--primary-soft', soft);
                    r.style.setProperty('--gradient-start', p);
                    r.style.setProperty('--gradient-mid', sec);
                    
                    if (s.navbarSettings?.bgColor) r.style.setProperty('--navbar-bg', s.navbarSettings.bgColor);
                    if (s.navbarSettings?.textColor) r.style.setProperty('--navbar-text', s.navbarSettings.textColor);
                    
                    if (s.buttonStyle?.bgColor) r.style.setProperty('--button-bg', s.buttonStyle.bgColor);
                    if (s.buttonStyle?.textColor) r.style.setProperty('--button-text', s.buttonStyle.textColor);
                    if (s.buttonStyle?.borderRadius) r.style.setProperty('--button-radius', s.buttonStyle.borderRadius);

                    if (s.font_family || s.fontFamily) r.style.setProperty('--font-family', s.font_family || s.fontFamily);
                    if (s.font_size || s.fontSize) r.style.setProperty('--font-size', s.font_size || s.fontSize);
                };

                // 1. apply initial server settings first (Highest Priority for SSR)
                const init = ${JSON.stringify(initialSettings)};
                if (init) {
                    apply(init);
                }

                // 2. Load from cache (For faster subsequent navigation)
                const cachedTheme = localStorage.getItem('agentTheme');
                if (cachedTheme) {
                    try { apply(JSON.parse(cachedTheme)); } catch(e) {}
                }

                // 3. Background Sync (Only if initial settings are missing)
                const metaAgent = document.querySelector('meta[name="agent-id"]');
                const agentId = metaAgent ? metaAgent.content : null;
                
                if (agentId && !init) {
                    const API_URL = '${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}';
                    fetch(API_URL + '/api/v1/agent/settings/public', {
                         headers: { 
                            'X-Agent-ID': agentId,
                            'X-Domain': window.location.hostname
                         } 
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data && data.homepage_settings) {
                            apply(data.homepage_settings);
                            localStorage.setItem('agentTheme', JSON.stringify(data.homepage_settings));
                        }
                    })
                    .catch(function() {});
                }

                // 4. Legacy Cache compatibility
                try {
                    const customThemeStr = localStorage.getItem(CUSTOM_COLORS_KEY);
                    if (customThemeStr) apply(JSON.parse(customThemeStr));
                } catch(e) {}

                // 5. Load UI Style Classes
                const uiStyleStr = localStorage.getItem(UI_STYLE_KEY);
                if (uiStyleStr) {
                    const { buttonShape, iconStyle, cardStyle, density, fontPairing } = JSON.parse(uiStyleStr);
                    const bodyClassList = document.body.classList;
                    if (buttonShape) bodyClassList.add('btn-' + buttonShape);
                    if (iconStyle) bodyClassList.add('icon-' + iconStyle);
                    if (cardStyle) bodyClassList.add('card-' + cardStyle);
                    if (density) bodyClassList.add('density-' + density);
                    if (fontPairing) bodyClassList.add('font-' + fontPairing);
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
