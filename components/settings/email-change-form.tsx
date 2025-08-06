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
import { Loader2, Mail, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import type { ChangeEmailRequest } from '@/types';

// Validation schema for email change form
const emailChangeSchema = z.object({
  newEmail: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type EmailChangeFormData = z.infer<typeof emailChangeSchema>;

interface EmailChangeFormProps {
  className?: string;
}

export function EmailChangeForm({ className }: EmailChangeFormProps) {
  const { settings, changeEmail, isLoading } = useSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [changeStatus, setChangeStatus] = useState<'idle' | 'requesting' | 'pending' | 'success' | 'error'>('idle');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<EmailChangeFormData>({
    resolver: zodResolver(emailChangeSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: EmailChangeFormData) => {
    setChangeStatus('requesting');
    setChangeError(null);

    try {
      const changeData: ChangeEmailRequest = {
        newEmail: data.newEmail,
        password: data.password,
      };

      await changeEmail(changeData);
      
      // Email change initiated successfully
      setPendingEmail(data.newEmail);
      setChangeStatus('pending');
      setIsDialogOpen(false);
      reset();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate email change';
      setChangeError(errorMessage);
      setChangeStatus('error');
    }
  };

  const handleCancel = () => {
    reset();
    setChangeError(null);
    setChangeStatus('idle');
    setIsDialogOpen(false);
  };

  const handleResendVerification = async () => {
    if (!pendingEmail) return;

    setChangeStatus('requesting');
    setChangeError(null);

    try {
      // Resend verification email
      const response = await fetch('/api/auth/resend-email-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: pendingEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to resend verification email');
      }

      setChangeStatus('pending');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend verification email';
      setChangeError(errorMessage);
      setChangeStatus('error');
    }
  };

  const currentEmail = settings?.profile?.email;
  const isEmailVerified = settings?.profile?.emailVerified;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Address
        </CardTitle>
        <CardDescription>
          Change your email address. You'll need to verify the new email before the change takes effect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Email Display */}
          <div className="space-y-2">
            <Label>Current Email</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{currentEmail}</span>
              {isEmailVerified ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Unverified</span>
                </div>
              )}
            </div>
          </div>

          {/* Pending Email Change Status */}
          {changeStatus === 'pending' && pendingEmail && (
            <Alert className="border-blue-200 bg-blue-50 text-blue-800">
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    <strong>Email change pending:</strong> We've sent a verification email to{' '}
                    <span className="font-medium">{pendingEmail}</span>
                  </p>
                  <p className="text-sm">
                    Please check your inbox and click the verification link to complete the email change.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={changeStatus === 'requesting'}
                  >
                    {changeStatus === 'requesting' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Resend Verification Email'
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {changeError && (
            <Alert variant="destructive">
              <AlertDescription>{changeError}</AlertDescription>
            </Alert>
          )}

          {/* Change Email Button */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isLoading || changeStatus === 'requesting'}
                className="w-full sm:w-auto"
              >
                <Mail className="mr-2 h-4 w-4" />
                Change Email Address
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Change Email Address
                </DialogTitle>
                <DialogDescription>
                  Enter your new email address and current password to initiate the change.
                  You'll need to verify the new email address before the change takes effect.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* New Email */}
                <div className="space-y-2">
                  <Label htmlFor="newEmail">New Email Address</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder="Enter your new email address"
                    {...register('newEmail')}
                    disabled={changeStatus === 'requesting'}
                    className={errors.newEmail ? 'border-red-500' : ''}
                  />
                  {errors.newEmail && (
                    <p className="text-sm text-red-600">{errors.newEmail.message}</p>
                  )}
                </div>

                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Current Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your current password"
                    {...register('password')}
                    disabled={changeStatus === 'requesting'}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {/* Form Error */}
                {changeError && changeStatus === 'error' && (
                  <Alert variant="destructive">
                    <AlertDescription>{changeError}</AlertDescription>
                  </Alert>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={changeStatus === 'requesting'}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={!isValid || changeStatus === 'requesting'}
                  >
                    {changeStatus === 'requesting' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Verification
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Security Notice */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Security Notice</p>
                <p className="text-sm text-muted-foreground">
                  For security reasons, you'll need to verify your new email address before the change takes effect.
                  Your current email will remain active until the new one is verified.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}