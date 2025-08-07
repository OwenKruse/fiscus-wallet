'use client';

import React from 'react';
import { useSettings } from '@/hooks/use-settings';
import { ThemeSelector } from './theme-selector';
import { CurrencySelector } from './currency-selector';
import { DateFormatSelector } from './date-format-selector';
import { LanguageSelector } from './language-selector';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { 
  ThemeOption, 
  CurrencyOption, 
  DateFormatOption, 
  LanguageOption,
  UpdateDisplaySettingsRequest 
} from '@/types';

export function DisplaySettings() {
  const { 
    settings, 
    isLoading, 
    error, 
    updateDisplay
  } = useSettings();

  const [localError, setLocalError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Clear messages after a delay
  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  React.useEffect(() => {
    if (localError) {
      const timer = setTimeout(() => setLocalError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [localError]);

  const handleSettingChange = async (updates: UpdateDisplaySettingsRequest) => {
    try {
      setLocalError(null);
      await updateDisplay(updates);
      setSuccessMessage('Display settings updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update display settings';
      setLocalError(errorMessage);
    }
  };

  const handleThemeChange = (theme: ThemeOption) => {
    handleSettingChange({ theme });
  };

  const handleCurrencyChange = (currencyFormat: CurrencyOption) => {
    handleSettingChange({ currencyFormat });
  };

  const handleDateFormatChange = (dateFormat: DateFormatOption) => {
    handleSettingChange({ dateFormat });
  };

  const handleLanguageChange = (language: LanguageOption) => {
    handleSettingChange({ language });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load display settings: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!settings?.display) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Display settings are not available. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {localError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      )}

      {/* Theme Selector */}
      <ThemeSelector
        value={settings.display.theme}
        onChange={handleThemeChange}
        disabled={isLoading}
      />

      {/* Currency Selector */}
      <CurrencySelector
        value={settings.display.currency as CurrencyOption}
        onChange={handleCurrencyChange}
        disabled={isLoading}
      />

      {/* Date Format Selector */}
      <DateFormatSelector
        value={settings.display.dateFormat as DateFormatOption}
        onChange={handleDateFormatChange}
        disabled={isLoading}
      />

      {/* Language Selector */}
      <LanguageSelector
        value={settings.display.language as LanguageOption}
        onChange={handleLanguageChange}
        disabled={isLoading}
      />
    </div>
  );
}