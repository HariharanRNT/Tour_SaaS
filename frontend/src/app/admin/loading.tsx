'use client'

import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative inline-block"
                >
                    <div className="absolute inset-0 bg-slate-900 blur-2xl opacity-10 animate-pulse rounded-full" />
                    <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl relative">
                        <Shield className="h-12 w-12 text-white animate-pulse" />
                    </div>
                </motion.div>
                <div className="mt-8 space-y-4">
                    <h2 className="text-xl font-jakarta font-bold text-slate-900">
                        Securing Admin Session
                    </h2>
                    <div className="w-48 h-1.5 bg-slate-200 mx-auto rounded-full overflow-hidden">
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="w-1/2 h-full bg-slate-900 rounded-full"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
