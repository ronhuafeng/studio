
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { ApiResponseType, FmeaApiResponse } from '@/types/fmea';
import type { RuleGroup, RuleItem, RuleItemStatus } from '@/lib/fmea-rules';
import { runAllRules } from '@/lib/fmea-rules';
import { parseJsonWithBigInt } from '@/lib/bigint-utils';
import { CheckCircle, XCircle, AlertTriangle, Info, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';


interface RuleVerificationPanelProps {
  fmeaJson: string;
  fmeaType: ApiResponseType | null;
  disabled?: boolean;
}

const statusConfig: Record<RuleItemStatus, { icon: React.ComponentType<{className?: string}>, color: string, label: string, borderColor: string }> = {
  success: { icon: CheckCircle, color: 'text-green-500', label: '通过', borderColor: 'border-green-500' },
  error: { icon: XCircle, color: 'text-red-500', label: '错误', borderColor: 'border-red-500' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', label: '警告', borderColor: 'border-yellow-500' },
  info: { icon: Info, color: 'text-blue-500', label: '信息', borderColor: 'border-blue-500' },
};


export function RuleVerificationPanel({ fmeaJson, fmeaType }: RuleVerificationPanelProps) {
  const [resultGroups, setResultGroups] = useState<RuleGroup[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'error' | 'warning' | 'success'>('all');

  useEffect(() => {
    if (!fmeaJson || !fmeaType) {
      setResultGroups([]);
      setParseError(null);
      setFilterStatus('all');
      return;
    }

    try {
      const parsedData = parseJsonWithBigInt(fmeaJson) as FmeaApiResponse;
      setParseError(null);
      const validationResults = runAllRules(parsedData, fmeaType);
      setResultGroups(validationResults);
      setFilterStatus('all');
    } catch (error) {
      if (error instanceof Error) {
        setParseError(error.message);
      } else {
        setParseError('An unknown error occurred during JSON parsing.');
      }
      setResultGroups([]);
      setFilterStatus('all');
    }
  }, [fmeaJson, fmeaType]);
  
  const totalRules = useMemo(() => resultGroups.reduce((acc, group) => acc + group.rules.length, 0), [resultGroups]);
  const totalSummary = useMemo(() => {
    return resultGroups.reduce((acc, group) => {
        acc.error += group.summary.error || 0;
        acc.warning += group.summary.warning || 0;
        acc.success += group.summary.success || 0;
        return acc;
    }, { error: 0, warning: 0, success: 0 });
  }, [resultGroups]);

  const filteredGroups = useMemo(() => {
    if (parseError) return [];
    if (filterStatus === 'all') return resultGroups;
    return resultGroups.filter(group => (group.summary[filterStatus] || 0) > 0);
  }, [resultGroups, filterStatus, parseError]);


  if (!fmeaJson) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight font-headline">规则验证</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          共验证 {totalRules} 条规则。点击下方标签或分组标题进行筛选和查看。
        </p>
        <div className="flex items-center space-x-2 pt-3">
          <Badge
            onClick={() => setFilterStatus('all')}
            className={cn('cursor-pointer transition-all hover:opacity-80', filterStatus === 'all' && 'ring-2 ring-primary/80 ring-offset-2 ring-offset-background')}
          >
            全部 {totalRules}
          </Badge>
           <Badge
            onClick={() => setFilterStatus('error')}
            variant="destructive"
            className={cn('cursor-pointer transition-all hover:opacity-80', {'opacity-50 cursor-not-allowed': totalSummary.error === 0}, filterStatus === 'error' && 'ring-2 ring-destructive/80 ring-offset-2 ring-offset-background')}
          >
            错误 {totalSummary.error}
          </Badge>
          <Badge
            onClick={() => setFilterStatus('warning')}
            className={cn(
              'cursor-pointer transition-all hover:opacity-80',
              'border-yellow-500/80 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20',
              {'opacity-50 cursor-not-allowed': totalSummary.warning === 0},
              filterStatus === 'warning' && 'ring-2 ring-yellow-500/80 ring-offset-2 ring-offset-background'
            )}
          >
            警告 {totalSummary.warning}
          </Badge>
           <Badge
            onClick={() => setFilterStatus('success')}
            className={cn(
              'cursor-pointer transition-all hover:opacity-80',
              'border-green-500/80 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20',
              {'opacity-50 cursor-not-allowed': totalSummary.success === 0},
              filterStatus === 'success' && 'ring-2 ring-green-500/80 ring-offset-2 ring-offset-background'
            )}
          >
            通过 {totalSummary.success}
          </Badge>
        </div>
      </div>
      
      <div className="space-y-2">
        {parseError ? (
           <p className="text-destructive">JSON 解析错误: {parseError}</p>
        ) : filteredGroups.map((group) => {
          const groupStatusConfig = statusConfig[group.overallStatus];
          return (
            <details key={group.groupTitle} className={cn("group border-l-4 rounded-r-md bg-muted/30 p-4", groupStatusConfig.borderColor)} open={group.overallStatus !== 'success'}>
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <div className="flex items-center space-x-3">
                  <groupStatusConfig.icon className={cn("w-5 h-5", groupStatusConfig.color)} />
                  <h3 className="font-semibold">{group.groupTitle}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {group.summary.error > 0 && <span className="text-xs font-medium text-red-600 dark:text-red-400">{group.summary.error} 错误</span>}
                  {group.summary.warning > 0 && <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">{group.summary.warning} 警告</span>}
                  {group.summary.success > 0 && <span className="text-xs font-medium text-gray-500">{group.summary.success} 通过</span>}
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                </div>
              </summary>
              <ul className="mt-4 space-y-4 pl-8 border-l border-border ml-2.5">
                {group.rules.map(rule => {
                  if (rule.status === 'info') return null; // Don't show info items
                  const itemStatusConfig = statusConfig[rule.status];
                  return (
                    <li key={rule.id} className="flex items-start space-x-4">
                      <itemStatusConfig.icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", itemStatusConfig.color)} />
                      <div className="flex-1">
                        <p className={cn("text-sm", rule.status !== 'success' && 'text-foreground', rule.status === 'success' && 'text-muted-foreground')}>
                          <code className="text-xs bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 mr-2">{rule.id}</code>
                          {rule.description}
                          {rule.remark && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="ml-2 align-middle">
                                  <Info className="w-4 h-4 text-blue-400" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{rule.remark}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </p>
                        {rule.details && <p className={cn("text-xs mt-1", itemStatusConfig.color, "opacity-90")}>{rule.details}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          )
        })}
      </div>
    </TooltipProvider>
  );
}
