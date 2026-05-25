"use client";

import React, { useState, useEffect } from 'react';
import { adminEmailLogService, EmailLog, EmailLogStats } from '@/services/adminEmailLogService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, Send, AlertCircle, RefreshCw, Eye, Search, Trash2, XCircle, RotateCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { EmailLogDetailsModal } from '@/components/admin/email-logs/EmailLogDetailsModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function EmailLogs() {
  const [stats, setStats] = useState<EmailLogStats | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  

  
  const limit = 20;

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [statsData, logsData] = await Promise.all([
        adminEmailLogService.getStats(),
        adminEmailLogService.getLogs(page, limit, statusFilter, searchQuery)
      ]);
      setStats(statsData);
      setLogs(logsData.data);
      setTotal(logsData.total);
    } catch (error: any) {
      toast.error(error.message || "Failed to load email logs");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 10-second polling for real-time updates
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleRetry = async (id: string) => {
    try {
      await adminEmailLogService.retryLog(id);
      toast.success("Email queued for retry.");
      fetchData(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleBulkRetry = async () => {
    try {
      const res = await adminEmailLogService.bulkRetryFailed(100);
      toast.success(res.message);
      fetchData(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm("Are you sure you want to delete logs older than 30 days?")) return;
    try {
      const res = await adminEmailLogService.bulkDeleteOld(30);
      toast.success(res.message);
      fetchData(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openDetails = (log: EmailLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT': return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
      case 'PENDING': return <Badge variant="secondary">Pending</Badge>;
      case 'PROCESSING': return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
      case 'RETRY': return <Badge className="bg-orange-100 text-orange-800">Retrying</Badge>;
      case 'EXPIRED': return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Email Monitoring</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm">Bulk Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleBulkRetry}>
                <RotateCw className="w-4 h-4 mr-2 text-blue-600" /> Retry All Failed (Max 100)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2 text-red-600" /> Delete Old Logs (30+ days)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.total || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.sent || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.pending || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.failed || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.expired || 0}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Email Queue Logs</CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2 items-center">
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="RETRY">Retry</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search email/subject..."
                  className="pl-8 w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10">Loading...</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No logs found</TableCell></TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="mr-1">{log.sender_type}</Badge>
                        <span className="text-sm font-medium">{log.email_type}</span>
                      </TableCell>
                      <TableCell>{log.recipient_email}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.subject}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {['FAILED', 'EXPIRED'].includes(log.status) && (
                            <Button variant="outline" size="icon" onClick={() => handleRetry(log.id)} title="Retry">
                              <RotateCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openDetails(log)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <EmailLogDetailsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        log={selectedLog} 
      />
    </div>
  );
}
