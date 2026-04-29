import React from 'react'
import { Lock, AlertTriangle } from 'lucide-react'

export function ServiceUnavailable() {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-100/50 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-50/50 blur-[100px] pointer-events-none" />
            
            <div className="max-w-md w-full bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 p-8 sm:p-12 text-center relative z-10">
                <div className="flex justify-center mb-8">
                    <div className="relative">
                        <div className="w-24 h-24 bg-orange-50 rounded-3xl flex items-center justify-center relative">
                            <Lock className="w-10 h-10 text-orange-500" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg border border-gray-50 flex items-center justify-center text-orange-500">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
                    Portal Unavailable
                </h1>
                
                <p className="text-gray-500 mb-0 leading-relaxed text-lg">
                    This agency portal is currently undergoing maintenance or is temporarily deactivated. Please contact the agency administrator for more information.
                </p>

                <div className="mt-12 pt-8 border-t border-gray-50">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            TourSaaS Platform Status: Protected
                        </span>
                    </div>
                </div>
            </div>

            {/* Stylized floating elements */}
            <div className="absolute top-[20%] left-[15%] hidden lg:block">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-50 rotate-12 opacity-40" />
            </div>
            <div className="absolute bottom-[30%] right-[15%] hidden lg:block">
                <div className="w-16 h-16 rounded-3xl bg-white shadow-sm border border-gray-50 -rotate-12 opacity-40" />
            </div>
        </div>
    )
}
