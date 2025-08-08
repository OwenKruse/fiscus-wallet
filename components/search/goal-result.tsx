'use client';

import React from 'react';
import { CommandItem } from '@/components/ui/command';
import { Target, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { GoalSearchResult } from '@/contexts/search-context';

interface GoalResultProps {
  goal: GoalSearchResult;
  onSelect: (goal: GoalSearchResult) => void;
  isHighlighted?: boolean;
}

export function GoalResult({ goal, onSelect, isHighlighted = false }: GoalResultProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'paused':
        return 'text-yellow-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <TrendingUp className="h-3 w-3" />;
      default:
        return <Target className="h-3 w-3" />;
    }
  };

  return (
    <CommandItem
      key={goal.id}
      value={`goal-${goal.id}`}
      onSelect={() => onSelect(goal)}
      className={`cursor-pointer ${
        isHighlighted ? 'bg-accent text-accent-foreground' : ''
      }`}
    >
      <div className="flex items-center gap-3 w-full">
        <div className="flex-shrink-0">
          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
            {getStatusIcon(goal.status)}
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium truncate">{goal.title}</span>
            <span className="text-sm font-medium text-muted-foreground">
              {goal.progress}%
            </span>
          </div>
          
          {/* Progress bar */}
          <Progress value={goal.progress} className="h-1.5" />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>${goal.currentAmount.toFixed(2)} of ${goal.targetAmount.toFixed(2)}</span>
              <span>•</span>
              <div className={`flex items-center gap-1 capitalize ${getStatusColor(goal.status)}`}>
                <span>{goal.status}</span>
              </div>
            </div>
          </div>
          
          {goal.description && (
            <p className="text-xs text-muted-foreground truncate">{goal.description}</p>
          )}
        </div>
      </div>
    </CommandItem>
  );
}