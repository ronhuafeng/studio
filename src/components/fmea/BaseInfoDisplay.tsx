"use client";

import type { DfmeaBaseInfo, PfmeaBaseInfo } from "@/types/fmea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface BaseInfoDisplayProps {
  baseInfo: DfmeaBaseInfo | PfmeaBaseInfo | null;
}

export function BaseInfoDisplay({ baseInfo }: BaseInfoDisplayProps) {
  if (!baseInfo) {
    return null;
  }

  return (
    <Card className="mt-4 shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Base Information</CardTitle>
        <CardDescription>{baseInfo.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p><strong className="font-medium">Part No:</strong> {baseInfo.partNo}</p>
        <p><strong className="font-medium">Part Name:</strong> {baseInfo.partName}</p>
        <p><strong className="font-medium">Evaluation Criteria:</strong> {baseInfo.evaluationCriteria}</p>
      </CardContent>
    </Card>
  );
}
