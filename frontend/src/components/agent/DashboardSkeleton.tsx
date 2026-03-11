'use client'

import { motion } from 'framer-motion'

export function DashboardSkeleton() {
    return (
        <div className="container mx-auto px-6 py-8 space-y-10 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-7 py-6 rounded-2xl border border-slate-100 bg-white/50">
                <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-full bg-slate-200" />
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
                        <div className="h-4 w-32 bg-slate-100 rounded-md" />
                    </div>
                </div>
                <div className="h-12 w-36 bg-slate-200 rounded-full" />
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="h-4 w-24 bg-slate-100 rounded" />
                                <div className="h-8 w-32 bg-slate-200 rounded-lg" />
                            </div>
                            <div className="h-12 w-12 bg-slate-100 rounded-xl" />
                        </div>
                        <div className="h-4 w-full bg-slate-50 rounded" />
                    </div>
                ))}
            </div>

            {/* Main Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Graph Skeleton */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 h-[400px]">
                        <div className="flex justify-between items-center mb-8">
                            <div className="h-6 w-48 bg-slate-200 rounded" />
                            <div className="h-10 w-32 bg-slate-100 rounded-full" />
                        </div>
                        <div className="w-full h-64 bg-slate-50 rounded-xl border-b-2 border-l-2 border-slate-100" />
                    </div>

                    {/* Table/List Skeleton */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 space-y-6">
                        <div className="h-6 w-36 bg-slate-200 rounded" />
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between py-4 border-b border-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-slate-100 rounded-lg" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-40 bg-slate-200 rounded" />
                                        <div className="h-3 w-24 bg-slate-100 rounded" />
                                    </div>
                                </div>
                                <div className="h-8 w-24 bg-slate-50 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar Column Skeleton */}
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 h-[300px] flex flex-col justify-center items-center space-y-4">
                        <div className="h-16 w-16 bg-slate-100 rounded-full" />
                        <div className="h-4 w-32 bg-slate-200 rounded" />
                        <div className="h-10 w-full bg-slate-100 rounded-lg" />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
                        <div className="h-5 w-28 bg-slate-200 rounded" />
                        {[1, 2].map(i => (
                            <div key={i} className="h-20 w-full bg-slate-50 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
