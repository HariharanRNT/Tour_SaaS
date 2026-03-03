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
        <div className={`flex items-center justify-between bg-orange-50/50 rounded-2xl border border-orange-100/50 transition-all hover:bg-orange-50 ${compact ? 'py-1.5 px-4 h-[48px]' : 'py-3 px-4'}`}>
            <div className={`flex ${compact ? 'flex-row items-center gap-2' : 'flex-col'}`}>
                <div className="flex items-center gap-2">
                    <p className={`font-bold text-[#3A1A08] ${compact ? 'text-[13px]' : ''}`}>{label}</p>
                    {badge && (
                        <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                            {badge}
                        </span>
                    )}
                </div>
                {sublabel && (
                    <p className={`font-bold text-[#A0501E] uppercase tracking-wider opacity-70 ${compact ? 'text-[11px] normal-case' : 'text-[11px]'}`}>
                        {sublabel}
                    </p>
                )}
            </div>
            <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={`${compact ? 'h-7 w-7' : 'h-9 w-9'} rounded-full border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all disabled:opacity-30`}
                    onClick={handleDecrement}
                    disabled={value <= min}
                >
                    <Minus className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                </Button>
                <span className={`${compact ? 'w-5 text-md' : 'w-6 text-lg'} text-center font-bold text-[#3A1A08]`}>{value}</span>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={`${compact ? 'h-7 w-7' : 'h-9 w-9'} rounded-full border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all disabled:opacity-30`}
                    onClick={handleIncrement}
                    disabled={value >= max}
                >
                    <Plus className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                </Button>
            </div>
        </div>
    )
}
