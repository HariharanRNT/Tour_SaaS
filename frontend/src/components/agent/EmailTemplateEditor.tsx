"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Save, 
  RotateCcw, 
  Send, 
  Eye, 
  Type,
  ChevronRight, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Smartphone,
  Monitor,
  MousePointer2,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Trash2,
  ExternalLink,
  ChevronDown,
  Layout,
  Globe
} from "lucide-react";
import { DEFAULT_STRUCTURED_CONTENT, MASTER_SHELLS, StructuredEmailContent } from "@/constants/email-structured-defaults";
import { EMAIL_VARIABLES, EmailTemplateType } from "@/constants/email-variables";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import api, { API_URL, uploadFileToS3 } from "@/lib/api";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-upload-utils";

interface EmailTemplateEditorProps {
  initialTemplates?: Record<string, any>;
  onSave?: (templates: Record<string, any>) => Promise<void>;
  agencyLogo?: string;
}

const TEMPLATE_OPTIONS = [
  { id: "booking_confirmation", label: "Booking Confirmed" },
  { id: "travel_itinerary", label: "Travel Itinerary" },
  { id: "payment_receipt", label: "Payment Receipt" },
  { id: "booking_cancellation", label: "Booking Cancelled" },
  { id: "trip_reminder", label: "Reminder Notification" },
  { id: "confirmation_email", label: "Confirmation Email Customizer" },
];

const PREVIEW_DATA: Record<string, string> = {
    agency_name:        "Your Agency",
    customer_name:      "Test Customer",
    booking_reference:  "BK-TEST-12345",
    package_name:       "Majestic Maldives Getaway",
    travel_date:        "2026-06-15",
    total_amount:       "75,000.00",
    amount_paid:        "75,000.00",
    payment_method:     "Online Payment",
    payment_date:       "2026-05-12",
    itinerary_summary:  "5 Days / 4 Nights in Maldives",
    refund_amount:      "75,000.00",
    refund_timeline:    "5-7 business days",
    departure_date:     "2026-06-15",
    days_until_travel:  "30",
    agent_name:         "Your Agent",
    agent_contact:      "+91 00000 00000",
    agent_email:        "agent@example.com",
    agent_phone:        "+91 00000 00000",
    invoice_number:     "INV-TEST-001",
};

const replacePreviewVars = (html: string): string => {
    return html.replace(/\{\{(\w+)\}\}/g, (_, key) => PREVIEW_DATA[key] || `{{${key}}}`);
};

