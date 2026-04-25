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

interface BlockProps {
    fields: any;
    globalDesign: any;
}

const HeroBlock = ({ fields, globalDesign }: BlockProps) => {
    return (
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden py-20 px-6">
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
            <div className="container relative z-10 text-center max-w-4xl mx-auto">
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight"
                >
                    {fields.title}
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-xl md:text-2xl text-white/90 mb-10 font-light"
                >
                    {fields.subtitle}
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
                                "h-14 px-10 text-lg font-bold shadow-xl transition-all hover:scale-105",
                                globalDesign.button_style === 'pill' ? 'rounded-full' : 
                                globalDesign.button_style === 'square' ? 'rounded-none' : 'rounded-xl'
                            )}
                            style={{ backgroundColor: globalDesign.primary_color, color: 'white' }}
                        >
                            {fields.btnText}
                        </Button>
                    </motion.div>
                )}
            </div>
        </section>
    );
};

const TextBlock = ({ fields, globalDesign }: BlockProps) => {
    return (
        <section className="py-16 px-6 bg-white">
            <div className="container max-w-3xl mx-auto">
                <div 
                    className="prose prose-lg max-w-none text-slate-700 leading-relaxed"
                    style={{ color: globalDesign.text_color, fontFamily: globalDesign.font_family }}
                    dangerouslySetInnerHTML={{ __html: fields.content?.replace(/\n/g, '<br />') }}
                />
            </div>
        </section>
    );
};

const ImageBlock = ({ fields }: BlockProps) => {
    return (
        <section className={cn(
            "py-12 px-6",
            fields.width === 'full' ? 'container-none' : 'container max-w-5xl mx-auto'
        )}>
            <div className={cn(
                "relative overflow-hidden rounded-[32px] shadow-2xl",
                fields.width === 'full' ? 'aspect-[21/9]' : 'aspect-video'
            )}>
                {fields.imageUrl && <Image src={fields.imageUrl} alt={fields.alt || 'Image'} fill className="object-cover" />}
            </div>
        </section>
    );
};

const StatsBlock = ({ fields, globalDesign }: BlockProps) => {
    return (
        <section className="py-20 px-6 bg-slate-50">
            <div className="container max-w-6xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {fields.stats?.map((stat: any, i: number) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center space-y-2"
                        >
                            <h3 className="text-4xl md:text-5xl font-black" style={{ color: globalDesign.primary_color }}>
                                {stat.value}
                            </h3>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                {stat.label}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const ContactInfoBlock = ({ fields, globalDesign }: BlockProps) => {
    return (
        <section className="py-20 px-6">
            <div className="container max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-black mb-4">{fields.title}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { icon: MapPin, label: 'Visit Us', value: fields.address },
                        { icon: Phone, label: 'Call Us', value: fields.phone },
                        { icon: Mail, label: 'Email Us', value: fields.email },
                    ].filter(item => item.value).map((item, i) => (
                        <div key={i} className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm text-center space-y-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto" style={{ color: globalDesign.primary_color }}>
                                <item.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                <p className="font-bold text-slate-900">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const ImageTextBlock = ({ fields, globalDesign }: BlockProps) => {
    return (
        <section className="py-20 px-6 overflow-hidden">
            <div className="container max-w-6xl mx-auto">
                <div className={cn(
                    "flex flex-col md:items-center gap-12",
                    fields.layout === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'
                )}>
                    <div className="flex-1 space-y-6">
                        <h2 className="text-3xl md:text-5xl font-black leading-tight">{fields.title}</h2>
                        <div 
                            className="text-lg text-slate-600 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: fields.content?.replace(/\n/g, '<br />') }}
                        />
                    </div>
                    <div className="flex-1">
                        <div className="relative aspect-square rounded-[40px] overflow-hidden shadow-2xl">
                            {fields.imageUrl && <Image src={fields.imageUrl} alt={fields.title} fill className="object-cover" />}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const TeamBlock = ({ fields, globalDesign }: BlockProps) => {
    return (
        <section className="py-20 px-6 bg-slate-50">
            <div className="container max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-black mb-4">{fields.title}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {fields.members?.map((member: any, i: number) => (
                        <div key={i} className="bg-white p-6 rounded-[32px] shadow-sm hover:shadow-xl transition-all text-center space-y-4">
                            <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-slate-50">
                                {member.imageUrl ? <Image src={member.imageUrl} alt={member.name} fill className="object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center"><Users className="h-10 w-10 text-slate-300" /></div>}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">{member.name}</h3>
                                <p className="text-xs font-black text-[var(--primary)] uppercase tracking-widest">{member.role}</p>
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-3">{member.bio}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const ContactFormBlock = ({ fields, globalDesign }: BlockProps) => {
    return (
        <section className="py-20 px-6 bg-white">
            <div className="container max-w-4xl mx-auto bg-slate-50 rounded-[48px] p-8 md:p-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-black mb-4">{fields.title}</h2>
                    <p className="text-slate-500">{fields.subtitle}</p>
                </div>
                <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Full Name</label>
                            <input type="text" className="w-full h-14 bg-white rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] shadow-sm" placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</label>
                            <input type="email" className="w-full h-14 bg-white rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] shadow-sm" placeholder="john@example.com" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Message</label>
                        <textarea className="w-full min-h-[150px] bg-white rounded-3xl p-6 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] shadow-sm resize-none" placeholder="How can we help you?" />
                    </div>
                    <Button 
                        size="lg" 
                        className={cn(
                            "w-full h-16 text-lg font-bold shadow-lg",
                            globalDesign.button_style === 'pill' ? 'rounded-full' : 
                            globalDesign.button_style === 'square' ? 'rounded-none' : 'rounded-2xl'
                        )}
                        style={{ backgroundColor: globalDesign.primary_color, color: 'white' }}
                    >
                        {fields.btnText}
                    </Button>
                </form>
            </div>
        </section>
    );
};

const DividerBlock = ({ fields }: BlockProps) => {
    return (
        <div className="container max-w-5xl mx-auto px-6 py-8">
            <div 
                style={{ 
                    borderTop: `${fields.thickness || 1}px ${fields.style || 'solid'} ${fields.color || '#E2E8F0'}` 
                }} 
            />
        </div>
    );
};

const GalleryBlock = ({ fields }: BlockProps) => {
    return (
        <section className="py-20 px-6">
            <div className="container max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-black mb-4">{fields.title}</h2>
                </div>
                <div className={cn(
                    "grid gap-4",
                    fields.columns === 2 ? 'grid-cols-2' : 
                    fields.columns === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'
                )}>
                    {fields.images?.map((img: any, i: number) => (
                        <div key={i} className="relative aspect-square rounded-3xl overflow-hidden shadow-lg hover:scale-[1.02] transition-all cursor-pointer group">
                            {img.url && <Image src={img.url} alt="Gallery" fill className="object-cover group-hover:scale-110 transition-all duration-700" />}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
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
    gallery: GalleryBlock
};

export default function PageRenderer({ blocks, globalDesign }: { blocks: any[], globalDesign: any }) {
    if (!blocks || blocks.length === 0) return null;

    return (
        <div style={{ fontFamily: globalDesign.font_family, color: globalDesign.text_color }}>
            {blocks.map((block) => {
                const Component = BlockComponents[block.type];
                if (!Component) return null;
                return <Component key={block.id} fields={block.fields} globalDesign={globalDesign} />;
            })}
        </div>
    );
}
