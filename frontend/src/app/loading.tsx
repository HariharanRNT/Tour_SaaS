'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
            <div className="text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-24 h-24 mx-auto mb-6"
                >
                    {/* Animated background rings */}
                    <div className="absolute inset-0 rounded-full bg-orange-100/50 animate-ping opacity-20" />
                    <div className="absolute inset-0 rounded-full border-4 border-orange-100 opacity-50" />

                    {/* Main spinner */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-t-4 border-orange-500 border-r-4 border-transparent"
                    />

                    {/* Icon in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-orange-500 animate-pulse" />
                    </div>
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-jakarta font-bold text-slate-900 tracking-tight"
                >
                    Loading Experience...
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{ delay: 0.4 }}
                    className="text-slate-500 mt-2 font-medium"
                >
                    Preparing your journey
                </motion.p>
            </div>
        </div>
    )
}
