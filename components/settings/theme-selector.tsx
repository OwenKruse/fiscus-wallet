'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_OPTIONS } from '@/types';
import type { ThemeOption } from '@/types';

interface ThemeSelectorProps {
  value: ThemeOption;
  onChange: (theme: ThemeOption) => void;
  disabled?: boolean;
}

export function ThemeSelector({ value, onChange, disabled = false }: ThemeSelectorProps) {
  const getThemeIcon = (theme: ThemeOption) => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getThemeDescription = (theme: ThemeOption) => {
    switch (theme) {
      case 'light':
        return 'Always use light theme';
      case 'dark':
        return 'Always use dark theme';
      case 'system':
        return 'Use system preference';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          Choose your preferred theme for the application interface.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value}
          onValueChange={(newValue) => onChange(newValue as ThemeOption)}
          disabled={disabled}
          className="space-y-3"
        >
          {THEME_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem
                value={option.value}
                id={`theme-${option.value}`}
                disabled={disabled}
              />
              <Label
                htmlFor={`theme-${option.value}`}
                className={`flex items-center gap-3 cursor-pointer ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {getThemeIcon(option.value)}
                  <span className="font-medium">{option.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {getThemeDescription(option.value)}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}