'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Receipt, 
  Download, 
  Calendar, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface BillingHistoryItem {
  id: string;
  subscriptionId: string;
  userId: string;
  stripeInvoiceId?: string;
  amount: number;
  currency: string;
  status: string;
  billingReason: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt?: Date;
  createdAt: Date;
}

interface BillingHistoryProps {
  className?: string;
}

interface BillingHistoryData {
  items: BillingHistoryItem[];
  loading: boolean;
  error: string | null;
}

export function BillingHistory({ className }: BillingHistoryProps) {
  const [billingData, setBillingData] = useState<BillingHistoryData>({
    items: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const fetchBillingHistory = async () => {
    try {
      setBillingData(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/billing/history');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch billing history');
      }
      
      setBillingData({
        items: result.data || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching billing history:', error);
      setBillingData({
        items: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch billing history'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatAmount = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateRange = (start: Date | string, end: Date | string) => {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/billing/invoice/${invoiceId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      // You might want to show a toast notification here
    }
  };

  const getBillingReasonLabel = (reason: string) => {
    switch (reason.toLowerCase()) {
      case 'subscription_create':
        return 'Initial subscription';
      case 'subscription_cycle':
        return 'Recurring payment';
      case 'subscription_update':
        return 'Plan change';
      case 'invoice_payment_failed':
        return 'Payment retry';
      default:
        return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (billingData.loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (billingData.error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>View your payment history and download invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {billingData.error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={fetchBillingHistory} 
            variant="outline" 
            className="mt-4"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Billing History
        </CardTitle>
        <CardDescription>
          View your payment history and download invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        {billingData.items.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No billing history found</p>
            <p className="text-sm text-muted-foreground">
              Your payment history will appear here once you have an active subscription.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {billingData.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getStatusIcon(item.status)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getBillingReasonLabel(item.billingReason)}
                      </span>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateRange(item.periodStart, item.periodEnd)}
                      </div>
                      {item.paidAt && (
                        <div>
                          Paid on {formatDate(item.paidAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatAmount(item.amount, item.currency)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </div>
                  </div>
                  
                  {item.stripeInvoiceId && item.status.toLowerCase() === 'paid' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(item.stripeInvoiceId!)}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Invoice
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}