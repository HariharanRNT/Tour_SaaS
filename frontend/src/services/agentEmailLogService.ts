import { api } from '@/lib/api';

export interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  status: string;
  created_at: string;
  sender_type: string;
  email_type: string;
  retry_count: number;
  error_message?: string;
  email_provider_response?: string;
  html_body?: string;
  template_name?: string;
  celery_task_id?: string;
  queue_name?: string;
  priority: number;
  scheduled_time?: string;
  processing_started_at?: string;
  sent_time?: string;
  expires_at?: string;
  max_retries: number;
  attachment_urls?: any;
}

export interface EmailLogStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  expired: number;
}

export interface EmailLogResponse {
  data: EmailLog[];
  total: number;
  page: number;
  limit: number;
}

export const agentEmailLogService = {
  getStats: async (): Promise<EmailLogStats> => {
    const response = await api.get('/agent/email-logs/stats');
    return response.data;
  },

  getLogs: async (page = 1, limit = 20, status?: string, search?: string): Promise<EmailLogResponse> => {
    let url = `/agent/email-logs/?page=${page}&limit=${limit}`;
    if (status && status !== 'ALL') url += `&status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    const response = await api.get(url);
    return response.data;
  },

  getLogDetails: async (id: string): Promise<EmailLog> => {
    const response = await api.get(`/agent/email-logs/${id}`);
    return response.data;
  }
};
