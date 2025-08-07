'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCY_OPTIONS } from '@/types';
import type { CurrencyOption } from '@/types';

interface CurrencySelectorProps {
  value: CurrencyOption;
  onChange: (currency: CurrencyOption) => void;
  disabled?: boolean;
}

export function CurrencySelector({ value, onChange, disabled = false }: CurrencySelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Format</CardTitle>
        <CardDescription>
          Choose your preferred currency for displaying financial amounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currency-select">Currency</Label>
          <Select
            value={value}
            onValueChange={(newValue) => onChange(newValue as CurrencyOption)}
            disabled={disabled}
          >
            <SelectTrigger id="currency-select">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{option.symbol}</span>
                    <span>{option.label}</span>
                    <span className="text-muted-foreground">({option.value})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="rounded-lg bg-muted p-3">
          <div className="text-sm font-medium mb-1">Preview</div>
          <div className="text-sm text-muted-foreground">
            {CURRENCY_OPTIONS.find(opt => opt.value === value)?.symbol}1,234.56
          </div>
        </div>
      </CardContent>
    </Card>
  );
}