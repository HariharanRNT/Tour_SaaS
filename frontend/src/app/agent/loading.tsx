'use client'

import { motion } from 'framer-motion'
import { LayoutDashboard } from 'lucide-react'

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
            <div className="text-center">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative inline-block"
                >
                    <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse rounded-full" />
                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 relative">
                        <LayoutDashboard className="h-12 w-12 text-blue-600 animate-bounce" />
                    </div>
                </motion.div>
                <div className="mt-8 space-y-4">
                    <h2 className="text-xl font-jakarta font-bold text-slate-800">
                        Initializing Agent Portal
                    </h2>
                    <div className="flex justify-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0.8, opacity: 0.3 }}
                                animate={{ scale: 1.2, opacity: 1 }}
                                transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    delay: i * 0.2
                                }}
                                className="w-2.5 h-2.5 rounded-full bg-blue-500"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
