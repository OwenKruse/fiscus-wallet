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
import { Loader2, Save, User } from 'lucide-react';
import { useProfileSettings } from '@/hooks/use-settings';
import type { UpdateProfileSettingsRequest } from '@/types';

// Validation schema for profile form
const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  phone: z.string().optional().refine((phone) => {
    if (!phone || phone.trim() === '') return true;
    return /^\+?[\d\s\-\(\)]+$/.test(phone);
  }, 'Please enter a valid phone number'),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  className?: string;
}

export function ProfileForm({ className }: ProfileFormProps) {
  const { profile, updateProfile, isLoading, error } = useProfileSettings();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phone: profile?.phone || '',
    },
    values: {
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phone: profile?.phone || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setSaveStatus('saving');
    setSaveError(null);

    try {
      const updateData: UpdateProfileSettingsRequest = {};
      
      // Only include changed fields
      if (data.firstName !== profile?.firstName) {
        updateData.firstName = data.firstName;
      }
      if (data.lastName !== profile?.lastName) {
        updateData.lastName = data.lastName;
      }
      if (data.phone !== profile?.phone) {
        updateData.phone = data.phone || undefined;
      }

      // Only update if there are actual changes
      if (Object.keys(updateData).length > 0) {
        await updateProfile(updateData);
        setSaveStatus('saved');
        
        // Reset saved status after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      } else {
        setSaveStatus('idle');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setSaveError(errorMessage);
      setSaveStatus('error');
    }
  };

  const handleReset = () => {
    reset();
    setSaveStatus('idle');
    setSaveError(null);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Update your personal details and contact information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Alert */}
          {(error || saveError) && (
            <Alert variant="destructive">
              <AlertDescription>
                {saveError || error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {saveStatus === 'saved' && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>
                Profile updated successfully!
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Enter your first name"
                {...register('firstName')}
                disabled={isLoading || saveStatus === 'saving'}
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter your last name"
                {...register('lastName')}
                disabled={isLoading || saveStatus === 'saving'}
                className={errors.lastName ? 'border-red-500' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={profile?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              To change your email address, use the email change form below.
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number (optional)"
              {...register('phone')}
              disabled={isLoading || saveStatus === 'saving'}
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!isDirty || isLoading || saveStatus === 'saving'}
            >
              Reset Changes
            </Button>
            
            <Button
              type="submit"
              disabled={!isDirty || isLoading || saveStatus === 'saving'}
              className="min-w-[120px]"
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}