
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { ApiResponseType, FmeaApiResponse } from '@/types/fmea';
import type { RuleResult } from '@/lib/fmea-rules';
import { runAllRules } from '@/lib/fmea-rules';
import { parseJsonWithBigInt } from '@/lib/bigint-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';


interface RuleVerificationPanelProps {
  fmeaJson: string;
  fmeaType: ApiResponseType | null;
  disabled?: boolean;
}

const statusConfig = {
  correct: {
    icon: CheckCircle2,
    color: 'text-green-500',
    label: 'Correct',
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    label: 'Info',
  }
};


export function RuleVerificationPanel({ fmeaJson, fmeaType, disabled }: RuleVerificationPanelProps) {
  const [results, setResults] = useState<RuleResult[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (!fmeaJson || !fmeaType) {
      setResults([]);
      setParseError(null);
      return;
    }

    try {
      const parsedData = parseJsonWithBigInt(fmeaJson) as FmeaApiResponse;
      setParseError(null);
      const validationResults = runAllRules(parsedData, fmeaType);
      setResults(validationResults);
    } catch (error) {
      if (error instanceof Error) {
        setParseError(error.message);
      } else {
        setParseError('An unknown error occurred during JSON parsing.');
      }
      setResults([]);
    }
  }, [fmeaJson, fmeaType]);

  const summary = useMemo(() => {
    if (parseError) return { error: 1, warning: 0, correct: 0, info: 0 };
    return results.reduce((acc, result) => {
        acc[result.status] = (acc[result.status] || 0) + 1;
        return acc;
    }, { error: 0, warning: 0, correct: 0, info: 0 });
  }, [results, parseError]);


  if (!fmeaJson) {
    return null; // Don't render anything if there's no JSON data
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight font-headline">规则验证</h2>
        <p className="text-sm text-muted-foreground mt-1.5">数据完整性和最佳实践的状态。</p>
        <div className="flex items-center space-x-2 pt-3">
            {summary.error > 0 && <Badge variant="destructive">{summary.error} 错误</Badge>}
            {summary.warning > 0 && <Badge variant="outline" className="border-yellow-500/80 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">{summary.warning} 警告</Badge>}
            {summary.correct > 0 && <Badge variant="outline" className="border-green-500/80 bg-green-500/10 text-green-700 dark:text-green-400">{summary.correct} 正确</Badge>}
        </div>
      </div>
      <TooltipProvider>
        <ul className="space-y-3">
        {parseError ? (
            <li className="flex items-center space-x-3">
                <XCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                <span className="text-sm">JSON is not valid.</span>
            </li>
        ) : (
            results.map(result => {
            const config = statusConfig[result.status];
            const Icon = config.icon;
            return (
                <li key={result.id} className="flex items-start space-x-3">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.color)} />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{config.label}</p>
                        </TooltipContent>
                    </Tooltip>
                    <div>
                        <p className="text-sm">{result.description}</p>
                        {result.details && (
                            <p className="text-xs text-muted-foreground">{result.details}</p>
                        )}
                    </div>
                </li>
            );
            })
        )}
        </ul>
      </TooltipProvider>
    </>
  );
}
