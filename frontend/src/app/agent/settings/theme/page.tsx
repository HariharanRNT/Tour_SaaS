'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { themes } from '@/lib/themes';
import { useTheme } from '@/context/ThemeContext';
import { Check, Palette, ArrowLeft, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export default function AgentThemeSettingsPage() {
    const { activeTheme, setActiveTheme } = useTheme();
    const router = useRouter();

    const handleThemeChange = (key: string) => {
        setActiveTheme(key);
        toast.success("Theme updated successfully", {
            position: "bottom-right",
            autoClose: 2000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
        });
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
            <div className="space-y-6">
                <nav className="flex items-center text-sm font-medium text-slate-500">
                    <button
                        onClick={() => router.push('/agent/settings')}
                        className="hover:text-blue-600 transition-colors flex items-center gap-1"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Settings
                    </button>
                </nav>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Portal Appearance</h1>
                        <p className="text-lg text-slate-500 max-w-2xl font-medium">
                            Customize your agent portal color theme to match your agency branding.
                        </p>
                    </div>
                </div>
            </div>

            <Card className="glass-panel border-white/40 shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--primary-glow)] rounded-xl text-[var(--primary)]">
                            <Palette className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-bold text-slate-900">Theme Library</CardTitle>
                            <CardDescription className="text-sm font-medium text-slate-500">
                                Select a color palette that feels right for your daily workflow.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Object.keys(themes).map((key) => {
                            const theme = themes[key];
                            const isActive = activeTheme === key;

                            return (
                                <div
                                    key={key}
                                    onClick={() => handleThemeChange(key)}
                                    className={`relative group cursor-pointer rounded-2xl border-2 transition-all duration-300 p-5 ${
                                        isActive 
                                        ? 'border-[var(--primary)] bg-[var(--primary-soft)]/20 shadow-lg shadow-[var(--primary-glow)]' 
                                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex -space-x-2">
                                            {theme.preview.map((color, i) => (
                                                <div
                                                    key={i}
                                                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                                    style={{ backgroundColor: color, zIndex: 3 - i }}
                                                />
                                            ))}
                                        </div>
                                        {isActive && (
                                            <Badge className="bg-[var(--primary)] text-white border-none text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <h4 className={`text-base font-bold ${isActive ? 'text-[var(--primary)]' : 'text-slate-800'}`}>
                                            {theme.name}
                                        </h4>
                                        <p className="text-xs text-slate-400 font-medium">
                                            {key === 'default' ? 'Original TourSaaS design' : `${theme.name} palette`}
                                        </p>
                                    </div>

                                    {isActive && (
                                        <div className="absolute -top-2 -right-2 p-1.5 bg-[var(--primary)] rounded-full text-white shadow-lg ring-4 ring-white">
                                            <Check className="h-3 w-3 stroke-[4px]" />
                                        </div>
                                    )}
                                    
                                    {!isActive && (
                                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 rounded-2xl transition-colors" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <div className="bg-[var(--primary-soft)]/20 rounded-2xl p-6 border border-[var(--primary-light)]/20 flex items-start gap-4">
                <div className="p-2 bg-[var(--primary-soft)]/30 rounded-lg text-[var(--primary)]">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div>
                    <h5 className="text-sm font-bold text-slate-800 mb-1">Personalized Experience</h5>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Your theme preference is saved locally and will not affect the customer-facing pages or other agents in your organization.
                    </p>
                </div>
            </div>
        </div>
    );
}
