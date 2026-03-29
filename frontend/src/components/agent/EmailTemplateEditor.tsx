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
  MousePointer2
} from "lucide-react";
import { DEFAULT_STRUCTURED_CONTENT, MASTER_SHELLS, StructuredEmailContent } from "@/constants/email-structured-defaults";
import { EMAIL_VARIABLES, EmailTemplateType } from "@/constants/email-variables";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import api from "@/lib/api";
import { toast } from "sonner";

interface EmailTemplateEditorProps {
  initialTemplates?: Record<string, any>;
  onSave?: (templates: Record<string, any>) => Promise<void>;
}

const TEMPLATE_OPTIONS = [
  { id: "booking_confirmation", label: "Booking Confirmed" },
  { id: "travel_itinerary", label: "Travel Itinerary" },
  { id: "payment_receipt", label: "Payment Receipt" },
  { id: "booking_cancellation", label: "Booking Cancelled" },
  { id: "trip_reminder", label: "Reminder Notification" },
];

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({ 
  initialTemplates = {}, 
  onSave 
}) => {
  const [activeTab, setActiveTab] = useState<EmailTemplateType>("booking_confirmation");
  
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
      ${html}
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

        const newValue = htmlEl.innerText;
        
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
    if (confirm("Reset this template to default?")) {
      setTemplates(prev => ({
        ...prev,
        [activeTab]: DEFAULT_STRUCTURED_CONTENT[activeTab]
      }));
      setDirtyTabs(prev => ({ ...prev, [activeTab]: true }));
      
      // Force iframe update
      const iframe = iframeRef.current;
      if (iframe) {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(MASTER_SHELLS[activeTab](DEFAULT_STRUCTURED_CONTENT[activeTab]));
            doc.close();
            // Note: need to re-attach listeners if we do this, better to just change activeTab briefly or trigger effect.
            setActiveTab(prev => prev); 
        }
      }
    }
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
    setIsTesting(true);
    try {
      // For test endpoint, we need to send the RENDERED HTML
      const html = MASTER_SHELLS[activeTab](templates[activeTab]);
      await api.post("/agent/settings/email/test", {
        template_type: activeTab,
        html_content: html
      });
      toast.success(`Test email sent!`);
    } catch (error: any) {
      toast.error(`Failed: ${error.response?.data?.detail || "Check SMTP"}`);
    } finally {
      setIsTesting(false);
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
            <h2 className="text-xl font-bold text-white tracking-tight">Visual Email Customizer</h2>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Click any text in the preview to edit directly
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleSendTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-all bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl disabled:opacity-50"
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
        <div className="w-72 border-r border-white/10 bg-white/10 backdrop-blur-md overflow-y-auto hidden md:block">
          <div className="p-4 space-y-2">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-4 mb-4">Email Types</h3>
            {TEMPLATE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveTab(opt.id as EmailTemplateType)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all duration-300 group ${
                  activeTab === opt.id
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-inner"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                    <Type className={`w-4 h-4 ${activeTab === opt.id ? "text-blue-400" : "text-slate-500"}`} />
                    <span className="text-sm font-semibold">{opt.label}</span>
                </div>
                {dirtyTabs[opt.id] && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                )}
              </button>
            ))}
          </div>
          
          <div className="mt-6 p-6 border-t border-white/10">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
              <Info className="w-3.5 h-3.5" /> Guide
            </h3>
            <div className="space-y-4">
                <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Insert variables by typing them manually (e.g. <code className="text-blue-400 bg-blue-500/10 px-1 rounded">{"{{customer_name}}"}</code>) into any editable area.
                    </p>
                </div>
                <div>
                    <h4 className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Available Keys:</h4>
                    <div className="flex flex-wrap gap-1.5">
                    {EMAIL_VARIABLES[activeTab].map((variable) => (
                        <button
                        key={variable.value}
                        onClick={() => insertVariable(variable.value)}
                        className="px-2.5 py-1.5 text-[9px] bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-white/5 transition-all font-mono"
                        >
                        {variable.value}
                        </button>
                    ))}
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-4">
                <div className="flex p-1.5 bg-slate-950/50 rounded-xl border border-white/10">
                    <button 
                        onClick={() => setPreviewMode("desktop")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${previewMode === "desktop" ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                    >
                        <Monitor className="w-3.5 h-3.5" /> Desktop
                    </button>
                    <button 
                        onClick={() => setPreviewMode("mobile")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${previewMode === "mobile" ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                    >
                        <Smartphone className="w-3.5 h-3.5" /> Mobile
                    </button>
                </div>
            </div>

            <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-400 transition-all hover:bg-red-500/5 rounded-lg"
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
      <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-[11px] text-slate-500">
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
