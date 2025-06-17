
"use client";

import type { NodeProps } from "reactflow";
import type { CustomNodeData } from "@/types/fmea";
import { Handle, Position } from "reactflow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBigIntForDisplay, isBigInt } from "@/lib/bigint-utils";
import {
  FileText, Cog, BarChart2, HardDrive, Server, Puzzle, AlertTriangle, Play, Package, ListChecks, ListOrdered, User, AlertCircle, Zap, HelpCircle, Settings2, Network, Merge, Share2, GitFork
} from "lucide-react";

// Map node types to icons and colors
const nodeStyleMap: Record<string, { icon: React.ComponentType<{className?: string}>, colorClass: string, bgColorClass: string, borderColorClass: string }> = {
  requirement: { icon: FileText, colorClass: "text-chart-1", bgColorClass: "bg-chart-1/10", borderColorClass: "border-chart-1" },
  func: { icon: Cog, colorClass: "text-chart-2", bgColorClass: "bg-chart-2/10", borderColorClass: "border-chart-2" },
  cha: { icon: BarChart2, colorClass: "text-chart-3", bgColorClass: "bg-chart-3/10", borderColorClass: "border-chart-3" },
  system: { icon: HardDrive, colorClass: "text-chart-4", bgColorClass: "bg-chart-4/10", borderColorClass: "border-chart-4" },
  subsystem: { icon: Server, colorClass: "text-chart-5", bgColorClass: "bg-chart-5/10", borderColorClass: "border-chart-5" },
  component: { icon: Puzzle, colorClass: "text-indigo-500", bgColorClass: "bg-indigo-500/10", borderColorClass: "border-indigo-500" },
  failure: { icon: AlertTriangle, colorClass: "text-red-500", bgColorClass: "bg-red-500/10", borderColorClass: "border-red-500" },
  action: { icon: Play, colorClass: "text-green-500", bgColorClass: "bg-green-500/10", borderColorClass: "border-green-500" },
  item: { icon: Package, colorClass: "text-amber-500", bgColorClass: "bg-amber-500/10", borderColorClass: "border-amber-500" },
  step: { icon: ListChecks, colorClass: "text-teal-500", bgColorClass: "bg-teal-500/10", borderColorClass: "border-teal-500" },
  step2: { icon: ListOrdered, colorClass: "text-cyan-500", bgColorClass: "bg-cyan-500/10", borderColorClass: "border-cyan-500" },
  elem: { icon: User, colorClass: "text-lime-500", bgColorClass: "bg-lime-500/10", borderColorClass: "border-lime-500" },
  mode: { icon: AlertCircle, colorClass: "text-orange-500", bgColorClass: "bg-orange-500/10", borderColorClass: "border-orange-500" },
  effect: { icon: Zap, colorClass: "text-pink-500", bgColorClass: "bg-pink-500/10", borderColorClass: "border-pink-500" },
  cause: { icon: HelpCircle, colorClass: "text-fuchsia-500", bgColorClass: "bg-fuchsia-500/10", borderColorClass: "border-fuchsia-500" },
  feature: { icon: Settings2, colorClass: "text-emerald-500", bgColorClass: "bg-emerald-500/10", borderColorClass: "border-emerald-500" },
  failureNet: { icon: GitFork, colorClass: "text-rose-500", bgColorClass: "bg-rose-500/10", borderColorClass: "border-rose-500" }, 
  default: { icon: Merge, colorClass: "text-slate-500", bgColorClass: "bg-slate-500/10", borderColorClass: "border-slate-500" },
};


export function CustomGraphNode({ data, selected, sourcePosition = Position.Right, targetPosition = Position.Left }: NodeProps<CustomNodeData>) {
  const { label, type, originalApiNode } = data;
  const styleInfo = nodeStyleMap[type] || nodeStyleMap.default;
  const IconComponent = styleInfo.icon;

  const extraProperties = originalApiNode.extra && Object.keys(originalApiNode.extra).length > 0
    ? Object.entries(originalApiNode.extra)
    : null;

  return (
    <>
      <Handle type="target" position={targetPosition} className="!bg-accent w-3 h-3" />
      <Card 
        className={cn(
          "shadow-md w-64 relative", 
          styleInfo.bgColorClass, 
          styleInfo.borderColorClass,
          selected ? `ring-2 ring-offset-1 ${styleInfo.borderColorClass} ring-opacity-75` : ""
        )}
        style={{
          // @ts-ignore
          '--tw-border-opacity': selected ? 1 : 0.5,
          borderColor: selected ? `hsl(var(--accent))` : styleInfo.borderColorClass.startsWith('border-chart-') ? `hsl(var(--${styleInfo.borderColorClass.substring(7)}))` : undefined,
        }}
      >
        <CardHeader className="p-3 pr-10"> 
          <div className="flex items-center space-x-2">
            <IconComponent className={cn("w-5 h-5", styleInfo.colorClass)} />
            <CardTitle className={cn("text-sm font-medium leading-none", styleInfo.colorClass, "font-headline")}>
              {type.toUpperCase()}
            </CardTitle>
          </div>
          <div className="absolute top-1 right-1.5 px-1.5 py-0.5 rounded bg-black/5 text-muted-foreground text-[10px] font-mono">
            UUID: {formatBigIntForDisplay(originalApiNode.uuid)}
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <CardDescription className="text-xs text-foreground/80 break-words">
            {label}
          </CardDescription>
          {extraProperties && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <h5 className="text-[11px] font-medium text-muted-foreground mb-1">Extra Properties:</h5>
              {extraProperties.map(([key, value]) => (
                <div key={key} className="text-[10px] text-foreground/70 truncate">
                  <span className="font-medium">{key}:</span> {isBigInt(value) ? formatBigIntForDisplay(value) : String(value)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Handle type="source" position={sourcePosition} className="!bg-accent w-3 h-3" />
    </>
  );
}
