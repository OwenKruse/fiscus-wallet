'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Trash2, AlertTriangle, Download, Shield } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';

// Account deletion confirmation schema
const accountDeletionSchema = z.object({
  confirmationText: z.string().refine((val) => val === 'DELETE MY ACCOUNT', {
    message: 'You must type "DELETE MY ACCOUNT" to confirm',
  }),
  password: z.string().min(1, 'Password is required to confirm deletion'),
  dataExportRequested: z.boolean().optional(),
  understandConsequences: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge the consequences of account deletion',
  }),
});

type AccountDeletionFormData = z.infer<typeof accountDeletionSchema>;

interface AccountDeletionDialogProps {
  className?: string;
}

export function AccountDeletionDialog({ className }: AccountDeletionDialogProps) {
  const { exportData, isLoading, error } = useSettings();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'warning' | 'export' | 'confirm' | 'processing'>('warning');
  const [deletionStatus, setDeletionStatus] = useState<'idle' | 'exporting' | 'deleting' | 'success' | 'error'>('idle');
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [exportCompleted, setExportCompleted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset: resetForm,
    setValue,
    watch,
  } = useForm<AccountDeletionFormData>({
    resolver: zodResolver(accountDeletionSchema),
    mode: 'onChange',
    defaultValues: {
      confirmationText: '',
      password: '',
      dataExportRequested: false,
      understandConsequences: false,
    },
  });

  const dataExportRequested = watch('dataExportRequested');
  const understandConsequences = watch('understandConsequences');

  // Handle data export
  const handleDataExport = async () => {
    setDeletionStatus('exporting');
    setDeletionError(null);

    try {
      const exportedData = await exportData();
      
      // Create and download the export file
      const dataStr = JSON.stringify(exportedData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `account-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportCompleted(true);
      setDeletionStatus('idle');
      
      toast({
        title: "Data Export Complete",
        description: "Your account data has been downloaded. You can now proceed with account deletion.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      setDeletionError(errorMessage);
      setDeletionStatus('error');
    }
  };

  // Handle account deletion
  const onSubmit = async (data: AccountDeletionFormData) => {
    setDeletionStatus('deleting');
    setDeletionError(null);

    try {
      // Call account deletion API
      const response = await fetch('/api/settings/account/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: data.password,
          confirmation: data.confirmationText,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete account');
      }

      setDeletionStatus('success');
      setCurrentStep('processing');
      
      // Redirect to goodbye page after a delay
      setTimeout(() => {
        window.location.href = '/auth/signin?deleted=true';
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setDeletionError(errorMessage);
      setDeletionStatus('error');
    }
  };

  // Reset dialog state when closed
  const handleDialogClose = (open: boolean) => {
    if (!open && deletionStatus !== 'deleting' && deletionStatus !== 'success') {
      setCurrentStep('warning');
      setDeletionStatus('idle');
      setDeletionError(null);
      setExportCompleted(false);
      resetForm();
    }
    setDialogOpen(open);
  };

  // Navigation between steps
  const handleNextStep = () => {
    if (currentStep === 'warning') {
      setCurrentStep('export');
    } else if (currentStep === 'export') {
      setCurrentStep('confirm');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'confirm') {
      setCurrentStep('export');
    } else if (currentStep === 'export') {
      setCurrentStep('warning');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <Trash2 className="h-5 w-5" />
          Delete Account
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Account deletion is permanent and cannot be undone. All your data, including financial information, goals, and settings will be permanently removed.
            </AlertDescription>
          </Alert>

          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
                disabled={isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete My Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Delete Account
                </DialogTitle>
                <DialogDescription>
                  This process will permanently delete your account and all associated data.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Step 1: Warning */}
                {currentStep === 'warning' && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h3 className="font-medium text-red-600">What will be deleted:</h3>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Your profile and account information</li>
                        <li>• All connected financial accounts and transaction data</li>
                        <li>• Your financial goals and progress tracking</li>
                        <li>• All settings and preferences</li>
                        <li>• Any uploaded documents or files</li>
                        <li>• Your account history and analytics data</li>
                      </ul>
                    </div>

                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>This action is irreversible.</strong> Once deleted, your account and data cannot be recovered.
                      </AlertDescription>
                    </Alert>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="understand-consequences"
                        checked={understandConsequences}
                        onCheckedChange={(checked) => setValue('understandConsequences', !!checked)}
                      />
                      <Label htmlFor="understand-consequences" className="text-sm">
                        I understand that this action is permanent and cannot be undone
                      </Label>
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => handleDialogClose(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleNextStep}
                        disabled={!understandConsequences}
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Data Export */}
                {currentStep === 'export' && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h3 className="font-medium">Export Your Data (Optional)</h3>
                      <p className="text-sm text-muted-foreground">
                        Before deleting your account, you can download a copy of your data for your records.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="export-data"
                        checked={dataExportRequested}
                        onCheckedChange={(checked) => setValue('dataExportRequested', !!checked)}
                        disabled={deletionStatus === 'exporting'}
                      />
                      <Label htmlFor="export-data" className="text-sm">
                        Export my data before deletion
                      </Label>
                    </div>

                    {dataExportRequested && !exportCompleted && (
                      <Button
                        onClick={handleDataExport}
                        disabled={deletionStatus === 'exporting'}
                        className="w-full"
                      >
                        {deletionStatus === 'exporting' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exporting Data...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Export My Data
                          </>
                        )}
                      </Button>
                    )}

                    {exportCompleted && (
                      <Alert className="border-green-200 bg-green-50 text-green-800">
                        <Download className="h-4 w-4" />
                        <AlertDescription>
                          Data export completed successfully. Your data has been downloaded.
                        </AlertDescription>
                      </Alert>
                    )}

                    {deletionError && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {deletionError}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={handlePreviousStep}
                        disabled={deletionStatus === 'exporting'}
                      >
                        Back
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleNextStep}
                        disabled={dataExportRequested && !exportCompleted && deletionStatus !== 'error'}
                      >
                        Continue to Deletion
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Final Confirmation */}
                {currentStep === 'confirm' && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h3 className="font-medium text-red-600">Final Confirmation</h3>
                      <p className="text-sm text-muted-foreground">
                        To confirm account deletion, please enter your password and type "DELETE MY ACCOUNT" below.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Current Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          {...register('password')}
                          disabled={deletionStatus === 'deleting'}
                        />
                        {errors.password && (
                          <p className="text-sm text-red-600">{errors.password.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmation">Type "DELETE MY ACCOUNT" to confirm</Label>
                        <Input
                          id="confirmation"
                          type="text"
                          placeholder="DELETE MY ACCOUNT"
                          {...register('confirmationText')}
                          disabled={deletionStatus === 'deleting'}
                          className="font-mono"
                        />
                        {errors.confirmationText && (
                          <p className="text-sm text-red-600">{errors.confirmationText.message}</p>
                        )}
                      </div>

                      {deletionError && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {deletionError}
                          </AlertDescription>
                        </Alert>
                      )}

                      <Separator />

                      <div className="flex justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePreviousStep}
                          disabled={deletionStatus === 'deleting'}
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          variant="destructive"
                          disabled={!isValid || deletionStatus === 'deleting'}
                        >
                          {deletionStatus === 'deleting' ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting Account...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete My Account
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 4: Processing */}
                {currentStep === 'processing' && (
                  <div className="space-y-4 text-center">
                    {deletionStatus === 'success' ? (
                      <>
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Trash2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-medium">Account Deleted Successfully</h3>
                          <p className="text-sm text-muted-foreground">
                            Your account and all associated data have been permanently deleted. You will be redirected to the sign-in page shortly.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-red-600 animate-spin" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-medium">Deleting Account...</h3>
                          <p className="text-sm text-muted-foreground">
                            Please wait while we permanently delete your account and data.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Information */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Before You Delete Your Account
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Consider exporting your data for your records</li>
              <li>• Disconnect any linked financial accounts first</li>
              <li>• Cancel any active subscriptions or services</li>
              <li>• This action cannot be undone or reversed</li>
              <li>• Contact support if you need help with your account</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}