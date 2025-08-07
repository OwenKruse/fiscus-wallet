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
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { usePrivacySettings } from '@/hooks/use-settings';
import type { ChangePasswordRequest } from '@/types';

// Password validation schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

interface PasswordChangeFormProps {
  className?: string;
}

export function PasswordChangeForm({ className }: PasswordChangeFormProps) {
  const { changePassword, isLoading, error } = usePrivacySettings();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changeStatus, setChangeStatus] = useState<'idle' | 'changing' | 'success' | 'error'>('idle');
  const [changeError, setChangeError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword || '');
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  const onSubmit = async (data: PasswordChangeFormData) => {
    setChangeStatus('changing');
    setChangeError(null);

    try {
      const changeData: ChangePasswordRequest = {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      };

      await changePassword(changeData);
      setChangeStatus('success');
      
      // Reset form after successful change
      reset();
      
      // Reset success status after 5 seconds
      setTimeout(() => {
        setChangeStatus('idle');
      }, 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
      setChangeError(errorMessage);
      setChangeStatus('error');
    }
  };

  const handleReset = () => {
    reset();
    setChangeStatus('idle');
    setChangeError(null);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your password to keep your account secure. Use a strong password with a mix of letters, numbers, and symbols.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Alert */}
          {(error || changeError) && (
            <Alert variant="destructive">
              <AlertDescription>
                {changeError || error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {changeStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Password changed successfully! You may need to sign in again on other devices.
              </AlertDescription>
            </Alert>
          )}

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Enter your current password"
                {...register('currentPassword')}
                disabled={isLoading || changeStatus === 'changing'}
                className={errors.currentPassword ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={isLoading || changeStatus === 'changing'}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-red-600">{errors.currentPassword.message}</p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                {...register('newPassword')}
                disabled={isLoading || changeStatus === 'changing'}
                className={errors.newPassword ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading || changeStatus === 'changing'}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-red-600">{errors.newPassword.message}</p>
            )}
            
            {/* Password Strength Indicator */}
            {newPassword && newPassword.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Password strength:</span>
                  <span className={`text-sm font-medium ${
                    passwordStrength >= 4 ? 'text-green-600' : 
                    passwordStrength >= 3 ? 'text-blue-600' : 
                    passwordStrength >= 2 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {strengthLabels[passwordStrength - 1] || 'Very Weak'}
                  </span>
                </div>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-2 flex-1 rounded-full ${
                        level <= passwordStrength 
                          ? strengthColors[passwordStrength - 1] || 'bg-red-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                {...register('confirmPassword')}
                disabled={isLoading || changeStatus === 'changing'}
                className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading || changeStatus === 'changing'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">Password Requirements:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  newPassword && newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                At least 8 characters long
              </li>
              <li className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  newPassword && /[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                One uppercase letter
              </li>
              <li className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  newPassword && /[a-z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                One lowercase letter
              </li>
              <li className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  newPassword && /[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                One number
              </li>
              <li className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  newPassword && /[^A-Za-z0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                One special character
              </li>
            </ul>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading || changeStatus === 'changing'}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={!isValid || isLoading || changeStatus === 'changing'}
              className="min-w-[140px]"
            >
              {changeStatus === 'changing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}