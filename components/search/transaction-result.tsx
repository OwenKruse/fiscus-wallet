'use client';

import React from 'react';
import { CommandItem } from '@/components/ui/command';
import { DollarSign } from 'lucide-react';
import type { TransactionSearchResult } from '@/types';

interface TransactionResultProps {
  transaction: TransactionSearchResult;
  onSelect: (transaction: TransactionSearchResult) => void;
  isHighlighted?: boolean;
}

export function TransactionResult({ transaction, onSelect, isHighlighted = false }: TransactionResultProps) {
  const isNegative = transaction.amount < 0;
  const displayAmount = Math.abs(transaction.amount);
  
  return (
    <CommandItem
      value={`transaction-${transaction.id}-${transaction.name}`}
      onSelect={() => onSelect(transaction)}
      className={`cursor-pointer ${
        isHighlighted ? 'bg-accent text-accent-foreground' : ''
      }`}
    >
      <div className="flex items-center gap-3 w-full">
        <div className="flex-shrink-0">
          <div className={`p-2 rounded-full ${isNegative ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium truncate flex-1">{transaction.name}</span>
            <span className={`text-sm font-medium flex-shrink-0 ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
              {isNegative ? '-' : '+'}${displayAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <span className="truncate flex-shrink">{transaction.accountName}</span>
            <span className="flex-shrink-0">•</span>
            <span className="flex-shrink-0">{new Date(transaction.date).toLocaleDateString()}</span>
            {transaction.category.length > 0 && (
              <>
                <span className="flex-shrink-0">•</span>
                <span className="truncate flex-shrink">{transaction.category[0]}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </CommandItem>
  );
}