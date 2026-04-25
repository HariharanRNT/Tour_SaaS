'use client'

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import PageRenderer from '@/components/page-builder/PageRenderer';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, MessageSquare } from 'lucide-react';

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

    // Fallback if not configured or disabled
    if (!contactConfig || !contactConfig.enabled || !contactConfig.blocks || contactConfig.blocks.length === 0) {
        return (
            <main className="min-h-screen bg-white">
                <section className="py-32 px-6">
                    <div className="container max-w-5xl mx-auto">
                        <div className="text-center mb-16 space-y-4">
                            <motion.h1 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight"
                            >
                                Get in Touch
                            </motion.h1>
                            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                                Have questions? We're here to help you plan your next perfect getaway.
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
                                    className="p-10 bg-slate-50 rounded-[40px] text-center space-y-4 hover:shadow-xl transition-all"
                                >
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm text-[var(--primary)]">
                                        <item.icon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{item.label}</p>
                                        <p className="text-lg font-bold text-slate-900">{item.value}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen pb-20 bg-white">
            <PageRenderer 
                blocks={contactConfig.blocks} 
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
