"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { toast } from "react-toastify";
import { Textarea } from "@/components/ui/textarea";
import { AgentTheme } from "@/types/theme";
import {
    Sparkles, Sliders, CheckCircle2, Globe, Users, Clock, Shield,
    Plane, MapPin, Coffee, Camera, Heart, Star, Layout, Image as ImageIcon,
    Eye, Save, RotateCcw, Info, Palette, Home, ShoppingCart, BookOpen,
    CalendarDays, Rocket, Menu, X, Monitor, Smartphone, ShieldCheck
} from "lucide-react";

// ─── Color Conversion Helpers ────────────────────────────────────────────────
function hexToHsl(hex: string): string {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    r /= 255; g /= 255; b /= 255;
    const min = Math.min(r, g, b), max = Math.max(r, g, b);
    let h = 0, s = 0;
    const l = (min + max) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

function hslToHex(hsl: string | undefined): string {
    if (!hsl) return "#000000";
    if (hsl.startsWith("#")) return hsl;
    const parts = hsl.replace(/hsl\(|\)|%/g, "").split(/[ ,]+/);
    if (parts.length < 3) return "#000000";
    let h = parseFloat(parts[0]) / 360;
    let s = parseFloat(parts[1]) / 100;
    let l = parseFloat(parts[2]) / 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = (x: number) => {
        const v = Math.round(x * 255).toString(16);
        return v.length === 1 ? "0" + v : v;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ─── Icon Helper ─────────────────────────────────────────────────────────────
function getIcon(name: string | undefined, fallback: React.ReactNode) {
    const map: Record<string, React.ReactNode> = {
        Sparkles: <Sparkles className="h-full w-full" />,
        Sliders: <Sliders className="h-full w-full" />,
        CheckCircle2: <CheckCircle2 className="h-full w-full" />,
        Globe: <Globe className="h-full w-full" />,
        Users: <Users className="h-full w-full" />,
        Clock: <Clock className="h-full w-full" />,
        Shield: <Shield className="h-full w-full" />,
        Plane: <Plane className="h-full w-full" />,
        MapPin: <MapPin className="h-full w-full" />,
        Coffee: <Coffee className="h-full w-full" />,
        Camera: <Camera className="h-full w-full" />,
        Heart: <Heart className="h-full w-full" />,
        Star: <Star className="h-full w-full" />,
    };
    return name && map[name] ? map[name] : fallback;
}

// ─── Coming Soon Placeholder ─────────────────────────────────────────────────
function ComingSoon({ pageName }: { pageName: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white/5">
            <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-6">
                <Rocket className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">{pageName} Customization</h3>
            <p className="text-slate-500 max-w-sm">Theme controls for this page are coming soon. You'll be able to customize colors, layouts, and content from here.</p>
            <Badge variant="outline" className="mt-4 text-xs font-semibold text-slate-500 border-slate-300">Coming Soon</Badge>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ThemeSettingsPage() {
    const { theme, updateTheme, refreshTheme } = useTheme();
    const [localTheme, setLocalTheme] = useState<AgentTheme | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const previewWindowRef = useRef<Window | null>(null);
    const [activePage, setActivePage] = useState("homepage");
    const [activeHomeTab, setActiveHomeTab] = useState("global");
    const [activeItineraryTab, setActiveItineraryTab] = useState("hero");
    useEffect(() => {
        if (theme) setLocalTheme(theme);
    }, [theme]);

    const handleChange = (key: keyof AgentTheme, value: any) => {
        if (!localTheme) return;
        const updated = { ...localTheme, [key]: value };
        setLocalTheme(updated);

        // Optimistic update for context (live preview)
        const shouldOptimisticUpdate =
            typeof value === "string" ||
            typeof value === "boolean" ||
            typeof value === "number" ||
            key.toString().startsWith("itin_") ||
            key.toString().includes("color") ||
            key.toString().includes("text");

        if (shouldOptimisticUpdate) {
            updateTheme({ [key]: value });
        }
    };

    const handleCardChange = (section: "feature_cards" | "wcu_cards", index: number, field: string, value: string | undefined) => {
        if (!localTheme) return;
        const cards = [...(localTheme[section] || [])];
        if (!cards[index]) cards[index] = {};
        cards[index] = { ...cards[index], [field]: value };
        handleChange(section, cards);
    };

    const IconBgPicker = ({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) => {
        const presets = [
            { name: 'Blue', color: '#3B82F6' },
            { name: 'Purple', color: '#8B5CF6' },
            { name: 'Teal', color: '#06B6D4' },
            { name: 'Green', color: '#10B981' },
            { name: 'Orange', color: '#F97316' },
            { name: 'Rose', color: '#F43F5E' },
        ];

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Icon Background</Label>
                    {value && (
                        <button
                            onClick={() => onChange(undefined)}
                            className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-bold"
                        >
                            <X className="h-2 w-2" /> Unselect
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                    {presets.map((p) => (
                        <button
                            key={p.color}
                            onClick={() => onChange(p.color)}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${value === p.color ? 'border-blue-600 ring-2 ring-blue-100 scale-110' : 'border-white hover:scale-105 shadow-sm'}`}
                            style={{ backgroundColor: p.color }}
                            title={p.name}
                        />
                    ))}
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                        <div className="relative w-7 h-7 rounded-full overflow-hidden border border-slate-200 shadow-sm">
                            <input
                                type="color"
                                value={value || "#3B82F6"}
                                onChange={(e) => onChange(e.target.value)}
                                className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer"
                            />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">Custom</span>
                    </div>
                </div>
            </div>
        );
    };

    const handleSave = async (silent = false) => {
        if (!localTheme) return;
        if (!silent) setIsSaving(true);
        try {
            const token = localStorage.getItem("token");
            await axios.put(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/theme/agent`,
                localTheme,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!silent) toast.success("Draft saved successfully");
            await refreshTheme();
            return true;
        } catch {
            if (!silent) toast.error("Failed to save draft");
            return false;
        } finally {
            if (!silent) setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!localTheme) return;

        const confirmed = window.confirm("Are you sure you want to publish these changes? This will make them live for all customers.");
        if (!confirmed) return;

        setIsSaving(true);
        try {
            // 1. Save latest draft first
            const saved = await handleSave(true);
            if (!saved) throw new Error("Failed to save draft before publishing");

            // 2. Publish
            const token = localStorage.getItem("token");
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/theme/publish`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Theme published successfully!");
            await refreshTheme();
        } catch (error) {
            console.error("Publish failed:", error);
            toast.error("Failed to publish theme");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestore = async () => {
        const confirmed = window.confirm("Are you sure you want to restore the previous theme version? Your current draft will be replaced.");
        if (!confirmed) return;

        setIsSaving(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/theme/restore`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Previous theme version restored!");
            await refreshTheme();
        } catch (error) {
            toast.error("Failed to restore previous version");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePreview = () => {
        if (!localTheme) return;

        // Store current unsaved theme in localStorage for real-time sync
        localStorage.setItem('preview_theme', JSON.stringify(localTheme));
        localStorage.setItem('preview_timestamp', Date.now().toString());

        // Open or focus the preview tab
        if (!previewWindowRef.current || previewWindowRef.current.closed) {
            previewWindowRef.current = window.open("/?preview=true", "_blank");
        } else {
            // Tab already open — just focus it, storage event will update it in the other tab
            previewWindowRef.current.focus();
        }
    };

    const handleReset = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to discard your current draft and reset to live theme? \n\n" +
            "This will permanently delete your unpublished changes."
        );

        if (!confirmed) return;

        setIsSaving(true);
        try {
            const token = localStorage.getItem("token");
            await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/theme/agent`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Also clear any unsaved preview from sessionStorage/localStorage
            sessionStorage.removeItem('preview_theme');
            localStorage.removeItem('preview_theme');
            localStorage.removeItem('preview_timestamp');

            await refreshTheme();
            toast.success("Draft discarded and reset to live");
        } catch (error) {
            console.error("Reset failed:", error);
            toast.error("Failed to reset theme settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (!localTheme) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-10 w-10 rounded-full border-t-4 border-blue-500 animate-spin" />
            </div>
        );
    }

    // ─── Sub-components ───────────────────────────────────────────────────────
    // ─── Sub-components ───────────────────────────────────────────────────────
    const ColorInput = ({ label, id, value, onChange, description }: { label: string; id: string; value: string | undefined; onChange: (v: string | undefined) => void; description?: string }) => {
        const hexValue = value?.startsWith('#') ? value : hslToHex(value);

        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor={id} className="font-semibold text-sm">{label}</Label>
                    {value && (
                        <button
                            onClick={() => onChange(undefined)}
                            className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-bold"
                        >
                            <X className="h-2 w-2" /> Unselect
                        </button>
                    )}
                </div>
                <div className="flex gap-3">
                    <div className="relative group">
                        <input
                            type="color"
                            value={hexValue || "#000000"}
                            onChange={(e) => onChange(hexToHsl(e.target.value))}
                            className="w-12 h-12 rounded-lg border-2 border-slate-200 cursor-pointer p-0.5 bg-white shadow-sm hover:border-slate-300 transition-colors"
                        />
                        <div className="absolute inset-0 pointer-events-none rounded-lg ring-1 ring-black/5" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">#</span>
                            <Input
                                id={id}
                                value={hexValue?.replace('#', '') || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^[0-9A-Fa-f]{0,6}$/.test(val)) {
                                        onChange(hexToHsl('#' + val));
                                    }
                                }}
                                placeholder="000000"
                                className="font-mono text-sm h-12 pl-7 uppercase tracking-wider"
                                maxLength={6}
                            />
                        </div>
                    </div>
                </div>
                {description && <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>}
            </div>
        );
    };

    const IconPicker = ({ value, onChange, label = "Icon" }: { value: string | undefined; onChange: (v: string | undefined) => void; label?: string }) => {
        const icons = ["Sparkles", "Sliders", "CheckCircle2", "Globe", "Users", "Clock", "Shield", "Plane", "MapPin", "Coffee", "Camera", "Heart", "Star"];
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">{label}</Label>
                    {value && (
                        <button
                            onClick={() => onChange(undefined)}
                            className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-bold"
                        >
                            <X className="h-2 w-2" /> Unselect
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white/5">
                    <Button
                        variant={!value ? "default" : "outline"}
                        size="sm"
                        className="h-8 px-2 text-[10px] font-bold"
                        onClick={() => onChange(undefined)}
                    >
                        None
                    </Button>
                    {icons.map((icon) => (
                        <Button key={icon} variant={value === icon ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => onChange(icon)} title={icon}>
                            {getIcon(icon, <Sparkles className="h-4 w-4" />)}
                        </Button>
                    ))}
                </div>
            </div>
        );
    };

    // ─── Page-Level Tab Data ──────────────────────────────────────────────────
    const pageNav = [
        { id: "header", label: "Header & Nav", icon: Layout },
        { id: "homepage", label: "Home Page", icon: Home },
        { id: "plan-trip", label: "Plan Tripper", icon: Plane },
        { id: "itinerary", label: "Itinerary", icon: CalendarDays },
        { id: "bookings", label: "My Bookings", icon: BookOpen },
    ];


    return (
        <div className="container mx-auto py-8 max-w-7xl">
            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl border shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                        <Palette className="h-8 w-8 text-blue-600" />
                        Theme Customization
                    </h1>
                    <p className="text-slate-500 font-medium">Craft a unique visual identity for every page of your travel agency.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <Button variant="outline" onClick={handleRestore} disabled={isSaving} className="flex-1 md:flex-none font-bold text-slate-600 border-slate-200">
                        <RotateCcw className="h-4 w-4 mr-2" /> Back to Old Theme
                    </Button>
                    <Button variant="outline" onClick={handleReset} disabled={isSaving} className="flex-1 md:flex-none font-bold text-red-600 border-red-100 hover:bg-red-50">
                        <X className="h-4 w-4 mr-2" /> Discard Draft
                    </Button>
                    <Button variant="secondary" onClick={handlePreview} disabled={isSaving} className="flex-1 md:flex-none font-bold bg-slate-100 hover:bg-slate-200">
                        <Eye className="h-4 w-4 mr-2" /> Live Preview
                    </Button>
                    <Button onClick={handlePublish} disabled={isSaving} className="flex-1 md:flex-none font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                        {isSaving ? "Publishing..." : <><CheckCircle2 className="h-4 w-4 mr-2" /> Publish Changes</>}
                    </Button>
                </div>
            </div>

            {/* ── Top-Level Page Navigation ── */}
            <div className="flex gap-2 flex-wrap mb-6 bg-white p-2 rounded-2xl border shadow-sm">
                {pageNav.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActivePage(id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${activePage === id
                            ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                            : "text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ══ HEADER & NAV ════════════════════════════════════════════════ */}
            {activePage === "header" && (
                <Tabs defaultValue="branding" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <TabsList className="grid grid-cols-2 h-auto bg-slate-100/50 p-1 rounded-xl">
                        <TabsTrigger value="branding" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Rocket className="h-4 w-4 mr-1.5" /> Branding (Logo)
                        </TabsTrigger>
                        <TabsTrigger value="nav" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Menu className="h-4 w-4 mr-1.5" /> Navigation & Style
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Branding Section ── */}
                    <TabsContent value="branding" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/5 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Rocket className="h-5 w-5 text-blue-500" /> Agency Branding
                                </CardTitle>
                                <CardDescription>Customize how your agency name and logo appear in the header.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold">Agency Name (Logo Text)</Label>
                                            <div className="relative">
                                                <Input
                                                    value={localTheme.navbar_logo_text || ""}
                                                    onChange={(e) => handleChange("navbar_logo_text", e.target.value)}
                                                    placeholder="TourSaaS"
                                                    className="h-12 font-bold pl-4"
                                                    maxLength={20}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                                                    {(localTheme.navbar_logo_text || "TourSaaS").length}/20
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mt-3">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold text-slate-500">Text Color</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="color"
                                                            value={localTheme.navbar_logo_text_color || "#1e293b"}
                                                            onChange={(e) => handleChange("navbar_logo_text_color", e.target.value)}
                                                            className="w-10 h-10 p-1 cursor-pointer"
                                                        />
                                                        <Input
                                                            value={localTheme.navbar_logo_text_color || "#1e293b"}
                                                            onChange={(e) => handleChange("navbar_logo_text_color", e.target.value)}
                                                            className="flex-1 h-10 font-mono text-xs"
                                                            placeholder="#000000"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold text-slate-500">Font Weight</Label>
                                                    <select
                                                        className="w-full h-10 px-3 border rounded-md bg-white text-sm"
                                                        value={localTheme.navbar_logo_font_weight || "bold"}
                                                        onChange={(e) => handleChange("navbar_logo_font_weight", e.target.value)}
                                                    >
                                                        <option value="normal">Normal</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="semibold">Semibold</option>
                                                        <option value="bold">Bold</option>
                                                        <option value="extrabold">Extra Bold</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="font-bold">Logo Color (Plane Icon)</Label>
                                            <div className="flex items-center gap-3 p-4 bg-transparent rounded-2xl border">
                                                <div
                                                    className="w-10 h-10 rounded-xl shadow-inner border-2 border-white"
                                                    style={{ backgroundColor: localTheme.navbar_logo_color || localTheme.primary_color }}
                                                />
                                                <Input
                                                    type="color"
                                                    value={localTheme.navbar_logo_color || "#3B82F6"}
                                                    onChange={(e) => handleChange("navbar_logo_color", e.target.value)}
                                                    className="w-full h-10 cursor-pointer"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleChange("navbar_logo_color", localTheme.primary_color)}
                                                    className="text-xs font-bold text-blue-600 h-10"
                                                >
                                                    Use Primary
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold">Custom Logo Image (Optional)</Label>
                                            <Input
                                                value={localTheme.navbar_logo_image || ""}
                                                onChange={(e) => handleChange("navbar_logo_image", e.target.value)}
                                                placeholder="https://your-logo-url.png"
                                                className="h-10 bg-white"
                                            />
                                            <p className="text-[10px] text-slate-400">Replaces the plane icon if provided. Transparent PNG recommended.</p>
                                        </div>

                                        {localTheme.navbar_logo_image && (
                                            <div className="p-4 bg-transparent rounded-2xl border border-dashed border-slate-300 flex items-center justify-center min-h-[100px]">
                                                <img
                                                    src={localTheme.navbar_logo_image}
                                                    alt="Preview"
                                                    className="h-12 w-auto object-contain"
                                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Navigation Section ── */}
                    <TabsContent value="nav" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/5 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Palette className="h-5 w-5 text-indigo-500" /> Header Style & Behavior
                                </CardTitle>
                                <CardDescription>Control the appearance and interactive elements of the navbar.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-6">
                                {/* Navbar Style Preset */}
                                {/* Navbar Style Mode Selection */}
                                <div className="space-y-4">
                                    <Label className="font-bold">Navbar Background Mode</Label>
                                    <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                                        <button
                                            onClick={() => {
                                                handleChange("navbar_bg_color", undefined); // Clear custom color
                                            }}
                                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${!localTheme.navbar_bg_color ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Preset Style
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!localTheme.navbar_bg_color) handleChange("navbar_bg_color", "#ffffff"); // Set default if empty
                                            }}
                                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${localTheme.navbar_bg_color ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Custom Color
                                        </button>
                                    </div>
                                </div>

                                {/* Conditional Content based on Mode */}
                                {!localTheme.navbar_bg_color ? (
                                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { id: 'light', label: 'Light', desc: 'White & Gray', colors: 'bg-white border text-gray-900' },
                                                { id: 'dark', label: 'Dark', desc: 'Deep Navy', colors: 'bg-slate-900 text-white' },
                                                { id: 'transparent', label: 'Glass', desc: 'Blur & Clear', colors: 'bg-white/30 backdrop-blur-sm border text-gray-900' }
                                            ].map((p) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => handleChange("navbar_style_preset", p.id)}
                                                    className={`p-4 rounded-2xl border-2 transition-all text-left group ${localTheme.navbar_style_preset === p.id
                                                        ? 'border-blue-600 bg-blue-50/30'
                                                        : 'border-slate-100 bg-transparent hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div className={`w-full h-8 rounded-lg mb-2 shadow-inner p-1 ${p.colors}`}>
                                                        <div className="w-1/3 h-1 bg-current opacity-20 rounded-full mt-1.5" />
                                                    </div>
                                                    <div className="font-bold text-sm">{p.label}</div>
                                                    <div className="text-[10px] text-slate-400">{p.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                        <Label className="font-bold text-sm">Background Color Override</Label>
                                        <div className="flex items-center gap-3 p-3 bg-transparent rounded-xl border">
                                            <div
                                                className="w-10 h-10 rounded-lg border shadow-sm"
                                                style={{ backgroundColor: localTheme.navbar_bg_color || '#ffffff' }}
                                            />
                                            <div className="flex-1">
                                                <Input
                                                    type="color"
                                                    value={localTheme.navbar_bg_color || "#ffffff"}
                                                    onChange={(e) => handleChange("navbar_bg_color", e.target.value)}
                                                    className="w-full h-10 cursor-pointer"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <Input
                                                    value={localTheme.navbar_bg_color || ""}
                                                    onChange={(e) => handleChange("navbar_bg_color", e.target.value)}
                                                    placeholder="#ffffff"
                                                    className="h-10 font-mono text-xs"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400">Custom color is active. Presets are disabled.</p>
                                    </div>
                                )}

                                <Separator className="bg-slate-100" />

                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Link & Border Controls */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-transparent rounded-2xl border">
                                            <div>
                                                <Label className="font-bold">Sticky Header</Label>
                                                <p className="text-[10px] text-slate-400">Header stays fixed at top when scrolling</p>
                                            </div>
                                            <Checkbox
                                                checked={localTheme.navbar_sticky !== false}
                                                onCheckedChange={(v) => handleChange("navbar_sticky", v)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-transparent rounded-2xl border">
                                            <div>
                                                <Label className="font-bold">Transparent on Hero</Label>
                                                <p className="text-[10px] text-slate-400">Makes header see-through over the home banner</p>
                                            </div>
                                            <Checkbox
                                                checked={localTheme.navbar_transparent_on_hero === true}
                                                onCheckedChange={(v) => handleChange("navbar_transparent_on_hero", v)}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <Label className="font-bold">Sign Up Button Style</Label>
                                            <div className="flex items-center gap-3 p-4 bg-transparent rounded-2xl border">
                                                <div
                                                    className="w-12 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                                                    style={{ backgroundColor: localTheme.navbar_signup_bg_color || localTheme.primary_color }}
                                                >
                                                    Sign Up
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        type="color"
                                                        value={localTheme.navbar_signup_bg_color || "#3B82F6"}
                                                        onChange={(e) => handleChange("navbar_signup_bg_color", e.target.value)}
                                                        className="w-full h-8 cursor-pointer"
                                                    />
                                                    <Input
                                                        value={localTheme.navbar_signup_label || "Sign Up"}
                                                        onChange={(e) => handleChange("navbar_signup_label", e.target.value)}
                                                        placeholder="Sign Up"
                                                        className="h-8 text-xs font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}

            {/* ══ HOME PAGE ════════════════════════════════════════════════════ */}
            {activePage === "homepage" && (

                <Tabs value={activeHomeTab} onValueChange={setActiveHomeTab} className="space-y-6">
                    <TabsList className="grid grid-cols-2 lg:grid-cols-4 h-auto bg-slate-100/50 p-1 rounded-xl">
                        <TabsTrigger value="global" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Palette className="h-4 w-4 mr-1.5" /> Global Styles
                        </TabsTrigger>
                        <TabsTrigger value="hero" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <ImageIcon className="h-4 w-4 mr-1.5" /> Hero Section
                        </TabsTrigger>
                        <TabsTrigger value="features" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Sparkles className="h-4 w-4 mr-1.5" /> Feature Cards
                        </TabsTrigger>
                        <TabsTrigger value="wcu" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Why Choose Us
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Hero Section ── */}
                    <TabsContent value="hero" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/5 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-indigo-500" />
                                    Hero Section Configuration
                                </CardTitle>
                                <CardDescription>The first thing customers see when they land on your site.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-6">
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Left: Text Content */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="font-bold">Main Title</Label>
                                            <Input value={localTheme.home_hero_title || ""} onChange={(e) => handleChange("home_hero_title", e.target.value)} placeholder="Adventure Awaits—" className="h-12 text-lg font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-bold">Subtitle</Label>
                                            <Input value={localTheme.home_hero_subtitle || ""} onChange={(e) => handleChange("home_hero_subtitle", e.target.value)} placeholder="Plan your dream trip..." className="h-10" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="font-semibold text-xs text-slate-500">Primary Button</Label>
                                                <Input value={localTheme.hero_cta_primary_text || ""} onChange={(e) => handleChange("hero_cta_primary_text", e.target.value)} placeholder="e.g. Start Your Journey" className="h-10 font-bold" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="font-semibold text-xs text-slate-500">Secondary Button</Label>
                                                <Input value={localTheme.hero_cta_secondary_text || ""} onChange={(e) => handleChange("hero_cta_secondary_text", e.target.value)} placeholder="e.g. See Sample" className="h-10 font-bold" />
                                            </div>
                                        </div>
                                        {/* Section Visibility */}
                                        <div className="space-y-3 pt-2">
                                            <Label className="font-bold text-sm">Section Visibility</Label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex items-center space-x-3 p-3 border rounded-xl bg-white/5 hover:bg-transparent transition-colors">
                                                    <Checkbox
                                                        id="show_feature_cards"
                                                        checked={localTheme.show_feature_cards !== false}
                                                        onCheckedChange={(checked) => handleChange("show_feature_cards", !!checked)}
                                                    />
                                                    <Label htmlFor="show_feature_cards" className="font-bold text-sm cursor-pointer">Feature Cards</Label>
                                                </div>
                                                <div className="flex items-center space-x-3 p-3 border rounded-xl bg-white/5 hover:bg-transparent transition-colors">
                                                    <Checkbox
                                                        id="show_wcu_section"
                                                        checked={localTheme.show_wcu_section !== false}
                                                        onCheckedChange={(checked) => handleChange("show_wcu_section", !!checked)}
                                                    />
                                                    <Label htmlFor="show_wcu_section" className="font-bold text-sm cursor-pointer">"Why Choose" Section</Label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Background */}
                                    <div className="space-y-6 bg-transparent p-6 rounded-2xl border border-dashed border-slate-300">
                                        <div className="space-y-4">
                                            <Label className="font-bold flex items-center gap-2">
                                                <Layout className="h-4 w-4" /> Visual Background
                                            </Label>
                                            <select
                                                className="w-full h-11 px-3 border rounded-xl bg-white font-bold"
                                                value={localTheme.hero_background_type}
                                                onChange={(e) => handleChange("hero_background_type", e.target.value)}
                                            >
                                                <option value="image">Photographic Image</option>
                                                <option value="gradient">Dynamic Gradient</option>
                                                <option value="solid">Solid Branding Color</option>
                                            </select>
                                        </div>

                                        {localTheme.hero_background_type === "image" && (
                                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-semibold">Image URL</Label>
                                                    <div className="flex gap-3">
                                                        {localTheme.home_hero_image && (
                                                            <div className="relative group shrink-0">
                                                                <img src={localTheme.home_hero_image} alt="Thumbnail" className="w-10 h-10 object-cover rounded-lg border shadow-sm" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                            </div>
                                                        )}
                                                        <Input
                                                            value={localTheme.home_hero_image || ""}
                                                            onChange={(e) => handleChange("home_hero_image", e.target.value)}
                                                            placeholder="https://images.unsplash.com/..."
                                                            className="h-10 bg-white"
                                                        />
                                                    </div>
                                                </div>
                                                {localTheme.home_hero_image && (
                                                    <div className="relative group">
                                                        <img src={localTheme.home_hero_image} alt="Hero Preview" className="w-full h-32 object-cover rounded-xl border-2 border-white shadow-md transition-transform hover:scale-[1.02]" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                                            <span className="text-white text-xs font-bold px-3 py-1 bg-white/20 backdrop-blur-md rounded-full">Preview Mode</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {localTheme.hero_background_type !== "image" && (
                                            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                                <Label className="text-sm font-semibold">{localTheme.hero_background_type === "gradient" ? "Gradient CSS" : "Solid Color"}</Label>
                                                <Input value={localTheme.hero_gradient || ""} onChange={(e) => handleChange("hero_gradient", e.target.value)} className="h-10 bg-white" />
                                            </div>
                                        )}

                                        <div className="space-y-4 pt-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-sm font-bold flex items-center gap-2">
                                                    Overlay Darkness <Info className="h-3 w-3 text-slate-400" />
                                                </Label>
                                                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">{Math.round((localTheme.hero_overlay_opacity || 0.6) * 100)}%</span>
                                            </div>
                                            <Slider
                                                value={[localTheme.hero_overlay_opacity || 0.6]}
                                                min={0} max={1} step={0.05}
                                                onValueChange={([val]) => handleChange("hero_overlay_opacity", val)}
                                                className="py-4"
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                                                <span>Brighter</span>
                                                <span>Darker</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-2">Adjust how much the background image is dimmed to improve text readability.</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Feature Cards ── */}
                    <TabsContent value="features" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3 mb-2">
                            <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800 font-medium">These 3 cards highlight your core service offerings on the homepage just below the hero section.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[0, 1, 2].map((i) => (
                                <Card key={i} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                                    <CardHeader className="bg-white/5 border-b py-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-bold">Feature {i + 1}</CardTitle>
                                            <div className="bg-white p-2 rounded-lg border shadow-sm group-hover:scale-110 transition-transform">
                                                {getIcon(localTheme.feature_cards?.[i]?.icon, <Sparkles className="h-5 w-5 text-blue-500" />)}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5 pt-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500 uppercase">Heading</Label>
                                            <Input value={localTheme.feature_cards?.[i]?.title || ""} onChange={(e) => handleCardChange("feature_cards", i, "title", e.target.value)} className="h-10 font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Label className="text-xs font-bold text-slate-500 uppercase">Short Description</Label>
                                                <span className={`text-[10px] font-mono ${(localTheme.feature_cards?.[i]?.description || "").length > 150 ? "text-red-500 font-bold" : "text-slate-400"}`}>
                                                    {(localTheme.feature_cards?.[i]?.description || "").length}/150
                                                </span>
                                            </div>
                                            <textarea
                                                value={localTheme.feature_cards?.[i]?.description || ""}
                                                onChange={(e) => handleCardChange("feature_cards", i, "description", e.target.value)}
                                                className="w-full h-24 p-3 border rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all min-h-[100px] resize-y text-sm leading-relaxed"
                                            />
                                        </div>
                                        <Separator />
                                        <IconPicker value={localTheme.feature_cards?.[i]?.icon} onChange={(v) => handleCardChange("feature_cards", i, "icon", v)} />
                                        <ColorInput label="Card Highlight Color" id={`feat_bg_${i}`} value={localTheme.feature_cards?.[i]?.bg_color} onChange={(v) => handleCardChange("feature_cards", i, "bg_color", v)} description="Used for gradients and hover states" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* ── Global Styles ── */}
                    <TabsContent value="global" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Brand Colors */}
                            <Card className="border-slate-200 shadow-sm overflow-hidden">
                                <CardHeader className="bg-white/5 border-b pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Palette className="h-5 w-5 text-blue-500" /> Brand Colors
                                    </CardTitle>
                                    <CardDescription>Define your agency's primary color palette.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid sm:grid-cols-2 gap-6 pt-6">
                                    <ColorInput label="Primary Action" id="primary_color" value={localTheme.primary_color} onChange={(v) => handleChange("primary_color", v)} description="Main buttons and accents" />
                                    <ColorInput label="Secondary Background" id="secondary_color" value={localTheme.secondary_color} onChange={(v) => handleChange("secondary_color", v)} description="Soft backgrounds and borders" />
                                    <ColorInput label="Accent Highlights" id="accent_color" value={localTheme.accent_color} onChange={(v) => handleChange("accent_color", v)} description="Badges and special elements" />
                                    <Separator className="sm:col-span-2 my-2" />
                                    <ColorInput label="Heading Text" id="heading_color" value={localTheme.heading_color} onChange={(v) => handleChange("heading_color", v)} />
                                    <ColorInput label="Body Text" id="body_text_color" value={localTheme.body_text_color} onChange={(v) => handleChange("body_text_color", v)} />
                                </CardContent>
                            </Card>

                            {/* Layout & Spacing */}
                            <Card className="border-slate-200 shadow-sm overflow-hidden">
                                <CardHeader className="bg-white/5 border-b pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Layout className="h-5 w-5 text-purple-500" /> Layout & Spacing
                                    </CardTitle>
                                    <CardDescription>Control the feel and structure of your pages.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-6 pt-6">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-semibold text-sm">Button Roundness</Label>
                                            <div className="flex gap-2">
                                                {[
                                                    { label: 'Sharp', val: '0rem' },
                                                    { label: 'Rounded', val: '0.5rem' },
                                                    { label: 'Pill', val: '9999px' }
                                                ].map((opt) => (
                                                    <Button
                                                        key={opt.label}
                                                        variant={localTheme.button_radius === opt.val ? "default" : "outline"}
                                                        onClick={() => handleChange("button_radius", opt.val)}
                                                        className="flex-1 text-xs"
                                                    >
                                                        {opt.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-semibold text-sm">Card Roundness</Label>
                                            <div className="flex gap-2">
                                                {[
                                                    { label: 'Sharp', val: '0rem' },
                                                    { label: 'Rounded', val: '0.75rem' },
                                                    { label: 'Soft', val: '1.5rem' }
                                                ].map((opt) => (
                                                    <Button
                                                        key={opt.label}
                                                        variant={localTheme.card_radius === opt.val ? "default" : "outline"}
                                                        onClick={() => handleChange("card_radius", opt.val)}
                                                        className="flex-1 text-xs"
                                                    >
                                                        {opt.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-sm">Section Vertical Spacing</Label>
                                        <div className="flex gap-2">
                                            {["compact", "comfortable", "spacious"].map((preset) => (
                                                <Button key={preset} variant={localTheme.section_spacing === preset ? "default" : "outline"} className="flex-1 capitalize font-bold" onClick={() => handleChange("section_spacing", preset)}>
                                                    {preset}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ── Why Choose Us ── */}
                    <TabsContent value="wcu" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/5 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Layout className="h-5 w-5 text-emerald-500" /> Section Headings
                                </CardTitle>
                                <CardDescription>Customize the main title of the "Why Choose Us" section.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
                                <div className="space-y-2">
                                    <Label className="font-bold">Main Title Line</Label>
                                    <Input value={localTheme.wcu_title || "Everything You Need"} onChange={(e) => handleChange("wcu_title", e.target.value)} placeholder="Everything You Need" className="h-12 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold">Accent Highlight Line</Label>
                                    <Input value={localTheme.wcu_accent_title || "For a Perfect Trip"} onChange={(e) => handleChange("wcu_accent_title", e.target.value)} placeholder="For a Perfect Trip" className="h-12 text-blue-600 font-bold" />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[0, 1, 2, 3].map((i) => (
                                <Card key={i} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                                    <CardHeader className="bg-white/5 border-b py-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-bold">Trust Point {i + 1}</CardTitle>
                                            <div className="bg-white p-2 rounded-lg border shadow-sm group-hover:scale-110 transition-transform">
                                                {getIcon(localTheme.wcu_cards?.[i]?.icon, <CheckCircle2 className="h-5 w-5 text-green-500" />)}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5 pt-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500 uppercase">Heading</Label>
                                            <Input value={localTheme.wcu_cards?.[i]?.title || ""} onChange={(e) => handleCardChange("wcu_cards", i, "title", e.target.value)} className="h-10 font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Label className="text-xs font-bold text-slate-500 uppercase">Reasoning</Label>
                                                <span className={`text-[10px] font-mono ${(localTheme.wcu_cards?.[i]?.description || "").length > 150 ? "text-red-500 font-bold" : "text-slate-400"}`}>
                                                    {(localTheme.wcu_cards?.[i]?.description || "").length}/150
                                                </span>
                                            </div>
                                            <textarea
                                                value={localTheme.wcu_cards?.[i]?.description || ""}
                                                onChange={(e) => handleCardChange("wcu_cards", i, "description", e.target.value)}
                                                className="w-full h-24 p-3 border rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all min-h-[100px] resize-y text-sm leading-relaxed"
                                                maxLength={150}
                                            />
                                        </div>
                                        <Separator className="bg-slate-100" />
                                        <IconPicker value={localTheme.wcu_cards?.[i]?.icon} onChange={(v) => handleCardChange("wcu_cards", i, "icon", v)} />

                                        <Separator className="bg-slate-100" />
                                        <IconBgPicker
                                            value={localTheme.wcu_cards?.[i]?.icon_bg_color}
                                            onChange={(v) => handleCardChange("wcu_cards", i, "icon_bg_color", v)}
                                        />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            )}

            {/* ══ PLAN TRIPPER ════════════════════════════════════════════════ */}
            {activePage === "plan-trip" && (
                <Tabs defaultValue="hero" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <TabsList className="grid grid-cols-3 h-auto bg-slate-100/50 p-1 rounded-xl">
                        <TabsTrigger value="hero" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <ImageIcon className="h-4 w-4 mr-1.5" /> Hero & Banner
                        </TabsTrigger>
                        <TabsTrigger value="form" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Layout className="h-4 w-4 mr-1.5" /> Step Form
                        </TabsTrigger>
                        <TabsTrigger value="infocards" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Sparkles className="h-4 w-4 mr-1.5" /> Info Cards
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Hero & Banner ── */}
                    <TabsContent value="hero" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/5 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-indigo-500" /> Plan Trip Hero
                                </CardTitle>
                                <CardDescription>The dramatic header customers see at the top of the plan-trip wizard.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold">Banner Title</Label>
                                            <Input value={localTheme.plan_trip_title || ""} onChange={(e) => handleChange("plan_trip_title", e.target.value)} placeholder="Plan Your Perfect Trip" className="h-12 font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-bold">Banner Subtitle</Label>
                                            <Input value={localTheme.plan_trip_subtitle || ""} onChange={(e) => handleChange("plan_trip_subtitle", e.target.value)} placeholder="AI-powered itinerary in minutes" className="h-10" />
                                        </div>
                                    </div>
                                    <div className="space-y-4 bg-transparent p-5 rounded-2xl border border-dashed border-slate-300">
                                        <div className="space-y-2">
                                            <Label className="font-bold">Background Image URL</Label>
                                            <Input value={localTheme.plan_trip_image || ""} onChange={(e) => handleChange("plan_trip_image", e.target.value)} placeholder="https://images.unsplash.com/..." className="h-10 bg-white" />
                                        </div>
                                        {localTheme.plan_trip_image && (
                                            <div className="relative group">
                                                <img src={localTheme.plan_trip_image} alt="Plan Trip Preview" className="w-full h-28 object-cover rounded-xl border-2 border-white shadow-md" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                                    <span className="text-white text-xs font-bold px-3 py-1 bg-white/20 backdrop-blur-md rounded-full">Preview Mode</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-3 pt-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-sm font-bold flex items-center gap-2">
                                                    Overlay Darkness <Info className="h-3 w-3 text-slate-400" />
                                                </Label>
                                                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">{Math.round((localTheme.plan_trip_hero_overlay_opacity ?? 0.5) * 100)}%</span>
                                            </div>
                                            <Slider
                                                value={[localTheme.plan_trip_hero_overlay_opacity ?? 0.5]}
                                                min={0} max={1} step={0.05}
                                                onValueChange={([val]) => handleChange("plan_trip_hero_overlay_opacity", val)}
                                                className="py-4"
                                            />
                                            <p className="text-[10px] text-slate-500">Controls how dark the image overlay is — higher values improve text contrast.</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Step Form ── */}
                    <TabsContent value="form" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-800 font-medium">These settings control the step-by-step form card where users fill destination, dates, travelers, and services.</p>
                        </div>

                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/5 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Layout className="h-5 w-5 text-sky-500" /> Continue Button
                                </CardTitle>
                                <CardDescription>Customize the step navigation button shown at the bottom of each form step.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-6">

                                {/* ── Button Label ── */}
                                <div className="grid md:grid-cols-2 gap-8 items-start">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <Label className="font-bold">Button Label Text</Label>
                                            <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${(localTheme.plan_trip_cta_text?.length || 0) > 20
                                                ? 'bg-red-50 border-red-200 text-red-600'
                                                : 'bg-slate-100 border-slate-200 text-slate-500'
                                                }`}>
                                                {localTheme.plan_trip_cta_text?.length || 0}/25
                                            </span>
                                        </div>
                                        <Input
                                            value={localTheme.plan_trip_cta_text || ""}
                                            maxLength={25}
                                            onChange={(e) => handleChange("plan_trip_cta_text", e.target.value)}
                                            placeholder="e.g. Continue"
                                            className="h-11 font-bold text-base"
                                        />
                                        {/* Quick-fill chips */}
                                        <div className="flex flex-wrap gap-2">
                                            {["Continue →", "Next Step", "Proceed", "Let's Go!"].map((chip) => (
                                                <button
                                                    key={chip}
                                                    type="button"
                                                    onClick={() => handleChange("plan_trip_cta_text", chip)}
                                                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${localTheme.plan_trip_cta_text === chip
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                                        }`}
                                                >
                                                    {chip}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-relaxed">
                                            💡 Leave blank to auto-label: Step 1 → "Continue to Step 2", Step 3 → "Customize Trip", etc.
                                        </p>
                                    </div>

                                    {/* Live Button Preview */}
                                    <div className="space-y-3">
                                        <Label className="font-bold text-slate-500">Live Preview</Label>
                                        <div className="bg-transparent rounded-2xl border border-dashed border-slate-300 p-6 flex items-center justify-center min-h-[100px]">
                                            <button
                                                type="button"
                                                disabled
                                                className="px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all cursor-default"
                                                style={{ backgroundColor: localTheme.plan_trip_cta_color || localTheme.primary_color || '#3B82F6' }}
                                            >
                                                {localTheme.plan_trip_cta_text || "Continue to Step 2"}
                                                <span className="ml-2">→</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Brand Primary Color ── */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="font-bold">Brand Primary Color</Label>
                                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed max-w-xs">
                                                Controls the active step indicator ring, input focus border, and step buttons — all in one. Change once, everything stays consistent.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleChange("plan_trip_cta_color", localTheme.primary_color || '#3B82F6')}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors shrink-0 ml-4"
                                        >
                                            <RotateCcw className="h-3 w-3" /> Reset to Brand
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-3 p-4 bg-transparent rounded-2xl border">
                                        {[
                                            { label: 'Brand Blue', hex: '#3B82F6' },
                                            { label: 'Ocean Teal', hex: '#0EA5E9' },
                                            { label: 'Emerald', hex: '#10B981' },
                                            { label: 'Violet', hex: '#8B5CF6' },
                                            { label: 'Rose', hex: '#F43F5E' },
                                            { label: 'Amber', hex: '#F59E0B' },
                                            { label: 'Slate', hex: '#475569' },
                                            { label: 'Midnight', hex: '#1E293B' },
                                        ].map(({ label, hex }) => {
                                            const isSelected = (localTheme.plan_trip_cta_color || '#3B82F6').toLowerCase() === hex.toLowerCase();
                                            return (
                                                <button
                                                    key={hex}
                                                    type="button"
                                                    title={label}
                                                    onClick={() => handleChange("plan_trip_cta_color", hex)}
                                                    className={`group flex flex-col items-center gap-1.5 transition-all`}
                                                >
                                                    <div
                                                        className={`w-9 h-9 rounded-full shadow-md transition-all ${isSelected ? 'ring-4 ring-offset-2 scale-110' : 'hover:scale-105'
                                                            }`}
                                                        style={{ backgroundColor: hex, '--tw-ring-color': hex } as React.CSSProperties}
                                                    />
                                                    <span className={`text-[9px] font-bold ${isSelected ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                        {label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        {/* Custom hex input */}
                                        <div className="flex flex-col items-center gap-1.5 ml-2">
                                            <label
                                                className="w-9 h-9 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden shadow-sm"
                                                title="Custom color"
                                            >
                                                <Palette className="h-4 w-4 text-slate-400" />
                                                <input
                                                    type="color"
                                                    className="opacity-0 w-0 h-0 absolute"
                                                    value={localTheme.plan_trip_cta_color || '#3B82F6'}
                                                    onChange={(e) => handleChange("plan_trip_cta_color", e.target.value)}
                                                />
                                            </label>
                                            <span className="text-[9px] font-bold text-slate-400">Custom</span>
                                        </div>
                                    </div>
                                    {localTheme.plan_trip_cta_color && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: localTheme.plan_trip_cta_color }} />
                                            <span className="font-mono font-bold">{localTheme.plan_trip_cta_color}</span>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-400">The final "Generate My Plan" button always uses a blue→indigo gradient regardless of this setting.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Info Cards ── */}
                    <TabsContent value="infocards" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-slate-200 shadow-sm overflow-hidden mb-4">
                            <CardContent className="pt-6">
                                <div className="space-y-2">
                                    <Label className="font-bold">Section Heading</Label>
                                    <Input
                                        value={localTheme.plan_trip_info_section_heading || ""}
                                        onChange={(e) => handleChange("plan_trip_info_section_heading", e.target.value)}
                                        placeholder="How It Works"
                                        className="h-10 font-bold"
                                    />
                                    <p className="text-[10px] text-slate-500">Shown above the three feature cards at the bottom of the Plan Trip page.</p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                            <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800 font-medium">These 3 value-proposition cards appear at the bottom of /plan-trip. Customize emoji, text and icon background color for each.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[0, 1, 2].map((i) => {
                                const defaults = [
                                    { title: "Smart Matching", desc: "Our AI analyzes millions of data points to find the best activities that match your unique travel style.", emoji: "🎯", accent: '#DBEAFE' },
                                    { title: "Full Customization", desc: "Easily add, remove, or modify any activity. It's your trip, we just help you plan it faster.", emoji: "✏️", accent: '#F3E8FF' },
                                    { title: "Save & Book", desc: "Save your plan for later or checkout when you're ready to make it a reality.", emoji: "💾", accent: '#DCFCE7' },
                                ];
                                const PASTEL_COLORS = [
                                    { name: 'Sky Blue', hex: '#DBEAFE' },
                                    { name: 'Lavender', hex: '#EDE9FE' },
                                    { name: 'Mint', hex: '#D1FAE5' },
                                    { name: 'Peach', hex: '#FEE2E2' },
                                    { name: 'Sunflower', hex: '#FEF3C7' },
                                    { name: 'Rose', hex: '#FCE7F3' },
                                ];
                                const EMOJI_OPTIONS = [
                                    '🎯', '✏️', '💾', '🚀', '⭐', '💡', '🎁', '🔥', '🌟', '🏆',
                                    '🗺️', '✈️', '🌴', '🏖️', '🎒', '📍', '🤖', '💎', '🎉', '🌈',
                                ];
                                const card = localTheme.plan_trip_info_cards?.[i] || {};
                                const def = defaults[i];
                                const currentEmoji = card.emoji || def.emoji;
                                const currentAccent = card.accent || def.accent;

                                const updateCard = (field: string, value: string) => {
                                    const cards = [...(localTheme.plan_trip_info_cards || [{}, {}, {}])];
                                    cards[i] = { ...cards[i], [field]: value };
                                    handleChange("plan_trip_info_cards", cards);
                                };

                                return (
                                    <Card key={i} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                        {/* Live Card Header Preview */}
                                        <div className="px-5 pt-5 pb-4 border-b flex items-center gap-3" style={{ backgroundColor: currentAccent + '60' }}>
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner text-3xl flex-shrink-0 transition-all" style={{ backgroundColor: currentAccent }}>
                                                {currentEmoji}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Card {i + 1} Preview</p>
                                                <p className="font-bold text-slate-800 text-sm leading-tight">{card.title || def.title}</p>
                                            </div>
                                        </div>

                                        <CardContent className="space-y-4 pt-5">
                                            {/* Emoji Picker */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase">Emoji Icon</Label>
                                                <div className="flex flex-wrap gap-2 p-3 bg-transparent rounded-xl border">
                                                    {EMOJI_OPTIONS.map((em) => (
                                                        <button
                                                            key={em}
                                                            type="button"
                                                            onClick={() => updateCard('emoji', em)}
                                                            className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg transition-all ${currentEmoji === em
                                                                ? 'ring-2 ring-blue-500 ring-offset-1 scale-110 bg-white shadow-md'
                                                                : 'hover:scale-110 hover:bg-white hover:shadow-sm'
                                                                }`}
                                                        >
                                                            {em}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Icon Background Color */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase">Icon Background</Label>
                                                <div className="flex gap-2">
                                                    {PASTEL_COLORS.map(({ name, hex }) => (
                                                        <button
                                                            key={hex}
                                                            type="button"
                                                            title={name}
                                                            onClick={() => updateCard('accent', hex)}
                                                            className={`w-8 h-8 rounded-full transition-all shadow-sm ${currentAccent === hex
                                                                ? 'ring-2 ring-blue-500 ring-offset-2 scale-110'
                                                                : 'hover:scale-105 hover:ring-2 hover:ring-slate-300 hover:ring-offset-1'
                                                                }`}
                                                            style={{ backgroundColor: hex }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase">Title</Label>
                                                <Input
                                                    value={card.title || ""}
                                                    onChange={(e) => updateCard('title', e.target.value)}
                                                    placeholder={def.title}
                                                    className="h-10 font-bold"
                                                />
                                            </div>

                                            {/* Description */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase">Description</Label>
                                                <textarea
                                                    className="w-full h-20 p-3 border rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                                                    value={card.desc || ""}
                                                    onChange={(e) => updateCard('desc', e.target.value)}
                                                    placeholder={def.desc}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </TabsContent>
                </Tabs>
            )}


            {/* ══ ITINERARY ═══════════════════════════════════════════════════ */}
            {activePage === "itinerary" && (
                <Tabs defaultValue="hero" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300" onValueChange={setActiveItineraryTab}>
                    <TabsList className="grid grid-cols-5 h-auto bg-slate-100/50 p-1 rounded-xl">
                        <TabsTrigger value="hero" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <ImageIcon className="h-4 w-4 mr-1.5" /> Hero & Banner
                        </TabsTrigger>
                        <TabsTrigger value="timeline" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Clock className="h-4 w-4 mr-1.5" /> Day Timeline
                        </TabsTrigger>
                        <TabsTrigger value="cards" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Layout className="h-4 w-4 mr-1.5" /> Overview Cards
                        </TabsTrigger>
                        <TabsTrigger value="sidebar" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <ShoppingCart className="h-4 w-4 mr-1.5" /> Sidebar & Pricing
                        </TabsTrigger>
                        <TabsTrigger value="trust" className="rounded-lg py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <ShieldCheck className="h-4 w-4 mr-1.5" /> Trust & Footer
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Hero & Banner ── */}
                    <TabsContent value="hero" className="space-y-6">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/5 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-indigo-500" /> Hero Section
                                </CardTitle>
                                <CardDescription>Customize the top banner of the itinerary page.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4 bg-transparent p-5 rounded-2xl border border-dashed border-slate-300">
                                        <div className="space-y-2">
                                            <Label className="font-bold">Background Image URL</Label>
                                            <Input
                                                value={localTheme.itin_hero_image || ""}
                                                onChange={(e) => handleChange("itin_hero_image", e.target.value)}
                                                placeholder="https://images.unsplash.com/..."
                                                className="h-10 bg-white"
                                            />
                                        </div>
                                        {localTheme.itin_hero_image && (
                                            <div className="relative group">
                                                <img src={localTheme.itin_hero_image} alt="Itinerary Hero Preview" className="w-full h-28 object-cover rounded-xl border-2 border-white shadow-md" />
                                            </div>
                                        )}
                                        <div className="space-y-3 pt-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-sm font-bold">Overlay Darkness</Label>
                                                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">{Math.round((localTheme.itin_hero_overlay_opacity ?? 0.5) * 100)}%</span>
                                            </div>
                                            <Slider
                                                value={[localTheme.itin_hero_overlay_opacity ?? 0.5]}
                                                min={0} max={1} step={0.05}
                                                onValueChange={([val]) => handleChange("itin_hero_overlay_opacity", val)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <ColorInput
                                            label="Destination Name Accent"
                                            id="itin_dest_accent"
                                            value={localTheme.itin_destination_accent_color}
                                            onChange={(v) => handleChange("itin_destination_accent_color", v)}
                                            description="Color for the destination name (e.g. 'Chennai') in the hero."
                                        />
                                        <div className="space-y-2">
                                            <Label className="font-semibold text-sm">Info Card Style</Label>
                                            <div className="flex gap-2">
                                                {['dark', 'light', 'transparent'].map((style) => (
                                                    <Button
                                                        key={style}
                                                        variant={localTheme.itin_info_card_style === style ? "default" : "outline"}
                                                        onClick={() => handleChange("itin_info_card_style", style)}
                                                        className="flex-1 capitalize font-bold"
                                                    >
                                                        {style}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Day Timeline ── */}
                    <TabsContent value="timeline" className="space-y-6">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/5 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-orange-500" /> Journey Timeline
                                </CardTitle>
                                <CardDescription>Customize day tabs, time labels, and badges.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-6">
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <ColorInput
                                        label="Active Day Tab"
                                        id="itin_active_day"
                                        value={localTheme.itin_active_day_color}
                                        onChange={(v) => handleChange("itin_active_day_color", v)}
                                        description="Background of the currently selected day."
                                    />
                                    <ColorInput
                                        label="DAY Badge Color"
                                        id="itin_day_badge"
                                        value={localTheme.itin_day_badge_color}
                                        onChange={(v) => handleChange("itin_day_badge_color", v)}
                                        description="Circle color for day numbers."
                                    />
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-sm">Activity Image Layout</Label>
                                        <div className="flex gap-2">
                                            {['compact', 'expanded'].map((layout) => (
                                                <Button
                                                    key={layout}
                                                    variant={localTheme.itin_activity_layout === layout ? "default" : "outline"}
                                                    onClick={() => handleChange("itin_activity_layout", layout)}
                                                    className="flex-1 capitalize font-bold"
                                                >
                                                    {layout}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Info className="h-4 w-4 text-blue-500" /> Time-of-Day Label Colors
                                    </h4>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <ColorInput label="Morning" id="itin_morning" value={localTheme.itin_morning_color} onChange={(v) => handleChange("itin_morning_color", v)} />
                                        <ColorInput label="Afternoon" id="itin_afternoon" value={localTheme.itin_afternoon_color} onChange={(v) => handleChange("itin_afternoon_color", v)} />
                                        <ColorInput label="Evening" id="itin_evening" value={localTheme.itin_evening_color} onChange={(v) => handleChange("itin_evening_color", v)} />
                                        <ColorInput label="Night" id="itin_night" value={localTheme.itin_night_color} onChange={(v) => handleChange("itin_night_color", v)} />
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-yellow-500" /> Badges & Tags
                                    </h4>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                                        <ColorInput label="AI Badge Color" id="itin_ai_badge" value={localTheme.itin_ai_badge_color} onChange={(v) => handleChange("itin_ai_badge_color", v)} />
                                        <ColorInput label="Overall Tag Color" id="itin_tag_color" value={localTheme.itin_tag_color} onChange={(v) => handleChange("itin_tag_color", v)} />
                                        <div className="flex items-center gap-2 p-4 bg-transparent rounded-xl border">
                                            <Checkbox
                                                id="show_ai_badge"
                                                checked={localTheme.itin_show_ai_badge ?? true}
                                                onCheckedChange={(checked) => handleChange("itin_show_ai_badge", checked)}
                                            />
                                            <Label htmlFor="show_ai_badge" className="text-sm font-bold cursor-pointer">Show AI Badge</Label>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Overview Cards ── */}
                    <TabsContent value="cards" className="space-y-6">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/5 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Layout className="h-5 w-5 text-blue-500" /> Trip Overview Cards
                                </CardTitle>
                                <CardDescription>Flights, Hotels, Activities, and Transfers cards.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-6">
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <ColorInput
                                        label="Icon Color"
                                        id="itin_icon_color"
                                        value={localTheme.itin_overview_icon_color}
                                        onChange={(v) => handleChange("itin_overview_icon_color", v)}
                                    />
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-sm">Card Background</Label>
                                        <div className="flex gap-2">
                                            {['white', 'tinted'].map((style) => (
                                                <Button
                                                    key={style}
                                                    variant={localTheme.itin_overview_card_style === style ? "default" : "outline"}
                                                    onClick={() => handleChange("itin_overview_card_style", style)}
                                                    className="flex-1 capitalize font-bold"
                                                >
                                                    {style}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-sm">Card Border/Shadow</Label>
                                        <div className="flex gap-2">
                                            {['none', 'subtle', 'shadow'].map((style) => (
                                                <Button
                                                    key={style}
                                                    variant={localTheme.itin_overview_card_border === style ? "default" : "outline"}
                                                    onClick={() => handleChange("itin_overview_card_border", style)}
                                                    className="flex-1 capitalize font-bold"
                                                >
                                                    {style}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <Separator />
                                <ColorInput
                                    label="Section Heading Border"
                                    id="itin_heading_border"
                                    value={localTheme.itin_heading_border_color}
                                    onChange={(v) => handleChange("itin_heading_border_color", v)}
                                    description="The color of the left border on 'Trip Overview' and 'Day-by-Day' headings."
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Sidebar & Pricing ── */}
                    <TabsContent value="sidebar" className="space-y-6">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/5 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5 text-emerald-500" /> Sidebar & Pricing
                                </CardTitle>
                                <CardDescription>Checkout sidebar and pricing highlights.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-6">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="font-semibold text-sm">Sidebar Background</Label>
                                            <div className="flex gap-2">
                                                {['navy', 'brand', 'white'].map((style) => (
                                                    <Button
                                                        key={style}
                                                        variant={localTheme.itin_sidebar_bg === style ? "default" : "outline"}
                                                        onClick={() => handleChange("itin_sidebar_bg", style)}
                                                        className="flex-1 capitalize font-bold"
                                                    >
                                                        {style}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <ColorInput
                                            label="Price Highlight Color"
                                            id="itin_price_color"
                                            value={localTheme.itin_price_color}
                                            onChange={(v) => handleChange("itin_price_color", v)}
                                        />
                                        <div className="flex items-center gap-2 p-4 bg-transparent rounded-xl border">
                                            <Checkbox
                                                id="show_trust_badges"
                                                checked={localTheme.itin_show_trust_badges ?? true}
                                                onCheckedChange={(checked) => handleChange("itin_show_trust_badges", checked)}
                                            />
                                            <Label htmlFor="show_trust_badges" className="text-sm font-bold cursor-pointer">Show Trust Badges (SSL/Instant)</Label>
                                        </div>
                                    </div>
                                    <div className="space-y-6 bg-transparent p-6 rounded-2xl border border-dashed border-slate-300">
                                        <div className="space-y-2">
                                            <Label className="font-bold">CTA Button Label</Label>
                                            <Input
                                                value={localTheme.itin_cta_text || ""}
                                                onChange={(e) => handleChange("itin_cta_text", e.target.value)}
                                                placeholder="Confirm & Pay Securely"
                                                className="h-10 bg-white font-bold"
                                            />
                                        </div>
                                        <ColorInput
                                            label="CTA Button Color"
                                            id="itin_cta_color"
                                            value={localTheme.itin_cta_color}
                                            onChange={(v) => handleChange("itin_cta_color", v)}
                                        />
                                        <div className="p-4 bg-white rounded-xl shadow-inner flex items-center justify-center">
                                            <Button
                                                className="w-full font-bold shadow-lg"
                                                style={{ backgroundColor: localTheme.itin_cta_color || localTheme.primary_color || '#3B82F6' }}
                                            >
                                                {localTheme.itin_cta_text || "Confirm & Pay Securely"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Trust & Confidence ── */}
                    <TabsContent value="trust" className="space-y-6">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-white/5 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-blue-500" /> Trust & Confidence Section
                                </CardTitle>
                                <CardDescription>Customize the "Why book with us?" section at the bottom of the itinerary.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-6">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 p-4 bg-transparent rounded-xl border">
                                            <Checkbox
                                                id="itin_show_trust_section"
                                                checked={localTheme.itin_show_trust_section ?? true}
                                                onCheckedChange={(checked) => handleChange("itin_show_trust_section", checked)}
                                            />
                                            <Label htmlFor="itin_show_trust_section" className="text-sm font-bold cursor-pointer">Show Trust Section</Label>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="font-bold">Section Heading</Label>
                                            <Input
                                                value={localTheme.itin_trust_title || ""}
                                                onChange={(e) => handleChange("itin_trust_title", e.target.value)}
                                                placeholder="Why book with RNT Tour?"
                                                className="h-10 bg-white font-bold"
                                            />
                                        </div>

                                        <ColorInput
                                            label="Heading Color"
                                            id="itin_trust_title_color"
                                            value={localTheme.itin_trust_title_color}
                                            onChange={(v) => handleChange("itin_trust_title_color", v)}
                                        />

                                        <ColorInput
                                            label="Section Background"
                                            id="itin_trust_section_bg"
                                            value={localTheme.itin_trust_section_bg}
                                            onChange={(v) => handleChange("itin_trust_section_bg", v)}
                                            description="Leave empty for default light grey."
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="font-semibold text-sm">Card Styling</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['flat', 'bordered', 'shadowed', 'colored'].map((style) => (
                                                <Button
                                                    key={style}
                                                    variant={localTheme.itin_trust_card_style === style ? "default" : "outline"}
                                                    onClick={() => handleChange("itin_trust_card_style", style)}
                                                    className="capitalize font-bold"
                                                >
                                                    {style}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Info className="h-4 w-4 text-blue-500" /> Trust Cards (3 Slots)
                                    </h4>
                                    <div className="grid gap-6">
                                        {(localTheme.itin_trust_cards || [
                                            { title: "Verified & Secure", desc: "Curated packages & 100% secure payments via reliable gateways.", icon: "ShieldCheck", color: "#3B82F6", bgColor: "#eff6ff" },
                                            { title: "Flexible & Transparent", desc: "Customizable plans with absolutely no hidden fees.", icon: "CheckCircle", color: "#10B981", bgColor: "#ecfdf5" },
                                            { title: "24/7 Expert Support", desc: "Instant confirmation & dedicated assistance throughout your trip.", icon: "Headphones", color: "#8B5CF6", bgColor: "#f5f3ff" }
                                        ]).map((card, idx) => (
                                            <div key={idx} className="p-6 bg-transparent rounded-2xl border border-slate-200">
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-bold">Title</Label>
                                                            <Input
                                                                value={card.title}
                                                                onChange={(e) => {
                                                                    const currCards = localTheme.itin_trust_cards || [
                                                                        { title: "Verified & Secure", desc: "Curated packages & 100% secure payments via reliable gateways.", icon: "ShieldCheck", color: "#3B82F6", bgColor: "#eff6ff" },
                                                                        { title: "Flexible & Transparent", desc: "Customizable plans with absolutely no hidden fees.", icon: "CheckCircle", color: "#10B981", bgColor: "#ecfdf5" },
                                                                        { title: "24/7 Expert Support", desc: "Instant confirmation & dedicated assistance throughout your trip.", icon: "Headphones", color: "#8B5CF6", bgColor: "#f5f3ff" }
                                                                    ];
                                                                    const newCards = [...currCards];
                                                                    newCards[idx] = { ...newCards[idx], title: e.target.value };
                                                                    handleChange("itin_trust_cards", newCards);
                                                                }}
                                                                className="h-9 bg-white font-semibold"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-bold">Description</Label>
                                                            <Textarea
                                                                value={card.desc}
                                                                onChange={(e) => {
                                                                    const currCards = localTheme.itin_trust_cards || [
                                                                        { title: "Verified & Secure", desc: "Curated packages & 100% secure payments via reliable gateways.", icon: "ShieldCheck", color: "#3B82F6", bgColor: "#eff6ff" },
                                                                        { title: "Flexible & Transparent", desc: "Customizable plans with absolutely no hidden fees.", icon: "CheckCircle", color: "#10B981", bgColor: "#ecfdf5" },
                                                                        { title: "24/7 Expert Support", desc: "Instant confirmation & dedicated assistance throughout your trip.", icon: "Headphones", color: "#8B5CF6", bgColor: "#f5f3ff" }
                                                                    ];
                                                                    const newCards = [...currCards];
                                                                    newCards[idx] = { ...newCards[idx], desc: e.target.value };
                                                                    handleChange("itin_trust_cards", newCards);
                                                                }}
                                                                className="min-h-[60px] bg-white text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-bold">Icon Color</Label>
                                                                <IconBgPicker
                                                                    value={card.color || "#3B82F6"}
                                                                    onChange={(v) => {
                                                                        const currCards = localTheme.itin_trust_cards || [
                                                                            { title: "Verified & Secure", desc: "Curated packages & 100% secure payments via reliable gateways.", icon: "ShieldCheck", color: "#3B82F6", bgColor: "#eff6ff" },
                                                                            { title: "Flexible & Transparent", desc: "Customizable plans with absolutely no hidden fees.", icon: "CheckCircle", color: "#10B981", bgColor: "#ecfdf5" },
                                                                            { title: "24/7 Expert Support", desc: "Instant confirmation & dedicated assistance throughout your trip.", icon: "Headphones", color: "#8B5CF6", bgColor: "#f5f3ff" }
                                                                        ];
                                                                        const newCards = [...currCards];
                                                                        newCards[idx] = { ...newCards[idx], color: v };
                                                                        handleChange("itin_trust_cards", newCards);
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-bold">Icon BG Color</Label>
                                                                <IconBgPicker
                                                                    value={card.bgColor || "#eff6ff"}
                                                                    onChange={(v) => {
                                                                        const currCards = localTheme.itin_trust_cards || [
                                                                            { title: "Verified & Secure", desc: "Curated packages & 100% secure payments via reliable gateways.", icon: "ShieldCheck", color: "#3B82F6", bgColor: "#eff6ff" },
                                                                            { title: "Flexible & Transparent", desc: "Customizable plans with absolutely no hidden fees.", icon: "CheckCircle", color: "#10B981", bgColor: "#ecfdf5" },
                                                                            { title: "24/7 Expert Support", desc: "Instant confirmation & dedicated assistance throughout your trip.", icon: "Headphones", color: "#8B5CF6", bgColor: "#f5f3ff" }
                                                                        ];
                                                                        const newCards = [...currCards];
                                                                        newCards[idx] = { ...newCards[idx], bgColor: v };
                                                                        handleChange("itin_trust_cards", newCards);
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
            {/* Riverside */}
            {/* ══ MY BOOKINGS ═════════════════════════════════════════════════ */}
            {activePage === "bookings" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <ComingSoon pageName="My Bookings" />
                </div>
            )}

            {/* ══ CART ════════════════════════════════════════════════════════ */}
            {activePage === "cart" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <ComingSoon pageName="Cart" />
                </div>
            )}
        </div>
    );
}
