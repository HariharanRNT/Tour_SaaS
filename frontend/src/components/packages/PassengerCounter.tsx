import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'

interface PassengerCounterProps {
    label: string
    sublabel?: string
    value: number
    min: number
    max: number
    onChange: (value: number) => void
}

export function PassengerCounter({
    label,
    sublabel,
    value,
    min,
    max,
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
        <div className="flex items-center justify-between py-2">
            <div>
                <p className="font-medium text-gray-900">{label}</p>
                {sublabel && <p className="text-sm text-gray-500">{sublabel}</p>}
            </div>
            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleDecrement}
                    disabled={value <= min}
                >
                    <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{value}</span>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleIncrement}
                    disabled={value >= max}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
