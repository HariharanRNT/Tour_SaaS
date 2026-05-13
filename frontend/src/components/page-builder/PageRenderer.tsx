'use client'

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
    Zap, ClipboardList, Camera, Compass, Users, Award,
    Mail, CheckCircle, RotateCcw, Globe, Phone, MapPin,
    ArrowRight, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitize';
import SafeHTML from '@/components/SafeHTML';

interface BlockProps {
    fields: any;
    globalDesign: any;
    themeMode?: string;
}

const truncateText = (text: string, limit: number): string => {
  if (!text) return '';
  return text.length > limit 
    ? text.slice(0, limit).trimEnd() + '...' 
    : text;
};

const HeroBlock = ({ fields, globalDesign, themeMode }: BlockProps) => {
    return (
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden py-12 md:py-16 px-6">
            {fields.imageUrl && (
                <div className="absolute inset-0 z-0">
                    <Image src={fields.imageUrl} alt={fields.title} fill className="object-cover" priority />
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundColor: fields.overlayColor || '#000000',
                            opacity: (fields.bgOpacity || 50) / 100
                        }}
                    />
                </div>
            )}
            <div className="container relative z-10 text-center max-w-3xl mx-auto overflow-hidden w-full">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={cn("text-3xl md:text-5xl font-black mb-6 leading-tight break-words whitespace-normal max-w-full line-clamp-2", fields.imageUrl ? "text-white" : "")}
                    style={!fields.imageUrl ? { color: globalDesign.text_color } : {}}
                >
                    {truncateText(fields.title, 60)}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className={cn("text-lg md:text-xl mb-10 font-light break-words whitespace-normal max-w-[700px] mx-auto line-clamp-2", fields.imageUrl ? "text-white/90" : "")}
                    style={!fields.imageUrl ? { color: globalDesign.text_color } : {}}
                >
                    {truncateText(fields.subtitle, 120)}
                </motion.p>
                {fields.btnText && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <Button
                            size="lg"
                            className={cn(
                                "h-14 px-10 text-lg font-bold shadow-xl transition-all hover:scale-105 inline-flex items-center justify-center max-w-fit min-w-[140px] whitespace-nowrap overflow-hidden text-ellipsis truncate",
                                themeMode === 'glass' ? 'glass-btn !rounded-full' : '',
                                globalDesign.button_style === 'pill' ? 'rounded-full' :
                                    globalDesign.button_style === 'square' ? 'rounded-none' : 'rounded-xl'
                            )}
                            style={themeMode === 'glass' ? {} : { backgroundColor: globalDesign.primary_color, color: 'white' }}
                        >
                            {truncateText(fields.btnText, 25)}
                        </Button>
                    </motion.div>
                )}
            </div>
        </section>
    );
};

const TextBlock = ({ fields, themeMode }: BlockProps) => {
    return (
        <section className={cn("py-10 md:py-12 px-6", themeMode === 'glass' ? "" : "bg-white")}>
            <div className={cn("container max-w-2xl mx-auto overflow-hidden w-full", themeMode === 'glass' ? "glass-card p-6 md:p-8 rounded-2xl" : "")}>
                <SafeHTML
                    className={cn("prose prose-lg max-w-none leading-relaxed break-words whitespace-pre-wrap overflow-hidden w-full", themeMode === 'glass' ? "text-black/85" : "text-slate-700")}
                    html={fields.content?.replace(/\n/g, '<br />') || ''}
                />
            </div>
        </section>
    );
};

const ImageBlock = ({ fields }: BlockProps) => {
    return (
        <section className={cn(
            "py-8 px-6",
            fields.width === 'full' ? 'container-none' : 'container max-w-4xl mx-auto'
        )}>
            <div className={cn(
                "relative overflow-hidden rounded-2xl shadow-2xl w-full max-w-full",
                fields.width === 'full' ? 'aspect-[21/9]' : 'aspect-video'
            )}>
                {fields.imageUrl && <Image src={fields.imageUrl} alt={fields.alt || 'Image'} fill className="object-cover" />}
            </div>
        </section>
    );
};

