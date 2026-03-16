'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { themes } from '@/lib/themes';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';

export function ThemeSwitcher() {
    const [isOpen, setIsOpen] = useState(false);
    const { activeTheme, setActiveTheme } = useTheme();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const themeKeys = Object.keys(themes);

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-full hover:bg-white/20 transition-all text-[var(--primary)]"
                title="Change Theme"
            >
                <Palette className="h-5 w-5" />
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-3xl overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-gray-100/50">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                            Interface Theme
                        </h3>
                    </div>

                    <div className="py-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {themeKeys.map((key) => {
                            const theme = themes[key];
                            const isActive = activeTheme === key;

                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        setActiveTheme(key);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/50 transition-colors ${isActive ? 'bg-white/40' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-1.5">
                                            {theme.preview.map((color, i) => (
                                                <div
                                                    key={i}
                                                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                                    style={{ backgroundColor: color, zIndex: 3 - i }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className={`text-sm font-bold ${isActive ? 'text-[var(--primary)]' : 'text-gray-700'}`}>
                                                {theme.name}
                                            </span>
                                            {key === 'default' && (
                                                <span className="text-[10px] font-medium text-gray-400">
                                                    ★ Original Design
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isActive && (
                                        <div className="bg-[var(--primary-soft)] p-1 rounded-full">
                                            <Check className="h-3 w-3 text-[var(--primary)] stroke-[3px]" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    
                    {activeTheme === 'default' && (
                        <div className="p-3 bg-gray-50/50 text-center">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                Restore original defaults
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
