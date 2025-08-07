'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LANGUAGE_OPTIONS } from '@/types';
import type { LanguageOption } from '@/types';

interface LanguageSelectorProps {
  value: LanguageOption;
  onChange: (language: LanguageOption) => void;
  disabled?: boolean;
}

export function LanguageSelector({ value, onChange, disabled = false }: LanguageSelectorProps) {
  const getLanguageFlag = (language: LanguageOption): string => {
    const flags: Record<LanguageOption, string> = {
      en: '🇺🇸',
      es: '🇪🇸',
      fr: '🇫🇷',
      de: '🇩🇪',
      it: '🇮🇹',
      pt: '🇵🇹',
      zh: '🇨🇳',
      ja: '🇯🇵',
    };
    return flags[language] || '🌐';
  };

  const isComingSoon = (language: LanguageOption): boolean => {
    // Only English is fully supported for now
    return language !== 'en';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language</CardTitle>
        <CardDescription>
          Choose your preferred language for the application interface.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="language-select">Language</Label>
          <Select
            value={value}
            onValueChange={(newValue) => onChange(newValue as LanguageOption)}
            disabled={disabled}
          >
            <SelectTrigger id="language-select">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  disabled={isComingSoon(option.value)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-base">{getLanguageFlag(option.value)}</span>
                    <span>{option.label}</span>
                    {isComingSoon(option.value) && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {isComingSoon(value) && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
            <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Language Support
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              This language is not yet fully supported. The interface will remain in English while we work on translations.
            </div>
          </div>
        )}
        
        <div className="rounded-lg bg-muted p-3">
          <div className="text-sm font-medium mb-1">Current Language</div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-base">{getLanguageFlag(value)}</span>
            <span>{LANGUAGE_OPTIONS.find(opt => opt.value === value)?.label}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}