'use client';

import React from 'react';
import { CommandItem } from '@/components/ui/command';
import { 
  Home, 
  BarChart3, 
  Target, 
  CreditCard, 
  Settings, 
  FileText,
  Navigation,
  ExternalLink
} from 'lucide-react';
import type { PageSearchResult } from '@/types';

interface PageResultProps {
  page: PageSearchResult;
  onSelect: (page: PageSearchResult) => void;
  isHighlighted?: boolean;
}

export function PageResult({ page, onSelect, isHighlighted = false }: PageResultProps) {
  const getPageIcon = (iconName?: string) => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (iconName?.toLowerCase()) {
      case 'home':
        return <Home {...iconProps} />;
      case 'barchart3':
      case 'analytics':
        return <BarChart3 {...iconProps} />;
      case 'target':
      case 'goals':
        return <Target {...iconProps} />;
      case 'creditcard':
      case 'transactions':
        return <CreditCard {...iconProps} />;
      case 'settings':
        return <Settings {...iconProps} />;
      case 'filetext':
      case 'documents':
        return <FileText {...iconProps} />;
      case 'externallink':
        return <ExternalLink {...iconProps} />;
      default:
        return <Navigation {...iconProps} />;
    }
  };

  return (
    <CommandItem
      key={page.id}
      value={`page-${page.id}`}
      onSelect={() => onSelect(page)}
      className={`cursor-pointer ${
        isHighlighted ? 'bg-accent text-accent-foreground' : ''
      }`}
    >
      <div className="flex items-center gap-3 w-full">
        <div className="flex-shrink-0">
          <div className="p-2 rounded-full bg-gray-100 text-gray-600">
            {getPageIcon(page.icon)}
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium truncate">{page.name}</span>
            <span className="text-xs text-muted-foreground">
              {page.path}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {page.description}
          </p>
        </div>
      </div>
    </CommandItem>
  );
}