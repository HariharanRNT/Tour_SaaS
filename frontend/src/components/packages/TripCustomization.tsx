import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plane, Hotel, Car, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TripCustomizationProps {
    includeFlights: boolean
    includeHotels: boolean
    includeTransfers: boolean
    onFlightsChange: (checked: boolean) => void
    onHotelsChange: (checked: boolean) => void
    onTransfersChange: (checked: boolean) => void
}

export function TripCustomization({
    includeFlights,
    includeHotels,
    includeTransfers,
    onFlightsChange,
    onHotelsChange,
    onTransfersChange
}: TripCustomizationProps) {
    const CustomizationOption = ({
        title,
        description,
        icon: Icon,
        isSelected,
        onChange,
        colorClass,
        bgClass,
        comingSoon = false
    }: any) => (
        <div
            onClick={() => onChange(!isSelected)}
            className={cn(
                "relative group flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden",
                isSelected
                    ? `border-${colorClass}-500 bg-${colorClass}-50/30 shadow-md`
                    : "border-slate-100 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1 bg-white"
            )}
        >
            <div className={cn(
                "min-w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                isSelected ? `bg-${colorClass}-500 text-white shadow-lg shadow-${colorClass}-200` : `bg-${bgClass} text-${colorClass}-600 group-hover:scale-110`
            )}>
                <Icon className="w-6 h-6" />
            </div>

            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <h3 className={cn(
                        "font-bold text-lg",
                        isSelected ? `text-${colorClass}-900` : "text-slate-900"
                    )}>{title}</h3>
                    {isSelected && (
                        <CheckCircle2 className={cn("w-6 h-6 animate-in zoom-in spin-in-90 duration-300", `text-${colorClass}-500`)} />
                    )}
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{description}</p>

                {comingSoon && isSelected && (
                    <div className={`mt-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-${colorClass}-100 text-${colorClass}-700 animate-in fade-in slide-in-from-top-1`}>
                        ✨ Coming Soon
                    </div>
                )}
            </div>

            {/* Selection Ring Animation */}
            <span className={cn(
                "absolute inset-0 rounded-2xl border-2 pointer-events-none transition-all duration-500",
                isSelected ? `border-${colorClass}-500 opacity-100 scale-100` : "border-transparent opacity-0 scale-95"
            )} />
        </div>
    )

    return (
        <Card className="max-w-3xl mx-auto border-0 shadow-none bg-transparent">
            <CardHeader className="text-center pb-8">
                <CardTitle className="text-3xl font-extrabold text-slate-900">
                    Customize Your Experience
                </CardTitle>
                <CardDescription className="text-lg text-slate-500 max-w-lg mx-auto">
                    Choose the services you need for a seamless journey.
                    AI will tailor recommendations based on your selection.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <CustomizationOption
                    title="Include Flights"
                    description="Search and book best-value flights tailored to your dates. We compare hundreds of airlines instantly."
                    icon={Plane}
                    isSelected={includeFlights}
                    onChange={onFlightsChange}
                    colorClass="blue"
                    bgClass="blue-50"
                />

                <CustomizationOption
                    title="Include Hotels"
                    description="Get AI-curated stay recommendations from 4-star comfort to 5-star luxury at the best rates."
                    icon={Hotel}
                    isSelected={includeHotels}
                    onChange={onHotelsChange}
                    colorClass="cyan"
                    bgClass="cyan-50"
                    comingSoon={true}
                />

                <CustomizationOption
                    title="Include Transfers"
                    description="Hassle-free airport pickups and local city transfers. Travel in comfort with verified drivers."
                    icon={Car}
                    isSelected={includeTransfers}
                    onChange={onTransfersChange}
                    colorClass="indigo"
                    bgClass="indigo-50"
                    comingSoon={true}
                />
            </CardContent>
        </Card>
    )
}
