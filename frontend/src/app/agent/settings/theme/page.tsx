'use client'

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { themes } from '@/lib/themes';
import { useTheme } from '@/context/ThemeContext';
import {
    Check, Palette, Sparkles, Wand2, Eye, Save, ExternalLink,
    RefreshCw, Upload, Link as LinkIcon, Home, Map as MapIcon, Package,
    ClipboardList, ShoppingCart, Sliders, RotateCcw, Bell, X,
    Plane, Globe, Users, Clock, Shield, Star, Heart, Camera,
    Car, Hotel, Compass, Sun, Mountain, Waves, Umbrella, Gift,
    Award, Zap, CheckCircle, Headphones, Wallet, Coffee, Luggage,
    Ticket, Navigation, Flag, Search, CheckCircle2, Info, ArrowRight,
    Trees, Palmtree, MapPin, Mail, Moon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { compressImage, uploadToS3 } from '@/lib/image-upload-utils';
import { API_URL } from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const CUSTOM_THEME_STORAGE_KEY = 'agent_custom_theme';
const HOMEPAGE_SETTINGS_KEY = 'agent-homepage-settings';
const HOMEPAGE_CARDS_KEY = 'agent-homepage-cards';
const HOMEPAGE_WCU_KEY = 'agent-homepage-wcu-cards';
const HOMEPAGE_CARD_STYLE_KEY = 'agent-homepage-card-style';
const UI_STYLE_KEY = 'agent-ui-style';
const PAGE_SETTINGS_KEY = 'agent-page-settings';

// ─── Feature Card Types ────────────────────────────────────────────────────────
interface FeatureCard {
    icon: string; title: string; description: string;
}

interface CardAppearance {
    iconStyle: 'filled-circle' | 'outlined-circle' | 'rounded-square' | 'gradient-circle' | 'soft-tinted';
    background: 'soft-white' | 'glass' | 'tinted' | 'pure-white' | 'transparent';
    border: 'none' | 'subtle' | 'primary' | 'top-accent' | 'glow';
    hover: 'lift' | 'glow' | 'scale' | 'border' | 'none';
    titleColor: 'dark' | 'primary' | 'gradient';
    layout: 'top' | 'horizontal' | 'minimal';
    iconColor: 'follow-theme' | 'white-on-primary' | 'primary-on-soft' | 'custom';
    customIconColor: string;
}

const DEFAULT_FEATURE_CARDS: FeatureCard[] = [
    { icon: 'Sparkles', title: 'Smart Recommendations', description: 'Tailored trips based on your unique preferences' },
    { icon: 'Sliders', title: 'Customize Everything', description: 'Full control to adjust dates, activities, and stays' },
    { icon: 'CheckCircle2', title: 'Instant Booking', description: 'Save your plan and book securely when ready' },
];

const DEFAULT_WCU_CARDS: FeatureCard[] = [
    { icon: 'Map', title: 'Curated Destinations', description: 'Discover handpicked, verified experiences at the worlds top destinations.' },
    { icon: 'Users', title: 'Local Experts', description: 'Authentic experiences guided by seasoned locals who know the hidden gems.' },
    { icon: 'Clock', title: 'Flexible Plans', description: 'Change dates, activities, or cancel with ease. Your plan adapts to you.' },
    { icon: 'Shield', title: 'Safe Payments', description: 'Seamless, secure payments via Razorpay with instant confirmation.' },
];

const DEFAULT_CARD_STYLE: CardAppearance = {
    iconStyle: 'filled-circle',
    background: 'soft-white',
    border: 'none',
    hover: 'lift',
    titleColor: 'dark',
    layout: 'top',
    iconColor: 'follow-theme',
    customIconColor: '#F97316'
};
const ICON_OPTIONS = [
    'Plane', 'Globe', 'Users', 'Clock', 'Shield', 'Star', 'Heart', 'Map',
    'Camera', 'Car', 'Hotel', 'Compass', 'Sun', 'Mountain', 'Waves', 'Umbrella',
    'Gift', 'Award', 'Zap', 'CheckCircle', 'Headphones', 'Wallet', 'Coffee',
    'Package', 'Luggage', 'Ticket', 'Navigation', 'Flag', 'Search', 'Sparkles',
];

interface CustomThemeColors {
    primary: string;
    secondary: string;
    glass: string;
    // Nested structure for Design File alignment
    navbarSettings: {
        bgColor: string;
        textColor: string;
    };
    buttonStyle: {
        bgColor: string;
        textColor: string;
        borderRadius: string;
    };
    accent_color: string;
    bg_color: string;
    font_family: string;
    font_size: string;
    font_color: string;
}

const DEFAULT_CUSTOM: CustomThemeColors = {
    primary: '#14b8a6',
    secondary: '#2dd4bf',
    glass: '#ccfbf1',
    navbarSettings: {
        bgColor: '',
        textColor: '#ffffff'
    },
    buttonStyle: {
        bgColor: '',
        textColor: '#ffffff',
        borderRadius: '0.75rem'
    },
    bg_color: '',
    accent_color: '',
    font_family: 'var(--font-inter)',
    font_size: '16px',
    font_color: '#1e293b'
};

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const PRESET_IMAGES = [
    { label: 'Mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80' },
    { label: 'Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80' },
    { label: 'City', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80' },
    { label: 'Desert', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80' },
    { label: 'Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80' },
    { label: 'Lake', url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80' },
];

interface HomepageSettings {
    headline1: string; headline2: string; subheading: string;
    primaryBtnText: string; secondaryBtnText: string; backgroundImageUrl: string;
    navbar_logo_image: string;
    badgeText: string; showAiBadge: boolean;
    agency_name?: string;
}
const DEFAULT_HOMEPAGE: HomepageSettings = {
    headline1: 'Adventure Awaits—', headline2: 'Tailored Just for You',
    subheading: 'Plan, customize, and book your dream trip effortlessly with AI-powered suggestions.',
    primaryBtnText: 'Start Your Journey', secondaryBtnText: 'See Sample Itinerary',
    backgroundImageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop',
    navbar_logo_image: 'https://toursaas.s3.us-east-1.amazonaws.com/logo.png',
    badgeText: 'AI-Powered Trip Planning', showAiBadge: true
};

interface PageSettings {
    // Plan Trip
    plan_trip_heading: string;
    plan_trip_subheading: string;
    plan_trip_placeholder: string;
    plan_trip_button_text: string;
    plan_trip_stats_text: string;
    plan_trip_italic: string;
    show_category_pills: boolean;
    show_stat_bar: boolean;
    plan_trip_section_heading: string;
    plan_trip_section_subtext: string;

    // Destinations
    destinations_heading: string;
    destinations_subtext: string;
    destinations_link_text: string;
    destinations_cta_text: string;
    trip_style_cards: { title: string; description: string; icon_name: string }[];

    // Packages
    packages_title: string;
    packages_subtitle: string;
    show_best_seller_badge: boolean;
    show_top_rated_badge: boolean;
    show_wishlist: boolean;

    // Itinerary
    show_ai_optimized_badge: boolean;
    ai_optimized_text: string;
    morning_label: string;
    afternoon_label: string;
    evening_label: string;
    night_label: string;
    show_activity_images: boolean;

    // Cart
    cart_summary_title: string;
    cart_cta_text: string;
    show_gst_breakdown: boolean;
    show_per_person: boolean;
    show_verified_badge: boolean;
    show_support_badge: boolean;
    show_flexible_badge: boolean;
    modal_cta_text: string;
    package_cta_text: string;

    // Itinerary Theme (New)
    itinerary_card_style: string;
    itinerary_summary_card_style: string;
    itinerary_why_book_style: string;
    itinerary_primary_color: string;
    itinerary_secondary_color: string;
    itinerary_font_family: string;
    itinerary_button_style: string;
    itinerary_wcu_cards: FeatureCard[];
}

const DEFAULT_PAGE_SETTINGS: PageSettings = {
    plan_trip_heading: 'Where do you want to go?',
    plan_trip_subheading: 'Search for a destination, package name, or an experience you love.',
    plan_trip_placeholder: 'Search destinations, trip types…',
    plan_trip_button_text: 'Explore Now',
    plan_trip_stats_text: '480+ curated trips • 50K+ happy travelers • Rated 4.9★',
    plan_trip_italic: 'want',
    show_category_pills: true,
    show_stat_bar: true,
    plan_trip_section_heading: 'Browse by Trip Style',
    plan_trip_section_subtext: 'From serene beaches to high-altitude thrills, pick a vibe that suits your current mood.',
    destinations_heading: 'Popular Destinations',
    destinations_subtext: 'Handpicked favorites from our community of global explorers.',
    destinations_link_text: 'View All Destinations',
    destinations_cta_text: 'Explore Destination',
    trip_style_cards: [
        { title: 'Adventure', description: 'For the thrill-seekers', icon_name: 'Mountain' },
        { title: 'Beach', description: 'Sun, sand and serenity', icon_name: 'Waves' },
        { title: 'Honeymoon', description: 'Romantic getaways', icon_name: 'Heart' },
        { title: 'Family', description: 'Memories for all ages', icon_name: 'Users' }
    ],
    packages_title: 'Explore Our Packages',
    packages_subtitle: 'Handpicked itineraries crafted for every kind of traveler',
    show_best_seller_badge: true,
    show_top_rated_badge: true,
    show_wishlist: true,
    show_ai_optimized_badge: true,
    ai_optimized_text: 'AI Optimized',
    morning_label: 'Morning',
    afternoon_label: 'Afternoon',
    evening_label: 'Evening',
    night_label: 'Night',
    show_activity_images: true,
    cart_summary_title: 'Your Trip Summary',
    cart_cta_text: 'Confirm & Book',
    show_gst_breakdown: true,
    show_per_person: true,
    show_verified_badge: true,
    show_support_badge: true,
    show_flexible_badge: true,
    modal_cta_text: 'Start Planning Journey',
    package_cta_text: 'Book Now',

    // Itinerary Theme (New)
    itinerary_card_style: 'glassy',
    itinerary_summary_card_style: 'glassy',
    itinerary_why_book_style: 'glassy',
    itinerary_primary_color: '',
    itinerary_secondary_color: '',
    itinerary_font_family: 'Inter, sans-serif',
    itinerary_button_style: 'pill',
    itinerary_wcu_cards: [...DEFAULT_WCU_CARDS].slice(0, 3) // Default to 3 cards
};

// ─── Tab Definitions ─────────────────────────────────────────────────────────
const TABS = [
    { id: 'theme', icon: <Palette className="h-4 w-4" />, label: 'Theme', count: 2 },
    { id: 'homepage', icon: <Home className="h-4 w-4" />, label: 'Homepage', count: 3 },
    { id: 'plantrip', icon: <MapIcon className="h-4 w-4" />, label: 'Plan Trip', count: 3 },
    { id: 'itinerary', icon: <ClipboardList className="h-4 w-4" />, label: 'Itinerary', count: 4 },
    { id: 'cart', icon: <ShoppingCart className="h-4 w-4" />, label: 'Cart', count: 3 },
    { id: 'uistyle', icon: <Sliders className="h-4 w-4" />, label: 'UI Style', count: 5 },
] as const;
type TabId = typeof TABS[number]['id'];

// ─── Toggle Helper ─────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <button onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 focus:outline-none ${checked ? 'bg-[var(--primary)]' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}

// ─── Section Card Helper ───────────────────────────────────────────────────────
function SectionCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <Card className="glass-panel border-white/40 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[var(--primary-glow)] rounded-xl text-[var(--primary)]">{icon}</div>
                    <div><CardTitle className="text-base font-bold text-slate-900">{title}</CardTitle><CardDescription className="text-xs text-slate-500">{subtitle}</CardDescription></div>
                </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">{children}</CardContent>
        </Card>
    );
}


// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AgentThemeSettingsPage() {
    const { activeTheme, setActiveTheme } = useTheme();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>('theme');

    // Theme state
    const [showCustomEditor, setShowCustomEditor] = useState(false);
    const [customColors, setCustomColors] = useState<CustomThemeColors>(DEFAULT_CUSTOM);
    const [previewColors, setPreviewColors] = useState<CustomThemeColors>(DEFAULT_CUSTOM);
    const isCustomActive = activeTheme === 'custom';

    // UI Style state
    const [buttonShape, setButtonShape] = useState('pill');
    const [iconStyle, setIconStyle] = useState('filled-circle');
    const [cardStyle, setCardStyle] = useState('glass');
    const [density, setDensity] = useState('spacious');
    const [fontPairing, setFontPairing] = useState('serif-sans');
    const [fontFamily, setFontFamily] = useState('var(--font-inter)');
    const [fontColor, setFontColor] = useState('#1e293b');

    // Homepage state
    const [hpSettings, setHpSettings] = useState<HomepageSettings>(DEFAULT_HOMEPAGE);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [imageUrlDraft, setImageUrlDraft] = useState('');
    const [hpSaving, setHpSaving] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const logoRef = useRef<HTMLInputElement>(null);

    // Feature cards state
    const [featureCards, setFeatureCards] = useState<FeatureCard[]>(DEFAULT_FEATURE_CARDS);
    const [wcuCards, setWcuCards] = useState<FeatureCard[]>(DEFAULT_WCU_CARDS);
    const [cardAppearance, setCardAppearance] = useState<CardAppearance>(DEFAULT_CARD_STYLE);
    const [iconPickerOpen, setIconPickerOpen] = useState<{ type: 'feature' | 'wcu', idx: number } | null>(null);
    const [iconSearch, setIconSearch] = useState('');

    const ICON_MAP: Record<string, React.ElementType> = {
        Plane, Globe, Users, Clock, Shield, Star, Heart, Map: MapIcon,
        Camera, Car, Hotel, Compass, Sun, Mountain, Waves, Umbrella,
        Gift, Award, Zap, CheckCircle, Headphones, Wallet, Coffee,
        Package, Luggage, Ticket, Navigation, Flag, Search, Sparkles,
        Sliders: Sliders, CheckCircle2: CheckCircle2
    };
    const getIconCmp = (name: string) => ICON_MAP[name] || Sparkles;

    const updateCard = (idx: number, field: keyof FeatureCard, value: any) =>
        setFeatureCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
    const updateWcuCard = (idx: number, field: keyof FeatureCard, value: any) =>
        setWcuCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
    const updateCardStyle = (field: keyof CardAppearance, value: any) =>
        setCardAppearance(prev => ({ ...prev, [field]: value }));

    // Page settings state
    const [pageSettings, setPageSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
    const [pageSaving, setPageSaving] = useState(false);

    // Body class helpers
    const applyBodyClasses = (btn: string, icon: string, card: string, dens: string, font: string) => {
        const b = document.body.classList;
        ['btn-pill', 'btn-rounded', 'btn-soft-square', 'btn-square', 'btn-underline'].forEach(c => b.remove(c));
        ['icon-filled-circle', 'icon-outlined-circle', 'icon-rounded-square', 'icon-plain', 'icon-gradient'].forEach(c => b.remove(c));
        ['card-glass', 'card-flat', 'card-bordered', 'card-elevated', 'card-tinted'].forEach(c => b.remove(c));
        ['density-spacious', 'density-comfortable', 'density-compact'].forEach(c => b.remove(c));
        ['font-serif-sans', 'font-all-sans', 'font-bold-slab', 'font-playful'].forEach(c => b.remove(c));
        b.add(`btn-${btn}`, `icon-${icon}`, `card-${card}`, `density-${dens}`, `font-${font}`);
    };

    const saveUiStyle = (updates: Partial<{ buttonShape: string; iconStyle: string; cardStyle: string; density: string; fontPairing: string; font_family: string; font_color: string }>) => {
        const next = {
            buttonShape: updates.buttonShape ?? buttonShape,
            iconStyle: updates.iconStyle ?? iconStyle,
            cardStyle: updates.cardStyle ?? cardStyle,
            density: updates.density ?? density,
            fontPairing: updates.fontPairing ?? fontPairing,
            font_family: updates.font_family ?? fontFamily,
            font_color: updates.font_color ?? fontColor
        };
        if (updates.buttonShape !== undefined) setButtonShape(updates.buttonShape);
        if (updates.iconStyle !== undefined) setIconStyle(updates.iconStyle);
        if (updates.cardStyle !== undefined) setCardStyle(updates.cardStyle);
        if (updates.density !== undefined) setDensity(updates.density);
        if (updates.fontPairing !== undefined) setFontPairing(updates.fontPairing);
        if (updates.font_family !== undefined) setFontFamily(updates.font_family);
        if (updates.font_color !== undefined) setFontColor(updates.font_color);

        applyBodyClasses(next.buttonShape, next.iconStyle, next.cardStyle, next.density, next.fontPairing);
        
        // Apply font variables immediately to root for preview
        const root = document.documentElement;
        if (next.font_family) root.style.setProperty('--project-font-family', next.font_family);
        if (next.font_color) root.style.setProperty('--project-font-color', next.font_color);

        localStorage.setItem(UI_STYLE_KEY, JSON.stringify(next));
        toast.success('UI style updated!', { position: 'bottom-right' });
    };

    // Mount: restore all settings
    useEffect(() => {
        // Initial load from LocalStorage for immediate results
        try { const s = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY); if (s) { const p = JSON.parse(s); setCustomColors(p); setPreviewColors(p); } } catch { }
        try { const s = localStorage.getItem(HOMEPAGE_SETTINGS_KEY); if (s) setHpSettings({ ...DEFAULT_HOMEPAGE, ...JSON.parse(s) }); } catch { }
        try { const s = localStorage.getItem(HOMEPAGE_CARDS_KEY); if (s) { const arr = JSON.parse(s); if (Array.isArray(arr)) setFeatureCards(arr.map((c: any, i: number) => ({ ...DEFAULT_FEATURE_CARDS[i] || DEFAULT_FEATURE_CARDS[0], ...c }))); } } catch { }
        try { const s = localStorage.getItem(HOMEPAGE_WCU_KEY); if (s) { const arr = JSON.parse(s); if (Array.isArray(arr)) setWcuCards(arr.map((c: any, i: number) => ({ ...DEFAULT_WCU_CARDS[i] || DEFAULT_WCU_CARDS[0], ...c }))); } } catch { }
        try { const s = localStorage.getItem(HOMEPAGE_CARD_STYLE_KEY); if (s) setCardAppearance({ ...DEFAULT_CARD_STYLE, ...JSON.parse(s) }); } catch { }
        try { const s = localStorage.getItem(PAGE_SETTINGS_KEY); if (s) setPageSettings({ ...DEFAULT_PAGE_SETTINGS, ...JSON.parse(s) }); } catch { }
        try {
            const s = localStorage.getItem(UI_STYLE_KEY);
            if (s) {
                const u = JSON.parse(s);
                setButtonShape(u.buttonShape || 'pill'); setIconStyle(u.iconStyle || 'filled-circle');
                setCardStyle(u.cardStyle || 'glass'); setDensity(u.density || 'spacious'); setFontPairing(u.fontPairing || 'serif-sans');
                setFontFamily(u.font_family || 'var(--font-inter)');
                setFontColor(u.font_color || '#1e293b');
                applyBodyClasses(u.buttonShape || 'pill', u.iconStyle || 'filled-circle', u.cardStyle || 'glass', u.density || 'spacious', u.fontPairing || 'serif-sans');
            } else { applyBodyClasses('pill', 'filled-circle', 'glass', 'spacious', 'serif-sans'); }
        } catch { }

        // Fetch from Backend to sync
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch(`${API_URL}/api/v1/agent/settings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.agency_name) {
                        setHpSettings(prev => ({ ...prev, agency_name: data.agency_name }));
                    }
                    if (data.homepage_settings) {
                        const hs = data.homepage_settings;
                        if (hs.headline1) setHpSettings(prev => ({ ...prev, ...hs }));
                        if (hs.feature_cards) setFeatureCards(hs.feature_cards);
                        if (hs.wcu_cards) setWcuCards(hs.wcu_cards);
                        if (hs.card_appearance) setCardAppearance(hs.card_appearance);

                        // Populate pageSettings from backend
                        setPageSettings(prev => ({
                            ...prev,
                            ...hs
                        }));

                        // If cloud has colors, update customColors preview
                        if (hs.primaryColor || hs.primary_color) {
                            setCustomColors(prev => ({
                                ...prev,
                                primary: hs.primaryColor || hs.primary_color || '#F97316',
                                secondary: hs.secondaryColor || hs.secondary_color || prev.secondary,
                                navbarSettings: {
                                    bgColor: hs.navbarSettings?.bgColor || hs.nav_bg || '',
                                    textColor: hs.navbarSettings?.textColor || '#ffffff'
                                },
                                buttonStyle: {
                                    bgColor: hs.buttonStyle?.bgColor || hs.button_color || '',
                                    textColor: hs.buttonStyle?.textColor || '#ffffff',
                                    borderRadius: hs.buttonStyle?.borderRadius || '0.75rem'
                                },
                                bg_color: hs.bg_color || '',
                                accent_color: hs.accent_color || '',
                                font_family: hs.font_family || hs.fontFamily || 'Inter, sans-serif',
                                font_size: hs.font_size || hs.fontSize || '16px'
                            }));
                        }
                        if (hs.font_color || hs.fontColor) setFontColor(hs.font_color || hs.fontColor);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch settings from backend", err);
            }
        };
        fetchData();
    }, []);

    useEffect(() => { setPreviewColors(customColors); }, [customColors]);

    // Theme handlers
    const handleThemeChange = async (key: string) => {
        if (key === 'custom') { setShowCustomEditor(true); return; }
        setActiveTheme(key);
        setShowCustomEditor(false);

        // If it's a preset theme, we should also save those colors to the "cloud" 
        // as the baseline branding for customers
        const t = themes[key];
        if (t) {
            try {
                const token = localStorage.getItem('token') || '';
                await fetch(`${API_URL}/api/v1/agent/settings/homepage`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        activeTheme: key,
                        primaryColor: t.primary,
                        secondaryColor: t.primaryLight,
                        // Legacy support
                        primary_color: t.primary,
                        secondary_color: t.primaryLight
                    })
                });

                // Also update local pageSettings so they are in sync
                setPageSettings(prev => ({
                    ...prev,
                    activeTheme: key,
                    primaryColor: t.primary,
                    secondaryColor: t.primaryLight,
                    primary_color: t.primary,
                    secondary_color: t.primaryLight
                }));
            } catch (err) {
                console.error("Failed to sync preset theme to cloud:", err);
            }
        }

        toast.success('Theme updated!', { position: 'bottom-right' });
    };
    const handleApplyCustomTheme = async () => {
        const root = document.documentElement;
        const glassColor = customColors.secondary + '20'; // Standardize glass color

        root.style.setProperty('--primary', customColors.primary);
        root.style.setProperty('--primary-light', customColors.secondary);
        root.style.setProperty('--primary-soft', customColors.glass);
        root.style.setProperty('--primary-glow', hexToRgba(customColors.primary, 0.25));
        root.style.setProperty('--gradient-start', customColors.primary);
        root.style.setProperty('--gradient-mid', customColors.secondary);
        root.style.setProperty('--gradient-end', customColors.glass);

        localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(customColors));
        localStorage.setItem('app-theme', 'custom');
        setActiveTheme('custom');

        // Sync to pageSettings so "Save Changes" works too
        setPageSettings(prev => ({
            ...prev,
            primary_color: customColors.primary,
            secondary_color: customColors.secondary
        }));

        // PERSIST TO BACKEND IMMEDIATELY (Aligning with Design File)
        try {
            const token = localStorage.getItem('token') || '';
            const res = await fetch(`${API_URL}/api/v1/agent/settings/homepage`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    activeTheme: 'custom',
                    primaryColor: customColors.primary,
                    secondaryColor: customColors.secondary,
                    navbarSettings: customColors.navbarSettings,
                    buttonStyle: customColors.buttonStyle,
                    bg_color: customColors.bg_color,
                    accent_color: customColors.accent_color,
                    font_family: customColors.font_family,
                    font_size: customColors.font_size,
                    // Legacy support
                    primary_color: customColors.primary,
                    secondary_color: customColors.secondary,
                    nav_bg: customColors.navbarSettings.bgColor,
                    button_color: customColors.buttonStyle.bgColor
                })
            });
            if (res.ok) {
                // Update the combined agentTheme cache
                const data = await res.json();
                localStorage.setItem('agentTheme', JSON.stringify(data.settings));
                toast.success('Custom theme saved to cloud!', { position: 'bottom-right' });
            }
        } catch (err) {
            console.error("Failed to persist custom theme:", err);
        }
    };

    const handleRestoreDefault = async () => {
        localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY);
        setActiveTheme('default');
        setShowCustomEditor(false);
        setCustomColors(DEFAULT_CUSTOM);

        // Reset in backend too
        try {
            const token = localStorage.getItem('token') || '';
            await fetch(`${API_URL}/api/v1/agent/settings/homepage`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    primary_color: '#F97316', // Default Orange
                    secondary_color: '#FB923C'
                })
            });
        } catch { }

        toast.info('Restored to default theme', { position: 'bottom-right' });
    };

    // Homepage handlers
    const hpField = (field: keyof HomepageSettings, value: any) => setHpSettings(prev => ({ ...prev, [field]: value }));
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setImageUploading(true);
        const toastId = toast.loading('Optimizing and uploading background image...');
        try {
            // 1. Compress image
            const compressedFile = await compressImage(file, {
                maxWidthOrHeight: 1920,
                initialQuality: 0.8
            });

            // 2. Get presigned URL
            const token = localStorage.getItem('token') || '';
            const presignedRes = await fetch(`${API_URL}/api/v1/presigned-url`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_name: compressedFile.name,
                    content_type: compressedFile.type,
                    folder: 'homepage'
                })
            });

            if (!presignedRes.ok) throw new Error('Failed to get upload URL');
            const { upload_url, file_url } = await presignedRes.json();

            // 3. Direct upload to S3
            const success = await uploadToS3(compressedFile, upload_url);
            if (!success) throw new Error('S3 upload failed');

            // 4. Update state
            hpField('backgroundImageUrl', file_url);
            toast.success('Background image updated! ✓', { id: toastId });
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Upload failed', { id: toastId });
        } finally {
            setImageUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLogoUploading(true);
        const toastId = toast.loading('Optimizing and uploading logo...');

        try {
            // 1. Compress image (Logo usually smaller, but let's stick to 1920 max or maybe smaller?)
            // For logo, we might want smaller dimensions, but 1920 is a safe max.
            const compressedFile = await compressImage(file, {
                maxWidthOrHeight: 800, // Logos don't need to be 1920
                initialQuality: 0.8
            });

            // 2. Get presigned URL
            const token = localStorage.getItem('token') || '';
            const presignedRes = await fetch(`${API_URL}/api/v1/upload/presigned-url`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_name: compressedFile.name,
                    content_type: compressedFile.type,
                    folder: 'logos'
                })
            });

            if (!presignedRes.ok) throw new Error('Failed to get upload URL');
            const { upload_url, file_url } = await presignedRes.json();

            // 3. Direct upload to S3
            const success = await uploadToS3(compressedFile, upload_url);
            if (!success) throw new Error('S3 upload failed');

            // 4. Update state
            hpField('navbar_logo_image', file_url);
            toast.success('Logo updated successfully ✓', { id: toastId });
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Logo upload failed', { id: toastId });
        } finally {
            setLogoUploading(false);
            if (logoRef.current) logoRef.current.value = '';
        }
    };

    const handleApplyImageUrl = () => { if (imageUrlDraft.trim()) { hpField('backgroundImageUrl', imageUrlDraft.trim()); setShowUrlInput(false); setImageUrlDraft(''); } };
    const handleSaveHomepage = async () => {
        setHpSaving(true);
        const heroData = {
            headline1: hpSettings.headline1.trim() || DEFAULT_HOMEPAGE.headline1,
            headline2: hpSettings.headline2.trim() || DEFAULT_HOMEPAGE.headline2,
            subheading: hpSettings.subheading.trim() || DEFAULT_HOMEPAGE.subheading,
            primaryBtnText: hpSettings.primaryBtnText.trim() || DEFAULT_HOMEPAGE.primaryBtnText,
            secondaryBtnText: hpSettings.secondaryBtnText.trim() || DEFAULT_HOMEPAGE.secondaryBtnText,
            backgroundImageUrl: hpSettings.backgroundImageUrl || DEFAULT_HOMEPAGE.backgroundImageUrl,
            navbar_logo_image: hpSettings.navbar_logo_image || DEFAULT_HOMEPAGE.navbar_logo_image,
            badgeText: hpSettings.badgeText.trim() || DEFAULT_HOMEPAGE.badgeText,
            showAiBadge: hpSettings.showAiBadge,
            agency_name: hpSettings.agency_name
        };

        const fullPayload = {
            ...heroData,
            feature_cards: featureCards,
            wcu_cards: wcuCards,
            card_appearance: cardAppearance
        };

        console.log("Saving Homepage Payload:", fullPayload);

        setHpSettings(heroData);
        localStorage.setItem(HOMEPAGE_SETTINGS_KEY, JSON.stringify(heroData));
        localStorage.setItem(HOMEPAGE_CARDS_KEY, JSON.stringify(featureCards));
        localStorage.setItem(HOMEPAGE_WCU_KEY, JSON.stringify(wcuCards));
        localStorage.setItem(HOMEPAGE_CARD_STYLE_KEY, JSON.stringify(cardAppearance));

        try {
            const token = localStorage.getItem('token') || '';
            const res = await fetch(`${API_URL}/api/v1/agent/settings/homepage`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(fullPayload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Save failed' }));
                throw new Error(err.detail || 'Save failed');
            }
        } catch (err: any) {
            toast.error(`Backend save failed: ${err.message}. Changes saved locally only.`);
        } finally {
            toast.success('Homepage settings saved!', { position: 'bottom-right' });
            setHpSaving(false);
        }
    };
    const handleResetHomepage = () => { setHpSettings(DEFAULT_HOMEPAGE); localStorage.removeItem(HOMEPAGE_SETTINGS_KEY); toast.info('Reset to defaults', { position: 'bottom-right' }); };

    // Page settings handler
    const pgField = (field: keyof PageSettings, value: any) => setPageSettings(prev => ({ ...prev, [field]: value }));
    const handleSavePageSettings = async () => {
        setPageSaving(true);
        localStorage.setItem(PAGE_SETTINGS_KEY, JSON.stringify(pageSettings));

        try {
            const token = localStorage.getItem('token') || '';
            const payload = {
                ...pageSettings,
                buttonShape,
                iconStyle,
                cardStyle,
                density,
                fontPairing,
                font_family: fontFamily,
                font_color: fontColor
            };

            const res = await fetch(`${API_URL}/api/v1/agent/settings/homepage`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Save failed' }));
                throw new Error(err.detail || 'Save failed');
            }
            toast.success('Settings saved to cloud!', { position: 'bottom-right' });
        } catch (err: any) {
            toast.error(`Cloud save failed: ${err.message}. Saved locally only.`);
        } finally {
            setPageSaving(false);
        }
    };
    const handleResetPageSettings = () => { setPageSettings(DEFAULT_PAGE_SETTINGS); localStorage.removeItem(PAGE_SETTINGS_KEY); toast.info('Reset to defaults', { position: 'bottom-right' }); };

    // ── Render Tabs ────────────────────────────────────────────────────────────
    const renderThemeTab = () => (
        <div className="space-y-5">
            <SectionCard icon={<Palette className="h-5 w-5" />} title="Theme Library" subtitle="Choose a pre-built color theme for your agent portal">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(themes).map(([key, t]) => (
                        <button key={key} onClick={() => handleThemeChange(key)}
                            className={`relative p-3 rounded-2xl border-2 transition-all text-left group ${activeTheme === key ? 'border-[var(--primary)] shadow-lg scale-[1.02]' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'}`}>
                            {activeTheme === key && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]" style={{ background: 'var(--primary)' }}><Check className="h-3 w-3" /></span>}
                            <div className="flex gap-1.5 mb-2">
                                {[t.primary, t.primaryLight, t.primarySoft].filter(Boolean).map((c, i) => (
                                    <div key={i} className="w-4 h-4 rounded-full shadow-sm" style={{ background: c }} />
                                ))}
                            </div>
                            <p className="text-xs font-bold text-slate-800 capitalize">{t.name || key}</p>
                        </button>
                    ))}
                    <button onClick={() => setShowCustomEditor(!showCustomEditor)}
                        className={`p-3 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${showCustomEditor || isCustomActive ? 'border-[var(--primary)] shadow-lg' : 'border-dashed border-slate-300 bg-white hover:border-slate-400'}`}>
                        <Wand2 className="h-4 w-4 text-[var(--primary)]" />
                        <p className="text-xs font-bold text-slate-800">Custom</p>
                    </button>
                </div>
            </SectionCard>

            {showCustomEditor && (
                <SectionCard icon={<Wand2 className="h-5 w-5" />} title="Custom Theme Builder" subtitle="Pick your own colors and apply instantly">
                    <div className="space-y-3">
                        {([
                            ['primary', 'Primary Color', 'Highlights & active states', 'primary'],
                            ['secondary', 'Accent Color', 'Gradients & hover effects', 'secondary'],
                            ['nav_bg', 'Navbar Background', 'Navigation bar fill color', 'navbarSettings.bgColor'],
                            ['nav_text', 'Navbar Text', 'Color for links and brand name', 'navbarSettings.textColor'],
                            ['button_bg', 'Button Color', 'Global button background color', 'buttonStyle.bgColor'],
                            ['button_text', 'Button Text', 'Color of text inside buttons', 'buttonStyle.textColor'],
                            ['button_radius', 'Corner Radius', 'How rounded the buttons should be', 'buttonStyle.borderRadius', 'text'],
                            ['bg_color', 'Overall Background', 'Main page background override', 'bg_color'],
                            ['accent_color', 'Finer Accent', 'Secondary UI highlights', 'accent_color'],
                        ] as [string, string, string, string, string?][]).map(([id, label, desc, path, type]) => {
                            // Helper to get nested value
                            const getValue = (p: string) => {
                                if (p.includes('.')) {
                                    const [parent, child] = p.split('.') as [keyof CustomThemeColors, any];
                                    return (customColors[parent] as any)?.[child] || '';
                                }
                                return (customColors as any)[p] || '';
                            };

                            // Helper to set nested value
                            const setValue = (p: string, val: string) => {
                                setCustomColors(prev => {
                                    const next = { ...prev };
                                    if (p.includes('.')) {
                                        const [parent, child] = p.split('.') as [keyof CustomThemeColors, any];
                                        (next[parent] as any) = { ...(next[parent] as any), [child]: val };
                                    } else {
                                        (next as any)[p] = val;
                                    }
                                    return next;
                                });
                            };

                            const currentVal = getValue(path);
                            const isText = type === 'text';

                            return (
                                <div key={id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/60 border border-white/60">
                                    <div><p className="text-sm font-bold text-slate-800">{label}</p><p className="text-xs text-slate-700">{desc}</p></div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-slate-700 uppercase">{currentVal || (isText ? '' : 'Auto')}</span>
                                        {isText ? (
                                            <Input
                                                value={currentVal}
                                                onChange={e => setValue(path, e.target.value)}
                                                className="w-24 h-8 text-xs rounded-lg glass-input px-2"
                                                placeholder="e.g. 10px"
                                            />
                                        ) : (
                                            <label className="relative cursor-pointer">
                                                <div className="w-10 h-10 rounded-xl shadow-md border-2 border-white ring-2 ring-slate-100" style={{ backgroundColor: currentVal || '#ffffff' }} />
                                                <input type="color" value={currentVal || '#ffffff'} onChange={e => setValue(path, e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            </label>
                                        )}
                                        {currentVal && (
                                            <button onClick={() => setValue(path, '')} className="p-1 hover:text-red-500"><X className="h-4 w-4" /></button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex gap-2 pt-1">
                            <Button onClick={handleApplyCustomTheme} className="flex-1 h-10 text-white font-bold rounded-xl" style={{ background: `linear-gradient(135deg, ${previewColors.primary}, ${previewColors.secondary})` }}>
                                <Wand2 className="h-4 w-4 mr-2" />Apply Theme
                            </Button>
                            <Button onClick={handleRestoreDefault} variant="outline" className="h-10 rounded-xl text-slate-600">
                                <RotateCcw className="h-4 w-4 mr-1" />Reset
                            </Button>
                        </div>
                    </div>
                    {/* Live preview */}
                    <div className="rounded-2xl p-4 text-white overflow-hidden mt-2" style={{ background: `linear-gradient(135deg, ${previewColors.primary}, ${previewColors.secondary})` }}>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Preview</p>
                        <p className="text-lg font-extrabold">Agent Portal</p>
                        <div className="flex gap-2 mt-3 flex-wrap">
                            <button className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 border border-white/30">Primary</button>
                            <button className="px-4 py-1.5 rounded-full text-xs font-bold border-2 border-white text-white bg-transparent">Outline</button>
                            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: hexToRgba(previewColors.glass, 0.3) }}>Badge</span>
                        </div>
                    </div>
                </SectionCard>
            )}
        </div>
    );

    const renderHomepageTab = () => (
        <div className="space-y-5">
            <SectionCard icon={<Home className="h-5 w-5" />} title="Hero Content" subtitle="Customize the hero text and buttons customers see">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-xs font-bold text-slate-600">Headline Line 1 <span className="font-normal text-slate-700">({hpSettings.headline1.length}/40)</span></Label><Input maxLength={40} value={hpSettings.headline1} onChange={e => hpField('headline1', e.target.value)} placeholder="Adventure Awaits—" className="h-10 rounded-xl glass-input" /></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-slate-600">Headline Line 2 <span className="font-normal text-slate-700">({hpSettings.headline2.length}/40)</span></Label><Input maxLength={40} value={hpSettings.headline2} onChange={e => hpField('headline2', e.target.value)} placeholder="Tailored Just for You" className="h-10 rounded-xl glass-input" /></div>
                </div>
                <div className="space-y-1"><Label className="text-xs font-bold text-slate-600">Subheading <span className="font-normal text-slate-700">({hpSettings.subheading.length}/160)</span></Label><Textarea maxLength={160} value={hpSettings.subheading} onChange={e => hpField('subheading', e.target.value)} className="rounded-xl glass-input resize-none min-h-[72px]" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-xs font-bold text-slate-600">Primary Button <span className="font-normal text-slate-700">({hpSettings.primaryBtnText.length}/25)</span></Label><Input maxLength={25} value={hpSettings.primaryBtnText} onChange={e => hpField('primaryBtnText', e.target.value)} className="h-10 rounded-xl glass-input" /></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-slate-600">Secondary Button <span className="font-normal text-slate-700">({hpSettings.secondaryBtnText.length}/25)</span></Label><Input maxLength={25} value={hpSettings.secondaryBtnText} onChange={e => hpField('secondaryBtnText', e.target.value)} className="h-10 rounded-xl glass-input" /></div>
                </div>
            </SectionCard>

            <SectionCard icon={<Palette className="h-5 w-5" />} title="Agency Brand Name" subtitle="The official name of your agency displayed across the platform">
                <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Company / Agency Name</Label>
                    <Input
                        value={hpSettings.agency_name || ''}
                        onChange={e => hpField('agency_name', e.target.value)}
                        placeholder="e.g. Dream Travels"
                        className="h-10 rounded-xl glass-input w-full max-w-md"
                    />
                    <p className="text-xs text-slate-500 mt-1">This name will appear on the navbar, booking emails, and invoices.</p>
                </div>
            </SectionCard>

            <SectionCard icon={<Shield className="h-5 w-5" />} title="Agency Logo Branding" subtitle="Upload your custom logo to display in the navbar and footers">
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-white/40 border border-white/60">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center">
                        {hpSettings.navbar_logo_image ? (
                            <img src={hpSettings.navbar_logo_image} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                        ) : (
                            <div className="text-slate-300 flex flex-col items-center">
                                <Plane className="h-8 w-8 mb-1" />
                                <span className="text-[10px] font-bold">DEFAULT</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-3 w-full">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-800">Agency Logo</h4>
                            <p className="text-xs text-slate-500">Recommended size: 200x200px or higher. PNG with transparency preferred.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => logoRef.current?.click()} disabled={logoUploading} className="h-9 rounded-xl text-sm border-slate-200 text-slate-700 bg-white">
                                {logoUploading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                                {logoUploading ? 'Uploading…' : 'Upload Logo'}
                            </Button>
                            <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
                            {hpSettings.navbar_logo_image !== DEFAULT_HOMEPAGE.navbar_logo_image && (
                                <Button variant="ghost" onClick={() => hpField('navbar_logo_image', DEFAULT_HOMEPAGE.navbar_logo_image)} className="h-9 rounded-xl text-xs text-slate-700 hover:text-red-500">Reset to Default</Button>
                            )}
                        </div>
                    </div>
                </div>
            </SectionCard>

            <SectionCard icon={<Eye className="h-5 w-5" />} title="Background Image" subtitle="Set the hero section full-screen background">
                <div className="relative w-full h-[160px] rounded-2xl overflow-hidden border border-white/40 bg-slate-100">
                    {hpSettings.backgroundImageUrl ? <img src={hpSettings.backgroundImageUrl} alt="Preview" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-slate-700 text-sm">No image selected</div>}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/50 text-white text-[10px] rounded backdrop-blur-sm">Preview</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={imageUploading} className="h-9 rounded-xl text-sm border-slate-200 text-slate-700">
                        {imageUploading ? <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4 mr-1.5" />Upload to S3</>}
                    </Button>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
                    <Button variant="outline" onClick={() => setShowUrlInput(!showUrlInput)} className="h-9 rounded-xl text-sm border-slate-200 text-slate-700"><LinkIcon className="h-4 w-4 mr-1.5" />Use URL</Button>
                </div>
                {showUrlInput && (
                    <div className="flex gap-2"><Input value={imageUrlDraft} onChange={e => setImageUrlDraft(e.target.value)} placeholder="https://…" className="h-9 rounded-xl glass-input flex-1" /><Button onClick={handleApplyImageUrl} className="h-9 rounded-xl px-4 text-white" style={{ background: 'var(--primary)' }}>Apply</Button></div>
                )}
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quick Presets</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {PRESET_IMAGES.map(img => (
                            <button key={img.label} onClick={() => hpField('backgroundImageUrl', img.url)}
                                className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${hpSettings.backgroundImageUrl === img.url ? 'border-[var(--primary)] shadow-lg' : 'border-transparent'}`}>
                                <img src={img.url} alt={img.label} className="w-full h-14 object-cover" />
                                <div className="absolute inset-0 bg-black/30 flex items-end p-1"><span className="text-white text-[9px] font-bold">{img.label}</span></div>
                            </button>
                        ))}
                    </div>
                </div>
            </SectionCard>

            <SectionCard icon={<Badge className="h-5 w-5 bg-transparent border-0 text-slate-600 p-0"><Sparkles className="h-5 w-5" /></Badge>} title="AI Badge" subtitle="Configure the badge pill shown in the hero section">
                <ToggleSwitch checked={hpSettings.showAiBadge} onChange={v => hpField('showAiBadge', v)} label="Show AI Badge" />
                {hpSettings.showAiBadge && <div className="space-y-1"><Label className="text-xs font-bold text-slate-600">Badge Text <span className="font-normal text-slate-700">({hpSettings.badgeText.length}/30)</span></Label><Input maxLength={30} value={hpSettings.badgeText} onChange={e => hpField('badgeText', e.target.value)} className="h-10 rounded-xl glass-input" /></div>}
            </SectionCard>

            {/* Feature Cards Section */}
            <SectionCard icon={<span className="text-base">🃏</span>} title="Feature Cards" subtitle="Customize the feature highlight cards shown on your homepage">
                {/* Icon Picker Modal */}
                {iconPickerOpen !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setIconPickerOpen(null)}>
                        <div className="rounded-2xl p-5 max-w-sm w-full shadow-2xl" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)' }} onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-3">
                                <p className="font-bold text-slate-800">Choose an Icon</p>
                                <button onClick={() => setIconPickerOpen(null)} className="p-1 rounded-lg hover:bg-slate-100"><X className="h-4 w-4 text-slate-700" /></button>
                            </div>
                            <Input placeholder="Search icons…" value={iconSearch} onChange={e => setIconSearch(e.target.value)} className="h-9 rounded-xl mb-3 glass-input" />
                            <div className="grid grid-cols-6 gap-1.5 max-h-56 overflow-y-auto">
                                {ICON_OPTIONS.filter(n => n.toLowerCase().includes(iconSearch.toLowerCase())).map(name => {
                                    const IconC = ICON_MAP[name] || Sparkles;
                                    const isWcu = iconPickerOpen.type === 'wcu';
                                    const selected = (isWcu ? wcuCards[iconPickerOpen.idx] : featureCards[iconPickerOpen.idx])?.icon === name;
                                    return (
                                        <button key={name} title={name} onClick={() => {
                                            if (isWcu) updateWcuCard(iconPickerOpen.idx, 'icon', name);
                                            else updateCard(iconPickerOpen.idx, 'icon', name);
                                            setIconPickerOpen(null); setIconSearch('');
                                        }}
                                            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${selected ? 'bg-[var(--primary-glow)] border-2 border-[var(--primary)]' : 'hover:bg-[var(--primary-soft)]'}`}>
                                            <IconC className="h-4 w-4" style={{ color: selected ? 'var(--primary)' : '#64748b' }} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featureCards.map((card, idx) => {
                        const IconC = getIconCmp(card.icon);
                        return (
                            <div key={idx} className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)' }}>
                                {/* Mini live preview */}
                                <div className="rounded-xl p-3 flex flex-col items-center text-center gap-1.5" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.5)' }}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))' }}>
                                        <IconC className="h-5 w-5 text-white" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{card.title || 'Card Title'}</p>
                                    <p className="text-xs text-slate-500 leading-tight">{card.description || 'Description'}</p>
                                </div>

                                {/* Icon picker button */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: 'var(--primary)' }}>
                                        <IconC className="h-5 w-5" />
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => { setIconPickerOpen({ type: 'feature', idx }); setIconSearch(''); }} className="h-8 rounded-lg text-xs border-slate-200 text-slate-600 flex-1">
                                        Change Icon ({card.icon})
                                    </Button>
                                </div>

                                {/* Title */}
                                <div className="space-y-0.5">
                                    <Label className="text-[11px] font-bold text-slate-500">Title <span className="font-normal">({card.title.length}/30)</span></Label>
                                    <Input maxLength={30} value={card.title} onChange={e => updateCard(idx, 'title', e.target.value)} className="h-9 rounded-lg glass-input text-sm" />
                                </div>

                                {/* Description */}
                                <div className="space-y-0.5">
                                    <Label className="text-[11px] font-bold text-slate-500">Description <span className="font-normal">({card.description.length}/100)</span></Label>
                                    <Textarea maxLength={100} value={card.description} onChange={e => updateCard(idx, 'description', e.target.value)} className="rounded-lg glass-input resize-none min-h-[56px] text-sm" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </SectionCard>

            {/* Why Choose Us Cards Section */}
            <SectionCard icon={<span className="text-base">🤝</span>} title="Why Choose Us Cards" subtitle="Customize the 4 cards shown in the 'Why Choose Us' section">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wcuCards.map((card, idx) => {
                        const IconC = getIconCmp(card.icon);
                        return (
                            <div key={idx} className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)' }}>
                                {/* Mini live preview */}
                                <div className="rounded-xl p-3 flex flex-col items-center text-center gap-1.5" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.5)' }}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))' }}>
                                        <IconC className="h-5 w-5 text-white" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{card.title || 'Card Title'}</p>
                                    <p className="text-xs text-slate-500 leading-tight">{card.description || 'Description'}</p>
                                </div>

                                {/* Icon picker button */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: 'var(--primary)' }}>
                                        <IconC className="h-5 w-5" />
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => { setIconPickerOpen({ type: 'wcu', idx }); setIconSearch(''); }} className="h-8 rounded-lg text-xs border-slate-200 text-slate-600 flex-1">
                                        Change Icon ({card.icon})
                                    </Button>
                                </div>

                                {/* Title */}
                                <div className="space-y-0.5">
                                    <Label className="text-[11px] font-bold text-slate-500">Title <span className="font-normal">({card.title.length}/30)</span></Label>
                                    <Input maxLength={30} value={card.title} onChange={e => updateWcuCard(idx, 'title', e.target.value)} className="h-9 rounded-lg glass-input text-sm" />
                                </div>

                                {/* Description */}
                                <div className="space-y-0.5">
                                    <Label className="text-[11px] font-bold text-slate-500">Description <span className="font-normal">({card.description.length}/100)</span></Label>
                                    <Textarea maxLength={100} value={card.description} onChange={e => updateWcuCard(idx, 'description', e.target.value)} className="rounded-lg glass-input resize-none min-h-[56px] text-sm" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </SectionCard>

            {/* Global Card Appearance Section */}
            <SectionCard icon={<Palette className="h-5 w-5" />} title="Card Appearance" subtitle="Control the visual style of all cards on your homepage">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Icon Style</Label>
                            <div className="grid grid-cols-5 gap-2">
                                {(['filled-circle', 'outlined-circle', 'rounded-square', 'gradient-circle', 'soft-tinted'] as const).map(s => (
                                    <button key={s} onClick={() => updateCardStyle('iconStyle', s)} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${cardAppearance.iconStyle === s ? 'border-[var(--primary)] bg-[var(--primary-glow)]' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s === 'filled-circle' ? 'bg-orange-500 rounded-full' : s === 'outlined-circle' ? 'border-2 border-orange-500 rounded-full' : s === 'rounded-square' ? 'bg-orange-100 rounded-xl' : s === 'gradient-circle' ? 'bg-gradient-to-br from-orange-400 to-orange-600 rounded-full' : 'bg-orange-50 rounded-full'}`}>
                                            <Sparkles className={`h-4 w-4 ${s === 'filled-circle' || s === 'gradient-circle' ? 'text-white' : 'text-orange-500'}`} />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 capitalize text-center leading-tight">{s.split('-')[0]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Card Background</Label>
                            <div className="grid grid-cols-5 gap-2">
                                {(['soft-white', 'glass', 'tinted', 'pure-white', 'transparent'] as const).map(bg => (
                                    <button key={bg} onClick={() => updateCardStyle('background', bg)} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${cardAppearance.background === bg ? 'border-[var(--primary)] bg-[var(--primary-glow)]' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                        <div className={`w-full aspect-video rounded-lg border border-slate-200 ${bg === 'pure-white' ? 'bg-white' : bg === 'tinted' ? 'bg-orange-50' : bg === 'transparent' ? 'bg-transparent border-dashed' : 'bg-slate-50'}`} />
                                        <span className="text-[10px] font-bold text-slate-600 capitalize text-center leading-tight">{bg.split('-')[0]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Card Border & Effect</Label>
                            <div className="flex flex-wrap gap-2">
                                {(['none', 'subtle', 'primary', 'top-accent', 'glow'] as const).map(b => (
                                    <Button key={b} variant={cardAppearance.border === b ? 'default' : 'outline'} size="sm" onClick={() => updateCardStyle('border', b)} className="h-8 rounded-lg text-xs px-3 capitalize" style={cardAppearance.border === b ? { background: 'var(--primary)' } : {}}>
                                        {b.replace('-', ' ')}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Hover Effect</Label>
                            <div className="flex flex-wrap gap-2">
                                {(['lift', 'glow', 'scale', 'border', 'none'] as const).map(h => (
                                    <Button key={h} variant={cardAppearance.hover === h ? 'default' : 'outline'} size="sm" onClick={() => updateCardStyle('hover', h)} className="h-8 rounded-lg text-xs px-4 capitalize" style={cardAppearance.hover === h ? { background: 'var(--primary)' } : {}}>
                                        {h}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Title Color</Label>
                            <div className="flex gap-2">
                                {(['dark', 'primary', 'gradient'] as const).map(c => (
                                    <Button key={c} variant={cardAppearance.titleColor === c ? 'default' : 'outline'} size="sm" onClick={() => updateCardStyle('titleColor', c)} className="h-8 rounded-lg text-xs px-4 capitalize flex-1" style={cardAppearance.titleColor === c ? { background: 'var(--primary)' } : {}}>
                                        {c}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Layout Direction</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['top', 'horizontal', 'minimal'] as const).map(l => (
                                    <button key={l} onClick={() => updateCardStyle('layout', l)} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${cardAppearance.layout === l ? 'border-[var(--primary)] bg-[var(--primary-glow)]' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                        <div className="w-full h-10 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center relative overflow-hidden">
                                            {l === 'top' && <div className="flex flex-col items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-400" /><div className="w-6 h-1 rounded-full bg-slate-300" /></div>}
                                            {l === 'horizontal' && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-400" /><div className="w-5 h-1 rounded-full bg-slate-300" /></div>}
                                            {l === 'minimal' && <div className="flex flex-col items-center gap-1"><div className="w-8 h-1 rounded-full bg-slate-400" /><div className="w-10 h-1.5 rounded-full bg-slate-200" /></div>}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 capitalize">{l}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Live Preview Panel */}
                        <div className="mt-2 p-4 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden">
                            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-3">Live Result Preview</p>
                            <div className={`grid gap-3 ${cardAppearance.layout === 'horizontal' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {[1, 2].map(i => (
                                    <div key={i} className={`p-4 rounded-xl shadow-sm border border-white transition-all ${cardAppearance.layout === 'horizontal' ? 'flex items-center gap-3' : 'flex flex-col items-center text-center'}`} style={{
                                        background: cardAppearance.background === 'pure-white' ? '#fff' : cardAppearance.background === 'transparent' ? 'transparent' : cardAppearance.background === 'tinted' ? 'var(--primary-soft)' : 'rgba(255,255,255,0.7)',
                                        border: cardAppearance.border === 'primary' ? '1px solid var(--primary-light)' : cardAppearance.border === 'subtle' ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent',
                                        borderTop: cardAppearance.border === 'top-accent' ? '3px solid var(--primary)' : undefined,
                                        boxShadow: cardAppearance.border === 'glow' ? '0 0 15px var(--primary-glow)' : undefined,
                                        transform: cardAppearance.hover === 'lift' ? 'translateY(-2px)' : undefined
                                    }}>
                                        {cardAppearance.layout !== 'minimal' && (
                                            <div className={`flex items-center justify-center shrink-0 ${cardAppearance.iconStyle === 'rounded-square' ? 'w-10 h-10 rounded-xl bg-[var(--primary-soft)]' : 'w-10 h-10 rounded-full'} ${cardAppearance.iconStyle === 'filled-circle' ? 'bg-[var(--primary)]' : cardAppearance.iconStyle === 'outlined-circle' ? 'border-2 border-[var(--primary)]' : cardAppearance.iconStyle === 'gradient-circle' ? 'bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-mid)]' : ''}`}>
                                                <Sparkles className={`h-5 w-5 ${cardAppearance.iconStyle === 'filled-circle' || cardAppearance.iconStyle === 'gradient-circle' ? 'text-white' : 'text-[var(--primary)]'}`} />
                                            </div>
                                        )}
                                        <div className={cardAppearance.layout === 'horizontal' ? 'flex-1' : ''}>
                                            <h4 className={`text-sm font-bold leading-tight mb-0.5 ${cardAppearance.titleColor === 'primary' ? 'text-[var(--primary)]' : cardAppearance.titleColor === 'gradient' ? 'text-transparent bg-clip-text bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-mid)]' : 'text-slate-800'}`}>Card Title</h4>
                                            <p className="text-[10px] text-slate-500 leading-tight">Short tagline goes here.</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </SectionCard>
        </div>
    );

    const renderPlanTripTab = () => (
        <div className="space-y-5">
            <SectionCard icon={<MapIcon className="h-5 w-5" />} title="Hero Section" subtitle="Customize the top banner and search bar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-600">Main Heading</Label>
                        <Input value={pageSettings.plan_trip_heading} onChange={e => pgField('plan_trip_heading', e.target.value)} className="h-10 rounded-xl glass-input" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-600">Italic Highlight Word</Label>
                        <Input value={pageSettings.plan_trip_italic} onChange={e => pgField('plan_trip_italic', e.target.value)} className="h-10 rounded-xl glass-input" />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Subheading</Label>
                    <Textarea value={pageSettings.plan_trip_subheading} onChange={e => pgField('plan_trip_subheading', e.target.value)} className="rounded-xl glass-input resize-none min-h-[72px]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-600">Search Placeholder</Label>
                        <Input value={pageSettings.plan_trip_placeholder} onChange={e => pgField('plan_trip_placeholder', e.target.value)} className="h-10 rounded-xl glass-input" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-600">Search Button Text</Label>
                        <Input value={pageSettings.plan_trip_button_text} onChange={e => pgField('plan_trip_button_text', e.target.value)} className="h-10 rounded-xl glass-input" />
                    </div>
                </div>
            </SectionCard>

            <SectionCard icon={<Sliders className="h-5 w-5" />} title="Discovery & Categories" subtitle="Filters and secondary sections">
                <ToggleSwitch checked={pageSettings.show_category_pills} onChange={v => pgField('show_category_pills', v)} label="Show Category Pills" />
                <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Browse Section Heading</Label>
                    <Input value={pageSettings.plan_trip_section_heading} onChange={e => pgField('plan_trip_section_heading', e.target.value)} className="h-10 rounded-xl glass-input" />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Browse Section Subtext</Label>
                    <Textarea value={pageSettings.plan_trip_section_subtext} onChange={e => pgField('plan_trip_section_subtext', e.target.value)} className="rounded-xl glass-input resize-none min-h-[72px]" />
                </div>
            </SectionCard>

            <SectionCard icon={<Globe className="h-5 w-5" />} title="Popular Destinations" subtitle="Customize the destinations grid content">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-600">Destinations Heading</Label>
                        <Input value={pageSettings.destinations_heading} onChange={e => pgField('destinations_heading', e.target.value)} className="h-10 rounded-xl glass-input" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-600">Destinations Link Text (View All)</Label>
                        <Input value={pageSettings.destinations_link_text} onChange={e => pgField('destinations_link_text', e.target.value)} className="h-10 rounded-xl glass-input" />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Destinations Subtext</Label>
                    <Textarea value={pageSettings.destinations_subtext} onChange={e => pgField('destinations_subtext', e.target.value)} className="rounded-xl glass-input resize-none min-h-[72px]" />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Explore Button Text (on Cards)</Label>
                    <Input value={pageSettings.destinations_cta_text} onChange={e => pgField('destinations_cta_text', e.target.value)} className="h-10 rounded-xl glass-input" />
                </div>
            </SectionCard>

            <SectionCard icon={<Sliders className="h-5 w-5" />} title="Trip Style Cards" subtitle="Customize the 4 cards on your Plan Trip page">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pageSettings.trip_style_cards.map((card, idx) => (
                        <div key={idx} className="p-5 glass-trip-card space-y-4">
                            <div className="flex items-center justify-between pointer-events-none">
                                <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest opacity-70">Card {idx + 1}</span>
                                <div className="flex gap-1 pointer-events-auto">
                                    {[
                                        { name: 'Mountain', icon: <Mountain className="h-3 w-3" /> },
                                        { name: 'Waves', icon: <Waves className="h-3 w-3" /> },
                                        { name: 'Heart', icon: <Heart className="h-3 w-3" /> },
                                        { name: 'Users', icon: <Users className="h-3 w-3" /> },
                                        { name: 'Trees', icon: <Trees className="h-3 w-3" /> },
                                        { name: 'Palmtree', icon: <Palmtree className="h-3 w-3" /> },
                                        { name: 'Compass', icon: <Compass className="h-3 w-3" /> },
                                        { name: 'MapPin', icon: <MapPin className="h-3 w-3" /> },
                                        { name: 'Camera', icon: <Camera className="h-3 w-3" /> }
                                    ].map(ico => (
                                        <button
                                            key={ico.name}
                                            onClick={() => {
                                                const newCards = [...pageSettings.trip_style_cards];
                                                newCards[idx] = { ...newCards[idx], icon_name: ico.name };
                                                pgField('trip_style_cards', newCards);
                                            }}
                                            className={`p-1.5 rounded-lg border transition-all ${card.icon_name === ico.name ? 'bg-[var(--primary)] text-white border-transparent shadow-[0_4px_12px_var(--primary-glow)]' : 'bg-white/40 border-white/40 text-slate-500 hover:border-[var(--primary)] hover:bg-white/60'}`}
                                            title={ico.name}
                                        >
                                            {ico.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500">Label</Label>
                                <Input
                                    value={card.title}
                                    onChange={e => {
                                        const newCards = [...pageSettings.trip_style_cards];
                                        newCards[idx] = { ...newCards[idx], title: e.target.value };
                                        pgField('trip_style_cards', newCards);
                                    }}
                                    className="h-8 text-xs rounded-lg glass-input"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500">Description</Label>
                                <Input
                                    value={card.description}
                                    onChange={e => {
                                        const newCards = [...pageSettings.trip_style_cards];
                                        newCards[idx] = { ...newCards[idx], description: e.target.value };
                                        pgField('trip_style_cards', newCards);
                                    }}
                                    className="h-8 text-xs rounded-lg glass-input"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            <SectionCard icon={<Sparkles className="h-5 w-5" />} title="Social Proof" subtitle="Trust indicators below search">
                <ToggleSwitch checked={pageSettings.show_stat_bar} onChange={v => pgField('show_stat_bar', v)} label="Show Stats Bar" />
                {pageSettings.show_stat_bar && (
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-600">Stats Text</Label>
                        <Input value={pageSettings.plan_trip_stats_text} onChange={e => pgField('plan_trip_stats_text', e.target.value)} className="h-10 rounded-xl glass-input" />
                    </div>
                )}
            </SectionCard>
        </div>
    );

    const renderItineraryTab = () => (
        <div className="space-y-5">
            <SectionCard icon={<Palette className="h-5 w-5" />} title="Itinerary Page Theme" subtitle="Modernize the look and feel of your customer-facing itinerary">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Card Style</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {(['glassy', 'minimal', 'rounded', 'classic'] as const).map(s => (
                                <button key={s} onClick={() => pgField('itinerary_card_style', s)}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${pageSettings.itinerary_card_style === s ? 'border-[var(--primary)] bg-[var(--primary-glow)]' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                    <div className={`w-full h-8 rounded-lg border border-slate-200 ${s === 'glassy' ? 'bg-white/40 backdrop-blur-sm' : s === 'minimal' ? 'bg-white border-slate-100 shadow-sm' : s === 'rounded' ? 'bg-white rounded-xl' : 'bg-slate-50'}`} />
                                    <span className="text-[10px] font-bold text-slate-600 capitalize">{s}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Primary Theme Color</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative cursor-pointer">
                                    <div className="w-10 h-10 rounded-xl shadow-md border-2 border-white ring-2 ring-slate-100" style={{ backgroundColor: pageSettings.itinerary_primary_color || customColors.primary }} />
                                    <input type="color" value={pageSettings.itinerary_primary_color || customColors.primary} onChange={e => pgField('itinerary_primary_color', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                </div>
                                <Input value={pageSettings.itinerary_primary_color || customColors.primary} onChange={e => pgField('itinerary_primary_color', e.target.value)} className="h-10 rounded-xl glass-input flex-1 text-sm font-mono uppercase" placeholder="#HEX" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Secondary Color</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative cursor-pointer">
                                    <div className="w-10 h-10 rounded-xl shadow-md border-2 border-white ring-2 ring-slate-100" style={{ backgroundColor: pageSettings.itinerary_secondary_color || customColors.secondary }} />
                                    <input type="color" value={pageSettings.itinerary_secondary_color || customColors.secondary} onChange={e => pgField('itinerary_secondary_color', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                </div>
                                <Input value={pageSettings.itinerary_secondary_color || customColors.secondary} onChange={e => pgField('itinerary_secondary_color', e.target.value)} className="h-10 rounded-xl glass-input flex-1 text-sm font-mono uppercase" placeholder="#HEX" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Button & Font Style</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="grid grid-cols-3 gap-2">
                                {(['pill', 'rounded', 'square'] as const).map(s => (
                                    <button key={s} onClick={() => pgField('itinerary_button_style', s)}
                                        className={`p-2 rounded-xl border-2 transition-all text-[10px] font-bold ${pageSettings.itinerary_button_style === s ? 'border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)]' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-1">
                                <Input value={pageSettings.itinerary_font_family} onChange={e => pgField('itinerary_font_family', e.target.value)} className="h-10 rounded-xl glass-input text-xs" placeholder="Font Family (e.g. Inter, sans-serif)" />
                            </div>
                        </div>
                    </div>
                </div>
            </SectionCard>

            <SectionCard icon={<ClipboardList className="h-5 w-5" />} title="Hero Section" subtitle="The top banner on the itinerary detail page">
                <ToggleSwitch checked={pageSettings.show_ai_optimized_badge} onChange={v => pgField('show_ai_optimized_badge', v)} label="Show 'AI Optimized' badge" />
                {pageSettings.show_ai_optimized_badge && <div className="space-y-1"><Label className="text-xs font-bold text-slate-600">Badge Text</Label><Input value={pageSettings.ai_optimized_text} onChange={e => pgField('ai_optimized_text', e.target.value)} className="h-10 rounded-xl glass-input" /></div>}
            </SectionCard>
            <SectionCard icon={<Eye className="h-5 w-5" />} title="Time Slot Labels" subtitle="Rename the time-of-day categories in the itinerary timeline">
                <div className="grid grid-cols-2 gap-3">
                    {([['morning_label', 'Morning'], ['afternoon_label', 'Afternoon'], ['evening_label', 'Evening'], ['night_label', 'Night']] as [keyof PageSettings, string][]).map(([field, label]) => (
                        <div key={field} className="space-y-1"><Label className="text-xs font-bold text-slate-600">{label}</Label><Input value={pageSettings[field] as string} onChange={e => pgField(field, e.target.value)} className="h-9 rounded-xl glass-input" /></div>
                    ))}
                </div>
            </SectionCard>
            <SectionCard icon={<Eye className="h-5 w-5" />} title="Activity Cards" subtitle="Control what appears on activity cards in the itinerary">
                <ToggleSwitch checked={pageSettings.show_activity_images} onChange={v => pgField('show_activity_images', v)} label="Show activity images" />
            </SectionCard>

            <SectionCard icon={<Award className="h-5 w-5" />} title="'Why Book' Cards" subtitle="Customize the trust cards shown on the itinerary page">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {pageSettings.itinerary_wcu_cards.map((card, idx) => (
                        <div key={idx} className="p-4 glass-trip-card space-y-3 relative group">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest opacity-60">Card {idx + 1}</span>
                                <div className="flex gap-1">
                                    {ICON_OPTIONS.slice(0, 10).map(iconName => {
                                        const IconComp = {
                                            Plane, Globe, Users, Clock, Shield, Star, Heart, Map: MapIcon, Camera, Car
                                        }[iconName] as any;
                                        return (
                                            <button
                                                key={iconName}
                                                onClick={() => {
                                                    const newCards = [...pageSettings.itinerary_wcu_cards];
                                                    newCards[idx] = { ...newCards[idx], icon: iconName };
                                                    pgField('itinerary_wcu_cards', newCards);
                                                }}
                                                className={`p-1 rounded transition-all ${card.icon === iconName ? 'bg-[var(--primary)] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                            >
                                                {IconComp && <IconComp className="h-3 w-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500">Title</Label>
                                <Input
                                    value={card.title}
                                    onChange={e => {
                                        const newCards = [...pageSettings.itinerary_wcu_cards];
                                        newCards[idx] = { ...newCards[idx], title: e.target.value };
                                        pgField('itinerary_wcu_cards', newCards);
                                    }}
                                    className="h-8 text-xs rounded-lg glass-input"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500">Description</Label>
                                <Textarea
                                    value={card.description}
                                    onChange={e => {
                                        const newCards = [...pageSettings.itinerary_wcu_cards];
                                        newCards[idx] = { ...newCards[idx], description: e.target.value };
                                        pgField('itinerary_wcu_cards', newCards);
                                    }}
                                    className="text-xs rounded-lg glass-input min-h-[60px] resize-none"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>
        </div>
    );

    const renderCartTab = () => (
        <div className="space-y-5">
            <SectionCard icon={<ShoppingCart className="h-5 w-5" />} title="Trip Summary & Checkout" subtitle="Customize the booking summary in the cart/checkout">
                <div className="space-y-1"><Label className="text-xs font-bold text-slate-600">Card Title</Label><Input value={pageSettings.cart_summary_title} onChange={e => pgField('cart_summary_title', e.target.value)} className="h-10 rounded-xl glass-input" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-xs font-bold text-slate-600">Checkout CTA Text</Label><Input value={pageSettings.cart_cta_text} onChange={e => pgField('cart_cta_text', e.target.value)} className="h-10 rounded-xl glass-input" /></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-slate-600">Modal Start Button</Label><Input value={pageSettings.modal_cta_text} onChange={e => pgField('modal_cta_text', e.target.value)} className="h-10 rounded-xl glass-input" /></div>
                </div>
            </SectionCard>
            <SectionCard icon={<Eye className="h-5 w-5" />} title="Price Display" subtitle="Control what pricing details are shown">
                <ToggleSwitch checked={pageSettings.show_gst_breakdown} onChange={v => pgField('show_gst_breakdown', v)} label="Show GST breakdown" />
                <ToggleSwitch checked={pageSettings.show_per_person} onChange={v => pgField('show_per_person', v)} label='Show "per person" label' />
            </SectionCard>
            <SectionCard icon={<Check className="h-5 w-5" />} title="Trust Badges" subtitle="Build customer confidence with trust indicators">
                <ToggleSwitch checked={pageSettings.show_verified_badge} onChange={v => pgField('show_verified_badge', v)} label='"Verified & Secure" badge' />
                <ToggleSwitch checked={pageSettings.show_support_badge} onChange={v => pgField('show_support_badge', v)} label='"24/7 Support" badge' />
                <ToggleSwitch checked={pageSettings.show_flexible_badge} onChange={v => pgField('show_flexible_badge', v)} label='"Flexible Plans" badge' />
            </SectionCard>
        </div>
    );

    const renderUiStyleTab = () => (
        <div className="space-y-5">
            <SectionCard icon={<Sliders className="h-5 w-5" />} title="UI Style" subtitle="Customize buttons, cards, icons, spacing and fonts — applied instantly">

                {/* Button Shape */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Button Style</p>
                    <div className="flex flex-wrap gap-2">
                        {([
                            { key: 'pill', label: 'Pill', r: '999px' },
                            { key: 'rounded', label: 'Rounded', r: '12px' },
                            { key: 'soft-square', label: 'Soft Square', r: '8px' },
                            { key: 'square', label: 'Square', r: '4px' },
                            { key: 'underline', label: 'Underline', r: '0' },
                        ] as { key: string; label: string; r: string }[]).map(opt => (
                            <button key={opt.key} onClick={() => saveUiStyle({ buttonShape: opt.key })}
                                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 transition-all ${buttonShape === opt.key ? 'border-[var(--primary)] bg-[var(--primary-glow)]' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                <span className="px-3 py-1 text-[11px] font-bold" style={{
                                    borderRadius: opt.r,
                                    background: opt.key === 'underline' ? 'transparent' : 'var(--primary)',
                                    borderBottom: opt.key === 'underline' ? '2px solid var(--primary)' : undefined,
                                    color: opt.key === 'underline' ? 'var(--primary)' : 'white'
                                }}>Book Now</span>
                                <span className="text-[10px] font-bold text-slate-500">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Icon Style */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Icon Style</p>
                    <div className="flex flex-wrap gap-2">
                        {([
                            { key: 'filled-circle', label: 'Filled', bg: { background: 'var(--primary)', borderRadius: '50%', padding: '6px' } },
                            { key: 'outlined-circle', label: 'Outlined', bg: { border: '2px solid var(--primary)', borderRadius: '50%', padding: '6px' } },
                            { key: 'rounded-square', label: 'Badge', bg: { background: 'var(--primary-soft)', borderRadius: '10px', padding: '6px' } },
                            { key: 'plain', label: 'Plain', bg: {} },
                            { key: 'gradient', label: 'Gradient', bg: { background: 'linear-gradient(135deg,var(--gradient-start),var(--gradient-end))', borderRadius: '8px', padding: '6px' } },
                        ] as { key: string; label: string; bg: React.CSSProperties }[]).map(opt => (
                            <button key={opt.key} onClick={() => saveUiStyle({ iconStyle: opt.key })}
                                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 transition-all ${iconStyle === opt.key ? 'border-[var(--primary)] bg-[var(--primary-glow)]' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                <span className="w-8 h-8 flex items-center justify-center" style={opt.bg}>
                                    <Sparkles className="h-3.5 w-3.5" style={{ color: ['outlined-circle', 'plain'].includes(opt.key) ? 'var(--primary)' : 'white' }} />
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Card Style */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Card Style</p>
                    <div className="flex flex-wrap gap-2">
                        {([
                            { key: 'glass', label: 'Glass', s: { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.35)' } },
                            { key: 'flat', label: 'Flat', s: { background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' } },
                            { key: 'bordered', label: 'Bordered', s: { background: '#fff', borderTop: '3px solid var(--primary)', border: '1px solid #f0f0f0' } },
                            { key: 'elevated', label: 'Elevated', s: { background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } },
                            { key: 'tinted', label: 'Tinted', s: { background: 'var(--primary-soft)', border: '1px solid var(--primary-light)' } },
                        ] as { key: string; label: string; s: React.CSSProperties }[]).map(opt => (
                            <button key={opt.key} onClick={() => saveUiStyle({ cardStyle: opt.key })}
                                className={`flex flex-col items-center gap-1.5 p-1.5 rounded-2xl border-2 transition-all ${cardStyle === opt.key ? 'border-[var(--primary)] bg-[var(--primary-glow)]' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                <div className="w-[80px] h-[54px] rounded-lg overflow-hidden" style={opt.s}>
                                    <div className="p-1.5 space-y-1"><div className="h-2 w-10 rounded bg-slate-300/60" /><div className="h-1.5 w-full rounded bg-slate-200/60" /><div className="h-1.5 w-2/3 rounded bg-slate-200/60" /></div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Density */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Spacing</p>
                    <div className="flex rounded-xl overflow-hidden border border-slate-200 w-fit">
                        {(['spacious', 'comfortable', 'compact'] as const).map((opt, i) => (
                            <button key={opt} onClick={() => saveUiStyle({ density: opt })}
                                className={`px-5 py-2 text-xs font-bold transition-all ${density === opt ? 'text-white' : 'text-slate-600 bg-white hover:bg-slate-50'} ${i > 0 ? 'border-l border-slate-200' : ''}`}
                                style={density === opt ? { background: 'var(--primary)' } : {}}>
                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Font Theme Selector */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Font Theme</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {( [
                                    { label: 'Modern Sans', value: 'var(--font-inter)', preview: 'The quick brown fox' },
                                    { label: 'Classic Serif', value: 'var(--font-playfair)', preview: 'The quick brown fox' },
                                    { label: 'Mono Tech', value: 'var(--font-mono)', preview: 'The quick brown fox' },
                                    { label: 'Elegant Script', value: 'var(--font-script)', preview: 'The quick brown fox' },
                                    { label: 'Rounded Friendly', value: 'var(--font-rounded)', preview: 'The quick brown fox' },
                                ] as const).map((opt) => (
                                    <button 
                                        key={opt.value} 
                                        onClick={() => saveUiStyle({ font_family: opt.value })}
                                        className={cn(
                                            "flex flex-col items-start gap-1 px-4 py-3 rounded-2xl border-2 transition-all min-w-[140px]",
                                            fontFamily === opt.value ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-slate-100 bg-white hover:border-slate-200"
                                        )}
                                    >
                                        <span className="text-sm font-medium text-slate-900" style={{ fontFamily: opt.value }}>{opt.preview}</span>
                                        <span className="text-[10px] font-bold text-slate-700 uppercase">{opt.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Primary Font Color</p>
                                <div className="flex flex-wrap gap-3 items-center">
                                    <div className="relative group">
                                        <input 
                                            type="color" 
                                            value={fontColor} 
                                            onChange={(e) => saveUiStyle({ font_color: e.target.value })}
                                            className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">Custom</div>
                                    </div>
                                    
                                    <div className="h-6 w-px bg-slate-200 mx-1" />

                                    {( [
                                        { name: 'Midnight Black', value: '#1e293b' },
                                        { name: 'Slate Gray', value: '#475569' },
                                        { name: 'Ocean Blue', value: '#1e40af' },
                                        { name: 'Warm Crimson', value: '#991b1b' },
                                        { name: 'Forest Green', value: '#166534' }
                                    ] as const).map((color) => (
                                        <button 
                                            key={color.value}
                                            onClick={() => saveUiStyle({ font_color: color.value })}
                                            className={cn(
                                                "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                                                fontColor === color.value ? "border-[var(--primary)] ring-2 ring-[var(--primary-glow)]" : "border-white shadow-sm"
                                            )}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Live Preview Panel */}
                        <div className="relative">
                            <div className="absolute -top-3 -right-3 z-10 px-3 py-1 bg-[var(--primary)] text-white text-[10px] font-bold rounded-full shadow-lg flex items-center gap-1">
                                <Eye className="h-3 w-3" /> LIVE PREVIEW
                            </div>
                            <div className="glass-panel border-white/40 shadow-xl rounded-[32px] p-6 h-full flex flex-col justify-center space-y-4 overflow-hidden" 
                                 style={{ 
                                     fontFamily: 'var(--project-font-family, sans-serif)',
                                     color: 'var(--project-font-color, inherit)'
                                 }}>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-medium leading-tight">Majestic Maldives</h3>
                                    <p className="text-sm opacity-80 font-medium">Escape to paradise with our curated getaway.</p>
                                </div>
                                
                                <div className="flex gap-2">
                                    <div className="px-3 py-1 rounded-full bg-[var(--primary-glow)] text-[var(--primary)] text-[10px] font-bold border border-[var(--primary-soft)]">
                                        5D / 4N
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                        Best Seller
                                    </div>
                                </div>

                                <p className="text-xs leading-relaxed opacity-70 italic">
                                    "The most incredible experience of my life. Every detail was handled with care and sophistication."
                                </p>

                                <div className="pt-2 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Starts from</p>
                                        <p className="text-lg font-black">$1,250</p>
                                    </div>
                                    <button className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold shadow-lg shadow-[var(--primary-glow)]">
                                        Book Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SectionCard>
        </div>
    );

    // Tabs that have a save/reset bar
    const SAVEABLE_TABS: TabId[] = ['homepage', 'plantrip', 'itinerary', 'cart', 'uistyle'];

    const handleSave = () => {
        if (activeTab === 'homepage') { handleSaveHomepage(); return; }
        handleSavePageSettings();
    };
    const handleReset = () => {
        if (activeTab === 'homepage') { handleResetHomepage(); return; }
        handleResetPageSettings();
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent">
            {/* ── Main Content Area ────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto px-6 py-8 pb-24">
                <div className="max-w-5xl mx-auto">
                    {/* Modern Page Header Card */}
                    <div className="page-header-card flex-col items-start gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                                <span className="text-[var(--primary)]">{TABS.find(t => t.id === activeTab)?.icon}</span>
                                {TABS.find(t => t.id === activeTab)?.label}
                            </h1>
                            <p className="text-[#8B5E34] text-sm mt-1.5 font-medium">
                                {activeTab === 'theme' && 'Choose colors and build your brand identity'}
                                {activeTab === 'homepage' && 'What customers see when they land on your homepage'}
                                {activeTab === 'plantrip' && 'Customize the trip search and discovery experience'}
                                {activeTab === 'itinerary' && 'Customize the itinerary detail page'}
                                {activeTab === 'cart' && 'Adjust the cart and checkout experience'}
                                {activeTab === 'uistyle' && 'Instantly change button shapes, card styles, and typography'}
                            </p>
                        </div>

                        {/* Horizontal Scrollable Tabs */}
                        <div className="tab-bar w-full">
                            {TABS.map(tab => {
                                const active = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as TabId)}
                                        className={cn("tab-item", active && "active")}
                                    >
                                        <span className="opacity-70">{tab.icon}</span>
                                        <span>{tab.label}</span>
                                        {tab.count > 0 && (
                                            <span className={cn(
                                                "text-[10px] rounded-full px-1.5 py-0.5 font-bold transition-all",
                                                active ? "bg-[var(--primary)] text-white" : "bg-slate-200/50 text-slate-500"
                                            )}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="w-full">
                        {activeTab === 'theme' && renderThemeTab()}
                        {activeTab === 'homepage' && renderHomepageTab()}
                        {activeTab === 'plantrip' && renderPlanTripTab()}
                        {activeTab === 'itinerary' && renderItineraryTab()}
                        {activeTab === 'cart' && renderCartTab()}
                        {activeTab === 'uistyle' && renderUiStyleTab()}
                    </div>
                </div>

                {/* ── Sticky Save Bar ────────────────────────────────────── */}
                {SAVEABLE_TABS.includes(activeTab) && (
                    <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-3 border-t border-white/20 bg-white/70 backdrop-blur-xl">
                        <div className="max-w-5xl mx-auto flex items-center gap-3">
                            <p className="text-xs text-slate-700 flex-1 flex items-center gap-1.5">
                                <span className="p-1 rounded bg-slate-100">ℹ️</span> Changes apply after you save
                            </p>
                            <Button variant="ghost" onClick={handleReset} className="h-9 text-sm text-slate-500 hover:text-slate-800 rounded-xl">
                                <RotateCcw className="h-4 w-4 mr-1.5" />Reset
                            </Button>
                            {activeTab === 'homepage' && (
                                <Button variant="outline" onClick={() => window.open('http://rnt.local:3000', '_blank')} className="h-9 text-sm rounded-xl border-slate-200">
                                    <ExternalLink className="h-4 w-4 mr-1.5" />Preview
                                </Button>
                            )}
                            <Button onClick={handleSave} disabled={hpSaving || pageSaving} className="h-9 text-sm text-white font-bold rounded-xl px-5" style={{ background: 'var(--primary)' }}>
                                <Save className="h-4 w-4 mr-1.5" />
                                {(hpSaving || pageSaving) ? 'Saving…' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
