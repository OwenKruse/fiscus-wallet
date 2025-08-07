'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, ShieldCheck, ShieldX, QrCode, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { usePrivacySettings } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';

// Verification code validation schema
const verificationCodeSchema = z.object({
  code: z.string()
    .min(6, 'Verification code must be 6 digits')
    .max(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});

type VerificationCodeFormData = z.infer<typeof verificationCodeSchema>;

interface TwoFactorSetupData {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

interface TwoFactorSetupProps {
  className?: string;
}

export function TwoFactorSetup({ className }: TwoFactorSetupProps) {
  const { privacy, toggleTwoFactor, isLoading, error } = usePrivacySettings();
  const { toast } = useToast();
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [actionStatus, setActionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset: resetForm,
    watch,
  } = useForm<VerificationCodeFormData>({
    resolver: zodResolver(verificationCodeSchema),
    mode: 'onChange',
    defaultValues: {
      code: '',
    },
  });

  const verificationCode = watch('code');

  // Auto-format verification code input
  useEffect(() => {
    if (verificationCode && verificationCode.length === 6 && /^\d{6}$/.test(verificationCode)) {
      // Auto-submit when 6 digits are entered
      handleSubmit(onVerifyCode)();
    }
  }, [verificationCode, handleSubmit]);

  // Initialize 2FA setup
  const handleSetupStart = async () => {
    setActionStatus('loading');
    setActionError(null);

    try {
      // Call API to get setup data
      const response = await fetch('/api/settings/privacy/two-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'setup' }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to initialize 2FA setup');
      }

      setSetupData(result.data);
      setSetupStep('qr');
      setSetupDialogOpen(true);
      setActionStatus('idle');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize 2FA setup';
      setActionError(errorMessage);
      setActionStatus('error');
    }
  };

  // Verify code and enable 2FA
  const onVerifyCode = async (data: VerificationCodeFormData) => {
    setActionStatus('loading');
    setActionError(null);

    try {
      const response = await fetch('/api/settings/privacy/two-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'enable',
          verificationCode: data.code,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Invalid verification code');
      }

      setSetupStep('backup');
      setActionStatus('success');
      resetForm();
      
      toast({
        title: "Two-Factor Authentication Enabled",
        description: "Your account is now protected with 2FA. Save your backup codes in a secure location.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify code';
      setActionError(errorMessage);
      setActionStatus('error');
    }
  };

  // Disable 2FA
  const handleDisable = async () => {
    setActionStatus('loading');
    setActionError(null);

    try {
      const response = await fetch('/api/settings/privacy/two-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'disable' }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to disable 2FA');
      }

      await toggleTwoFactor();
      setDisableDialogOpen(false);
      setActionStatus('idle');
      
      toast({
        title: "Two-Factor Authentication Disabled",
        description: "Your account is no longer protected with 2FA.",
        variant: "destructive",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable 2FA';
      setActionError(errorMessage);
      setActionStatus('error');
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "The text has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the text manually.",
        variant: "destructive",
      });
    }
  };

  // Reset setup state when dialog closes
  const handleSetupDialogClose = (open: boolean) => {
    if (!open) {
      setSetupData(null);
      setSetupStep('qr');
      setActionStatus('idle');
      setActionError(null);
      resetForm();
    }
    setSetupDialogOpen(open);
  };

  const isEnabled = privacy?.twoFactorEnabled || false;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <Shield className="h-5 w-5" />
          )}
          Two-Factor Authentication
          {isEnabled && (
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              Enabled
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account by requiring a verification code from your phone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Error Alert */}
          {(error || actionError) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {actionError || error}
              </AlertDescription>
            </Alert>
          )}

          {/* Status Display */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              {isEnabled ? (
                <ShieldCheck className="h-8 w-8 text-green-600" />
              ) : (
                <ShieldX className="h-8 w-8 text-gray-400" />
              )}
              <div>
                <h3 className="font-medium">
                  {isEnabled ? 'Two-Factor Authentication is enabled' : 'Two-Factor Authentication is disabled'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isEnabled 
                    ? 'Your account is protected with an additional security layer.'
                    : 'Enable 2FA to add an extra layer of security to your account.'
                  }
                </p>
              </div>
            </div>
            
            {isEnabled ? (
              <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    disabled={isLoading || actionStatus === 'loading'}
                  >
                    Disable
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Disable Two-Factor Authentication
                    </DialogTitle>
                    <DialogDescription>
                      Are you sure you want to disable two-factor authentication? This will make your account less secure.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setDisableDialogOpen(false)}
                      disabled={actionStatus === 'loading'}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDisable}
                      disabled={actionStatus === 'loading'}
                    >
                      {actionStatus === 'loading' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Disabling...
                        </>
                      ) : (
                        'Disable 2FA'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={setupDialogOpen} onOpenChange={handleSetupDialogClose}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={handleSetupStart}
                    disabled={isLoading || actionStatus === 'loading'}
                  >
                    {actionStatus === 'loading' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Enable 2FA
                      </>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Setup Two-Factor Authentication
                    </DialogTitle>
                    <DialogDescription>
                      Follow these steps to secure your account with 2FA.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {setupData && (
                    <div className="space-y-6">
                      {/* Step 1: QR Code */}
                      {setupStep === 'qr' && (
                        <div className="space-y-4">
                          <div className="text-center">
                            <h3 className="font-medium mb-2">Step 1: Scan QR Code</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                            </p>
                            <div className="flex justify-center mb-4">
                              <img 
                                src={setupData.qrCodeUrl} 
                                alt="2FA QR Code" 
                                className="border rounded-lg"
                              />
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">
                                Can't scan? Enter this code manually:
                              </p>
                              <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                                <span className="flex-1">{setupData.secret}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(setupData.secret)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <Button 
                            onClick={() => setSetupStep('verify')}
                            className="w-full"
                          >
                            Next: Verify Code
                          </Button>
                        </div>
                      )}

                      {/* Step 2: Verify Code */}
                      {setupStep === 'verify' && (
                        <div className="space-y-4">
                          <div className="text-center">
                            <h3 className="font-medium mb-2">Step 2: Verify Code</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Enter the 6-digit code from your authenticator app
                            </p>
                          </div>
                          
                          <form onSubmit={handleSubmit(onVerifyCode)} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="code">Verification Code</Label>
                              <Input
                                id="code"
                                type="text"
                                placeholder="000000"
                                maxLength={6}
                                className="text-center text-lg tracking-widest font-mono"
                                {...register('code')}
                                disabled={actionStatus === 'loading'}
                              />
                              {errors.code && (
                                <p className="text-sm text-red-600">{errors.code.message}</p>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSetupStep('qr')}
                                disabled={actionStatus === 'loading'}
                                className="flex-1"
                              >
                                Back
                              </Button>
                              <Button
                                type="submit"
                                disabled={!isValid || actionStatus === 'loading'}
                                className="flex-1"
                              >
                                {actionStatus === 'loading' ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                  </>
                                ) : (
                                  'Verify & Enable'
                                )}
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Step 3: Backup Codes */}
                      {setupStep === 'backup' && (
                        <div className="space-y-4">
                          <div className="text-center">
                            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                            <h3 className="font-medium mb-2">Two-Factor Authentication Enabled!</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Save these backup codes in a secure location. You can use them to access your account if you lose your phone.
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Backup Codes</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(setupData.backupCodes.join('\n'))}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy All
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 p-3 bg-muted rounded-lg">
                              {setupData.backupCodes.map((code, index) => (
                                <div key={index} className="font-mono text-sm text-center py-1">
                                  {code}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Important:</strong> Store these codes in a safe place. Each code can only be used once.
                            </AlertDescription>
                          </Alert>
                          
                          <Button 
                            onClick={() => handleSetupDialogClose(false)}
                            className="w-full"
                          >
                            Done
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Information */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">How Two-Factor Authentication Works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Install an authenticator app on your phone (Google Authenticator, Authy, etc.)</li>
              <li>• Scan the QR code or enter the setup key manually</li>
              <li>• Enter the 6-digit code from your app when signing in</li>
              <li>• Keep your backup codes in a safe place for account recovery</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}