'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DATE_FORMAT_OPTIONS } from '@/types';
import type { DateFormatOption } from '@/types';

interface DateFormatSelectorProps {
  value: DateFormatOption;
  onChange: (dateFormat: DateFormatOption) => void;
  disabled?: boolean;
}

export function DateFormatSelector({ value, onChange, disabled = false }: DateFormatSelectorProps) {
  const formatDate = (format: DateFormatOption): string => {
    const now = new Date();
    const option = DATE_FORMAT_OPTIONS.find(opt => opt.value === format);
    return option?.example || format;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Date Format</CardTitle>
        <CardDescription>
          Choose how dates should be displayed throughout the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="date-format-select">Date Format</Label>
          <Select
            value={value}
            onValueChange={(newValue) => onChange(newValue as DateFormatOption)}
            disabled={disabled}
          >
            <SelectTrigger id="date-format-select">
              <SelectValue placeholder="Select date format" />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    <span className="text-muted-foreground ml-4">{option.example}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="rounded-lg bg-muted p-3">
          <div className="text-sm font-medium mb-1">Preview</div>
          <div className="text-sm text-muted-foreground">
            Today: {formatDate(value)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}