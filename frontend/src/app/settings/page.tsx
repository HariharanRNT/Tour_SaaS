'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { themes } from '@/lib/themes';
import { useTheme } from '@/context/ThemeContext';
import { Check, Palette } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
    const { activeTheme, setActiveTheme } = useTheme();

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="mb-12">
                <h1 className="text-4xl font-black text-gray-900 mb-4 font-display">Settings</h1>
                <p className="text-gray-500 text-lg">Manage your account preferences and appearance.</p>
            </div>

            <div className="space-y-8">
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-[var(--primary-glow)] rounded-xl text-[var(--primary)]">
                            <Palette className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Appearance</h2>
                    </div>

                    <Card className="glass-panel border-white/40 shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader>
                            <CardTitle>Interface Theme</CardTitle>
                            <CardDescription>Select your preferred color theme for the platform.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.keys(themes).map((key) => {
                                    const theme = themes[key];
                                    const isActive = activeTheme === key;

                                    return (
                                        <div
                                            key={key}
                                            onClick={() => setActiveTheme(key)}
                                            className={`relative group cursor-pointer rounded-2xl border-2 transition-all duration-300 p-4 ${
                                                isActive 
                                                ? 'border-[var(--primary)] bg-[var(--primary-soft)]/20 shadow-lg shadow-[var(--primary-glow)]' 
                                                : 'border-gray-100 bg-white/50 hover:border-gray-200 hover:bg-white/80'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex -space-x-1.5">
                                                    {theme.preview.map((color, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                                            style={{ backgroundColor: color, zIndex: 3 - i }}
                                                        />
                                                    ))}
                                                </div>
                                                {isActive && (
                                                    <Badge className="bg-[var(--primary)] text-white border-none text-[10px] uppercase font-bold px-2 py-0.5">
                                                        Active
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <h4 className={`font-bold ${isActive ? 'text-[var(--primary)]' : 'text-gray-800'}`}>
                                                    {theme.name}
                                                </h4>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {key === 'default' ? 'The original TourSaaS design' : `Beautiful ${theme.name.toLowerCase()} accents`}
                                                </p>
                                            </div>

                                            {isActive && (
                                                <div className="absolute top-2 right-2 p-1 bg-[var(--primary)] rounded-full text-white">
                                                    <Check className="h-3 w-3 stroke-[4px]" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
}