const normalizeEditableContent = (html: string): string => {
    // Step 1: Normalize block tags to newlines
    let text = html
        .replace(/<div><br\s*\/?><\/div>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<div>/gi, '')
        .replace(/<\/p>/gi, '\n')
        .replace(/<p>/gi, '')
        .replace(/^\n+/, '')
        .replace(/\n+$/, '');

    // Step 2: Convert &nbsp; to real spaces first
    text = text.replace(/&nbsp;/gi, ' ');

    // Step 3: For each line, convert leading spaces to &nbsp;
    // so they survive email client stripping
    const lines = text.split('\n');
    const processedLines = lines.map(line => {
        const match = line.match(/^(\s+)(.*)/);
        if (match) {
            const leadingSpaces = match[1].length;
            const content = match[2];
            // Convert each leading space to &nbsp;
            return '&nbsp;'.repeat(leadingSpaces) + content;
        }
        return line;
    });

    return processedLines.join('\n');
};

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({ 
  initialTemplates = {}, 
  onSave,
  agencyLogo = "https://toursaas.s3.us-east-1.amazonaws.com/logo.png"
}) => {
  const [activeTab, setActiveTab] = useState<EmailTemplateType>("booking_confirmation");
  const [sidebarTab, setSidebarTab] = useState<"types" | "images" | "variables">("types");
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);
  const headerFileRef = useRef<HTMLInputElement>(null);
  const bodyFileRef = useRef<HTMLInputElement>(null);
  
  // Initialize state from initialTemplates or defaults
  const [templates, setTemplates] = useState<Record<string, StructuredEmailContent>>(() => {
    const state: any = { ...DEFAULT_STRUCTURED_CONTENT };
    Object.keys(initialTemplates).forEach(key => {
      if (typeof initialTemplates[key] === 'object' && initialTemplates[key] !== null) {
        state[key] = { ...state[key], ...initialTemplates[key] };
      }
    });
    return state;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [dirtyTabs, setDirtyTabs] = useState<Record<string, boolean>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isDirty = Object.values(dirtyTabs).some(v => v);
  useUnsavedChanges(isDirty);

  // Sync with initial templates when they load
  useEffect(() => {
    if (Object.keys(initialTemplates).length > 0) {
      setTemplates(prev => {
        const next = { ...prev };
        Object.keys(initialTemplates).forEach(key => {
            if (typeof initialTemplates[key] === 'object' && initialTemplates[key] !== null) {
                next[key] = { ...next[key], ...initialTemplates[key] };
            }
        });
        return next;
      });
    }
  }, [initialTemplates]);

  // Inject content and setup contentEditable
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const content = templates[activeTab];
    const html = MASTER_SHELLS[activeTab](content);
    const previewHtml = replacePreviewVars(html);
    
    // Minimal reset + custom styles for editable elements
    const styledHtml = `
      <style>
        body { margin: 0; padding: 20px; background: rgba(255, 255, 255, 0.05); display: flex; justify-content: center; }
        [data-edit] { 
          position: relative; 
          outline: none; 
          transition: all 0.2s;
          border: 1px dashed transparent;
          border-radius: 4px;
          cursor: text;
        }
        [data-edit]:hover { 
          background-color: rgba(59, 130, 246, 0.05); 
          border-color: rgba(59, 130, 246, 0.3);
        }
        [data-edit]:focus { 
          background-color: white; 
          border-color: #3b82f6; 
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
          border-style: solid;
        }
        /* Hide dashed border when not in focus if desired, but good for UX */
      </style>
      ${previewHtml}
    `;

    doc.open();
    doc.write(styledHtml);
    doc.close();

    // Attach listeners
    const editableElements = doc.querySelectorAll("[data-edit]");
    editableElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.contentEditable = "true";
      
      htmlEl.oninput = (e: any) => {
        const field = htmlEl.getAttribute("data-edit") as keyof StructuredEmailContent;
        if (!field) return;

        const newValue = normalizeEditableContent(htmlEl.innerHTML);
        
        setTemplates(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            [field]: newValue
          }
        }));

        setDirtyTabs(prev => ({
          ...prev,
          [activeTab]: true
        }));
      };
    });
  }, [activeTab]); // Only re-run when changing tabs. Edits update state but we don't want to re-write the iframe every keystroke.

  const handleReset = () => {
    toast("Reset template to original?", {
      description: "This will discard all your custom edits for this template.",
      action: {
        label: "Reset",
        onClick: () => {
          setTemplates(prev => ({
            ...prev,
            [activeTab]: DEFAULT_STRUCTURED_CONTENT[activeTab]
          }));
          setDirtyTabs(prev => ({ ...prev, [activeTab]: true }));
          
          const iframe = iframeRef.current;
          if (iframe) {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc) {
                doc.open();
                doc.write(MASTER_SHELLS[activeTab](DEFAULT_STRUCTURED_CONTENT[activeTab]));
                doc.close();
                setActiveTab(prev => prev); 
            }
          }
          toast.success("Template reset successful");
        }
      },
      cancel: {
        label: "Cancel",
        onClick: () => console.log("Reset cancelled")
      }
    });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(templates);
      } else {
        await api.put("/agent/settings/homepage", {
          homepage_settings: {
              email_templates: templates
          }
        });
      }
      toast.success("Templates saved!");
      setDirtyTabs({});
    } catch (error) {
      toast.error("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }
    setIsTesting(true);
    try {
      await api.post("/agent/settings/email/test", {
        template_type: activeTab,
        structured_content: templates[activeTab],
        test_email: testEmail
      });
      toast.success(`Test email sent!`);
    } catch (error: any) {
      toast.error(`Failed: ${error.response?.data?.detail || "Check SMTP"}`);
    } finally {
      setIsTesting(false);
    }
  };

  const updateActiveTemplate = (updates: Partial<StructuredEmailContent>) => {
    setTemplates(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        ...updates
      }
    }));
    setDirtyTabs(prev => ({
      ...prev,
      [activeTab]: true
    }));
  };

  const handleImageUpload = async (type: 'header' | 'body', file: File) => {
    const isHeader = type === 'header';
    if (isHeader) setUploadingHeader(true); else setUploadingBody(true);
    
    const toastId = toast.loading(`Uploading ${type} image...`);
    
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be less than 5MB");
      
      const compressedFile = await compressImage(file, {
        maxWidthOrHeight: isHeader ? 800 : 1200,
        initialQuality: 0.8
      });

      // Upload via backend proxy (avoids S3 CORS issues from Vercel)
      const finalUrl = await uploadFileToS3(compressedFile, 'email-templates');
      if (!finalUrl) {
        throw new Error('Upload failed. Please check your connection and try again.');
      }

      if (isHeader) {
        updateActiveTemplate({ header_image_url: finalUrl, show_header: true });
      } else {
        const currentBodyImage = templates[activeTab].body_image || { width: '100%', alt: '', align: 'center' };
        updateActiveTemplate({ 
          body_image: { ...currentBodyImage, url: finalUrl },
          show_body_image: true 
        });
      }
      
      toast.success(`${type === 'header' ? 'Header' : 'Body'} image updated!`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message || "Upload failed", { id: toastId });
    } finally {
      if (isHeader) setUploadingHeader(false); else setUploadingBody(false);
    }
  };

  const insertVariable = (variable: string) => {
    toast.info(`To use ${variable}, simply type it into the text field where you want it to appear.`);
  };

  return (
    <div className="flex flex-col min-h-[900px] h-[calc(100vh-160px)] border border-white/30 rounded-[32px] overflow-hidden bg-white/10 backdrop-blur-3xl shadow-[0_32px_128px_-12px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-8 border-b border-white/10 bg-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
            <MousePointer2 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black tracking-tight">Visual Email Customizer</h2>
            <p className="text-sm text-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Click any text in the preview to edit directly
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input
            type="email"
            placeholder="Test Email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-black placeholder-black/40 w-48"
          />
          <button
            onClick={handleSendTest}
            disabled={isTesting || !testEmail}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-black hover:text-black/70 transition-all bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl disabled:opacity-50"
          >
            {isTesting ? "Sending..." : <><Send className="w-4 h-4" /> Send Test</>}
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving || !isDirty}
            className={`flex items-center gap-2 px-8 py-2.5 text-sm font-bold rounded-xl transition-all shadow-xl ${
              isDirty 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 border border-white/20" 
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-white/10 bg-white/10 backdrop-blur-md overflow-y-auto hidden md:flex flex-col">
          {/* Sidebar Tabs */}
          <div className="flex p-2 gap-1 border-b border-white/5 bg-black/5">
            {[
              { id: 'types', icon: Layout, label: 'Templates' },
              { id: 'images', icon: ImageIcon, label: 'Visuals' },
              { id: 'variables', icon: Info, label: 'Guide' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all ${
                  sidebarTab === tab.id 
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                    : "text-black/40 hover:text-black hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {sidebarTab === 'types' && (
              <div className="p-4 space-y-2">
                <h3 className="text-[10px] font-bold text-black uppercase tracking-[0.2em] px-4 mb-4">Email Types</h3>
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setActiveTab(opt.id as EmailTemplateType)}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all duration-300 group ${
                      activeTab === opt.id
                        ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-inner"
                        : "text-black/70 hover:bg-white/5 hover:text-black border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                        <Type className={`w-4 h-4 ${activeTab === opt.id ? "text-blue-400" : "text-black"}`} />
                        <span className="text-sm font-semibold">{opt.label}</span>
                    </div>
                    {dirtyTabs[opt.id] && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {sidebarTab === 'images' && (
              <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Header Image Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-black uppercase tracking-widest">Header / Logo</h3>
                    <button 
                      onClick={() => updateActiveTemplate({ show_header: !templates[activeTab].show_header })}
                      className={`w-8 h-4 rounded-full transition-all relative ${templates[activeTab].show_header ? 'bg-blue-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all ${templates[activeTab].show_header ? 'translate-x-4' : ''}`} />
                    </button>
                  </div>

                  {templates[activeTab].show_header && (
                    <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="relative aspect-video bg-black/10 rounded-xl overflow-hidden group border border-dashed border-white/20 hover:border-blue-500/50 transition-all">
                        <img 
                          src={templates[activeTab].header_image_url || agencyLogo} 
                          alt="Header" 
                          className="w-full h-full object-contain p-4"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                           <button 
                            onClick={() => headerFileRef.current?.click()}
                            className="p-2 bg-white rounded-full text-black hover:bg-blue-500 hover:text-white transition-all scale-90 group-hover:scale-100"
                           >
                            <Upload className="w-4 h-4" />
                           </button>
                           <button 
                            onClick={() => updateActiveTemplate({ header_image_url: agencyLogo })}
                            className="p-2 bg-white rounded-full text-black hover:bg-orange-500 hover:text-white transition-all scale-90 group-hover:scale-100"
                            title="Reset to Agency Logo"
                           >
                            <RotateCcw className="w-4 h-4" />
                           </button>
                        </div>
                        {uploadingHeader && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-[10px] gap-2">
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Uploading...
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/50 uppercase">Logo Height</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" min="30" max="120" 
                            value={parseInt(templates[activeTab].header_image_height || '40')} 
                            onChange={(e) => updateActiveTemplate({ header_image_height: e.target.value + 'px' })}
                            className="flex-1 accent-blue-500"
                          />
                          <span className="text-xs font-mono w-10">{templates[activeTab].header_image_height || '40px'}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/50 uppercase">Direct Image URL</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-black/40" />
                            <input 
                              type="text" 
                              placeholder="https://..."
                              className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              value={templates[activeTab].header_image_url || ''}
                              onChange={(e) => updateActiveTemplate({ header_image_url: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {sidebarTab === 'variables' && (
              <div className="p-6 border-t border-white/10">
                <h3 className="text-[10px] font-bold text-black uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                  <Info className="w-3.5 h-3.5" /> Guide
                </h3>
                <div className="space-y-4">
                    <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                        <p className="text-[11px] text-black leading-relaxed">
                            Insert variables by typing them manually (e.g. <code className="text-blue-400 bg-blue-500/10 px-1 rounded">{"{{customer_name}}"}</code>) into any editable area.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-black mb-2 uppercase tracking-wider">Available Keys:</h4>
                        <div className="flex flex-wrap gap-1.5">
                        {EMAIL_VARIABLES[activeTab].map((variable) => (
                            <button
                            key={variable.value}
                            onClick={() => insertVariable(variable.value)}
                            className="px-2.5 py-1.5 text-[9px] bg-slate-900/5 hover:bg-slate-900/10 text-black hover:text-black rounded-lg border border-white/5 transition-all font-mono"
                            >
                            {variable.value}
                            </button>
                        ))}
                        </div>
                    </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Hidden inputs */}
          <input 
            type="file" ref={headerFileRef} 
            className="hidden" accept="image/png, image/jpeg, image/webp" 
            onChange={(e) => e.target.files?.[0] && handleImageUpload('header', e.target.files[0])} 
          />
          <input 
            type="file" ref={bodyFileRef} 
            className="hidden" accept="image/png, image/jpeg, image/webp" 
            onChange={(e) => e.target.files?.[0] && handleImageUpload('body', e.target.files[0])} 
          />
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-4">
                <div className="flex p-1.5 bg-slate-950/50 rounded-xl border border-white/10">
                    <button 
                        onClick={() => setPreviewMode("desktop")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${previewMode === "desktop" ? "bg-white/20 text-black shadow-lg" : "text-black/60 hover:text-black"}`}
                    >
                        <Monitor className="w-3.5 h-3.5" /> Desktop
                    </button>
                    <button 
                        onClick={() => setPreviewMode("mobile")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${previewMode === "mobile" ? "bg-white/20 text-black shadow-lg" : "text-black/60 hover:text-black"}`}
                    >
                        <Smartphone className="w-3.5 h-3.5" /> Mobile
                    </button>
                </div>
            </div>

            <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-black/60 hover:text-red-600 transition-all hover:bg-red-500/5 rounded-lg"
            >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to Original
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="flex justify-center">
                <div 
                    className={`bg-white/20 backdrop-blur-2xl rounded-[32px] shadow-[0_48px_100px_-24px_rgba(0,0,0,0.5)] transition-all duration-700 border border-white/30 p-2 md:p-6 mb-8 ${
                    previewMode === "mobile" ? "w-[375px]" : "w-full max-w-[750px]"
                    }`}
                >
                    <iframe
                        ref={iframeRef}
                        title="Template Editor"
                        className="w-full border-none bg-white rounded-2xl shadow-xl"
                        style={{ height: '1400px' }}
                    />
                </div>
              </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-[11px] text-black">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium">Direct Edit Mode Active</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Changes are saved as structured content</span>
          </div>
        </div>
        <div>
          {isDirty && (
            <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 font-bold animate-pulse">
                Unsaved edits for ${TEMPLATE_OPTIONS.find(t => t.id === activeTab)?.label}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default EmailTemplateEditor;
