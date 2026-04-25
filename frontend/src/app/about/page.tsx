'use client'

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import PageRenderer from '@/components/page-builder/PageRenderer';
import { motion } from 'framer-motion';

export default function AboutPage() {
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
    const aboutConfig = config?.about_page;

    // Fallback if not configured or disabled
    if (!aboutConfig || !aboutConfig.enabled || !aboutConfig.blocks || aboutConfig.blocks.length === 0) {
        return (
            <main className="min-h-screen bg-white">
                <section className="py-32 px-6">
                    <div className="container max-w-4xl mx-auto text-center space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight">About Us</h1>
                            <div className="h-1.5 w-24 bg-[var(--primary)] mx-auto rounded-full" />
                        </motion.div>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto"
                        >
                            Welcome to {publicSettings?.agency_name || 'our agency'}. We are a team of passionate travel enthusiasts dedicated to creating unforgettable experiences for our clients. Our mission is to make travel planning seamless, personalized, and inspiring.
                        </motion.p>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen pb-20 bg-white">
            <PageRenderer 
                blocks={aboutConfig.blocks} 
                globalDesign={config.global_design || {
                    font_family: 'Inter',
                    primary_color: 'var(--primary)',
                    text_color: '#1F2937',
                    button_style: 'rounded'
                }} 
            />
        </main>
    );
}
