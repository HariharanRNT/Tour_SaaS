'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, MessageSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIAssistantCardProps {
    chatHistory: Message[];
    isLoading: boolean;
    onSendMessage: (message: string) => void;
    suggestions?: string[];
}

export default function AIAssistantCard({
    chatHistory,
    isLoading,
    onSendMessage,
    suggestions = ["Japan 7 Days", "Maldives Honeymoon"]
}: AIAssistantCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, isLoading]);

    const handleSend = () => {
        if (message.trim() && !isLoading) {
            onSendMessage(message);
            setMessage('');
        }
    };

    return (
        <div className="font-jakarta">
            {/* The Chatbot GIF Button - Fixed permanently */}
            <div className="fixed z-[1050]" style={{ bottom: '24px', right: '24px' }}>
                <button
                    onClick={() => setIsOpen(prev => !prev)}
                    className="cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none group"
                >
                    <img
                        src="/images/Chatbot-2.gif"
                        alt="Chat with Assistant"
                        width={96}
                        height={96}
                        style={{
                            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
                            mixBlendMode: 'multiply'
                        }}
                        className="group-hover:scale-110 transition-transform duration-200 ease-in-out"
                    />
                </button>
            </div>

            {/* Chat Card Panel */}
            <div className="fixed z-[1000] pointer-events-none flex flex-col items-end" style={{ bottom: '90px', right: '24px' }}>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            key="card"
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-[340px] max-h-[480px] rounded-[24px] overflow-hidden flex flex-col border border-white/25 shadow-[0_8px_32px_rgba(255,122,69,0.25)] pointer-events-auto"
                            style={{
                                background: 'rgba(255, 255, 255, 0.12)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                            }}
                        >
                            {/* Header */}
                            <div className="p-4 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#FF7A45]/10 to-[#FFB38A]/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center shadow-lg shadow-orange-500/20">
                                        <Sparkles className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="font-bold text-slate-800 text-sm tracking-tight">AI Assistant</span>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-full hover:bg-black/5 transition-colors text-slate-500"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
                                {/* Intro Text / Empty State */}
                                {chatHistory.length === 0 && (
                                    <div className="text-center py-2">
                                        <p className="text-xs font-semibold text-slate-600">Create itinerary instantly.</p>
                                    </div>
                                )}

                                {/* Chat Messages */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-[var(--primary-soft)]"
                                >
                                    {chatHistory.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-[#FF7A45] text-white rounded-tr-none shadow-md'
                                                    : 'bg-white/60 backdrop-blur-md border border-white/40 text-slate-800 rounded-tl-none'
                                                    }`}
                                            >
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white/60 backdrop-blur-md border border-white/40 px-3.5 py-2.5 rounded-2xl rounded-tl-none">
                                                <div className="flex gap-1.5">
                                                    <div className="w-1.5 h-1.5 bg-[#FF7A45] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-[#FF7A45] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-[#FF7A45] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Input & Chips */}
                                <div className="space-y-3 pt-2">
                                    <div className="relative">
                                        <Input
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            placeholder="Ask anything..."
                                            className="bg-white/40 border-white/40 rounded-full pl-4 pr-10 focus:ring-[#FF7A45] focus:border-[#FF7A45] text-sm h-11 placeholder:text-slate-400"
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={!message.trim() || isLoading}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#FF7A45] flex items-center justify-center text-white disabled:opacity-50 transition-transform active:scale-90"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {suggestions.map((suggestion, i) => (
                                            <button
                                                key={i}
                                                onClick={() => onSendMessage(suggestion)}
                                                className="px-3 py-1.5 bg-[#FFB38A]/20 hover:bg-[#FFB38A]/40 text-[#FF7A45] text-[10px] font-bold rounded-full border border-[#FFB38A]/30 transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Subtle Glow Background */}
                            <div className="absolute -z-10 bottom-0 right-0 w-32 h-32 bg-[#FF7A45]/5 blur-3xl rounded-full pointer-events-none" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
