'use client'

import React, { useState, useEffect, useRef } from 'react';
import { cn, decodeHtmlEntities } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { themes } from '@/lib/themes';
import { useTheme } from '@/context/ThemeContext';
import {
    Check, Palette, Sparkles, Wand2, Eye, Save, ExternalLink,
    RefreshCw, Upload, Link as LinkIcon, Home, Map as MapIcon, Package,
    ClipboardList, ShoppingCart, Sliders, RotateCcw, Bell, X, ArrowLeft,
    Plane, Globe, Users, Clock, Shield, Star, Heart, Camera,
    Car, Hotel, Compass, Sun, Mountain, Waves, Umbrella, Gift,
    Award, Zap, CheckCircle, Headphones, Wallet, Coffee, Luggage,
    Ticket, Navigation, Flag, Search, CheckCircle2, Info, ArrowRight,
    Trees, Palmtree, MapPin, Mail, Moon, CreditCard, Phone,
    Trash2, ArrowUp, ArrowDown, Plus, ChevronDown, ChevronUp, Copy, GripVertical,
    Sunrise, Sunset, Bold, MessageSquare, ShieldCheck, Calendar, Lock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { compressImage } from '@/lib/image-upload-utils';
import { API_URL, uploadFileToS3 } from '@/lib/api';
import RichTextEditor from '@/components/agent/RichTextEditor';

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
        textColor: ''
    },
    buttonStyle: {
        bgColor: '',
        textColor: '',
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
    primaryBtnText: string; secondaryBtnText: string; enquiryBtnText: string;
    backgroundImageUrl: string;
    navbar_logo_image: string;
    favicon_url?: string;
    showAISearch: boolean;
    aiSearchBtnText: string;
    aiSearchTagline: string;
    agency_name?: string;
    favicon?: string;
}
const DEFAULT_HOMEPAGE: HomepageSettings = {
    headline1: 'Adventure Awaits—', headline2: 'Tailored Just for You',
    subheading: 'Plan, customize, and book your dream trip effortlessly with AI-powered suggestions.',
    primaryBtnText: 'Start Your Journey', secondaryBtnText: 'See Sample Itinerary',
    enquiryBtnText: 'Enquiry',
    backgroundImageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop',
    navbar_logo_image: 'https://toursaas.s3.us-east-1.amazonaws.com/logo.png',
    favicon_url: '',
    showAISearch: true,
    aiSearchBtnText: 'Try AI Search',
    aiSearchTagline: '— just describe your dream trip'
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
    full_day_label: string;
    half_day_label: string;
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

    // My Booking Customization
    priority_support_phone: string;
    priority_support_email: string;
    payment_summary_title: string;
    payment_summary_base_cost_label: string;
    payment_summary_taxes_label: string;
    payment_summary_total_label: string;
    payment_summary_support_text: string;

    // All Destinations (Plan Trip) Customization
    plan_trip_page_title: string;
    plan_trip_search_placeholder: string;
    plan_trip_primary_btn_text: string;
    plan_trip_secondary_btn_text: string;
    plan_trip_price_label: string;
    plan_trip_empty_state_message: string;

    // Design System (Missing fields causing TS errors)
    buttonStyle?: {
        bgColor?: string;
        textColor?: string;
        borderRadius?: string;
    };
    navbarSettings?: {
        bgColor?: string;
        textColor?: string;
    };
    activeTheme?: string;
    primaryColor?: string;
    secondaryColor?: string;
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
    full_day_label: 'Full Day',
    half_day_label: 'Half Day',
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
    itinerary_wcu_cards: [...DEFAULT_WCU_CARDS].slice(0, 3),

    // My Booking Customization
    priority_support_phone: '+91 1800-123-4567',
    priority_support_email: 'support@toursaas.com',
    payment_summary_title: 'Payment Summary',
    payment_summary_base_cost_label: 'Package Base Cost',
    payment_summary_taxes_label: 'Taxes & Service Fees',
    payment_summary_total_label: 'Total Investment',
    payment_summary_support_text: '* Estimated refund values are calculated based on your total transaction. The final amount may vary slightly due to gateway rounding.',

    // All Destinations (Plan Trip) Customization
    plan_trip_page_title: 'All Destinations',
    plan_trip_search_placeholder: 'Search destination, package, or activity...',
    plan_trip_primary_btn_text: 'Book Now',
    plan_trip_secondary_btn_text: 'Enquire Now',
    plan_trip_price_label: 'Starting From',
    plan_trip_empty_state_message: 'No packages found',

    // Design System Defaults
    buttonStyle: {
        bgColor: '',
        textColor: '',
        borderRadius: '0.75rem'
    },
    navbarSettings: {
        bgColor: '',
        textColor: ''
    },
    activeTheme: 'default',
    primaryColor: '',
    secondaryColor: ''
};

// ─── Website Pages Builder Types ──────────────────────────────────────────────
export type BlockType = 'hero' | 'text' | 'image' | 'image_text' | 'team' | 'stats' | 'contact_info' | 'contact_form' | 'divider' | 'gallery' | 'faq' | 'map';

export interface ContentBlock {
    id: string;
    type: BlockType;
    fields: Record<string, any>;
}

export interface PageBuilderConfig {
    enabled: boolean;
    blocks: ContentBlock[];
}

export interface WebsitePagesConfig {
    global_design: {
        font_family: string;
        primary_color: string;
        background_color: string;
        text_color: string;
        button_style: 'rounded' | 'pill' | 'square';
    };
    about_page: PageBuilderConfig;
    contact_page: PageBuilderConfig;
}

const DEFAULT_WEBSITE_PAGES: WebsitePagesConfig = {
    global_design: {
        font_family: 'Inter',
        primary_color: '#3B82F6',
        background_color: '#FFFFFF',
        text_color: '#1F2937',
        button_style: 'rounded'
    },
    about_page: {
        enabled: true,
        blocks: []
    },
    contact_page: {
        enabled: true,
        blocks: []
    }
};

const BLOCK_TEMPLATES: Record<BlockType, any> = {
    hero: { title: 'Adventure Awaits', subtitle: 'Explore the world with us', btnText: 'Learn More', imageUrl: '', bgOpacity: 50, overlayColor: '#000000' },
    text: { title: 'Heading', content: 'Enter your text here...' },
    image: { imageUrl: '', alt: 'Image', width: 'full', alignment: 'center' },
    image_text: { title: 'Heading', content: 'Text here...', imageUrl: '', layout: 'left' },
    team: { title: 'Our Team', members: [{ name: 'John Doe', role: 'Founder', bio: '', imageUrl: '' }] },
    stats: { stats: [{ label: 'Happy Customers', value: '10,000+', icon: 'Users' }] },
    contact_info: { title: 'Get in Touch', address: '', phone: '', email: '', whatsapp: '', hours: '' },
    contact_form: { title: 'Send us a message', subtitle: 'We will get back to you shortly', btnText: 'Send Message', showName: false, showEmail: true, showPhone: false, showMessage: false },
    divider: { style: 'solid', color: '#E2E8F0', thickness: 1 },
    gallery: { title: 'Our Moments', columns: 3, images: [] },
    faq: { title: 'Frequently Asked Questions', questions: [{ question: 'What is your cancellation policy?', answer: 'We offer full refunds...' }] },
    map: { mapUrl: '' }
};

// ─── Tab Definitions ─────────────────────────────────────────────────────────
const TABS = [
    { id: 'theme', icon: <Palette className="h-4 w-4" />, label: 'Theme', count: 2 },
    { id: 'homepage', icon: <Home className="h-4 w-4" />, label: 'Homepage', count: 3 },
    { id: 'plantrip', icon: <MapIcon className="h-4 w-4" />, label: 'Plan Trip', count: 3 },
    { id: 'itinerary', icon: <ClipboardList className="h-4 w-4" />, label: 'Itinerary', count: 4 },
    { id: 'cart', icon: <ShoppingCart className="h-4 w-4" />, label: 'Cart', count: 3 },
    { id: 'mybooking', icon: <Ticket className="h-4 w-4" />, label: 'My Booking', count: 2 },
    { id: 'website_pages', icon: <Globe className="h-4 w-4" />, label: 'Website Pages', count: 2 },
    { id: 'uistyle', icon: <Sliders className="h-4 w-4" />, label: 'UI Style', count: 5 },
] as const;
type TabId = typeof TABS[number]['id'];

