'use client'

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import PageRenderer from '@/components/page-builder/PageRenderer';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, MessageSquare } from 'lucide-react';

// --- Color Utilities ---
function hexToRgbStr(hex: string): string {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return '91, 140, 244'; // fallback
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

function darken(hex: string, percent: number): string {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return hex;
    let r = parseInt(cleanHex.substring(0, 2), 16);
    let g = parseInt(cleanHex.substring(2, 4), 16);
    let b = parseInt(cleanHex.substring(4, 6), 16);

    r = Math.max(0, Math.floor(r * (1 - percent)));
    g = Math.max(0, Math.floor(g * (1 - percent)));
    b = Math.max(0, Math.floor(b * (1 - percent)));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getLuminance(hex: string): number {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return 0.5;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export default function ContactPage() {
    const { publicSettings, isLoading } = useTheme();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 bg-slate-100 rounded-full" />
                    <div className="h-4 w-32 bg-slate-50 rounded" />
                </div>
            </div>
        );
    }

    const config = publicSettings?.website_pages_config;
    const contactConfig = config?.contact_page;

    const themeConfig = publicSettings?.theme_config;

    const globalDesign = config?.global_design || {
        font_family: 'Inter',
        primary_color: '#5B8CF4',
        text_color: '#1F2937',
        button_style: 'rounded'
    };

    const pColor = themeConfig?.primary_color || globalDesign.primary_color || '#5B8CF4';
    const aColor = themeConfig?.accent_color || pColor;
    const rgbStr = hexToRgbStr(pColor);

    const injectedStyles = `
        .contact-glass-theme {
            background: linear-gradient(
                135deg,
                var(--primary, #4277E0) 0%,
                var(--accent, #6370B0) 50%,
                color-mix(in srgb, var(--primary, #4277E0) 60%, black) 100%
            );
            min-height: 100vh;
            font-family: var(--font-family, 'Inter', sans-serif);
            color: rgba(0, 0, 0, 0.85); /* Body text default */
        }
        
        .contact-glass-theme * {
            box-sizing: border-box;
        }
        
        .contact-glass-theme h1, 
        .contact-glass-theme h2, 
        .contact-glass-theme h3, 
        .contact-glass-theme h4, 
        .contact-glass-theme h5, 
        .contact-glass-theme h6 {
            color: #000000 !important;
        }

        .contact-glass-theme .glass-card {
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(16px) saturate(160%);
            -webkit-backdrop-filter: blur(16px) saturate(160%);
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .contact-glass-theme .glass-glow {
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
        }
        .contact-glass-theme .glass-btn {
            background: var(--button-color, var(--primary));
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.4);
            color: var(--button-text, #FFFFFF);
            transition: all 0.3s ease;
        }
        .contact-glass-theme .glass-btn:hover {
            filter: brightness(1.1);
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
        }
    `;

    return (
        <main className="contact-glass-theme">
            <style dangerouslySetInnerHTML={{ __html: injectedStyles }} />
            
            {(!contactConfig || !contactConfig.enabled || !contactConfig.blocks || contactConfig.blocks.length === 0) ? (
                <section className="py-32 px-6">
                    <div className="container max-w-5xl mx-auto glass-card p-12 rounded-[48px]">
                        <div className="text-center mb-16 space-y-4">
                            <motion.h1 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-5xl md:text-7xl font-black tracking-tight"
                                style={{ color: 'var(--text-color)' }}
                            >
                                Get in Touch
                            </motion.h1>
                            <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--text-color)', opacity: 0.8 }}>
                                Have questions? We&apos;re here to help you plan your next perfect getaway.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { icon: Phone, label: 'Call Us', value: '+91 12345 67890' },
                                { icon: Mail, label: 'Email Us', value: 'hello@travelagency.com' },
                                { icon: MapPin, label: 'Our Office', value: '123 Travel Street, Adventure City' },
                            ].map((item, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-10 rounded-[40px] text-center space-y-4 hover:shadow-xl transition-all glass-card hover:glass-glow"
                                >
                                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto shadow-sm text-white">
                                        <item.icon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] mb-1 text-white/50">{item.label}</p>
                                        <p className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>{item.value}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            ) : (
                <div className="pb-20">
                    <PageRenderer 
                        blocks={contactConfig.blocks} 
                        globalDesign={globalDesign} 
                        themeMode="glass"
                    />
                </div>
            )}
        </main>
    );
}