const StatsBlock = ({ fields, globalDesign, themeMode }: BlockProps) => {
    return (
        <section className={cn("py-10 md:py-12 px-6", themeMode === 'glass' ? "rounded-3xl mx-4 my-6" : "bg-slate-50")} style={themeMode === 'glass' ? { background: 'rgba(255, 255, 255, 0.08)' } : {}}>
            <div className="container max-w-5xl mx-auto overflow-hidden w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {fields.stats?.map((stat: any, i: number) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={cn("text-center space-y-2 flex-1 min-w-0 overflow-hidden", themeMode === 'glass' ? "p-4" : "")}
                        >
                            <h3 className={cn("text-3xl md:text-4xl font-black truncate", themeMode === 'glass' ? "text-black" : "")} style={themeMode === 'glass' ? {} : { color: globalDesign.primary_color }}>
                                {truncateText(stat.value, 10)}
                            </h3>
                            <p className={cn("text-sm font-bold uppercase tracking-widest truncate", themeMode === 'glass' ? "text-black/60" : "text-slate-500")} style={themeMode === 'glass' ? { color: 'rgba(0, 0, 0, 0.6)' } : {}}>
                                {truncateText(stat.label, 20)}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const ContactInfoBlock = ({ fields, globalDesign, themeMode }: BlockProps) => {
    return (
        <section className="py-10 md:py-12 px-6">
            <div className="container max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className={cn("text-2xl md:text-4xl font-black mb-4 truncate", themeMode === 'glass' ? "text-black" : "")} style={themeMode !== 'glass' ? { color: globalDesign.text_color } : {}}>{truncateText(fields.title, 40)}</h2>
                </div>
                <div className="flex flex-wrap justify-center gap-6 w-full box-border">
                    {[
                        { icon: MapPin, label: 'Visit Us', value: fields.address, limit: 80, className: "line-clamp-2 break-words" },
                        { icon: Phone, label: 'Call Us', value: fields.phone, limit: 20, className: "truncate" },
                        { icon: Mail, label: 'Email Us', value: fields.email, limit: 50, className: "truncate break-all" },
                    ].filter(item => item.value).map((item, i) => (
                        <div key={i} className={cn("flex flex-col items-center text-center gap-3 flex-1 w-full sm:w-auto min-w-[200px] max-w-full sm:max-w-[320px] py-6 px-5 box-border rounded-2xl overflow-hidden", themeMode === 'glass' ? "glass-card" : "bg-white border border-slate-100 shadow-sm")}>
                            <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0 mx-auto", themeMode === 'glass' ? "bg-white/20" : "bg-slate-50")} style={themeMode === 'glass' ? {} : { color: globalDesign.primary_color }}>
                                <item.icon className={cn("h-6 w-6", themeMode === 'glass' ? "text-black" : "")} />
                            </div>
                            <div className="w-full flex flex-col gap-1 items-center overflow-hidden">
                                <p className={cn("text-[11px] font-black uppercase tracking-widest whitespace-nowrap", themeMode === 'glass' ? "text-black/60" : "text-slate-400")} style={themeMode === 'glass' ? { color: 'rgba(0, 0, 0, 0.6)' } : {}}>{item.label}</p>
                                <p className={cn("font-semibold text-[15px] leading-relaxed", item.className, themeMode === 'glass' ? "text-black/85" : "")} style={themeMode === 'glass' ? { color: 'rgba(0, 0, 0, 0.85)' } : {}}>{truncateText(item.value, item.limit)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const ImageTextBlock = ({ fields, globalDesign, themeMode }: BlockProps) => {
    return (
        <section className="py-10 md:py-12 px-6 overflow-hidden">
            <div className={cn("container max-w-5xl mx-auto", themeMode === 'glass' ? "glass-card p-6 md:p-8 rounded-3xl" : "")}>
                <div className={cn(
                    "flex flex-col md:items-center gap-8 w-full overflow-hidden",
                    fields.layout === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'
                )}>
                    <div className="flex-1 min-w-0 space-y-6 overflow-hidden">
                        <h2 className={cn("text-2xl md:text-4xl font-black leading-tight line-clamp-2", themeMode === 'glass' ? "text-black" : "")} style={themeMode !== 'glass' ? { color: globalDesign.text_color } : {}}>{truncateText(fields.title, 60)}</h2>
                        <SafeHTML
                            className={cn("text-lg leading-relaxed break-words whitespace-normal line-clamp-5", themeMode === 'glass' ? "text-black/85" : "text-slate-600")}
                            html={fields.content?.replace(/\n/g, '<br />') || ''}
                        />
                    </div>
                    <div className="flex-1 shrink-0 max-w-full md:max-w-[50%]">
                        <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl glass-glow">
                            {fields.imageUrl && <Image src={fields.imageUrl} alt={fields.title} fill className="object-cover" />}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const TeamBlock = ({ fields, globalDesign, themeMode }: BlockProps) => {
    return (
        <section className={cn("py-10 md:py-12 px-6", themeMode === 'glass' ? "" : "bg-slate-50")}>
            <div className="container max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className={cn("text-2xl md:text-4xl font-black mb-4", themeMode === 'glass' ? "text-black" : "")} style={themeMode !== 'glass' ? { color: globalDesign.text_color } : {}}>{fields.title}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {fields.members?.map((member: any, i: number) => (
                        <div key={i} className={cn("p-5 rounded-2xl hover:shadow-xl transition-all text-center space-y-4 w-full max-w-[280px] mx-auto overflow-hidden flex-1 min-w-0", themeMode === 'glass' ? "glass-card hover:glass-glow" : "bg-white shadow-sm")} style={themeMode === 'glass' ? { background: 'rgba(255, 255, 255, 0.1)' } : {}}>
                            <div className={cn("relative w-24 h-24 mx-auto rounded-full overflow-hidden border-[2px]", themeMode === 'glass' ? "border-white/40" : "border-slate-50")}>
                                {member.imageUrl ? <Image src={member.imageUrl} alt={member.name} fill className="object-cover" /> : <div className={cn("w-full h-full flex items-center justify-center", themeMode === 'glass' ? "bg-white/10" : "bg-slate-100")}><Users className={cn("h-10 w-10", themeMode === 'glass' ? "text-black/60" : "text-slate-300")} /></div>}
                            </div>
                            <div>
                                <h3 className={cn("text-xl font-bold overflow-hidden text-ellipsis whitespace-nowrap max-w-full truncate", themeMode === 'glass' ? "text-black" : "")}>{truncateText(member.name, 30)}</h3>
                                <div className="mt-1">
                                    <span className={cn("text-xs font-black uppercase tracking-widest inline-block px-3 py-1 rounded-full overflow-hidden text-ellipsis whitespace-nowrap max-w-full truncate", themeMode === 'glass' ? "bg-white/20 text-black" : "text-[var(--primary)]")}>{truncateText(member.role, 30)}</span>
                                </div>
                            </div>
                            <p className={cn("text-sm line-clamp-3", themeMode === 'glass' ? "text-black/85" : "text-slate-500")} style={themeMode === 'glass' ? { color: 'rgba(0, 0, 0, 0.85)' } : {}}>{truncateText(member.bio, 120)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const ContactFormBlock = ({ fields, globalDesign, themeMode }: BlockProps) => {
    return (
        <section className={cn("py-10 md:py-12 px-6", themeMode === 'glass' ? "" : "bg-white")}>
            <div className={cn("container max-w-3xl mx-auto rounded-[32px] p-6 md:p-10 overflow-hidden w-full", themeMode === 'glass' ? "glass-card glass-glow" : "bg-slate-50")}>
                <div className="text-center mb-12">
                    <h2 className={cn("text-2xl md:text-4xl font-black mb-4 line-clamp-2", themeMode === 'glass' ? "text-black" : "")} style={themeMode !== 'glass' ? { color: globalDesign.text_color } : {}}>{truncateText(fields.title, 50)}</h2>
                    <p className={cn("line-clamp-2", themeMode === 'glass' ? "opacity-70" : "text-slate-500")}>{truncateText(fields.subtitle, 100)}</p>
                </div>
                <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {fields.showName !== false && (
                            <div className="space-y-2 text-left">
                                <label className={cn("text-xs font-black uppercase tracking-widest", themeMode === 'glass' ? "text-black/60" : "text-slate-400")} style={themeMode === 'glass' ? { color: 'rgba(0, 0, 0, 0.6)' } : {}}>Full Name</label>
                                <input type="text" maxLength={60} className={cn("w-full max-w-full box-border h-14 rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] shadow-sm", themeMode === 'glass' ? "bg-white/10 text-black placeholder-black/45 border border-white/25" : "bg-white")} placeholder="John Doe" />
                            </div>
                        )}
                        {fields.showEmail !== false && (
                            <div className="space-y-2 text-left">
                                <label className={cn("text-xs font-black uppercase tracking-widest", themeMode === 'glass' ? "text-black/60" : "text-slate-400")} style={themeMode === 'glass' ? { color: 'rgba(0, 0, 0, 0.6)' } : {}}>Email Address</label>
                                <input type="email" maxLength={80} className={cn("w-full max-w-full box-border h-14 rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] shadow-sm", themeMode === 'glass' ? "bg-white/10 text-black placeholder-black/45 border border-white/25" : "bg-white")} placeholder="john@example.com" />
                            </div>
                        )}
                    </div>
                    {fields.showMessage !== false && (
                        <div className="space-y-2 text-left">
                            <label className={cn("text-xs font-black uppercase tracking-widest", themeMode === 'glass' ? "text-black/60" : "text-slate-400")} style={themeMode === 'glass' ? { color: 'rgba(0, 0, 0, 0.6)' } : {}}>Message</label>
                            <textarea maxLength={1000} className={cn("w-full max-w-full box-border min-h-[150px] rounded-3xl p-6 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] shadow-sm resize-none", themeMode === 'glass' ? "bg-white/10 text-black placeholder-black/45 border border-white/25" : "bg-white")} placeholder="How can we help you?" />
                        </div>
                    )}
                    <Button
                        size="lg"
                        className={cn(
                            "w-full h-16 text-lg font-bold shadow-lg max-w-full box-border truncate",
                            themeMode === 'glass' ? 'bg-[var(--primary)] text-black hover:brightness-110 border border-white/40 !rounded-full' : '',
                            globalDesign.button_style === 'pill' ? 'rounded-full' :
                                globalDesign.button_style === 'square' ? 'rounded-none' : 'rounded-2xl'
                        )}
                        style={themeMode === 'glass' ? { backgroundColor: 'var(--primary)', color: 'var(--button-text, #ffffff)' } : { backgroundColor: globalDesign.primary_color, color: 'white' }}
                    >
                        {truncateText(fields.btnText, 25)}
                    </Button>
                </form>
            </div>
        </section>
    );
};

const DividerBlock = ({ fields, themeMode }: BlockProps) => {
    return (
        <div className="container max-w-5xl mx-auto px-6 py-8">
            <div
                style={themeMode === 'glass' ? {
                    borderTop: `${fields.thickness || 1}px ${fields.style || 'solid'} rgba(255,255,255,0.2)`
                } : {
                    borderTop: `${fields.thickness || 1}px ${fields.style || 'solid'} ${fields.color || '#E2E8F0'}`
                }}
            />
        </div>
    );
};

const GalleryBlock = ({ fields, globalDesign, themeMode }: BlockProps) => {
    return (
        <section className="py-10 md:py-12 px-6">
            <div className="container max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className={cn("text-2xl md:text-4xl font-black mb-4 truncate", themeMode === 'glass' ? "text-black" : "")} style={themeMode !== 'glass' ? { color: globalDesign.text_color } : {}}>{truncateText(fields.title, 50)}</h2>
                </div>
                <div className={cn(
                    "grid gap-4 overflow-hidden w-full",
                    fields.columns === 2 ? 'grid-cols-2' :
                        fields.columns === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'
                )}>
                    {fields.images?.map((img: any, i: number) => {
                        const imgUrl = typeof img === 'string' ? img : img?.url;
                        if (!imgUrl) return null;
                        return (
                            <div key={i} className={cn("relative aspect-square rounded-2xl overflow-hidden shadow-lg hover:scale-[1.02] transition-all cursor-pointer group", themeMode === 'glass' ? "glass-card p-2" : "")}>
                                <div className="w-full h-full relative rounded-xl overflow-hidden">
                                    <Image src={imgUrl} alt="Gallery" fill className="object-cover group-hover:scale-110 transition-all duration-700" />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

const MapBlock = ({ fields, themeMode }: BlockProps) => {
    if (!fields.mapUrl) return null;
    
    // Helper to convert standard Google Maps URL to Embed URL
    const getEmbedUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('google.com/maps/embed')) return url;
        
        if (url.includes('google.com/maps/place/')) {
            const parts = url.split('google.com/maps/place/');
            if (parts.length > 1) {
                const place = parts[1].split('/')[0];
                return `https://maps.google.com/maps?q=${place}&output=embed`;
            }
        }
        
        if (url.includes('google.com/maps/search/')) {
            const parts = url.split('google.com/maps/search/');
            if (parts.length > 1) {
                const place = parts[1].split('/')[0];
                return `https://maps.google.com/maps?q=${place}&output=embed`;
            }
        }
        
        return url;
    };
    
    const embedUrl = getEmbedUrl(fields.mapUrl);
    
    return (
        <section className={cn("py-10 md:py-12 px-6 overflow-hidden w-full", themeMode === 'glass' ? "" : "bg-white")}>
            <div className={cn("container max-w-5xl mx-auto overflow-hidden rounded-[32px] shadow-xl w-full", themeMode === 'glass' ? "glass-card glass-glow p-3 h-[400px]" : "h-[350px]")}>
                <iframe
                    className="w-full max-w-full block"
                    src={embedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0, borderRadius: themeMode === 'glass' ? '20px' : '32px' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
        </section>
    );
};

const FAQBlock = ({ fields, themeMode, globalDesign }: BlockProps) => {
    return (
        <section className={cn("py-10 md:py-12 px-6", themeMode === 'glass' ? "" : "bg-slate-50")}>
            <div className="container max-w-2xl mx-auto overflow-hidden w-full">
                <div className="text-center mb-16">
                    <h2 className="text-2xl md:text-4xl font-black mb-4">{fields.title}</h2>
                </div>
                <div className="space-y-4">
                    {fields.questions?.map((q: any, i: number) => (
                        <div key={i} className={cn("p-5 rounded-2xl transition-all", themeMode === 'glass' ? "glass-card" : "bg-white shadow-sm")}>
                            <h3 className={cn("text-lg font-bold mb-2 break-words whitespace-normal max-w-full line-clamp-2", themeMode === 'glass' ? "text-black" : "")} style={themeMode !== 'glass' ? { color: globalDesign.text_color } : {}}>{truncateText(q.question, 120)}</h3>
                            <p className={cn("text-sm leading-relaxed break-words whitespace-normal max-w-full line-clamp-4", themeMode === 'glass' ? "text-black/85" : "text-slate-600")} style={themeMode === 'glass' ? { color: 'rgba(0, 0, 0, 0.85)' } : {}}>{truncateText(q.answer, 300)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const BlockComponents: Record<string, React.FC<BlockProps>> = {
    hero: HeroBlock,
    text: TextBlock,
    image: ImageBlock,
    image_text: ImageTextBlock,
    team: TeamBlock,
    stats: StatsBlock,
    contact_info: ContactInfoBlock,
    contact_form: ContactFormBlock,
    divider: DividerBlock,
    gallery: GalleryBlock,
    map: MapBlock,
    faq: FAQBlock
};

export default function PageRenderer({ blocks, globalDesign, themeMode }: { blocks: any[], globalDesign: any, themeMode?: string }) {
    if (!blocks || blocks.length === 0) return null;

    return (
        <div style={themeMode === 'glass' ? {} : { fontFamily: globalDesign.font_family, color: globalDesign.text_color }}>
            {blocks.map((block) => {
                const Component = BlockComponents[block.type];
                if (!Component) return null;
                return <Component key={block.id} fields={block.fields} globalDesign={globalDesign} themeMode={themeMode} />;
            })}
        </div>
    );
}