// ─── Toggle Helper ─────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-black">{label}</span>
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
                    <div><CardTitle className="text-base font-bold text-black">{title}</CardTitle><CardDescription className="text-xs text-black font-semibold">{subtitle}</CardDescription></div>
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
    const [fontColor, setFontColor] = useState('var(--color-primary-font)');
    const [buttonTextColor, setButtonTextColor] = useState('#ffffff');

    // Homepage state
    const [hpSettings, setHpSettings] = useState<HomepageSettings>(DEFAULT_HOMEPAGE);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [imageUrlDraft, setImageUrlDraft] = useState('');
    const [showLogoUrlInput, setShowLogoUrlInput] = useState(false);
    const [logoUrlDraft, setLogoUrlDraft] = useState('');
    const [showFaviconUrlInput, setShowFaviconUrlInput] = useState(false);
    const [faviconUrlDraft, setFaviconUrlDraft] = useState('');
    const [hpSaving, setHpSaving] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [faviconUploading, setFaviconUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const logoRef = useRef<HTMLInputElement>(null);
    const faviconRef = useRef<HTMLInputElement>(null);

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

    const getSelectedFontFamily = (value: string) => {
        switch (value) {
            case 'var(--font-inter)': return "'DM Sans', sans-serif";
            case 'var(--font-playfair)': return "'Playfair Display', serif";
            case 'var(--font-mono)': return "'Courier New', monospace";
            case 'var(--font-script)': return "'Dancing Script', cursive";
            case 'var(--font-rounded)': return "'Nunito', sans-serif";
            default: return "sans-serif";
        }
    };

    const updateCard = (idx: number, field: keyof FeatureCard, value: any) =>
        setFeatureCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
    const updateWcuCard = (idx: number, field: keyof FeatureCard, value: any) =>
        setWcuCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
    const updateCardStyle = (field: keyof CardAppearance, value: any) =>
        setCardAppearance(prev => ({ ...prev, [field]: value }));

    const getCardMockStyle = (appearance: CardAppearance) => {
        const style: React.CSSProperties = {};
        
        // Background style
        if (appearance.background === 'pure-white') {
            style.background = '#ffffff';
        } else if (appearance.background === 'transparent') {
            style.background = 'transparent';
        } else if (appearance.background === 'tinted') {
            style.background = 'var(--primary-soft)';
        } else if (appearance.background === 'glass') {
            style.background = 'rgba(255, 255, 255, 0.4)';
            style.backdropFilter = 'blur(12px)';
            style.WebkitBackdropFilter = 'blur(12px)';
        } else { // soft-white or default
            style.background = 'rgba(255, 255, 255, 0.75)';
            style.backdropFilter = 'blur(8px)';
            style.WebkitBackdropFilter = 'blur(8px)';
        }

        // Border style
        if (appearance.border === 'primary') {
            style.border = '1px solid var(--primary)';
        } else if (appearance.border === 'subtle') {
            style.border = '1px solid rgba(0, 0, 0, 0.05)';
        } else if (appearance.border === 'top-accent') {
            style.border = '1px solid transparent';
            style.borderTop = '3px solid var(--primary)';
        } else if (appearance.border === 'glow') {
            style.border = '1px solid transparent';
            style.boxShadow = '0 0 12px var(--primary-glow)';
        } else { // none
            style.border = '1px solid transparent';
        }

        return style;
    };

    const getCardHoverClass = (hover: CardAppearance['hover']) => {
        switch (hover) {
            case 'lift': return 'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg';
            case 'glow': return 'transition-all duration-300 hover:shadow-[0_0_15px_var(--primary-glow)]';
            case 'scale': return 'transition-all duration-300 hover:scale-105';
            case 'border': return 'transition-all duration-300 hover:border-[var(--primary)]';
            default: return 'transition-all duration-300';
        }
    };

    const getTitleColorStyle = (titleColor: CardAppearance['titleColor']) => {
        switch (titleColor) {
            case 'primary': return 'text-[var(--primary)]';
            case 'gradient': return 'text-transparent bg-clip-text bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-mid)]';
            default: return 'text-black'; // dark
        }
    };

    const getIconContainerStyle = (appearance: CardAppearance) => {
        let classes = 'flex items-center justify-center shrink-0 ';
        let styles: React.CSSProperties = {};

        switch (appearance.iconStyle) {
            case 'filled-circle':
                classes += 'rounded-full';
                styles.backgroundColor = 'var(--primary)';
                break;
            case 'outlined-circle':
                classes += 'border-2 rounded-full bg-transparent';
                styles.borderColor = 'var(--primary)';
                break;
            case 'rounded-square':
                classes += 'rounded-xl';
                styles.backgroundColor = 'var(--primary-soft)';
                break;
            case 'gradient-circle':
                classes += 'rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-mid)]';
                break;
            case 'soft-tinted':
                classes += 'rounded-full';
                styles.backgroundColor = 'var(--primary-soft)';
                break;
            default:
                classes += 'rounded-full bg-slate-100';
        }

        return { className: classes, style: styles };
    };

    const getIconCmpStyle = (appearance: CardAppearance) => {
        let classes = 'h-4 w-4 ';
        let styles: React.CSSProperties = {};

        if (appearance.iconColor === 'custom') {
            styles.color = appearance.customIconColor;
        } else if (appearance.iconStyle === 'filled-circle' || appearance.iconStyle === 'gradient-circle') {
            classes += 'text-black';
        } else {
            classes += 'text-[var(--primary)]';
        }

        return { className: classes, style: styles };
    };

    // Page settings state
    const [pageSettings, setPageSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
    const [pageSaving, setPageSaving] = useState(false);
    const [mockActiveTab, setMockActiveTab] = useState<'summary' | 'support'>('summary');

    // Website Pages state
    const [websitePages, setWebsitePages] = useState<WebsitePagesConfig>(DEFAULT_WEBSITE_PAGES);
    const [websiteSaving, setWebsiteSaving] = useState(false);
    const [activePageTab, setActivePageTab] = useState<'about' | 'contact'>('about');
    const [lowestPackageSlug, setLowestPackageSlug] = useState<string | null>(null);
    const [latestBookingId, setLatestBookingId] = useState<string | null>(null);
    const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

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

    const saveUiStyle = (updates: Partial<{ buttonShape: string; iconStyle: string; cardStyle: string; density: string; fontPairing: string; font_family: string; font_color: string, buttonTextColor: string }>) => {
        const next = {
            buttonShape: updates.buttonShape ?? buttonShape,
            iconStyle: updates.iconStyle ?? iconStyle,
            cardStyle: updates.cardStyle ?? cardStyle,
            density: updates.density ?? density,
            fontPairing: updates.fontPairing ?? fontPairing,
            font_family: updates.font_family ?? fontFamily,
            font_color: updates.font_color ?? fontColor,
            buttonTextColor: updates.buttonTextColor ?? buttonTextColor,
        };
        if (updates.buttonShape !== undefined) setButtonShape(updates.buttonShape);
        if (updates.iconStyle !== undefined) setIconStyle(updates.iconStyle);
        if (updates.cardStyle !== undefined) setCardStyle(updates.cardStyle);
        if (updates.density !== undefined) setDensity(updates.density);
        if (updates.fontPairing !== undefined) setFontPairing(updates.fontPairing);
        if (updates.font_family !== undefined) setFontFamily(updates.font_family);
        if (updates.font_color !== undefined) setFontColor(updates.font_color);
        if (updates.buttonTextColor !== undefined) setButtonTextColor(updates.buttonTextColor);

        applyBodyClasses(next.buttonShape, next.iconStyle, next.cardStyle, next.density, next.fontPairing);

        // Apply font variables immediately to root for preview
        const root = document.documentElement;
        if (next.font_family) {
            root.style.setProperty('--font-family', next.font_family);
            root.style.setProperty('--font-primary', next.font_family);
            root.style.setProperty('--project-font-family', next.font_family);
        }
        if (next.font_color) root.style.setProperty('--color-primary-font', next.font_color);
        if (next.buttonTextColor) root.style.setProperty('--button-text-color', next.buttonTextColor);

        try {
            localStorage.setItem(UI_STYLE_KEY, JSON.stringify(next));
        } catch (e) {
            console.error('UI style localStorage quota exceeded:', e);
        }
    };

    const wpField = (page: 'about' | 'contact', field: string, value: any) => {
        setWebsitePages(prev => ({
            ...prev,
            [`${page}_page`]: {
                ...(prev as any)[`${page}_page`],
                [field]: value
            }
        }));
    };

    const wpGlobal = (field: keyof WebsitePagesConfig['global_design'], value: any) => {
        setWebsitePages(prev => ({
            ...prev,
            global_design: {
                ...prev.global_design,
                [field]: value
            }
        }));
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
                setFontColor(u.font_color || 'var(--color-primary-font)');
                setButtonTextColor(u.buttonTextColor || '#ffffff');
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
                    if (data.website_pages_config) {
                        setWebsitePages(prev => ({ ...prev, ...data.website_pages_config }));
                    }
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
                                    bgColor: hs.navbarSettings?.bgColor || '',
                                    textColor: hs.navbarSettings?.textColor || ''
                                },
                                buttonStyle: {
                                    bgColor: hs.buttonStyle?.bgColor || '',
                                    textColor: hs.buttonStyle?.textColor || '',
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

                // Fetch packages to find the lowest priced one for preview
                const packagesRes = await fetch(`${API_URL}/api/v1/agent/packages?limit=100`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (packagesRes.ok) {
                    const packagesData = await packagesRes.json();
                    if (packagesData.items && packagesData.items.length > 0) {
                        // Filter for published packages first if possible, or just all owned packages
                        const publishedPkgs = packagesData.items.filter((p: any) => p.status === 'PUBLISHED' || p.status === 'published');
                        const targetPkgs = publishedPkgs.length > 0 ? publishedPkgs : packagesData.items;
                        
                        const lowestPricePkg = targetPkgs.reduce((prev: any, curr: any) => 
                            (prev.price_per_person < curr.price_per_person) ? prev : curr
                        );
                        setLowestPackageSlug(lowestPricePkg.slug);
                    }
                }

                // Fetch latest booking for preview
                const bookingsRes = await fetch(`${API_URL}/api/v1/agent/bookings?limit=1`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (bookingsRes.ok) {
                    const bookingsData = await bookingsRes.json();
                    if (bookingsData.items && bookingsData.items.length > 0) {
                        setLatestBookingId(bookingsData.items[0].id);
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
    const hexToRgba = (hex: string, alpha: number) => {
        if (!hex || hex.length < 7) return `rgba(0,0,0,${alpha})`;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const lightenHex = (hex: string, amount: number) => {
        if (!hex || hex.length < 7) return hex;
        let r_ = parseInt(hex.slice(1, 3), 16);
        let g_ = parseInt(hex.slice(3, 5), 16);
        let b_ = parseInt(hex.slice(5, 7), 16);
        r_ = Math.min(255, Math.floor(r_ + (255 - r_) * amount));
        g_ = Math.min(255, Math.floor(g_ + (255 - g_) * amount));
        b_ = Math.min(255, Math.floor(b_ + (255 - b_) * amount));
        const getHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${getHex(r_)}${getHex(g_)}${getHex(b_)}`;
    };

    const handleApplyCustomTheme = async () => {
        const root = document.documentElement;
        const glassColor = customColors.secondary + '20'; // Standardize glass color

        root.style.setProperty('--primary', customColors.primary);
        root.style.setProperty('--primary-light', customColors.secondary);
        root.style.setProperty('--button-text-color', customColors.buttonStyle.textColor);
        root.style.setProperty('--button-bg', customColors.buttonStyle.bgColor || customColors.primary);
        root.style.setProperty('--button-bg-light', lightenHex(customColors.buttonStyle.bgColor || customColors.primary, 0.2));
        root.style.setProperty('--button-glow', hexToRgba(customColors.buttonStyle.bgColor || customColors.primary, 0.25));
        root.style.setProperty('--button-radius', customColors.buttonStyle.borderRadius);
        root.style.setProperty('--primary-soft', customColors.glass);
        root.style.setProperty('--primary-glow', hexToRgba(customColors.primary, 0.25));
        root.style.setProperty('--gradient-start', customColors.primary);
        root.style.setProperty('--gradient-mid', customColors.secondary);
        root.style.setProperty('--gradient-end', customColors.glass);

        try {
            localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(customColors));
            localStorage.setItem('app-theme', 'custom');
        } catch (e) {
            console.error('Custom theme localStorage quota exceeded:', e);
        }
        setActiveTheme('custom');

        // Sync to pageSettings so "Save Changes" works too
        setPageSettings(prev => ({
            ...prev,
            primary_color: customColors.primary,
            secondary_color: customColors.secondary,
            buttonStyle: customColors.buttonStyle,
            navbarSettings: customColors.navbarSettings,
            bg_color: customColors.bg_color,
            accent_color: customColors.accent_color
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
                try {
                    localStorage.setItem('agentTheme', JSON.stringify(data.settings));
                } catch (e) {
                    console.error('agentTheme localStorage quota exceeded:', e);
                }
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

        // Restrict image size to 5MB
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        setImageUploading(true);
        const toastId = toast.loading('Optimizing and uploading background image...');
        try {
            // Compress then upload via backend proxy (avoids S3 CORS issues)
            const compressedFile = await compressImage(file, {
                maxWidthOrHeight: 1920,
                initialQuality: 0.8
            });

            const finalUrl = await uploadFileToS3(compressedFile, 'homepage');
            if (!finalUrl) throw new Error('Upload failed. Please try again.');

            hpField('backgroundImageUrl', finalUrl);
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

        // Restrict image size to 5MB
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Logo image size must be less than 5MB');
            return;
        }

        setLogoUploading(true);
        const toastId = toast.loading('Optimizing and uploading logo...');

        try {
            // Compress then upload via backend proxy (avoids S3 CORS issues)
            const compressedFile = await compressImage(file, {
                maxWidthOrHeight: 800,
                initialQuality: 0.8
            });

            const finalUrl = await uploadFileToS3(compressedFile, 'logos');
            if (!finalUrl) throw new Error('Logo upload failed. Please try again.');

            hpField('navbar_logo_image', finalUrl);
            toast.success('Logo updated successfully ✓', { id: toastId });
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Logo upload failed', { id: toastId });
        } finally {
            setLogoUploading(false);
            if (logoRef.current) logoRef.current.value = '';
        }
    };

    const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Restrict image size to 5MB
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Favicon size must be less than 5MB');
            return;
        }

        setFaviconUploading(true);
        const toastId = toast.loading('Optimizing and uploading favicon...');

        try {
            // Compress then upload via backend proxy (avoids S3 CORS issues)
            const compressedFile = await compressImage(file, {
                maxWidthOrHeight: 128,
                initialQuality: 0.9
            });

            const finalUrl = await uploadFileToS3(compressedFile, 'favicons');
            if (!finalUrl) throw new Error('Favicon upload failed. Please try again.');

            hpField('favicon_url', finalUrl);
            toast.success('Favicon updated successfully ✓', { id: toastId });
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Favicon upload failed', { id: toastId });
        } finally {
            setFaviconUploading(false);
            if (faviconRef.current) faviconRef.current.value = '';
        }
    };

    const handleApplyImageUrl = () => { if (imageUrlDraft.trim()) { hpField('backgroundImageUrl', imageUrlDraft.trim()); setShowUrlInput(false); setImageUrlDraft(''); } };
    const handleApplyLogoUrl = () => { if (logoUrlDraft.trim()) { hpField('navbar_logo_image', logoUrlDraft.trim()); setShowLogoUrlInput(false); setLogoUrlDraft(''); } };
    const handleApplyFaviconUrl = () => { if (faviconUrlDraft.trim()) { hpField('favicon_url', faviconUrlDraft.trim()); setShowFaviconUrlInput(false); setFaviconUrlDraft(''); } };
    const handleSaveHomepage = async () => {
        setHpSaving(true);
        const heroData = {
            headline1: hpSettings.headline1.trim() || DEFAULT_HOMEPAGE.headline1,
            headline2: hpSettings.headline2.trim() || DEFAULT_HOMEPAGE.headline2,
            subheading: hpSettings.subheading.trim() || DEFAULT_HOMEPAGE.subheading,
            primaryBtnText: hpSettings.primaryBtnText.trim() || DEFAULT_HOMEPAGE.primaryBtnText,
            secondaryBtnText: hpSettings.secondaryBtnText.trim() || DEFAULT_HOMEPAGE.secondaryBtnText,
            enquiryBtnText: hpSettings.enquiryBtnText?.trim() || DEFAULT_HOMEPAGE.enquiryBtnText,
            backgroundImageUrl: hpSettings.backgroundImageUrl || DEFAULT_HOMEPAGE.backgroundImageUrl,
            navbar_logo_image: hpSettings.navbar_logo_image || DEFAULT_HOMEPAGE.navbar_logo_image,
            favicon_url: hpSettings.favicon_url || DEFAULT_HOMEPAGE.favicon_url,
            showAISearch: hpSettings.showAISearch,
            aiSearchBtnText: hpSettings.aiSearchBtnText?.trim() || DEFAULT_HOMEPAGE.aiSearchBtnText,
            aiSearchTagline: hpSettings.aiSearchTagline?.trim() || DEFAULT_HOMEPAGE.aiSearchTagline,
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
        try {
            localStorage.setItem(HOMEPAGE_SETTINGS_KEY, JSON.stringify(heroData));
            localStorage.setItem(HOMEPAGE_CARDS_KEY, JSON.stringify(featureCards));
            localStorage.setItem(HOMEPAGE_WCU_KEY, JSON.stringify(wcuCards));
            localStorage.setItem(HOMEPAGE_CARD_STYLE_KEY, JSON.stringify(cardAppearance));
        } catch (e) {
            console.error('Homepage settings localStorage quota exceeded:', e);
        }

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
    const handleSaveWebsitePages = async () => {
        setWebsiteSaving(true);
        try {
            const token = localStorage.getItem('token') || '';
            const res = await fetch(`${API_URL}/api/v1/agent/settings/website-pages`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(websitePages)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Save failed' }));
                throw new Error(err.detail || 'Save failed');
            }
            toast.success('Website pages saved successfully!', { position: 'bottom-right' });
        } catch (err: any) {
            toast.error(`Failed to save website pages: ${err.message}`);
        } finally {
            setWebsiteSaving(false);
        }
    };

    const handleResetHomepage = () => { setHpSettings(DEFAULT_HOMEPAGE); localStorage.removeItem(HOMEPAGE_SETTINGS_KEY); toast.info('Reset to defaults', { position: 'bottom-right' }); };

    // Page settings handler
    const pgField = (field: keyof PageSettings, value: any) => setPageSettings(prev => ({ ...prev, [field]: value }));
    const handleSavePageSettings = async () => {
        setPageSaving(true);
        try {
            localStorage.setItem(PAGE_SETTINGS_KEY, JSON.stringify(pageSettings));
        } catch (e) {
            console.error('LocalStorage quota exceeded:', e);

            // Attempt to clear non-essential temporary data
            const keysToRemove = [
                'ai_itinerary_data', 'ai_highlights', 'ai_inclusions', 'ai_exclusions',
                'ai_generated_package', 'ai_package_search_id'
            ];
            keysToRemove.forEach(k => localStorage.removeItem(k));

            // Try saving again after cleanup
            try {
                localStorage.setItem(PAGE_SETTINGS_KEY, JSON.stringify(pageSettings));
            } catch (innerE) {
                console.warn('LocalStorage still full after cleanup. Continuing to cloud save only.');
            }
        }

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
                font_color: fontColor,
                buttonStyle: {
                    ...pageSettings.buttonStyle,
                    bgColor: customColors.buttonStyle.bgColor || pageSettings.buttonStyle?.bgColor || '',
                    textColor: buttonTextColor || '',
                    borderRadius: customColors.buttonStyle.borderRadius || pageSettings.buttonStyle?.borderRadius || '0.75rem'
                },
                navbarSettings: {
                    ...pageSettings.navbarSettings,
                    bgColor: customColors.navbarSettings.bgColor || pageSettings.navbarSettings?.bgColor || '',
                    textColor: customColors.navbarSettings.textColor || pageSettings.navbarSettings?.textColor || ''
                }
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
            toast.success(activeTab === 'uistyle' ? 'UI style updated!' : 'Settings saved to cloud!', { position: 'bottom-right' });
        } catch (err: any) {
            toast.error(`Cloud save failed: ${err.message}. Saved locally only.`);
        } finally {
            setPageSaving(false);
        }
    };
    const handleResetPageSettings = () => { setPageSettings(DEFAULT_PAGE_SETTINGS); localStorage.removeItem(PAGE_SETTINGS_KEY); toast.info('Reset to defaults', { position: 'bottom-right' }); };

    // ── Render Tabs ────────────────────────────────────────────────────────────
    const renderThemeTab = () => {
        return (
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
                                <p className="text-xs font-bold text-[var(--color-primary-font)] capitalize">{t.name || key}</p>
                            </button>
                        ))}
                        <button onClick={() => setShowCustomEditor(!showCustomEditor)}
                            className={`p-3 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${showCustomEditor || isCustomActive ? 'border-[var(--primary)] shadow-lg' : 'border-dashed border-slate-300 bg-white hover:border-slate-400'}`}>
                            <Wand2 className="h-4 w-4 text-[var(--primary)]" />
                            <p className="text-xs font-bold text-[var(--color-primary-font)]">Custom</p>
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
                                        <div><p className="text-sm font-bold text-black">{label}</p><p className="text-xs text-black/70">{desc}</p></div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-black/70 uppercase">{currentVal || (isText ? '' : 'Auto')}</span>
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
                                <Button onClick={handleApplyCustomTheme} className="flex-1 h-10 text-black font-bold rounded-xl" style={{ background: `linear-gradient(135deg, ${previewColors.primary}, ${previewColors.secondary})` }}>
                                    <Wand2 className="h-4 w-4 mr-2" />Apply Theme
                                </Button>
                                <Button onClick={handleRestoreDefault} variant="outline" className="h-10 rounded-xl text-black">
                                    <RotateCcw className="h-4 w-4 mr-1" />Reset
                                </Button>
                            </div>
                        </div>
                        {/* Live preview */}
                        <div className="rounded-2xl p-4 text-black overflow-hidden mt-2" style={{ background: `linear-gradient(135deg, ${previewColors.primary}, ${previewColors.secondary})` }}>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Preview</p>
                            <p className="text-lg font-extrabold text-black">Agent Portal</p>
                            <div className="flex gap-2 mt-3 flex-wrap">
                                <button className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 border border-white/30 text-black">Primary</button>
                                <button className="px-4 py-1.5 rounded-full text-xs font-bold border-2 border-black text-black bg-transparent">Outline</button>
                                <span className="px-3 py-1 rounded-full text-xs font-bold text-black" style={{ background: hexToRgba(previewColors.glass, 0.3) }}>Badge</span>
                            </div>
                        </div>
                    </SectionCard>
                )}
            </div>
        );
    };

    const renderHomepageTab = () => {
        const renderIconPicker = (type: 'feature' | 'wcu') => {
            if (!iconPickerOpen || iconPickerOpen.type !== type) return null;
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setIconPickerOpen(null)}>
                    <div className="rounded-2xl p-5 max-w-sm w-full shadow-2xl" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-bold text-black">Choose an Icon</p>
                            <button onClick={() => setIconPickerOpen(null)} className="p-1 rounded-lg hover:bg-slate-100"><X className="h-4 w-4 text-black/70" /></button>
                        </div>
                        <Input placeholder="Search icons…" value={iconSearch} onChange={e => setIconSearch(e.target.value)} className="h-9 rounded-xl mb-3 glass-input" />
                        <div className="grid grid-cols-6 gap-1.5 max-h-56 overflow-y-auto">
                            {ICON_OPTIONS.filter(n => n.toLowerCase().includes(iconSearch.toLowerCase())).map(name => {
                                const IconC = ICON_MAP[name] || Sparkles;
                                const isWcu = type === 'wcu';
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
            );
        };

        return (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:h-[calc(100vh-180px)] lg:overflow-hidden pb-20 lg:pb-0">
                <div className="space-y-5 order-2 lg:order-1 lg:overflow-y-auto lg:pr-4 custom-scrollbar lg:h-full">
                    <SectionCard icon={<Home className="h-5 w-5" />} title="Hero Content" subtitle="Customize the hero text, buttons, and AI search features">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1"><Label className="text-xs font-bold text-black">Headline Line 1 <span className="font-normal text-black/80">({hpSettings.headline1.length}/40)</span></Label><Input maxLength={40} value={hpSettings.headline1} onChange={e => hpField('headline1', e.target.value)} placeholder="Adventure Awaits—" className="h-10 rounded-xl glass-input" /></div>
                            <div className="space-y-1"><Label className="text-xs font-bold text-black">Headline Line 2 <span className="font-normal text-black/80">({hpSettings.headline2.length}/40)</span></Label><Input maxLength={40} value={hpSettings.headline2} onChange={e => hpField('headline2', e.target.value)} placeholder="Tailored Just for You" className="h-10 rounded-xl glass-input" /></div>
                        </div>
                        <div className="space-y-1 mt-3"><Label className="text-xs font-bold text-black">Subheading <span className="font-normal text-black/80">({hpSettings.subheading.length}/160)</span></Label><Textarea maxLength={160} value={hpSettings.subheading} onChange={e => hpField('subheading', e.target.value)} className="rounded-xl glass-input resize-none min-h-[72px]" /></div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                            <div className="space-y-1"><Label className="text-xs font-bold text-black">Primary Button</Label><Input maxLength={25} value={hpSettings.primaryBtnText} onChange={e => hpField('primaryBtnText', e.target.value)} className="h-10 rounded-xl glass-input text-xs" /></div>
                            <div className="space-y-1"><Label className="text-xs font-bold text-black">Secondary Button</Label><Input maxLength={25} value={hpSettings.secondaryBtnText} onChange={e => hpField('secondaryBtnText', e.target.value)} className="h-10 rounded-xl glass-input text-xs" /></div>
                            <div className="space-y-1"><Label className="text-xs font-bold text-black">Enquiry Button</Label><Input maxLength={25} value={hpSettings.enquiryBtnText || 'Enquiry'} onChange={e => hpField('enquiryBtnText', e.target.value)} className="h-10 rounded-xl glass-input text-xs" /></div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-black">Show AI Search button</Label>
                                    <p className="text-[10px] text-black/40 font-medium">Toggle the visibility of the AI search feature in hero</p>
                                </div>
                                <ToggleSwitch checked={hpSettings.showAISearch} onChange={v => hpField('showAISearch', v)} label="" />
                            </div>

                            {hpSettings.showAISearch && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-black uppercase tracking-wider">Button Label</Label>
                                        <Input value={hpSettings.aiSearchBtnText} onChange={e => hpField('aiSearchBtnText', e.target.value)} placeholder="Try AI Search" className="h-10 rounded-xl glass-input text-xs" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-black uppercase tracking-wider">Tagline / Helper Text</Label>
                                        <Input value={hpSettings.aiSearchTagline} onChange={e => hpField('aiSearchTagline', e.target.value)} placeholder="— just describe your dream trip" className="h-10 rounded-xl glass-input text-xs" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard icon={<Palette className="h-5 w-5" />} title="Agency Brand Name" subtitle="The official name of your agency displayed across the platform">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-black">Company / Agency Name</Label>
                            <Input
                                value={hpSettings.agency_name || ''}
                                onChange={e => hpField('agency_name', e.target.value)}
                                placeholder="e.g. Dream Travels"
                                className="h-10 rounded-xl glass-input w-full max-w-md"
                            />
                            <p className="text-xs text-black/60 mt-1">This name will appear on the navbar, booking emails, and invoices.</p>
                        </div>
                    </SectionCard>

                    <SectionCard icon={<Shield className="h-5 w-5" />} title="Agency Logo Branding" subtitle="Upload your custom logo to display in the navbar and footers">
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-white/40 border border-white/60">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center">
                                {hpSettings.navbar_logo_image ? (
                                    <img src={hpSettings.navbar_logo_image} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="text-black/30 flex flex-col items-center">
                                        <Plane className="h-8 w-8 mb-1" />
                                        <span className="text-[10px] font-bold">DEFAULT</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-3 w-full">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-black">Agency Logo</h4>
                                    <p className="text-xs text-black/60">Recommended size: 200x200px or higher. PNG with transparency preferred.</p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Button variant="outline" onClick={() => logoRef.current?.click()} disabled={logoUploading} className="h-9 rounded-xl text-sm border-slate-200 text-black/70 bg-white">
                                        {logoUploading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin text-black" /> : <Upload className="h-4 w-4 mr-1.5 text-black" />}
                                        {logoUploading ? 'Uploading…' : 'Upload Logo'}
                                    </Button>
                                    <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
                                    <Button variant="outline" onClick={() => setShowLogoUrlInput(!showLogoUrlInput)} className="h-9 rounded-xl text-sm border-slate-200 text-black/70 bg-white"><LinkIcon className="h-4 w-4 mr-1.5 text-black" />Use URL</Button>
                                    {hpSettings.navbar_logo_image !== DEFAULT_HOMEPAGE.navbar_logo_image && (
                                        <Button variant="ghost" onClick={() => hpField('navbar_logo_image', DEFAULT_HOMEPAGE.navbar_logo_image)} className="h-9 rounded-xl text-xs text-[var(--color-primary-font)]/70 hover:text-red-500">Reset</Button>
                                    )}
                                </div>
                                {showLogoUrlInput && (
                                    <div className="flex gap-2 pt-2 animate-in slide-in-from-top-1 duration-200">
                                        <Input 
                                            value={logoUrlDraft} 
                                            onChange={e => setLogoUrlDraft(e.target.value)} 
                                            placeholder="https://example.com/logo.png" 
                                            className="h-9 rounded-xl glass-input flex-1 text-xs" 
                                            onKeyDown={(e) => e.key === 'Enter' && handleApplyLogoUrl()}
                                        />
                                        <Button onClick={handleApplyLogoUrl} className="h-9 rounded-xl px-4 !text-black font-bold text-xs" style={{ background: 'var(--primary)' }}>Apply</Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Favicon Section */}
                        <div className="mt-6 flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-white/40 border border-white/60">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center">
                                {hpSettings.favicon_url || hpSettings.navbar_logo_image ? (
                                    <img src={hpSettings.favicon_url || hpSettings.navbar_logo_image} alt="Favicon Preview" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="text-black/30 flex flex-col items-center">
                                        <Globe className="h-6 w-6 mb-1" />
                                        <span className="text-[8px] font-bold uppercase">Favicon</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-3 w-full">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-black">Agency Favicon</h4>
                                    <p className="text-xs text-black/60">Recommended size: 32x32px or higher. Square (1:1) ratio is required.</p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Button variant="outline" onClick={() => faviconRef.current?.click()} disabled={faviconUploading} className="h-9 rounded-xl text-sm border-slate-200 text-black/70 bg-white">
                                        {faviconUploading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin text-black" /> : <Upload className="h-4 w-4 mr-1.5 text-black" />}
                                        {faviconUploading ? 'Uploading…' : 'Upload Favicon'}
                                    </Button>
                                    <input ref={faviconRef} type="file" accept="image/x-icon,image/png,image/jpeg,image/webp" className="hidden" onChange={handleFaviconUpload} />
                                    <Button variant="outline" onClick={() => setShowFaviconUrlInput(!showFaviconUrlInput)} className="h-9 rounded-xl text-sm border-slate-200 text-black/70 bg-white"><LinkIcon className="h-4 w-4 mr-1.5 text-black" />Use URL</Button>
                                    {hpSettings.favicon_url && (
                                        <Button variant="ghost" onClick={() => hpField('favicon_url', '')} className="h-9 rounded-xl text-xs text-[var(--color-primary-font)]/70 hover:text-red-500">Reset</Button>
                                    )}
                                </div>
                                {showFaviconUrlInput && (
                                    <div className="flex gap-2 pt-2 animate-in slide-in-from-top-1 duration-200">
                                        <Input 
                                            value={faviconUrlDraft} 
                                            onChange={e => setFaviconUrlDraft(e.target.value)} 
                                            placeholder="https://example.com/favicon.png" 
                                            className="h-9 rounded-xl glass-input flex-1 text-xs" 
                                            onKeyDown={(e) => e.key === 'Enter' && handleApplyFaviconUrl()}
                                        />
                                        <Button onClick={handleApplyFaviconUrl} className="h-9 rounded-xl px-4 !text-black font-bold text-xs" style={{ background: 'var(--primary)' }}>Apply</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard icon={<Eye className="h-5 w-5" />} title="Background Image" subtitle="Set the hero section full-screen background">
                        <div className="relative w-full h-[160px] rounded-2xl overflow-hidden border border-white/40 bg-slate-100">
                            {hpSettings.backgroundImageUrl ? <img src={hpSettings.backgroundImageUrl} alt="Preview" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-black/70 text-sm">No image selected</div>}
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-white/50 text-black text-[10px] rounded backdrop-blur-sm">Preview</div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={imageUploading} className="h-9 rounded-xl text-sm border-slate-200 text-black/70">
                                {imageUploading ? <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin text-black" />Uploading…</> : <><Upload className="h-4 w-4 mr-1.5 text-black" />Upload to S3</>}
                            </Button>
                            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
                            <Button variant="outline" onClick={() => setShowUrlInput(!showUrlInput)} className="h-9 rounded-xl text-sm border-slate-200 text-black/70"><LinkIcon className="h-4 w-4 mr-1.5 text-black" />Use URL</Button>
                        </div>
                        {showUrlInput && (
                            <div className="flex gap-2"><Input value={imageUrlDraft} onChange={e => setImageUrlDraft(e.target.value)} placeholder="https://…" className="h-9 rounded-xl glass-input flex-1" /><Button onClick={handleApplyImageUrl} className="h-9 rounded-xl px-4 !text-black font-bold" style={{ background: 'var(--primary)' }}>Apply</Button></div>
                        )}
                        <div>
                            <p className="text-xs font-bold text-black/60 uppercase tracking-wider mb-2">Quick Presets</p>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {PRESET_IMAGES.map(img => (
                                    <button key={img.label} onClick={() => hpField('backgroundImageUrl', img.url)}
                                        className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${hpSettings.backgroundImageUrl === img.url ? 'border-[var(--primary)] shadow-lg' : 'border-transparent'}`}>
                                        <img src={img.url} alt={img.label} className="w-full h-14 object-cover" />
                                        <div className="absolute inset-0 bg-white/30 flex items-end p-1"><span className="text-black text-[9px] font-bold">{img.label}</span></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </SectionCard>



                    {/* Feature Cards Section */}
                    <SectionCard icon={<span className="text-base">🃏</span>} title="Feature Cards" subtitle="Customize the feature highlight cards shown on your homepage">
                        {renderIconPicker('feature')}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {featureCards.map((card, idx) => {
                                const IconC = getIconCmp(card.icon);
                                return (
                                    <div key={idx} className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)' }}>
                                        {/* Mini live preview */}
                                        <div className="rounded-xl p-3 flex flex-col items-center text-center gap-1.5" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.5)' }}>
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))' }}>
                                                <IconC className="h-5 w-5 text-black" />
                                            </div>
                                            <p className="text-sm font-bold text-black leading-tight">{card.title || 'Card Title'}</p>
                                            <p className="text-xs text-black/60 leading-tight">{card.description || 'Description'}</p>
                                        </div>

                                        {/* Icon picker button */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-black flex-shrink-0" style={{ background: 'var(--primary)' }}>
                                                <IconC className="h-5 w-5" />
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => { setIconPickerOpen({ type: 'feature', idx }); setIconSearch(''); }} className="h-8 rounded-lg text-xs border-slate-200 text-black/70 flex-1">
                                                Change Icon ({card.icon})
                                            </Button>
                                        </div>

                                        {/* Title */}
                                        <div className="space-y-0.5">
                                            <Label className="text-[11px] font-bold text-black/60">Title <span className="font-normal">({card.title.length}/30)</span></Label>
                                            <Input maxLength={30} value={card.title} onChange={e => updateCard(idx, 'title', e.target.value)} className="h-9 rounded-lg glass-input text-sm" />
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-0.5">
                                            <Label className="text-[11px] font-bold text-black/60">Description <span className="font-normal">({card.description.length}/100)</span></Label>
                                            <Textarea maxLength={100} value={card.description} onChange={e => updateCard(idx, 'description', e.target.value)} className="rounded-lg glass-input resize-none min-h-[56px] text-sm" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>

                    {/* Why Choose Us Cards Section */}
                    <SectionCard icon={<span className="text-base">🤝</span>} title="Why Choose Us Cards" subtitle="Customize the 4 cards shown in the 'Why Choose Us' section">
                        {renderIconPicker('wcu')}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {wcuCards.map((card, idx) => {
                                const IconC = getIconCmp(card.icon);
                                return (
                                    <div key={idx} className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)' }}>
                                        {/* Mini live preview */}
                                        <div className="rounded-xl p-3 flex flex-col items-center text-center gap-1.5" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.5)' }}>
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))' }}>
                                                <IconC className="h-5 w-5 text-black" />
                                            </div>
                                            <p className="text-sm font-bold text-black leading-tight">{card.title || 'Card Title'}</p>
                                            <p className="text-xs text-black leading-tight">{card.description || 'Description'}</p>
                                        </div>

                                        {/* Icon picker button */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-black flex-shrink-0" style={{ background: 'var(--primary)' }}>
                                                <IconC className="h-5 w-5" />
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => { setIconPickerOpen({ type: 'wcu', idx }); setIconSearch(''); }} className="h-8 rounded-lg text-xs border-slate-200 text-black flex-1">
                                                Change Icon ({card.icon})
                                            </Button>
                                        </div>

                                        {/* Title */}
                                        <div className="space-y-0.5">
                                            <Label className="text-[11px] font-bold text-black">Title <span className="font-normal">({card.title.length}/30)</span></Label>
                                            <Input maxLength={30} value={card.title} onChange={e => updateWcuCard(idx, 'title', e.target.value)} className="h-9 rounded-lg glass-input text-sm" />
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-0.5">
                                            <Label className="text-[11px] font-bold text-black">Description <span className="font-normal">({card.description.length}/100)</span></Label>
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
                                    <Label className="text-xs font-bold text-black/60 uppercase tracking-wider">Icon Style</Label>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {(['filled-circle', 'outlined-circle', 'rounded-square', 'gradient-circle', 'soft-tinted'] as const).map(s => (
                                            <button key={s} onClick={() => updateCardStyle('iconStyle', s)} className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all min-w-0 ${cardAppearance.iconStyle === s ? 'border-[var(--primary)] bg-[var(--primary-glow)] shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s === 'filled-circle' ? 'bg-orange-500 rounded-full' : s === 'outlined-circle' ? 'border-2 border-orange-500 rounded-full' : s === 'rounded-square' ? 'bg-orange-100 rounded-xl' : s === 'gradient-circle' ? 'bg-gradient-to-br from-orange-400 to-orange-600 rounded-full' : 'bg-orange-50 rounded-full'}`}>
                                                    <Sparkles className={`h-4 w-4 ${s === 'filled-circle' || s === 'gradient-circle' ? 'text-black' : 'text-orange-500'}`} />
                                                </div>
                                                <span className="text-[9px] font-bold text-black/80 capitalize text-center leading-tight truncate w-full">{s.split('-')[0]}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-black/60 uppercase tracking-wider">Card Background</Label>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {(['soft-white', 'glass', 'tinted', 'pure-white', 'transparent'] as const).map(bg => (
                                            <button key={bg} onClick={() => updateCardStyle('background', bg)} className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all min-w-0 ${cardAppearance.background === bg ? 'border-[var(--primary)] bg-[var(--primary-glow)] shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                                <div className={`w-full aspect-square rounded-lg border border-slate-200 shrink-0 ${bg === 'pure-white' ? 'bg-white' : bg === 'tinted' ? 'bg-orange-50' : bg === 'transparent' ? 'bg-transparent border-dashed' : bg === 'glass' ? 'bg-slate-100/50' : 'bg-slate-50'}`} />
                                                <span className="text-[9px] font-bold text-black/80 capitalize text-center leading-tight truncate w-full">{bg.split('-')[0]}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-black/60 uppercase tracking-wider">Card Border & Effect</Label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(['none', 'subtle', 'primary', 'top-accent', 'glow'] as const).map(b => (
                                            <Button key={b} variant={cardAppearance.border === b ? 'default' : 'outline'} size="sm" onClick={() => updateCardStyle('border', b)} className={`h-8 rounded-lg text-[10px] px-2.5 capitalize whitespace-nowrap ${cardAppearance.border === b ? '!text-black font-extrabold' : 'text-black'}`} style={cardAppearance.border === b ? { background: 'var(--primary)' } : {}}>
                                                {b.replace('-', ' ')}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-black/60 uppercase tracking-wider">Title Color</Label>
                                    <div className="flex gap-1.5">
                                        {(['dark', 'primary', 'gradient'] as const).map(c => (
                                            <Button key={c} variant={cardAppearance.titleColor === c ? 'default' : 'outline'} size="sm" onClick={() => updateCardStyle('titleColor', c)} className={`h-8 rounded-lg text-[10px] px-3 capitalize flex-1 whitespace-nowrap ${cardAppearance.titleColor === c ? '!text-black font-extrabold' : 'text-black'}`} style={cardAppearance.titleColor === c ? { background: 'var(--primary)' } : {}}>
                                                {c}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-black/60 uppercase tracking-wider">Layout Direction</Label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {(['top', 'horizontal', 'minimal'] as const).map(l => (
                                            <button key={l} onClick={() => updateCardStyle('layout', l)} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all min-w-0 ${cardAppearance.layout === l ? 'border-[var(--primary)] bg-[var(--primary-glow)] shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                                <div className="w-full h-8 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center relative overflow-hidden shrink-0">
                                                    {l === 'top' && <div className="flex flex-col items-center gap-0.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-400" /><div className="w-5 h-1 rounded-full bg-slate-300" /></div>}
                                                    {l === 'horizontal' && <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-400" /><div className="w-4 h-1 rounded-full bg-slate-300" /></div>}
                                                    {l === 'minimal' && <div className="flex flex-col items-center gap-0.5"><div className="w-6 h-1 rounded-full bg-slate-400" /><div className="w-8 h-1 rounded-full bg-slate-200" /></div>}
                                                </div>
                                                <span className="text-[9px] font-bold text-black capitalize truncate w-full">{l}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>

                {/* Right Column: Instant Preview */}
                <div className="flex flex-col gap-4 order-1 lg:order-2 lg:h-full min-h-0">
                    <div className="flex items-center justify-between px-1 shrink-0">
                        <Label className="text-xs font-black text-black uppercase tracking-[0.1em]">Landing Page Preview</Label>
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            LIVE PREVIEW
                        </div>
                    </div>

                    <div className="flex-1 rounded-[32px] border-2 border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col min-h-0">
                        {/* Mock Browser Header */}
                        <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 shrink-0">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                            </div>
                            <div className="ml-4 flex-1 h-6 bg-white rounded-md border border-slate-200 flex items-center px-3 text-[10px] text-slate-400 overflow-hidden">
                                {typeof window !== 'undefined' ? window.location.origin : 'http://rnt.local:3000'}/
                            </div>
                        </div>

                        {/* Mock Landing Page Content */}
                        <div className="flex-1 overflow-y-auto bg-white min-h-0">
                            {/* Hero Section Mockup */}
                            <section className="relative h-[450px] flex flex-col overflow-hidden">
                                {/* Hero Background */}
                                <div className="absolute inset-0">
                                    <img 
                                        src={hpSettings.backgroundImageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop'} 
                                        className="w-full h-full object-cover" 
                                        alt="Hero" 
                                    />
                                    <div className="absolute inset-0 bg-black/40" />
                                </div>

                                {/* Navbar Mockup */}
                                <nav className="relative z-10 p-4 flex items-center justify-between bg-white/10 backdrop-blur-md">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-white p-1">
                                            <img src={hpSettings.navbar_logo_image} className="w-full h-full object-contain" alt="Logo" />
                                        </div>
                                        <span className="text-white text-xs font-black">{hpSettings.agency_name || 'Agency'}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="h-1 w-4 bg-white/60 rounded-full" />
                                        <div className="h-1 w-4 bg-white/60 rounded-full" />
                                        <div className="h-1 w-4 bg-white/60 rounded-full" />
                                    </div>
                                </nav>

                                {/* Hero Content */}
                                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pt-4">
                                    <h1 className="text-2xl font-black text-white leading-tight mb-2 drop-shadow-lg">
                                        {hpSettings.headline1}<br />
                                        {hpSettings.headline2}
                                    </h1>
                                    <p className="text-[10px] text-white/90 max-w-[280px] mb-6 line-clamp-2">
                                        {hpSettings.subheading}
                                    </p>
                                    
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex gap-2">
                                            <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/40 text-white text-[9px] font-black">
                                                {hpSettings.secondaryBtnText}
                                            </div>
                                            <div className="px-4 py-2 rounded-full bg-orange-500 text-white text-[10px] font-black shadow-lg">
                                                {hpSettings.primaryBtnText}
                                            </div>
                                            <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/40 text-white text-[9px] font-black">
                                                {hpSettings.enquiryBtnText || 'Enquiry'}
                                            </div>
                                        </div>

                                        {hpSettings.showAISearch && (
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white">
                                                <Sparkles className="h-3 w-3" />
                                                <span className="text-[9px] font-bold">{hpSettings.aiSearchBtnText}</span>
                                                <span className="text-[8px] opacity-60 font-medium">{hpSettings.aiSearchTagline}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Feature Cards Mockup */}
                                <div className={cn(
                                    "relative z-10 px-4 -mt-8 pb-4 grid gap-2",
                                    cardAppearance.layout === 'horizontal' ? "grid-cols-1" : "grid-cols-3"
                                )}>
                                    {featureCards.map((card, idx) => {
                                        const IconC = getIconCmp(card.icon);
                                        const isHorizontal = cardAppearance.layout === 'horizontal';
                                        const isMinimal = cardAppearance.layout === 'minimal';
                                        
                                        const cardStyle = getCardMockStyle(cardAppearance);
                                        const hoverClass = getCardHoverClass(cardAppearance.hover);
                                        const titleStyleClass = getTitleColorStyle(cardAppearance.titleColor);
                                        const iconContainer = getIconContainerStyle(cardAppearance);
                                        const iconStyle = getIconCmpStyle(cardAppearance);

                                        return (
                                            <div 
                                                key={idx} 
                                                className={cn(
                                                    "shadow-lg transition-all duration-300", 
                                                    isHorizontal ? "flex items-center text-left gap-2.5 p-3 rounded-xl" : "flex flex-col items-center text-center gap-1.5 p-3 rounded-xl",
                                                    hoverClass
                                                )} 
                                                style={cardStyle}
                                            >
                                                {!isMinimal && (
                                                    <div className={cn("w-8 h-8 flex items-center justify-center shrink-0", iconContainer.className)} style={iconContainer.style}>
                                                        <IconC className={iconStyle.className} style={iconStyle.style} />
                                                    </div>
                                                )}
                                                <div className={cn(isHorizontal ? "flex-1 min-w-0" : "")}>
                                                    <h4 className={cn("text-[9px] font-black leading-tight line-clamp-1", titleStyleClass)}>{card.title}</h4>
                                                    {isHorizontal && <p className="text-[7px] text-black/60 leading-tight mt-0.5 line-clamp-1">{card.description}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Popular Packages Mockup */}
                            <section className="p-6 space-y-4">
                                <div className="flex items-end justify-between">
                                    <div className="space-y-1">
                                        <div className="inline-block px-2 py-0.5 rounded-full border border-orange-200 bg-orange-50 text-orange-500 text-[6px] font-bold uppercase tracking-wider">Discover Your Next Adventure</div>
                                        <h3 className="text-xl font-black text-black tracking-tight">Popular <span className="text-orange-500">Packages</span></h3>
                                    </div>
                                    <div className="text-[8px] font-bold text-orange-500 uppercase flex items-center gap-1">View All <ArrowRight className="h-2 w-2" /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="aspect-[4/5] rounded-xl bg-slate-100 relative overflow-hidden group shadow-sm">
                                            <img src={i === 1 ? "https://images.unsplash.com/photo-1537944536135-1419ef385151?auto=format&fit=crop&q=80&w=400" : i === 2 ? "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80" : "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400"} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                                <div className="px-1.5 py-0.5 rounded-full bg-black text-white text-[5px] font-bold">5D/4N</div>
                                                <div className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[5px] font-bold">₹25000</div>
                                            </div>
                                            <div className="absolute bottom-2 left-2 right-2 text-white">
                                                <div className="text-[5px] font-bold opacity-60 uppercase mb-0.5">Destinations</div>
                                                <div className="text-[8px] font-bold leading-tight line-clamp-1">Tour Title Package</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Popular Destinations Mockup */}
                            <section className="p-6 space-y-4 pt-0">
                                <div className="flex items-end justify-between">
                                    <div className="space-y-1">
                                        <div className="inline-block px-2 py-0.5 rounded-full border border-orange-200 bg-orange-50 text-orange-500 text-[6px] font-bold uppercase tracking-wider">Discover Your Next Adventure</div>
                                        <h3 className="text-xl font-black text-black tracking-tight">Popular <span className="text-orange-500">Destinations</span></h3>
                                    </div>
                                    <div className="text-[8px] font-bold text-orange-500 uppercase flex items-center gap-1">View All <ArrowRight className="h-2 w-2" /></div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="aspect-square rounded-xl bg-slate-100 relative overflow-hidden group shadow-sm">
                                            <img src={`https://images.unsplash.com/photo-${i === 1 ? '1524492412937-b28074a5d7da' : i === 2 ? '1589308078059-be1415eab4c3' : i === 3 ? '1540959733332-eab4deabeeaf' : '1506744038136-46273834b3fb'}?auto=format&fit=crop&q=80&w=200`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                            <div className="absolute bottom-2 left-2 right-2 text-white">
                                                <div className="text-[7px] font-bold leading-tight">City Name</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Why Choose Us Section Mockup */}
                            <section className="p-6 bg-[#FFF3E8]/50">
                                <div className="text-center mb-6">
                                    <div className="inline-block px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-600 text-[8px] font-black uppercase tracking-widest">Why Choose Us</div>
                                </div>

                                <div className="grid gap-3" style={{ gridTemplateColumns: cardAppearance.layout === 'horizontal' ? '1fr' : '1fr 1fr' }}>
                                    {wcuCards.map((card, idx) => {
                                        const IconC = getIconCmp(card.icon);
                                        const isHorizontal = cardAppearance.layout === 'horizontal';
                                        const isMinimal = cardAppearance.layout === 'minimal';
                                        
                                        const cardStyle = getCardMockStyle(cardAppearance);
                                        const hoverClass = getCardHoverClass(cardAppearance.hover);
                                        const titleStyleClass = getTitleColorStyle(cardAppearance.titleColor);
                                        const iconContainer = getIconContainerStyle(cardAppearance);
                                        const iconStyle = getIconCmpStyle(cardAppearance);
                                        // Adjust icon size for WCU
                                        iconStyle.className = iconStyle.className.replace('h-4 w-4', 'h-5 w-5');

                                        return (
                                            <div 
                                                key={idx} 
                                                className={cn(
                                                    "shadow-sm p-4 rounded-2xl transition-all duration-300",
                                                    isHorizontal ? "flex items-center text-left gap-3.5" : "flex flex-col items-center text-center gap-2",
                                                    hoverClass
                                                )} 
                                                style={cardStyle}
                                            >
                                                {!isMinimal && (
                                                    <div className={cn("w-10 h-10 flex items-center justify-center shrink-0", iconContainer.className)} style={iconContainer.style}>
                                                        <IconC className={iconStyle.className} style={iconStyle.style} />
                                                    </div>
                                                )}
                                                <div className={cn(isHorizontal ? "flex-1 min-w-0" : "")}>
                                                    <h4 className={cn("text-[10px] font-bold leading-tight", titleStyleClass)}>{card.title}</h4>
                                                    <p className="text-[8px] text-black/60 leading-tight mt-1 line-clamp-2">{card.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPlanTripTab = () => {
        return (
        <div className="space-y-6">
            <SectionCard icon={<MapIcon className="h-5 w-5" />} title="Plan Trip Text Customization" subtitle="Customize the text for your package listing page (All Destinations view)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Editable Fields */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-bold text-black">Page Title</Label>
                                <Input
                                    value={pageSettings.plan_trip_page_title}
                                    onChange={e => pgField('plan_trip_page_title', e.target.value)}
                                    className="h-11 rounded-xl glass-input border-slate-200 focus:border-[var(--primary)] transition-all"
                                    placeholder="All Destinations"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-bold text-black">Search Placeholder</Label>
                                <Input
                                    value={pageSettings.plan_trip_search_placeholder}
                                    onChange={e => pgField('plan_trip_search_placeholder', e.target.value)}
                                    className="h-11 rounded-xl glass-input border-slate-200 focus:border-[var(--primary)] transition-all"
                                    placeholder="Search destination, package, or activity..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-bold text-black">Primary Button Text</Label>
                                <Input
                                    value={pageSettings.plan_trip_primary_btn_text}
                                    onChange={e => pgField('plan_trip_primary_btn_text', e.target.value)}
                                    className="h-11 rounded-xl glass-input border-slate-200 focus:border-[var(--primary)] transition-all"
                                    placeholder="Book Now"
                                />
                                <p className="text-[10px] text-black font-medium italic">Used for Instant Booking packages</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-bold text-black">Secondary Button Text</Label>
                                <Input
                                    value={pageSettings.plan_trip_secondary_btn_text}
                                    onChange={e => pgField('plan_trip_secondary_btn_text', e.target.value)}
                                    className="h-11 rounded-xl glass-input border-slate-200 focus:border-[var(--primary)] transition-all"
                                    placeholder="Enquire Now"
                                />
                                <p className="text-[10px] text-black font-medium italic">Used for Request Enquiry packages</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-bold text-black">Price Label</Label>
                            <Input
                                value={pageSettings.plan_trip_price_label}
                                onChange={e => pgField('plan_trip_price_label', e.target.value)}
                                className="h-11 rounded-xl glass-input border-slate-200 focus:border-[var(--primary)] transition-all"
                                placeholder="Starting From"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-bold text-black">Empty State Message</Label>
                            <Textarea
                                value={pageSettings.plan_trip_empty_state_message}
                                onChange={e => pgField('plan_trip_empty_state_message', e.target.value)}
                                className="rounded-xl glass-input border-slate-200 focus:border-[var(--primary)] transition-all min-h-[80px] resize-none"
                                placeholder="No packages found"
                            />
                        </div>
                    </div>

                    {/* Live Preview Section */}
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <Label className="text-xs font-black text-black uppercase tracking-[0.1em]">Instant Preview</Label>
                            <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                LIVE
                            </div>
                        </div>

                        <div className="flex-1 rounded-[24px] border-2 border-slate-100 bg-slate-50/50 p-6 flex flex-col gap-6 overflow-hidden">
                            {/* Title & Search Preview */}
                            <div className="space-y-3">
                                <h4 className="text-xl font-bold font-display text-black border-l-4 border-[var(--primary)] pl-3">
                                    {pageSettings.plan_trip_page_title || "All Destinations"}
                                </h4>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[var(--primary)] transition-colors" />
                                    </div>
                                    <Input
                                        readOnly
                                        placeholder={pageSettings.plan_trip_search_placeholder || "Search destination..."}
                                        className="h-10 rounded-full pl-11 bg-white border-slate-200 text-xs shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Package Card Preview */}
                            <div className="mx-auto w-full max-w-[260px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden group">
                                <div className="h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                    <MapPin className="h-10 w-10 text-slate-300 opacity-50" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="space-y-1.5">
                                        <div className="h-3 w-5/6 bg-slate-100 rounded-full animate-pulse" />
                                        <div className="h-2 w-1/2 bg-slate-50 rounded-full animate-pulse" />
                                    </div>
                                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                                        <div className="shrink-0">
                                            <p className="text-[8px] font-black text-black uppercase tracking-widest leading-none mb-1">
                                                {pageSettings.plan_trip_price_label || "Starting From"}
                                            </p>
                                            <p className="text-sm font-bold text-black leading-none">₹24,999</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="h-8 px-4 rounded-full text-[10px] font-black transition-transform active:scale-95 shadow-sm"
                                            style={{ background: 'var(--primary)', boxShadow: '0 4px 12px var(--primary-glow)' }}
                                        >
                                            {pageSettings.plan_trip_primary_btn_text || "Book Now"}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Empty State Preview */}
                            <div className="mt-auto pt-6 border-t border-slate-100 text-center">
                                <div className="bg-slate-100/50 rounded-2xl p-4 border border-dashed border-slate-200">
                                    <Search className="h-5 w-5 mx-auto text-slate-300 mb-2 opacity-70" />
                                    <p className="text-[10px] font-bold text-black italic mb-1 opacity-60 uppercase tracking-widest">Example Empty State View</p>
                                    <p className="text-xs font-semibold text-black line-clamp-2">
                                        {pageSettings.plan_trip_empty_state_message || "No packages found"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};

    const renderItineraryTab = () => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Column: Settings */}
                <div className="space-y-5 order-2 lg:order-1">
                    <SectionCard icon={<Palette className="h-5 w-5" />} title="Itinerary Page Theme" subtitle="Modernize the look and feel of your customer-facing itinerary">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-black uppercase">Card Style</Label>
                                <div className="grid grid-cols-4 gap-3 mt-1">
                                    {[
                                        { id: 'glassy', label: 'Glassy' },
                                        { id: 'flat', label: 'Flat' },
                                        { id: 'rounded', label: 'Rounded' },
                                        { id: 'elevated', label: 'Elevated' }
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => pgField('itinerary_card_style', s.id)}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-1 rounded-2xl transition-all duration-200 group relative",
                                                "hover:-translate-y-0.5",
                                                pageSettings.itinerary_card_style === s.id 
                                                    ? "outline outline-2 outline-[#1D4ED8] outline-offset-2 scale-[1.02] z-10" 
                                                    : "opacity-90 hover:opacity-100"
                                            )}
                                        >
                                            <div 
                                                className={cn(
                                                    "w-full h-10 rounded-xl border-0 transition-all duration-300",
                                                    s.id === 'glassy' && "bg-white/20 backdrop-blur-[10px] border border-white/40 shadow-[0_4px_16px_rgba(0,0,0,0.1)]",
                                                    s.id === 'flat' && "bg-[#E2E8F0] shadow-none",
                                                    s.id === 'rounded' && "bg-[#FFFFFF] border border-[#CBD5E1] shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-[24px]",
                                                    s.id === 'elevated' && "bg-[#FFFFFF] shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
                                                )}
                                            />
                                            <span 
                                                className={cn(
                                                    "text-[12px] font-medium transition-colors",
                                                    pageSettings.itinerary_card_style === s.id 
                                                        ? "text-black font-bold" 
                                                        : "text-black/50"
                                                )}
                                            >
                                                {s.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-black">Primary Theme Color</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative cursor-pointer">
                                            <div className="w-10 h-10 rounded-xl shadow-md border-2 border-white ring-2 ring-slate-100" style={{ backgroundColor: pageSettings.itinerary_primary_color || customColors.primary }} />
                                            <input type="color" value={pageSettings.itinerary_primary_color || customColors.primary} onChange={e => pgField('itinerary_primary_color', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        </div>
                                        <Input value={pageSettings.itinerary_primary_color || customColors.primary} onChange={e => pgField('itinerary_primary_color', e.target.value)} className="h-10 rounded-xl glass-input flex-1 text-sm font-mono uppercase" placeholder="#HEX" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-black">Secondary Color</Label>
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
                                <Label className="text-xs font-bold text-black uppercase">Button & Font Style</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['pill', 'rounded', 'square'] as const).map(s => (
                                            <button key={s} onClick={() => pgField('itinerary_button_style', s)}
                                                className={`p-2 rounded-xl border-2 transition-all text-[10px] font-bold ${pageSettings.itinerary_button_style === s ? 'border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)]' : 'border-slate-100 bg-white text-black hover:border-slate-200'}`}>
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


                    <SectionCard icon={<Eye className="h-5 w-5" />} title="Time Slot Labels" subtitle="Rename the time-of-day categories in the itinerary timeline">
                        <div className="grid grid-cols-2 gap-3">
                            {([
                                ['morning_label', 'Morning'], 
                                ['afternoon_label', 'Afternoon'], 
                                ['evening_label', 'Evening'], 
                                ['night_label', 'Night'],
                                ['full_day_label', 'Full Day'],
                                ['half_day_label', 'Half Day']
                            ] as [keyof PageSettings, string][]).map(([field, label]) => (
                                <div key={field} className="space-y-1">
                                    <Label className="text-xs font-bold text-black">{label}</Label>
                                    <Input 
                                        value={decodeHtmlEntities(pageSettings[field] as string)} 
                                        onChange={e => pgField(field, e.target.value)} 
                                        className="h-9 rounded-xl glass-input" 
                                    />
                                </div>
                            ))}
                        </div>
                    </SectionCard>



                </div>

                {/* Right Column: Instant Preview */}
                <div className="flex flex-col gap-4 sticky top-8 order-1 lg:order-2">
                    <div className="flex items-center justify-between px-1">
                        <Label className="text-xs font-black text-black uppercase tracking-[0.1em]">Instant Booking Page Preview</Label>
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            LIVE PREVIEW
                        </div>
                    </div>

                    <div 
                        className="flex-1 rounded-[32px] border-2 border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col min-h-[600px] max-h-[800px]" 
                        style={{ 
                            fontFamily: pageSettings.itinerary_font_family || 'Inter, sans-serif',
                            '--itinerary-primary': pageSettings.itinerary_primary_color || customColors.primary,
                            '--itinerary-secondary': pageSettings.itinerary_secondary_color || customColors.secondary
                        } as any}
                    >
                        {/* Mock Browser Header */}
                        <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 shrink-0">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                            </div>
                            <div className="ml-4 flex-1 h-6 bg-white rounded-md border border-slate-200 flex items-center px-3 text-[10px] text-slate-400 overflow-hidden">
                                {typeof window !== 'undefined' ? window.location.origin : 'http://rnt.local:3000'}/plan-trip/{lowestPackageSlug || 'bali-adventure'}
                            </div>
                        </div>

                        {/* Mock Page Content */}
                        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar p-0">


                            {/* Main Content Area */}
                            <div className="p-6 space-y-8">
                                {/* Navigation Tabs Mockup */}
                                <div className="flex border-b border-slate-200 gap-6 overflow-hidden">
                                    <div className="pb-3 border-b-2 font-bold text-xs" style={{ borderColor: 'var(--itinerary-primary)', color: 'var(--itinerary-primary)' }}>Itinerary</div>
                                </div>

                                {/* Itinerary Timeline Mockup */}
                                <div className="space-y-10">
                                    {/* Day Header */}
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="h-12 w-12 rounded-full flex flex-col items-center justify-center text-white shadow-lg"
                                            style={{ background: 'var(--itinerary-primary)' }}
                                        >
                                            <span className="text-[8px] font-black uppercase tracking-tighter leading-none">Day</span>
                                            <span className="text-xl font-black leading-none">01</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-black leading-tight">Arrival & Sunset Dinner</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">South Bali Highlights</p>
                                        </div>
                                    </div>

                                    {/* Timeline Section */}
                                    <div className="relative pl-10 space-y-8">
                                        <div className="absolute left-[19px] top-0 bottom-0 w-0.5 border-l-2 border-dashed border-slate-200" />

                                        {/* Morning Section */}
                                        <div className="relative">
                                            <div 
                                                className="absolute -left-[31px] top-0 h-6 w-6 rounded-full flex items-center justify-center text-white shadow-md"
                                                style={{ background: 'linear-gradient(135deg, #F59E0B, #FCD34D)' }}
                                            >
                                                <Sunrise className="h-3 w-3 text-black" />
                                            </div>
                                            <h4 className="text-sm font-black text-black mb-4 uppercase tracking-wider">{decodeHtmlEntities(pageSettings.morning_label) || 'Morning'}</h4>
                                            
                                            {/* Activity Card */}
                                            <div 
                                                className={cn(
                                                    "transition-all duration-300 flex flex-col md:flex-row overflow-hidden",
                                                    pageSettings.itinerary_card_style === 'glassy' && "bg-white/60 backdrop-blur-md border border-white/40 rounded-[2rem] shadow-xl",
                                                    pageSettings.itinerary_card_style === 'flat' && "bg-slate-100 rounded-xl",
                                                    pageSettings.itinerary_card_style === 'rounded' && "bg-white border border-slate-200 rounded-[24px] shadow-sm",
                                                    pageSettings.itinerary_card_style === 'elevated' && "bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
                                                )}
                                            >
                                                {pageSettings.show_activity_images && (
                                                    <div className="w-full md:w-32 h-32 bg-slate-200 shrink-0">
                                                        <img src="https://images.unsplash.com/photo-1537944536135-1419ef385151?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover" alt="Activity" />
                                                    </div>
                                                )}
                                                <div className="p-4 flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-wider border border-blue-100">Airport Transfer</div>
                                                            <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400"><Clock className="h-2.5 w-2.5" /> 10:00 AM</div>
                                                        </div>
                                                        <h5 className="font-bold text-sm text-black mb-1">Welcome to Bali</h5>
                                                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">Our driver will meet you at Ngurah Rai International Airport and transfer you to your hotel in Jimbaran.</p>
                                                    </div>
                                                    <div className="mt-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[8px] font-bold border border-slate-100">60 mins</div>
                                                        </div>
                                                        <div 
                                                            className={cn(
                                                                "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all",
                                                                pageSettings.itinerary_button_style === 'pill' && "rounded-full",
                                                                pageSettings.itinerary_button_style === 'rounded' && "rounded-lg",
                                                                pageSettings.itinerary_button_style === 'square' && "rounded-none"
                                                            )}
                                                            style={{ background: 'var(--itinerary-primary)', color: 'white' }}
                                                        >
                                                            Details
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Afternoon Section */}
                                        <div className="relative">
                                            <div 
                                                className="absolute -left-[31px] top-0 h-6 w-6 rounded-full flex items-center justify-center text-white shadow-md"
                                                style={{ background: 'linear-gradient(135deg, var(--itinerary-primary), var(--itinerary-secondary))' }}
                                            >
                                                <Sun className="h-3 w-3 text-black" />
                                            </div>
                                            <h4 className="text-sm font-black text-black mb-4 uppercase tracking-wider">{decodeHtmlEntities(pageSettings.afternoon_label) || 'Afternoon'}</h4>
                                            
                                            {/* Activity Card (Simplified) */}
                                            <div 
                                                className={cn(
                                                    "p-4 transition-all duration-300",
                                                    pageSettings.itinerary_card_style === 'glassy' && "bg-white/60 backdrop-blur-md border border-white/40 rounded-[2rem] shadow-xl",
                                                    pageSettings.itinerary_card_style === 'flat' && "bg-slate-100 rounded-xl",
                                                    pageSettings.itinerary_card_style === 'rounded' && "bg-white border border-slate-200 rounded-[24px] shadow-sm",
                                                    pageSettings.itinerary_card_style === 'elevated' && "bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
                                                )}
                                            >
                                                <h5 className="font-bold text-sm text-black mb-1">Hotel Check-in & Relaxation</h5>
                                                <p className="text-[10px] text-slate-500 leading-relaxed">Relax at your resort or take a stroll along the golden sands of Jimbaran Beach.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                            </div>

                            {/* Sticky Footer Mockup - Price/Button Removed as per user request */}
                            <div className="sticky bottom-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-6 flex items-center justify-center z-20">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Plan Your Trip with Ease</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderCartTab = () => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
                {/* Left Column: Settings */}
                <div className="space-y-5">
                    <SectionCard icon={<ShoppingCart className="h-5 w-5" />} title="Trip Summary & Checkout" subtitle="Customize the booking summary in the cart/checkout">
                        <div className="space-y-1"><Label className="text-xs font-bold text-black">Card Title</Label><Input value={decodeHtmlEntities(pageSettings.cart_summary_title)} onChange={e => pgField('cart_summary_title', e.target.value)} className="h-10 rounded-xl glass-input" /></div>
                        <div className="space-y-1"><Label className="text-xs font-bold text-black">Checkout CTA Text</Label><Input value={decodeHtmlEntities(pageSettings.cart_cta_text)} onChange={e => pgField('cart_cta_text', e.target.value)} className="h-10 rounded-xl glass-input" /></div>
                    </SectionCard>
                </div>

                {/* Right Column: Instant Preview */}
                <div className="flex flex-col gap-4 sticky top-8">
                    <div className="flex items-center justify-between px-1">
                        <Label className="text-xs font-black text-black uppercase tracking-[0.1em]">Cart Preview</Label>
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            LIVE PREVIEW
                        </div>
                    </div>

                    <div className="rounded-[32px] border-2 border-slate-200 bg-[#F8FAFC] shadow-2xl overflow-hidden flex flex-col min-h-[600px] relative">
                        {/* Ambient Glows for Mock Page */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/10 blur-[60px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-400/10 blur-[60px] pointer-events-none" />

                        {/* Mock Browser Header */}
                        <div className="h-10 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 gap-2 shrink-0 z-10">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                            </div>
                            <div className="ml-4 flex-1 h-6 bg-slate-50/50 rounded-md border border-slate-200/60 flex items-center px-3 text-[10px] text-slate-400 overflow-hidden font-mono">
                                /checkout?sessionId=af51cc...
                            </div>
                        </div>

                        {/* Mock Page Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 z-10">
                            
                            {/* Trip Details Gradient Card (New) */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[20px] shadow-lg overflow-hidden">
                                <div className="p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[9px] font-black text-white/70 uppercase tracking-[0.2em] mb-1">Trip Details</h3>
                                        <div className="text-lg font-black text-white flex items-center gap-2">
                                            Bali Adventure
                                        </div>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-xl border border-white/20">
                                        <ChevronDown className="h-4 w-4 text-white" />
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary Glassmorphism Card */}
                            <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-white/40 bg-white/30">
                                    <h3 className="text-[11px] font-black text-black uppercase tracking-wider">{decodeHtmlEntities(pageSettings.cart_summary_title) || 'Order Summary'}</h3>
                                </div>
                                
                                <div className="p-4 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] font-bold text-slate-600">Base Package</span>
                                        <span className="text-[11px] font-black text-black">₹49,999</span>
                                    </div>
                                    <div className="text-[9px] font-bold text-slate-400 -mt-3 flex justify-between">
                                        <span>₹49,999 × 1 Adult</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center p-2.5 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                        <span className="text-[10px] font-bold text-blue-700 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" />
                                            GST (5%)
                                        </span>
                                        <span className="text-[10px] font-black text-black">₹2,500</span>
                                    </div>

                                    <div className="flex flex-col gap-0.5 pt-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Total Amount</span>
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-3xl font-black text-black tracking-tight font-display">₹52,499</span>
                                            <span className="text-[10px] font-black text-slate-400">INR</span>
                                        </div>
                                    </div>

                                    {/* Trust Badges in Preview */}
                                    <div className="flex items-center gap-2 py-1">
                                        <div className="flex items-center gap-1.5 text-[8px] font-black text-emerald-700 bg-emerald-500/10 px-2 py-1.5 rounded-full border border-emerald-500/20">
                                            <ShieldCheck className="h-3 w-3 text-emerald-500" /> 100% SECURE
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[8px] font-black text-blue-700 bg-blue-500/10 px-2 py-1.5 rounded-full border border-blue-500/20">
                                            <RotateCcw className="h-3 w-3 text-blue-500" /> REFUNDABLE
                                        </div>
                                    </div>
                                </div>

                                {/* Checkout Button Footer */}
                                <div className="p-4 pt-2 bg-white/20 border-t border-white/40">
                                    <button 
                                        className="w-full h-12 rounded-full text-white text-xs font-black uppercase tracking-[0.15em] shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                                        style={{ background: `linear-gradient(to right, ${customColors.primary}, ${customColors.primary}dd)` }}
                                    >
                                        <Lock className="h-3.5 w-3.5" />
                                        {decodeHtmlEntities(pageSettings.cart_cta_text) || 'Pay ₹52,499'}
                                    </button>
                                    <div className="text-[8px] font-bold text-center text-slate-400 mt-3 flex items-center justify-center gap-1.5">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Secure Payment via Razorpay
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderMyBookingTab = () => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
                {/* Left Column: Settings */}
                <div className="space-y-5">
                    <SectionCard icon={<Phone className="h-5 w-5" />} title="Priority Support" subtitle="Customize the contact details shown in the Priority Support section">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-black">Phone Number</Label>
                                <Input value={decodeHtmlEntities(pageSettings.priority_support_phone)} onChange={e => pgField('priority_support_phone', e.target.value)} className="h-10 rounded-xl glass-input" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-black">Email Address</Label>
                                <Input value={decodeHtmlEntities(pageSettings.priority_support_email)} onChange={e => pgField('priority_support_email', e.target.value)} className="h-10 rounded-xl glass-input" />
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard icon={<CreditCard className="h-5 w-5" />} title="Payment Summary Labels" subtitle="Customize the text labels in the Payment Summary card">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-black">Base Cost Label</Label>
                                <Input value={decodeHtmlEntities(pageSettings.payment_summary_base_cost_label)} onChange={e => pgField('payment_summary_base_cost_label', e.target.value)} className="h-10 rounded-xl glass-input" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-black">Taxes Label</Label>
                                <Input value={decodeHtmlEntities(pageSettings.payment_summary_taxes_label)} onChange={e => pgField('payment_summary_taxes_label', e.target.value)} className="h-10 rounded-xl glass-input" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-black">Total Investment Label</Label>
                            <Input value={decodeHtmlEntities(pageSettings.payment_summary_total_label)} onChange={e => pgField('payment_summary_total_label', e.target.value)} className="h-10 rounded-xl glass-input" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-black">Supporting Text</Label>
                            <Textarea value={decodeHtmlEntities(pageSettings.payment_summary_support_text)} onChange={e => pgField('payment_summary_support_text', e.target.value)} className="rounded-xl glass-input resize-none min-h-[72px]" />
                        </div>
                    </SectionCard>
                </div>

                {/* Right Column: Instant Preview */}
                <div className="flex flex-col gap-4 sticky top-8">
                    <div className="flex items-center justify-between px-1">
                        <Label className="text-xs font-black text-black uppercase tracking-[0.1em]">My Booking Preview</Label>
                        <div className="flex items-center gap-1.5 text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                            LIVE PREVIEW
                        </div>
                    </div>

                    <div className="rounded-[32px] border-2 border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
                        {/* Mock Browser Header */}
                        <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 shrink-0">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                            </div>
                            <div className="ml-4 flex-1 h-6 bg-white rounded-md border border-slate-200 flex items-center px-3 text-[10px] text-slate-400 overflow-hidden">
                                {typeof window !== 'undefined' ? window.location.origin : 'http://rnt.local:3000'}/my-bookings/BK-12345
                            </div>
                        </div>

                        {/* Mock Header — Compact & Sharp */}
                        <div className="border-b border-slate-200 bg-slate-50 p-4 shrink-0">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-6 w-6 rounded-full bg-slate-200 flex flex-shrink-0 items-center justify-center">
                                    <ArrowLeft className="h-3 w-3 text-slate-600" />
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-black text-slate-800">Indian's Dual City</span>
                                    <div className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[8px] font-bold border border-emerald-200 flex items-center gap-1">
                                        <div className="h-1 w-1 rounded-full bg-emerald-600" />
                                        Confirmed
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-500 text-[9px] font-bold">
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-slate-400" />
                                    Delhi & Agra
                                </div>
                                <span className="text-slate-300">|</span>
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    18 May 2026
                                </div>
                                <span className="text-slate-300">|</span>
                                <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3 text-slate-400" />
                                    2 Travelers
                                </div>
                                <span className="text-slate-300">|</span>
                                <div className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-[8px] font-bold">
                                    BK-12345
                                </div>
                            </div>
                        </div>

                        {/* Mock Page Content */}
                        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar p-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {/* Left Column (spans 3) */}
                                <div className="md:col-span-3 space-y-4">
                                    {/* Package Overview Card */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative overflow-hidden">
                                        <div className="absolute top-3 right-3 p-2 bg-slate-50 rounded-lg text-slate-600 border border-slate-100">
                                            <Package className="h-4 w-4" />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Package Overview</span>
                                        <h4 className="text-sm font-extrabold tracking-tight text-black mb-2">
                                            Indian's <span className="opacity-60">Dual City</span>
                                        </h4>
                                        <div className="flex gap-1.5 flex-wrap">
                                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[8px] font-bold text-slate-600">5D / 4N</span>
                                        </div>
                                    </div>

                                    {/* Timeline details mock */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Itinerary Timeline</span>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="h-6 w-6 rounded bg-orange-100 flex flex-shrink-0 items-center justify-center text-orange-600 font-bold text-[9px]">D1</div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-black">Arrival in Delhi & Local Sightseeing</p>
                                                    <p className="text-[8px] text-slate-500">2 Activities • Hotel Check-in</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="h-6 w-6 rounded bg-orange-100 flex flex-shrink-0 items-center justify-center text-orange-600 font-bold text-[9px]">D2</div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-black">Agra Taj Mahal Day Tour</p>
                                                    <p className="text-[8px] text-slate-500">3 Activities • Return to Delhi</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column (spans 2) */}
                                <div className="md:col-span-2 space-y-4">
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
                                        {/* Tabs triggers */}
                                        <div className="flex bg-slate-100 p-0.5 rounded-lg mb-3">
                                            <button 
                                                onClick={() => setMockActiveTab('summary')}
                                                className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all ${mockActiveTab === 'summary' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                            >
                                                Summary
                                            </button>
                                            <button 
                                                onClick={() => setMockActiveTab('support')}
                                                className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all ${mockActiveTab === 'support' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                            >
                                                Support
                                            </button>
                                        </div>

                                        {mockActiveTab === 'summary' ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">{decodeHtmlEntities(pageSettings.payment_summary_total_label) || 'Total Investment'}</span>
                                                    <span className="text-base font-black text-slate-800">₹52,499</span>
                                                </div>
                                                <div className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[8px] font-bold border border-emerald-200 flex items-center gap-1.5">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                                    Payment Successful
                                                </div>
                                                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                                    <div className="flex justify-between items-center text-[9px]">
                                                        <span className="text-slate-400 font-bold uppercase tracking-tight">{decodeHtmlEntities(pageSettings.payment_summary_base_cost_label) || 'Base Package Cost'}</span>
                                                        <span className="font-bold text-slate-800">₹49,999</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[9px]">
                                                        <span className="text-slate-400 font-bold uppercase tracking-tight">{decodeHtmlEntities(pageSettings.payment_summary_taxes_label) || 'GST & Other Taxes'}</span>
                                                        <span className="font-bold text-slate-800">₹2,500</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[9px]">
                                                        <span className="text-slate-400 font-bold uppercase tracking-tight">Reference</span>
                                                        <span className="font-mono text-slate-500">BK-12345</span>
                                                    </div>
                                                </div>
                                                {pageSettings.payment_summary_support_text && (
                                                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 mt-2">
                                                        <p className="text-[8px] text-slate-400 leading-normal font-medium block break-words whitespace-pre-wrap">
                                                            {decodeHtmlEntities(pageSettings.payment_summary_support_text)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3 p-1">
                                                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="h-7 w-7 rounded-full bg-slate-200 flex flex-shrink-0 items-center justify-center text-slate-700">
                                                        <Phone className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-black leading-none">24/7 Support</p>
                                                        <p className="text-[7px] text-slate-500 mt-0.5">Dedicated Concierge</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg text-[8px] font-bold text-slate-700 transition-colors">
                                                        <span>Call Support</span>
                                                        <span className="text-blue-600 font-mono">{decodeHtmlEntities(pageSettings.priority_support_phone) || '+91 1800-123-4567'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg text-[8px] font-bold text-slate-700 transition-colors">
                                                        <span>Email Support</span>
                                                        <span className="text-blue-600 font-mono lowercase truncate max-w-[80px]">{decodeHtmlEntities(pageSettings.priority_support_email) || 'support@toursaas.com'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderWebsitePagesTab = () => {
        const activePage = activePageTab === 'about' ? websitePages.about_page : websitePages.contact_page;
        const pageUrl = `${window.location.origin.replace('agent.', '')}/${activePageTab}`;

        const addBlock = (type: BlockType) => {
            const newBlock: ContentBlock = {
                id: Math.random().toString(36).substr(2, 9),
                type,
                fields: { ...BLOCK_TEMPLATES[type] }
            };
            const newBlocks = [...activePage.blocks, newBlock];
            wpField(activePageTab, 'blocks', newBlocks);
        };

        const removeBlock = (id: string) => {
            const newBlocks = activePage.blocks.filter(b => b.id !== id);
            wpField(activePageTab, 'blocks', newBlocks);
        };

        const moveBlock = (idx: number, dir: 'up' | 'down') => {
            const newBlocks = [...activePage.blocks];
            const target = dir === 'up' ? idx - 1 : idx + 1;
            if (target < 0 || target >= newBlocks.length) return;
            [newBlocks[idx], newBlocks[target]] = [newBlocks[target], newBlocks[idx]];
            wpField(activePageTab, 'blocks', newBlocks);
        };

        const updateBlockField = (blockId: string, field: string, value: any) => {
            const newBlocks = activePage.blocks.map(b => 
                b.id === blockId ? { ...b, fields: { ...b.fields, [field]: value } } : b
            );
            wpField(activePageTab, 'blocks', newBlocks);
        };



        const handleBlockFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, blockId: string, field: string, index?: number) => {
            const file = e.target.files?.[0]; if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size must be less than 5MB');
                return;
            }
            const toastId = toast.loading('Optimizing and uploading image...');
            try {
                const compressedFile = await compressImage(file, {
                    maxWidthOrHeight: 1920,
                    initialQuality: 0.8
                });
                const finalUrl = await uploadFileToS3(compressedFile, 'website_pages');
                if (!finalUrl) throw new Error('Upload failed. Please try again.');
                
                if (index !== undefined) {
                    const block = activePage.blocks.find(b => b.id === blockId);
                    if (block && Array.isArray(block.fields[field])) {
                        const newArray = [...block.fields[field]];
                        newArray[index] = finalUrl;
                        updateBlockField(blockId, field, newArray);
                    }
                } else {
                    updateBlockField(blockId, field, finalUrl);
                }
                
                toast.success('Image updated! ✓', { id: toastId });
            } catch (err: any) {
                console.error(err);
                toast.error(err.message || 'Upload failed', { id: toastId });
            } finally {
                if (e.target) e.target.value = '';
            }
        };

        const toggleBlock = (id: string) => {
            setExpandedBlocks(prev => ({ ...prev, [id]: !prev[id] }));
        };

        return (
            <div className="space-y-6">
                {/* Tab Switcher */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                    {(['about', 'contact'] as const).map(p => (
                        <button key={p} onClick={() => setActivePageTab(p)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activePageTab === p ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-black'}`}>
                            {p === 'about' ? 'About us' : 'Contact us'}
                        </button>
                    ))}
                </div>

                {/* Page Info & Toggle */}
                <Card className="glass-panel border-white/40 shadow-lg rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-black">{activePageTab === 'about' ? 'About us' : 'Contact us'}</h3>
                                <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none cursor-pointer" onClick={() => window.open(pageUrl, '_blank')}>
                                    <ExternalLink className="h-3 w-3 mr-1" /> {pageUrl}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Customize the layout and content of your {activePageTab} page.</p>
                        </div>
                        <div className="flex items-center gap-4 bg-white/50 p-2 rounded-xl border border-white/40">
                            <span className="text-sm font-bold text-black">Enable Page</span>
                            <ToggleSwitch checked={activePage.enabled} onChange={v => wpField(activePageTab, 'enabled', v)} label="" />
                        </div>
                    </div>
                </Card>

                {/* Global Design Settings */}
                <SectionCard icon={<Palette className="h-5 w-5" />} title="Global Page Design" subtitle="These styles apply to all website pages (About, Contact, etc.)">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-black uppercase">Font Family</Label>
                            <select value={websitePages.global_design.font_family} onChange={e => wpGlobal('font_family', e.target.value)}
                                className="w-full h-10 rounded-xl glass-input text-xs px-3 focus:outline-none border-none">
                                <option value="Inter">Inter (Sans)</option>
                                <option value="Playfair Display">Playfair (Serif)</option>
                                <option value="Outfit">Outfit (Modern)</option>
                                <option value="Roboto">Roboto</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-black uppercase">Primary Color</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative w-10 h-10 rounded-xl border-2 border-white shadow-sm overflow-hidden ring-1 ring-slate-100" style={{ backgroundColor: websitePages.global_design.primary_color }}>
                                    <input type="color" value={websitePages.global_design.primary_color} onChange={e => wpGlobal('primary_color', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                                <Input value={websitePages.global_design.primary_color} onChange={e => wpGlobal('primary_color', e.target.value)} className="h-10 rounded-xl glass-input flex-1 text-xs font-mono uppercase" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-black uppercase">Button Style</Label>
                            <div className="grid grid-cols-3 gap-1">
                                {(['rounded', 'pill', 'square'] as const).map(s => (
                                    <button key={s} onClick={() => wpGlobal('button_style', s)}
                                        className={`p-2 rounded-lg border text-[10px] font-bold transition-all ${websitePages.global_design.button_style === s ? 'border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)]' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-black uppercase">Text Color</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative w-10 h-10 rounded-xl border-2 border-white shadow-sm overflow-hidden ring-1 ring-slate-100" style={{ backgroundColor: websitePages.global_design.text_color }}>
                                    <input type="color" value={websitePages.global_design.text_color} onChange={e => wpGlobal('text_color', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                                <Input value={websitePages.global_design.text_color} onChange={e => wpGlobal('text_color', e.target.value)} className="h-10 rounded-xl glass-input flex-1 text-xs font-mono uppercase" />
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* Blocks Area */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-sm font-black text-black uppercase tracking-widest opacity-60">Content Blocks ({activePage.blocks.length})</h4>
                    </div>

                    {activePage.blocks.length === 0 ? (
                        <div className="p-12 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50">
                            <div className="p-4 bg-white rounded-2xl shadow-sm"><Package className="h-8 w-8 text-slate-300" /></div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-black">No blocks added yet</p>
                                <p className="text-xs text-slate-500">Start building your page by adding content blocks below.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activePage.blocks.map((block, idx) => (
                                <Card key={block.id} className="glass-panel border-white/60 shadow-md rounded-3xl overflow-hidden group">
                                    <div className="flex items-stretch min-h-[100px]">
                                        {/* Block Label & Reorder */}
                                        <div className="w-12 bg-slate-100/50 flex flex-col items-center py-4 gap-2 border-r border-white/40">
                                            <span className="text-[10px] font-black text-slate-400 -rotate-90 my-2">{idx + 1}</span>
                                            <button onClick={() => moveBlock(idx, 'up')} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-black disabled:opacity-30 transition-all"><ArrowUp className="h-4 w-4" /></button>
                                            <button onClick={() => moveBlock(idx, 'down')} disabled={idx === activePage.blocks.length - 1} className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-black disabled:opacity-30 transition-all"><ArrowDown className="h-4 w-4" /></button>
                                        </div>

                                        {/* Block Content/Editor */}
                                        <div className="flex-1 p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-[var(--primary-glow)] rounded-xl text-[var(--primary)]">
                                                        {block.type === 'hero' && <Zap className="h-4 w-4" />}
                                                        {block.type === 'text' && <ClipboardList className="h-4 w-4" />}
                                                        {block.type === 'image' && <Camera className="h-4 w-4" />}
                                                        {block.type === 'image_text' && <Compass className="h-4 w-4" />}
                                                        {block.type === 'team' && <Users className="h-4 w-4" />}
                                                        {block.type === 'stats' && <Award className="h-4 w-4" />}
                                                        {block.type === 'contact_info' && <Mail className="h-4 w-4" />}
                                                        {block.type === 'contact_form' && <CheckCircle className="h-4 w-4" />}
                                                        {block.type === 'divider' && <RotateCcw className="h-4 w-4 rotate-45" />}
                                                        {block.type === 'gallery' && <Globe className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-black uppercase tracking-wider">{block.type.replace('_', ' ')}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium uppercase">{block.id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => toggleBlock(block.id)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-black transition-all" title="Toggle Expand">
                                                        {expandedBlocks[block.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                    <button onClick={() => {
                                                        const newBlock = { ...block, id: Math.random().toString(36).substr(2, 9) };
                                                        wpField(activePageTab, 'blocks', [...activePage.blocks, newBlock]);
                                                    }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-black transition-all opacity-0 group-hover:opacity-100" title="Duplicate"><Copy className="h-4 w-4" /></button>
                                                    <button onClick={() => removeBlock(block.id)} className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            </div>

                                            {/* Dynamic Fields per Block Type */}
                                            {expandedBlocks[block.id] && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-100/50 mt-4">
                                                {block.type === 'hero' && (
                                                    <>
                                                        <div className="space-y-1"><Label className="text-xs font-bold text-black">Title</Label><Input value={block.fields.title} onChange={e => updateBlockField(block.id, 'title', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                        <div className="space-y-1"><Label className="text-xs font-bold text-black">Subtitle</Label><Input value={block.fields.subtitle} onChange={e => updateBlockField(block.id, 'subtitle', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                        <div className="space-y-1"><Label className="text-xs font-bold text-black">Button Text</Label><Input value={block.fields.btnText} onChange={e => updateBlockField(block.id, 'btnText', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-bold text-black">Image URL</Label>
                                                            <div className="flex gap-2">
                                                                <Input value={block.fields.imageUrl} onChange={e => updateBlockField(block.id, 'imageUrl', e.target.value)} className="h-9 rounded-xl glass-input text-xs flex-1" placeholder="https://..." />
                                                                <Button size="sm" variant="outline" onClick={() => {
                                                                    const input = document.createElement('input');
                                                                    input.type = 'file';
                                                                    input.accept = 'image/*';
                                                                    input.onchange = (e: any) => handleBlockFileUpload(e, block.id, 'imageUrl');
                                                                    input.click();
                                                                }} className="h-9 rounded-xl text-xs"><Upload className="h-3 w-3 mr-1" /> Upload</Button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                 {block.type === 'text' && (
                                                    <div className="col-span-full space-y-3">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-bold text-black">Heading</Label>
                                                            <Input value={block.fields.title} onChange={e => updateBlockField(block.id, 'title', e.target.value)} className="h-9 rounded-xl glass-input text-xs" placeholder="Optional Heading" />
                                                        </div>
                                                        <RichTextEditor 
                                                            label="Content"
                                                            value={block.fields.content} 
                                                            onChange={val => updateBlockField(block.id, 'content', val)} 
                                                            maxLength={1000}
                                                            placeholder="Enter your text here..."
                                                        />
                                                    </div>
                                                )}
                                                {block.type === 'image' && (
                                                    <>
                                                        <div className="space-y-1"><Label className="text-xs font-bold text-black">Image URL</Label><Input value={block.fields.imageUrl} onChange={e => updateBlockField(block.id, 'imageUrl', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-bold text-black">Width</Label>
                                                            <select value={block.fields.width} onChange={e => updateBlockField(block.id, 'width', e.target.value)} className="w-full h-9 rounded-xl glass-input text-xs px-3">
                                                                <option value="full">Full Width</option>
                                                                <option value="contained">Contained</option>
                                                                <option value="small">Small</option>
                                                            </select>
                                                        </div>
                                                    </>
                                                )}
                                                {block.type === 'stats' && (
                                                    <div className="col-span-full space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-xs font-bold text-black">Statistics Cards</Label>
                                                            <Button size="sm" variant="ghost" onClick={() => {
                                                                const newStats = [...block.fields.stats, { label: 'New Stat', value: '0', icon: 'Star' }];
                                                                updateBlockField(block.id, 'stats', newStats);
                                                            }} className="h-7 text-[10px] font-bold"><Plus className="h-3 w-3 mr-1" /> Add Stat</Button>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                                            {block.fields.stats.map((s: any, sIdx: number) => (
                                                                <div key={sIdx} className="p-3 bg-white/50 rounded-2xl border border-white/60 relative group/stat">
                                                                    <button onClick={() => {
                                                                        const newStats = block.fields.stats.filter((_: any, i: number) => i !== sIdx);
                                                                        updateBlockField(block.id, 'stats', newStats);
                                                                    }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/stat:opacity-100 transition-all shadow-lg"><X className="h-3 w-3" /></button>
                                                                    <Input value={s.value} onChange={e => {
                                                                        const newStats = [...block.fields.stats];
                                                                        newStats[sIdx].value = e.target.value;
                                                                        updateBlockField(block.id, 'stats', newStats);
                                                                    }} className="h-7 text-xs font-black border-none bg-transparent p-0 mb-1" placeholder="Value (e.g. 10k+)" />
                                                                    <Input value={s.label} onChange={e => {
                                                                        const newStats = [...block.fields.stats];
                                                                        newStats[sIdx].label = e.target.value;
                                                                        updateBlockField(block.id, 'stats', newStats);
                                                                    }} className="h-6 text-[10px] font-bold text-slate-500 border-none bg-transparent p-0" placeholder="Label" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {block.type === 'contact_info' && (
                                                    <>
                                                        <div className="space-y-1"><Label className="text-xs font-bold text-black">Title</Label><Input value={block.fields.title} onChange={e => updateBlockField(block.id, 'title', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                        <div className="space-y-1"><Label className="text-xs font-bold text-black">Email</Label><Input value={block.fields.email} onChange={e => updateBlockField(block.id, 'email', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                        <div className="space-y-1"><Label className="text-xs font-bold text-black">Phone</Label><Input value={block.fields.phone} onChange={e => updateBlockField(block.id, 'phone', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                        <div className="space-y-1"><Label className="text-xs font-bold text-black">WhatsApp</Label><Input value={block.fields.whatsapp} onChange={e => updateBlockField(block.id, 'whatsapp', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                        <div className="col-span-full space-y-1"><Label className="text-xs font-bold text-black">Address</Label><Input value={block.fields.address} onChange={e => updateBlockField(block.id, 'address', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                        <div className="col-span-full space-y-1"><Label className="text-xs font-bold text-black">Working Hours</Label><Input value={block.fields.hours} onChange={e => updateBlockField(block.id, 'hours', e.target.value)} className="h-9 rounded-xl glass-input text-xs" placeholder="e.g. Mon-Fri 9AM - 6PM" /></div>
                                                    </>
                                                )}
                                                {block.type === 'team' && (
                                                    <div className="col-span-full space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-xs font-bold text-black">Team Members</Label>
                                                            <Button size="sm" variant="ghost" onClick={() => {
                                                                const newMembers = [...(block.fields.members || []), { name: 'New Member', role: 'Role', bio: '', imageUrl: '' }];
                                                                updateBlockField(block.id, 'members', newMembers);
                                                            }} className="h-7 text-[10px] font-bold"><Plus className="h-3 w-3 mr-1" /> Add Member</Button>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                            {block.fields.members?.map((m: any, mIdx: number) => (
                                                                <div key={mIdx} className="p-3 bg-white/50 rounded-2xl border border-white/60 relative group/member flex flex-col gap-2">
                                                                    <button onClick={() => {
                                                                        const newMembers = block.fields.members.filter((_: any, i: number) => i !== mIdx);
                                                                        updateBlockField(block.id, 'members', newMembers);
                                                                    }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/member:opacity-100 transition-all shadow-lg"><X className="h-3 w-3" /></button>
                                                                    <Input value={m.name} onChange={e => {
                                                                        const newM = [...block.fields.members]; newM[mIdx].name = e.target.value; updateBlockField(block.id, 'members', newM);
                                                                    }} className="h-8 text-xs font-bold bg-white" placeholder="Name" />
                                                                    <Input value={m.role} onChange={e => {
                                                                        const newM = [...block.fields.members]; newM[mIdx].role = e.target.value; updateBlockField(block.id, 'members', newM);
                                                                    }} className="h-8 text-xs bg-white" placeholder="Role" />
                                                                    <Input value={m.imageUrl} onChange={e => {
                                                                        const newM = [...block.fields.members]; newM[mIdx].imageUrl = e.target.value; updateBlockField(block.id, 'members', newM);
                                                                    }} className="h-8 text-xs bg-white" placeholder="Avatar URL" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {block.type === 'divider' && (
                                                    <div className="space-y-1 col-span-full">
                                                        <Label className="text-xs font-bold text-black">Style</Label>
                                                        <select value={block.fields.style} onChange={e => updateBlockField(block.id, 'style', e.target.value)} className="w-full h-9 rounded-xl glass-input text-xs px-3">
                                                            <option value="solid">Solid Line</option>
                                                            <option value="dashed">Dashed Line</option>
                                                            <option value="space">Invisible Space</option>
                                                            <option value="decorative">Decorative</option>
                                                        </select>
                                                    </div>
                                                )}
                                                {block.type === 'gallery' && (
                                                    <div className="col-span-full space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-xs font-bold text-black">Gallery Images</Label>
                                                            <Button size="sm" variant="ghost" onClick={() => {
                                                                const newImgs = [...(block.fields.images || []), ''];
                                                                updateBlockField(block.id, 'images', newImgs);
                                                            }} className="h-7 text-[10px] font-bold"><Plus className="h-3 w-3 mr-1" /> Add Image</Button>
                                                        </div>
                                                        <div className="space-y-1 mb-2">
                                                            <Label className="text-xs font-bold text-black">Grid Layout</Label>
                                                            <select value={block.fields.columns} onChange={e => updateBlockField(block.id, 'columns', parseInt(e.target.value))} className="w-full md:w-1/3 h-9 rounded-xl glass-input text-xs px-3">
                                                                <option value="2">2 Columns</option>
                                                                <option value="3">3 Columns</option>
                                                                <option value="4">4 Columns</option>
                                                            </select>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                            {block.fields.images?.map((img: string, iIdx: number) => (
                                                                <div key={iIdx} className="relative group/img flex gap-2 items-center">
                                                                    <div className="flex gap-2 flex-1">
                                                                        <Input value={img} onChange={e => {
                                                                            const newImgs = [...block.fields.images]; newImgs[iIdx] = e.target.value; updateBlockField(block.id, 'images', newImgs);
                                                                        }} className="h-9 text-xs glass-input flex-1" placeholder="Image URL" />
                                                                        <Button size="sm" variant="outline" onClick={() => {
                                                                            const input = document.createElement('input');
                                                                            input.type = 'file';
                                                                            input.accept = 'image/*';
                                                                            input.onchange = (e: any) => handleBlockFileUpload(e, block.id, 'images', iIdx);
                                                                            input.click();
                                                                        }} className="h-9 rounded-xl text-xs"><Upload className="h-3 w-3" /></Button>
                                                                    </div>
                                                                    <button onClick={() => {
                                                                        const newImgs = block.fields.images.filter((_: any, i: number) => i !== iIdx);
                                                                        updateBlockField(block.id, 'images', newImgs);
                                                                    }} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all"><X className="h-4 w-4" /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {block.type === 'image_text' && (
                                                    <>
                                                        <div className="space-y-1"><Label className="text-xs font-bold text-black">Heading</Label><Input value={block.fields.title} onChange={e => updateBlockField(block.id, 'title', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-bold text-black">Image URL</Label>
                                                            <div className="flex gap-2">
                                                                <Input value={block.fields.imageUrl} onChange={e => updateBlockField(block.id, 'imageUrl', e.target.value)} className="h-9 rounded-xl glass-input text-xs flex-1" />
                                                                <Button size="sm" variant="outline" onClick={() => {
                                                                    const input = document.createElement('input');
                                                                    input.type = 'file';
                                                                    input.accept = 'image/*';
                                                                    input.onchange = (e: any) => handleBlockFileUpload(e, block.id, 'imageUrl');
                                                                    input.click();
                                                                }} className="h-9 rounded-xl text-xs"><Upload className="h-3 w-3 mr-1" /> Upload</Button>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-bold text-black">Alignment</Label>
                                                            <select value={block.fields.layout} onChange={e => updateBlockField(block.id, 'layout', e.target.value)} className="w-full h-9 rounded-xl glass-input text-xs px-3">
                                                                <option value="left">Image on Left</option>
                                                                <option value="right">Image on Right</option>
                                                            </select>
                                                        </div>
                                                        <RichTextEditor 
                                                            label="Content Text"
                                                            value={block.fields.content} 
                                                            onChange={val => updateBlockField(block.id, 'content', val)} 
                                                            maxLength={1000}
                                                            placeholder="Enter your text here..."
                                                            minHeight="80px"
                                                        />
                                                    </>
                                                )}
                                                {/* Add more block types editors as needed */}
                                                {block.type === 'contact_form' && (
                                                    <div className="col-span-full space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div className="space-y-1"><Label className="text-xs font-bold text-black">Form Title</Label><Input value={block.fields.title} onChange={e => updateBlockField(block.id, 'title', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                            <div className="space-y-1"><Label className="text-xs font-bold text-black">Subtitle</Label><Input value={block.fields.subtitle} onChange={e => updateBlockField(block.id, 'subtitle', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                            <div className="space-y-1"><Label className="text-xs font-bold text-black">Button Text</Label><Input value={block.fields.btnText} onChange={e => updateBlockField(block.id, 'btnText', e.target.value)} className="h-9 rounded-xl glass-input text-xs" /></div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-bold text-black">Visible Fields</Label>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white/40 rounded-2xl border border-slate-100">
                                                                <ToggleSwitch checked={block.fields.showName} onChange={v => updateBlockField(block.id, 'showName', v)} label="Name Field" />
                                                                <ToggleSwitch checked={block.fields.showEmail} onChange={v => updateBlockField(block.id, 'showEmail', v)} label="Email Field" />
                                                                <ToggleSwitch checked={block.fields.showPhone} onChange={v => updateBlockField(block.id, 'showPhone', v)} label="Phone Field" />
                                                                <ToggleSwitch checked={block.fields.showMessage} onChange={v => updateBlockField(block.id, 'showMessage', v)} label="Message Field" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {block.type === 'map' && (
                                                    <div className="col-span-full space-y-1">
                                                        <Label className="text-xs font-bold text-black">Google Maps Embed URL / Iframe src</Label>
                                                        <Input value={block.fields.mapUrl} onChange={e => updateBlockField(block.id, 'mapUrl', e.target.value)} className="h-9 rounded-xl glass-input text-xs" placeholder="https://www.google.com/maps/embed?..." />
                                                    </div>
                                                )}
                                                {block.type === 'faq' && (
                                                    <div className="col-span-full space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-xs font-bold text-black">Questions & Answers</Label>
                                                            <Button size="sm" variant="ghost" onClick={() => {
                                                                const newQs = [...block.fields.questions, { question: 'New Question', answer: 'New Answer' }];
                                                                updateBlockField(block.id, 'questions', newQs);
                                                            }} className="h-7 text-[10px] font-bold"><Plus className="h-3 w-3 mr-1" /> Add Question</Button>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {block.fields.questions.map((q: any, qIdx: number) => (
                                                                <div key={qIdx} className="p-3 bg-white/50 rounded-2xl border border-white/60 relative group/faq flex flex-col gap-2">
                                                                    <button onClick={() => {
                                                                        const newQs = block.fields.questions.filter((_: any, i: number) => i !== qIdx);
                                                                        updateBlockField(block.id, 'questions', newQs);
                                                                    }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/faq:opacity-100 transition-all shadow-lg"><X className="h-3 w-3" /></button>
                                                                    <Input value={q.question} onChange={e => {
                                                                        const newQs = [...block.fields.questions];
                                                                        newQs[qIdx].question = e.target.value;
                                                                        updateBlockField(block.id, 'questions', newQs);
                                                                    }} className="h-8 text-xs font-bold bg-white" placeholder="Question" />
                                                                    <Textarea value={q.answer} onChange={e => {
                                                                        const newQs = [...block.fields.questions];
                                                                        newQs[qIdx].answer = e.target.value;
                                                                        updateBlockField(block.id, 'questions', newQs);
                                                                    }} className="min-h-[60px] text-xs resize-none bg-white" placeholder="Answer" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Block Picker */}
                    <div className="pt-6">
                        <SectionCard icon={<Plus className="h-5 w-5" />} title="Add Content Block" subtitle="Choose a component to add to your page">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                {(Object.keys(BLOCK_TEMPLATES) as BlockType[]).filter(t => t !== 'divider').map(t => (
                                    <button key={t} onClick={() => addBlock(t)}
                                        className="flex flex-col items-center gap-2 p-4 rounded-[24px] bg-white border-2 border-slate-100 hover:border-[var(--primary)] hover:bg-[var(--primary-glow)] transition-all group">
                                        <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white text-slate-400 group-hover:text-[var(--primary)] transition-all">
                                            {t === 'hero' && <Zap className="h-5 w-5" />}
                                            {t === 'text' && <ClipboardList className="h-5 w-5" />}
                                            {t === 'image' && <Camera className="h-5 w-5" />}
                                            {t === 'image_text' && <Compass className="h-5 w-5" />}
                                            {t === 'team' && <Users className="h-5 w-5" />}
                                            {t === 'stats' && <Award className="h-5 w-5" />}
                                            {t === 'contact_info' && <Mail className="h-5 w-5" />}
                                            {t === 'gallery' && <Globe className="h-5 w-5" />}
                                            {t === 'faq' && <Info className="h-5 w-5" />}
                                            {t === 'map' && <MapIcon className="h-5 w-5" />}
                                            {t === 'contact_form' && <MessageSquare className="h-5 w-5" />}
                                        </div>
                                        <span className="text-[10px] font-black text-black uppercase tracking-wider">{t.replace('_', ' ')}</span>
                                    </button>
                                ))}
                            </div>
                        </SectionCard>
                    </div>
                </div>
            </div>
        );
    };

    const renderUiStyleTab = () => {
        return (
        <div className="space-y-5">
            <SectionCard icon={<Sliders className="h-5 w-5" />} title="UI Style" subtitle="Customize buttons, cards, icons, spacing and fonts — applied instantly">

                {/* Button Shape */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-black uppercase tracking-wider">Button Style</p>
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
                                    color: opt.key === 'underline' ? 'var(--primary)' : 'black'
                                }}>Book Now</span>
                                <span className="text-[10px] font-bold text-black">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Icon Style */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-black uppercase tracking-wider">Icon Style</p>
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
                                    <Sparkles className="h-3.5 w-3.5" style={{ color: ['outlined-circle', 'plain'].includes(opt.key) ? 'var(--primary)' : 'black' }} />
                                </span>
                                <span className="text-[10px] font-bold text-black">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Card Style */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-black uppercase tracking-wider">Card Style</p>
                    <div className="flex flex-wrap gap-3">
                        {([
                            { key: 'glass', label: 'Glass' },
                            { key: 'flat', label: 'Flat' },
                            { key: 'bordered', label: 'Bordered' },
                            { key: 'tinted', label: 'Tinted' },
                        ] as const).map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => saveUiStyle({ cardStyle: opt.key })}
                                className={cn(
                                    "card-option-wrapper flex flex-col items-center transition-all",
                                    cardStyle === opt.key && "active"
                                )}
                            >
                                <div className={cn("card-style-option", opt.key)}>
                                    <div className="mock-text mb-2" />
                                    <div className="mock-line" />
                                    <div className="mock-line" />
                                </div>
                                <span className="card-style-label">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>



                {/* Font Theme Selector */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-black uppercase tracking-wider">Font Theme</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {([
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
                                        <span className="text-sm font-medium text-black" style={{ fontFamily: opt.value }}>{opt.preview}</span>
                                        <span className="text-[10px] font-bold text-black/70 uppercase">{opt.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold text-black uppercase tracking-wider">Primary Font Color</p>
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

                                    {([
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

                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                <p className="text-xs font-bold text-black uppercase tracking-wider">Button Text Color</p>
                                <div className="flex flex-wrap gap-3 items-center">
                                    <div className="relative group">
                                        <input
                                            type="color"
                                            value={buttonTextColor}
                                            onChange={(e) => saveUiStyle({ buttonTextColor: e.target.value })}
                                            className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">Custom</div>
                                    </div>

                                    <div className="h-6 w-px bg-slate-200 mx-1" />

                                    {([
                                        { name: 'Pure White', value: '#ffffff' },
                                        { name: 'Soft White', value: '#f8fafc' },
                                        { name: 'Steel Gray', value: '#334155' },
                                        { name: 'Jet Black', value: '#000000' }
                                    ] as const).map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => saveUiStyle({ buttonTextColor: color.value })}
                                            className={cn(
                                                "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                                                buttonTextColor === color.value ? "border-[var(--primary)] ring-2 ring-[var(--primary-glow)]" : "border-white shadow-sm"
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
                            <div className="absolute -top-3 -right-3 z-10 px-3 py-1 bg-[var(--primary)] text-black text-[10px] font-bold rounded-full shadow-lg flex items-center gap-1">
                                <Eye className="h-3 w-3" /> LIVE PREVIEW
                            </div>
                            <div className="glass-panel border-white/40 shadow-xl rounded-[32px] p-6 h-full flex flex-col justify-center space-y-4 overflow-hidden"
                                style={{
                                    fontFamily: getSelectedFontFamily(fontFamily),
                                    color: fontColor
                                }}>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-medium leading-tight">Majestic Maldives</h3>
                                    <p className="text-sm opacity-80 font-medium">Escape to paradise with our curated getaway.</p>
                                </div>

                                <div className="flex gap-2">
                                    <div className="px-3 py-1 rounded-full bg-[var(--primary-glow)] text-[var(--primary)] text-[10px] font-bold border border-[var(--primary-soft)]">
                                        5D / 4N
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-black/5 text-black/60 text-[10px] font-bold">
                                        Best Seller
                                    </div>
                                </div>

                                <p className="text-xs leading-relaxed opacity-70 italic">
                                    &quot;The most incredible experience of my life. Every detail was handled with care and sophistication.&quot;
                                </p>

                                <div className="pt-2 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Starts from</p>
                                        <p className="text-lg font-black">$1,250</p>
                                    </div>
                                    <button className="px-5 py-2 rounded-xl bg-[var(--primary)] text-xs font-bold shadow-lg shadow-[var(--primary-glow)]" style={{ color: buttonTextColor }}>
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
};

    // Tabs that have a save/reset bar
    const SAVEABLE_TABS: TabId[] = ['homepage', 'plantrip', 'itinerary', 'cart', 'mybooking', 'uistyle', 'website_pages'];

    const handleSave = () => {
        if (activeTab === 'homepage') { handleSaveHomepage(); return; }
        if (activeTab === 'website_pages') { handleSaveWebsitePages(); return; }
        handleSavePageSettings();
    };
    const handleReset = () => {
        if (activeTab === 'homepage') { handleResetHomepage(); return; }
        if (activeTab === 'website_pages') { setWebsitePages(DEFAULT_WEBSITE_PAGES); return; }
        handleResetPageSettings();
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent">
            {/* ── Main Content Area ────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto px-6 py-8 pb-24">
                <div className="max-w-5xl mx-auto">
                    {/* Modern Page Header Card */}
                    <div className="page-header-card flex flex-col items-center text-center gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex flex-col items-center">
                            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-primary-font)] flex items-center justify-center gap-3">
                                <span className="text-[var(--primary)]">{TABS.find(t => t.id === activeTab)?.icon}</span>
                                {TABS.find(t => t.id === activeTab)?.label}
                            </h1>
                            <p className="text-black text-sm mt-1.5 font-medium">
                                {activeTab === 'theme' && 'Choose colors and build your brand identity'}
                                {activeTab === 'homepage' && 'What customers see when they land on your homepage'}
                                {activeTab === 'plantrip' && 'Customize the trip search and discovery experience'}
                                {activeTab === 'itinerary' && 'Customize the itinerary detail page'}
                                {activeTab === 'cart' && 'Adjust the cart and checkout experience'}
                                {activeTab === 'mybooking' && 'Customize text content for the My Booking page'}
                                {activeTab === 'website_pages' && 'Build your About and Contact pages with content blocks'}
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
                                                active ? "bg-[var(--primary)] text-black" : "bg-black/10 text-black/60"
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
                        {activeTab === 'mybooking' && renderMyBookingTab()}
                        {activeTab === 'website_pages' && renderWebsitePagesTab()}
                        {activeTab === 'uistyle' && renderUiStyleTab()}
                    </div>
                </div>

                {/* ── Sticky Save Bar ────────────────────────────────────── */}
                {SAVEABLE_TABS.includes(activeTab) && (
                    <div className="theme-save-bar">
                        <div className="max-w-5xl mx-auto flex items-center w-full">
                            {/* Info Text - Leftmost */}
                            <div className="save-info flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                <span>Changes apply after you save</span>
                            </div>

                            {/* Spacer */}
                            <div className="flex-1" />

                            {/* Buttons - Rightmost */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={handleReset}
                                    className="h-10 text-sm text-black hover:text-black/80 rounded-2xl px-4"
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset
                                </Button>

                                {activeTab === 'homepage' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => window.open(window.location.origin, '_blank')}
                                        className="h-10 text-sm rounded-2xl border-slate-200 px-4 !text-black font-bold"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Preview Home
                                    </Button>
                                )}

                                {activeTab === 'plantrip' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => window.open(`${window.location.origin}/plan-trip?search=all`, '_blank')}
                                        className="h-10 text-sm rounded-2xl border-slate-200 px-4 !text-black font-bold"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Preview Plan Trip
                                    </Button>
                                )}

                                {activeTab === 'itinerary' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const url = lowestPackageSlug 
                                                ? `${window.location.origin}/plan-trip/${lowestPackageSlug}?mode=preview`
                                                : `${window.location.origin}/plan-trip`;
                                            window.open(url, '_blank');
                                        }}
                                        className="h-10 text-sm rounded-2xl border-slate-200 px-4 !text-black font-bold"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Preview Itinerary
                                    </Button>
                                )}

                                {activeTab === 'cart' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => window.open(`${window.location.origin}/checkout`, '_blank')}
                                        className="h-10 text-sm rounded-2xl border-slate-200 px-4 !text-black font-bold"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Preview Cart
                                    </Button>
                                )}

                                {activeTab === 'mybooking' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const bookingId = latestBookingId || "preview-sample";
                                            const url = `${window.location.origin}/bookings/${bookingId}?mode=preview`;
                                            window.open(url, '_blank');
                                        }}
                                        className="h-10 text-sm rounded-2xl border-slate-200 px-4 !text-black font-bold"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Preview My Booking
                                    </Button>
                                )}

                                {activeTab === 'website_pages' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const pageUrl = `${window.location.origin.replace('agent.', '')}/${activePageTab}`;
                                            window.open(pageUrl, '_blank');
                                        }}
                                        className="h-10 text-sm rounded-2xl border-slate-200 px-4 !text-black font-bold"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Preview Page
                                    </Button>
                                )}

                                <Button
                                    onClick={handleSave}
                                    disabled={hpSaving || pageSaving || websiteSaving}
                                    className="h-10 text-sm !text-black font-bold rounded-2xl px-8 shadow-lg shadow-[var(--primary-glow)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    style={{ background: 'var(--primary)' }}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {(hpSaving || pageSaving || websiteSaving) ? 'Saving…' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
