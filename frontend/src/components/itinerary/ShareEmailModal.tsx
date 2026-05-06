'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { emailShareSchema } from '@/lib/validations/emailShare';
import { z } from 'zod';
import { toast } from 'sonner';

interface ShareEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageName: string;
  packageId: string;
  agentId: string;
}

type ModalState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

export const ShareEmailModal: React.FC<ShareEmailModalProps> = ({
  isOpen,
  onClose,
  packageName,
  packageId,
  agentId,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ModalState>('IDLE');

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError(null);
      setState('IDLE');
    }
  }, [isOpen]);

  useEffect(() => {
    if (state === 'SUCCESS') {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim();
    
    try {
      emailShareSchema.parse({ recipientEmail: trimmedEmail });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setState('LOADING');
    setError(null);

    try {
      const response = await fetch('/api/share-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: trimmedEmail,
          packageId,
          agentId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send email');
      }

      setState('SUCCESS');
      toast.success('Itinerary sent successfully!');
    } catch (err: any) {
      console.error('Share email error:', err);
      setState('ERROR');
      setError('Failed to send email. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
        <DialogHeader className="px-8 pt-8 pb-4 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4 rounded-full hover:bg-slate-100 transition-colors text-slate-900"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            Share Itinerary via Email
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium pt-2">
            Share <span className="text-blue-600 font-bold italic">"{packageName}"</span> with your companions or clients.
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 pb-8">
          {state === 'SUCCESS' ? (
            <div className="py-12 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sent Successfully!</h3>
              <p className="text-slate-500 font-medium">
                Itinerary sent successfully to <br />
                <span className="text-emerald-600 font-bold">{email}</span>!
              </p>
              <p className="text-slate-400 text-xs mt-8">Closing automatically in 3 seconds...</p>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-slate-700 flex items-center gap-1">
                  Recipient Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="text"
                    placeholder="Enter email address"
                    value={email}
                    onChange={handleEmailChange}
                    disabled={state === 'LOADING'}
                    className={`h-12 rounded-xl border-slate-200 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 transition-all ${
                      error ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'hover:border-blue-300'
                    }`}
                  />
                  {error && (
                    <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold mt-2 animate-in slide-in-from-top-1">
                      <AlertCircle className="h-3 w-3" />
                      {error}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={state === 'LOADING'}
                  className="h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50 sm:flex-1 text-slate-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={state === 'LOADING'}
                  className="h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 sm:flex-1 transition-all"
                >
                  {state === 'LOADING' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
