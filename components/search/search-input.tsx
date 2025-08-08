'use client';

import React, { useEffect, useRef } from 'react';
import { CommandInput } from '@/components/ui/command';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = "Search transactions, goals, and pages...",
  autoFocus = true 
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when component mounts
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Use setTimeout to ensure the dialog is fully rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  return (
    <CommandInput
      ref={inputRef}
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      className="text-base"
    />
  );
}