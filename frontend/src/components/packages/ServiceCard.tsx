import React from 'react';
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ServiceCardProps {
    icon?: React.ReactNode;
    label?: string; // For fixed services
    isOn: boolean;
    onToggle: () => void;
    description: string;
    onDescriptionChange: (val: string) => void;
    placeholder?: string;
    isVisible: boolean;
    onVisibilityChange: (val: boolean) => void;
    // Custom specific
    isCustom?: boolean;
    heading?: string; // For custom services
    onHeadingChange?: (val: string) => void;
    onRemove?: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
    icon,
    label,
    isOn,
    onToggle,
    description,
    onDescriptionChange,
    placeholder,
    isVisible,
    onVisibilityChange,
    isCustom = false,
    heading,
    onHeadingChange,
    onRemove
}) => {
    return (
        <div 
            className={cn(
                "rounded-xl border transition-all duration-300 min-h-0 relative group/card",
                !isVisible 
                    ? "bg-gray-100/50 border-gray-200 grayscale-[0.5] opacity-60" 
                    : isOn
                        ? "bg-white/40 border-[var(--primary)]/30 shadow-sm"
                        : "bg-black/5 border-transparent opacity-70",
                isCustom && !heading && isOn && "border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
            )}
            style={{
                padding: '10px 12px',
                overflow: 'visible',
                boxSizing: 'border-box',
                width: '100%',
                height: 'auto'
            }}
        >
            {/* Header row */}
            <div className="flex items-center justify-between mb-0 h-8">
                <div className="flex items-center gap-3 flex-1">
                    {/* Visibility Checkbox */}
                    <div className="flex items-center" title="Show this service to customers">
                        <Checkbox 
                            id={`vis-${label || heading || Math.random()}`}
                            checked={isVisible}
                            onCheckedChange={(checked) => onVisibilityChange(checked as boolean)}
                            className="w-4 h-4 rounded border-black/20 data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)]"
                        />
                    </div>

                    {icon && <span className={cn("text-xl transition-opacity", !isVisible && "opacity-40")}>{icon}</span>}
                    {isCustom ? (
                        <div className="flex-1 max-w-[200px]">
                            <Input
                                placeholder="Service Heading"
                                value={heading}
                                maxLength={60}
                                disabled={!isVisible}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onHeadingChange?.(e.target.value.slice(0, 60))}
                                className={cn(
                                    "glass-input h-7 text-xs font-bold tracking-tight border-white/40 rounded-md",
                                    !heading && isOn && "border-red-500/30"
                                )}
                            />
                        </div>
                    ) : (
                        <span className="font-bold text-sm text-black">{label}</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {isCustom && onRemove && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="p-1 rounded text-black/20 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover/card:opacity-100"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Custom Toggle */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onToggle}
                            disabled={!isVisible}
                            className={cn(
                                "relative w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none",
                                !isVisible ? "bg-gray-200 cursor-not-allowed" : isOn ? "bg-[var(--primary)]" : "bg-gray-300"
                            )}
                        >
                            <div
                                className={cn(
                                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200",
                                    isOn ? "translate-x-4" : "translate-x-0",
                                    !isVisible && "bg-gray-100"
                                )}
                            />
                        </button>
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider min-w-[30px]",
                            isOn ? "text-emerald-600" : "text-red-500"
                        )}>
                            {isVisible ? (isOn ? 'ON' : 'OFF') : 'HIDDEN'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Description — only when ON */}
            {isOn && (
                <div className="mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label className="text-[9px] font-bold uppercase text-black/50 mb-1 block leading-none" style={{ paddingLeft: '0px' }}>
                        Description / Details
                    </Label>
                    <Textarea
                        placeholder={placeholder || "Provide details..."}
                        value={description}
                        maxLength={100}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onDescriptionChange(e.target.value.slice(0, 100))}
                        rows={1}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            height: '36px',
                            minHeight: '36px',
                            maxHeight: '36px',
                            resize: 'none',
                            overflow: 'hidden'
                        }}
                        className="text-xs p-2 rounded-md leading-tight glass-input bg-white/50 border-white/30 focus:border-[var(--primary)]/50"
                    />
                    <div className="text-[10px] text-gray-400 float-right font-medium mt-0.5 mb-1 leading-none">
                        {(description || '').length}/100
                    </div>
                    <div className="clear-both" />
                </div>
            )}
        </div>
    );
};

export default ServiceCard;
