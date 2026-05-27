import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmailLog } from "@/services/adminEmailLogService";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Clock, Send, RotateCw, ServerCrash, XCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  log: EmailLog | null;
}

export const EmailLogDetailsModal: React.FC<Props> = ({ isOpen, onClose, log }) => {
  const [sidebarWidth, setSidebarWidth] = React.useState('260px');
  
  React.useEffect(() => {
    if (isOpen) {
      const adminPanel = document.querySelector('.admin-panel > div:nth-child(2)') as HTMLElement;
      if (adminPanel) {
         setSidebarWidth(adminPanel.style.marginLeft || '260px');
      }
    }
  }, [isOpen]);

  if (!log) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT': return <Badge className="bg-green-100 text-green-800 border-green-200"><Send className="w-3 h-3 mr-1" /> Sent</Badge>;
      case 'PENDING': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'PROCESSING': return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><RotateCw className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'FAILED': return <Badge variant="destructive"><ServerCrash className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'RETRY': return <Badge className="bg-orange-100 text-orange-800 border-orange-200"><RotateCw className="w-3 h-3 mr-1" /> Retrying ({log.retry_count}/{log.max_retries})</Badge>;
      case 'EXPIRED': return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'PPpp');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] flex flex-col bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] rounded-3xl overflow-hidden"
        overlayClass="bg-slate-900/20 backdrop-blur-sm"
        overlayStyle={{ left: sidebarWidth }}
        style={{ 
          left: `calc(${sidebarWidth} + (100vw - ${sidebarWidth}) / 2)`,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2), 0 8px 32px 0 rgba(0,0,0,0.2)'
        }}
      >
        <DialogHeader>
          <div className="flex justify-between items-start mr-4">
            <div>
              <DialogTitle className="text-xl flex items-center gap-3">
                {log.subject}
                {getStatusBadge(log.status)}
              </DialogTitle>
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p><strong>To:</strong> {log.recipient_email}</p>
                <p><strong>Task ID:</strong> {log.celery_task_id || 'N/A'}</p>
                <p><strong>Type:</strong> {log.email_type} | <strong>Sender:</strong> {log.sender_type}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="details">Details & Timeline</TabsTrigger>
            <TabsTrigger value="preview">HTML Preview</TabsTrigger>
            <TabsTrigger value="error" disabled={!log.error_message && !log.email_provider_response}>
              Errors & Diagnostics
            </TabsTrigger>
            <TabsTrigger value="metadata" disabled={!log.attachment_urls}>
              Attachments
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4 border rounded-md p-4">
            <TabsContent value="details" className="m-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm border-b pb-1">Timeline</h4>
                  <p className="text-sm"><strong>Created:</strong> {formatDate(log.created_at)}</p>
                  <p className="text-sm"><strong>Processing Started:</strong> {formatDate(log.processing_started_at)}</p>
                  <p className="text-sm"><strong>Sent:</strong> {formatDate(log.sent_time)}</p>
                  <p className="text-sm"><strong>Scheduled For:</strong> {formatDate(log.scheduled_time)}</p>
                  <p className="text-sm text-red-600"><strong>Expires At:</strong> {formatDate(log.expires_at)}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm border-b pb-1">Queue Info</h4>
                  <p className="text-sm"><strong>Queue:</strong> {log.queue_name || 'default'}</p>
                  <p className="text-sm"><strong>Priority:</strong> {log.priority} / 10</p>
                  <p className="text-sm"><strong>Retries:</strong> {log.retry_count} / {log.max_retries}</p>
                  {log.template_name && <p className="text-sm"><strong>Template:</strong> {log.template_name}</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="m-0">
              {log.html_body ? (
                <div className="bg-white border rounded-md p-4 min-h-[400px]">
                  <iframe 
                    srcDoc={log.html_body} 
                    className="w-full min-h-[400px] border-0"
                    title="Email Preview"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                  <p>No HTML body available for preview.</p>
                  {log.template_name && <p className="text-sm mt-2">This email used template: {log.template_name}</p>}
                </div>
              )}
            </TabsContent>

            <TabsContent value="error" className="m-0 space-y-4">
              {log.error_message && (
                <div>
                  <h4 className="font-semibold text-sm text-red-600 mb-2">Error Message</h4>
                  <pre className="bg-red-50 text-red-900 p-3 rounded-md text-sm whitespace-pre-wrap font-mono">
                    {log.error_message}
                  </pre>
                </div>
              )}
              {log.email_provider_response && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Provider Response (SMTP/API)</h4>
                  <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap font-mono">
                    {log.email_provider_response}
                  </pre>
                </div>
              )}
            </TabsContent>

            <TabsContent value="metadata" className="m-0">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm mb-2">Attachments</h4>
                {log.attachment_urls && Array.isArray(log.attachment_urls) && log.attachment_urls.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {log.attachment_urls.map((att: any, i: number) => (
                      <li key={i} className="text-sm">
                        <a href={att.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {att.filename || 'Attachment'}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No attachments found.</p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
