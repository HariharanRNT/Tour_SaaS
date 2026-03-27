'use client'

import { AlertCircle, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"

interface InactivePlanModalProps {
    isOpen: boolean
    onClose: () => void
}

export function InactivePlanModal({
    isOpen,
    onClose
}: InactivePlanModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_40px_80px_rgba(0,0,0,0.2)] rounded-[28px] overflow-hidden">
                {/* Visual Glass Accent */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                
                <DialogHeader className="pt-6 pb-2">
                    <div className="mx-auto w-12 h-12 bg-amber-400/15 rounded-full flex items-center justify-center border border-amber-400/20 mb-4">
                        <AlertCircle className="h-6 w-6 text-amber-500" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-center text-[#3A1A08] font-display">
                        Agent Plan Inactive
                    </DialogTitle>
                    <DialogDescription className="text-center text-[#5C2500]/70 font-medium px-4">
                        Agent plan is not active. Please contact your travel agent to proceed with this booking.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="sm:justify-center pb-6">
                    <Button 
                        type="button" 
                        onClick={onClose}
                        className="min-w-[140px] h-11 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        Understood
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
