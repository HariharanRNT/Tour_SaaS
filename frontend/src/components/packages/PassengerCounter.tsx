import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'

interface PassengerCounterProps {
    label: string
    sublabel?: string
    badge?: string
    value: number
    min: number
    max: number
    compact?: boolean
    className?: string
    onChange: (value: number) => void
}

export function PassengerCounter({
    label,
    sublabel,
    badge,
    value,
    min,
    max,
    compact = false,
    className = "",
    onChange
}: PassengerCounterProps) {
    const handleDecrement = () => {
        if (value > min) {
            onChange(value - 1)
        }
    }

    const handleIncrement = () => {
        if (value < max) {
            onChange(value + 1)
        }
    }

    return (
        <div className={`flex items-center justify-between rounded-2xl p-4 shadow-sm border border-slate-100/50 ${compact ? 'h-[64px]' : ''} ${className}`}>
            <div className="flex flex-col">
                <p className="font-bold text-black text-sm uppercase tracking-tight">{label}</p>
                {sublabel && (
                    <p className="text-[11px] text-black/80 font-medium">
                        {sublabel}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-30"
                    onClick={handleDecrement}
                    disabled={value <= min}
                >
                    <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-bold text-[#2D3748] text-lg">{value}</span>
                <button
                    type="button"
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-30"
                    onClick={handleIncrement}
                    disabled={value >= max}
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
