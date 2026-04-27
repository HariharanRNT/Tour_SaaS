'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Check, X, Plane, Car, Hotel, ShieldCheck, MapPin, Coffee, Headphones, FileText, Sparkles, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InclusionDetail {
    included: boolean
    details: string | null
    visibleToCustomer?: boolean
}

interface Inclusions {
    [key: string]: InclusionDetail | undefined;
    flights?: InclusionDetail
    transportation?: InclusionDetail
    hotel?: InclusionDetail
    visaAssistance?: InclusionDetail
    travelInsurance?: InclusionDetail
    tourGuide?: InclusionDetail
    foodAndDining?: InclusionDetail
    supportAndServices?: InclusionDetail
    languages?: InclusionDetail
}

interface CustomService {
    id: string
    heading: string
    description: string
    isIncluded: boolean
    visibleToCustomer?: boolean
}

interface InclusionsSectionProps {
    inclusions: Inclusions
    exclusions?: any
    custom_services?: CustomService[]
}

const INCLUSION_METADATA: Record<string, { label: string; icon: any }> = {
    flights: { label: 'Flights', icon: Plane },
    transportation: { label: 'Transportation', icon: Car },
    hotel: { label: 'Hotel', icon: Hotel },
    visaAssistance: { label: 'Visa Assistance', icon: FileText },
    travelInsurance: { label: 'Travel Insurance', icon: ShieldCheck },
    tourGuide: { label: 'Tour Guide', icon: MapPin },
    foodAndDining: { label: 'Food & Dining', icon: Coffee },
    supportAndServices: { label: 'Support & Services', icon: Headphones },
    languages: { label: 'Language Support', icon: Languages },
}

export function InclusionsSection({ inclusions, exclusions, custom_services = [] }: InclusionsSectionProps) {
    if (!inclusions) return null

    // Get all standard keys
    const allStandardKeys = Object.keys(INCLUSION_METADATA);

    // Split standard items into included and excluded lists
    const includedItems = allStandardKeys
        .filter(key => {
            const item = inclusions[key];
            return item?.included && (item.visibleToCustomer !== false);
        })
        .map(key => {
            return {
                key,
                ...INCLUSION_METADATA[key],
                details: inclusions[key]?.details
            };
        });

    const excludedItems = allStandardKeys
        .filter(key => !inclusions[key]?.included && (inclusions[key]?.visibleToCustomer !== false))
        .map(key => {
            return {
                key,
                ...INCLUSION_METADATA[key]
            };
        });

    // Handle custom services
    const includedCustom = custom_services
        .filter(s => s.isIncluded && (s.visibleToCustomer !== false))
        .map(s => ({
            key: s.id,
            label: s.heading,
            icon: Sparkles,
            details: s.description,
            isCustom: true
        }));
    
    // Add custom services to excluded items
    const excludedCustom = custom_services
        .filter(s => !s.isIncluded && (s.visibleToCustomer !== false))
        .map(s => ({
            key: s.id,
            label: s.heading,
            icon: Sparkles,
            isCustom: true
        }));

    const allIncluded = [...includedItems, ...includedCustom];
    
    // Combine standard exclusions and custom exclusions
    const allExcluded = [...excludedItems, ...excludedCustom];

    return (
        <section className="space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold text-black tracking-tight flex items-center gap-3">
                    What's Included <span className="text-[var(--primary)]">&</span> Excluded
                </h2>
                <div className="h-1.5 w-24 bg-[var(--primary)] rounded-full" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inclusions Card */}
                <Card className="border-0 shadow-xl bg-white/40 backdrop-blur-md overflow-hidden group w-full">
                    <div className="bg-emerald-500/10 px-6 py-4 border-b border-emerald-500/20 flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-600">
                            <Check className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-emerald-900 uppercase tracking-widest text-sm">Package Inclusions</h3>
                    </div>
                    <CardContent className="p-6 space-y-6">
                        {allIncluded.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6">
                                {includedItems.map((item) => (
                                    <div key={item.key} className="flex gap-4 group/item">
                                        <div className="mt-1 p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover/item:bg-emerald-100 transition-colors">
                                            {item.icon && <item.icon className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 space-y-1 min-w-0">
                                            <div className="font-bold text-black group-hover/item:text-[var(--primary)] transition-colors">
                                                {item.label}
                                            </div>
                                            <p className="text-sm text-black/70 leading-relaxed break-words whitespace-normal">
                                                {item.details || `Standard ${item.label.toLowerCase()} included in package.`}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {includedCustom.length > 0 && (
                                    <div className="pt-6 border-t border-emerald-500/10 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-black/40">Additional Services</span>
                                        </div>
                                        {includedCustom.map((item) => (
                                            <div key={item.key} className="flex gap-4 group/item">
                                                <div className="mt-1 p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover/item:bg-emerald-100 transition-colors">
                                                    {item.icon && <item.icon className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 space-y-1 min-w-0">
                                                    <div className="font-bold text-black group-hover/item:text-[var(--primary)] transition-colors">
                                                        {item.label}
                                                    </div>
                                                    <p className="text-sm text-black/70 leading-relaxed break-words whitespace-normal">
                                                        {item.details || `Standard ${item.label.toLowerCase()} included in package.`}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-black/50 italic py-4 text-center">No specific inclusions defined.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Exclusions Card */}
                <Card className="border-0 shadow-xl bg-white/40 backdrop-blur-md overflow-hidden group w-full">
                    <div className="bg-rose-500/10 px-6 py-4 border-b border-rose-500/20 flex items-center gap-3">
                        <div className="p-2 bg-rose-500/20 rounded-lg text-rose-600">
                            <X className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-rose-900 uppercase tracking-widest text-sm">Exclusions</h3>
                    </div>
                    <CardContent className="p-6 space-y-4">
                        {allExcluded.length > 0 || (Array.isArray(exclusions) && exclusions.length > 0) ? (
                            <div className="flex flex-col gap-4">
                                {allExcluded.length > 0 && (
                                    <div className="flex flex-wrap gap-3">
                                        {allExcluded.map((item) => (
                                            <div 
                                                key={item.key} 
                                                className="flex items-center gap-2 px-4 py-2 bg-rose-50/50 border border-rose-100 rounded-full text-rose-700 text-sm font-medium line-through opacity-80"
                                            >
                                                {item.icon && <item.icon className="w-3.5 h-3.5" />}
                                                {item.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {Array.isArray(exclusions) && exclusions.length > 0 && (
                                    <ul className="space-y-2 list-disc list-inside">
                                        {exclusions.map((item, idx) => (
                                            <li key={`text-excl-${idx}`} className="text-sm text-rose-800 opacity-80 break-words whitespace-normal">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-black/50 italic py-4 text-center">Refer to terms and conditions.</p>
                        )}
                        <div className="pt-4 mt-4 border-t border-rose-100/50">
                            <p className="text-xs text-rose-800/60 leading-relaxed italic break-words whitespace-normal">
                                * Anything not explicitly mentioned in the inclusions list is excluded from the package. Personal expenses, tips, and additional activities are not covered.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}
