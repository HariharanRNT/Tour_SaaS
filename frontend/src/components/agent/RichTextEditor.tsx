'use client'

import React, { useRef, useEffect, useState } from 'react';
import { Bold } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    minHeight?: string;
    maxLength?: number;
    label?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
    value, 
    onChange, 
    placeholder, 
    className,
    minHeight = '120px',
    maxLength,
    label
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isBold, setIsBold] = useState(false);

    // Update editor content when value changes externally (but not during typing)
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const checkFormat = () => {
        setIsBold(document.queryCommandState('bold'));
    };

    const handleInput = () => {
        if (editorRef.current) {
            const content = editorRef.current.innerHTML;
            if (maxLength && editorRef.current.innerText.length > maxLength) {
                // Optional: truncate or just prevent typing
                // For now, let's just let it be but show red count
            }
            onChange(content);
        }
    };

    const handleBold = (e: React.MouseEvent) => {
        e.preventDefault();
        document.execCommand('bold', false);
        checkFormat();
        editorRef.current?.focus();
    };

    const charCount = editorRef.current?.innerText.length || 0;

    return (
        <div className={cn("space-y-1 w-full", className)}>
            <div className="flex items-center justify-between px-1 mb-1">
                <Label className="text-xs font-bold text-black">
                    {label} {maxLength && <span className={cn("font-normal text-black/60", charCount > maxLength && "text-red-500")}>({charCount}/{maxLength})</span>}
                </Label>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn("h-7 w-7 p-0 hover:bg-slate-200 text-black", isBold ? "bg-slate-200" : "")} 
                    onMouseDown={handleBold} 
                    title="Bold"
                >
                    <Bold className="h-3.5 w-3.5" />
                </Button>
            </div>
            <div
                ref={editorRef}
                contentEditable
                onInput={() => { handleInput(); checkFormat(); }}
                onKeyUp={checkFormat}
                onMouseUp={checkFormat}
                className={cn(
                    "w-full rounded-2xl glass-input text-xs p-4 focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-y-auto bg-white/50",
                    !value && "before:content-[attr(data-placeholder)] before:text-slate-400 before:pointer-events-none"
                )}
                style={{ minHeight }}
                data-placeholder={placeholder}
            />
        </div>
    );
};

export default RichTextEditor;
