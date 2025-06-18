"use client";

import type { InterfaceLink } from "@/types/fmea";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBigIntForDisplay, formatBigIntForEditor } from "@/lib/bigint-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2 } from "lucide-react";

interface InterfaceLinkEditorProps {
  interfaceLink: InterfaceLink | null;
  onPropertyChange: (updatedInterfaceLink: InterfaceLink) => void;
  onUpdateInterfaceLink: () => void;
  disabled?: boolean;
}

export function InterfaceLinkEditor({ 
  interfaceLink, 
  onPropertyChange, 
  onUpdateInterfaceLink, 
  disabled 
}: InterfaceLinkEditorProps) {
  if (!interfaceLink) {
    return (
      <Card className="shadow-lg h-full">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Interface Link Properties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Select an interface link (edge) to view and edit its properties.</p>
        </CardContent>
      </Card>
    );
  }

  const handleInputChange = (field: keyof InterfaceLink, value: string | number | bigint) => {
    const updatedLink = { ...interfaceLink, [field]: value };
    onPropertyChange(updatedLink);
  };

  const getInteractionTypeLabel = (interaction: number) => {
    switch (interaction) {
      case 0: return "Unidirectional";
      case 1: return "Bidirectional";
      default: return `Type ${interaction}`;
    }
  };

  const getEffectTypeLabel = (effect: number) => {
    switch (effect) {
      case 0: return "Normal";
      case 1: return "Adverse";
      default: return `Effect ${effect}`;
    }
  };

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Share2 className="w-5 h-5 text-chart-4" />
          Interface Link Properties
        </CardTitle>
        <CardDescription>
          Structure: {formatBigIntForDisplay(interfaceLink.structureId)}
        </CardDescription>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="structureId">Structure ID (Read-only)</Label>
            <Input 
              id="structureId" 
              value={formatBigIntForEditor(interfaceLink.structureId)} 
              readOnly 
              disabled 
              className="mt-1 bg-muted/50" 
            />
          </div>

          <div>
            <Label htmlFor="startId">Start ID (Read-only)</Label>
            <Input 
              id="startId" 
              value={formatBigIntForEditor(interfaceLink.startId)} 
              readOnly 
              disabled 
              className="mt-1 bg-muted/50" 
            />
          </div>

          <div>
            <Label htmlFor="endId">End ID (Read-only)</Label>
            <Input 
              id="endId" 
              value={formatBigIntForEditor(interfaceLink.endId)} 
              readOnly 
              disabled 
              className="mt-1 bg-muted/50" 
            />
          </div>

          <div>
            <Label htmlFor="type">Interface Type</Label>
            <Input
              id="type"
              type="number"
              value={interfaceLink.type}
              onChange={(e) => handleInputChange('type', parseInt(e.target.value, 10) || 0)}
              className="mt-1"
              disabled={disabled}
            />
          </div>

          <div>
            <Label htmlFor="interaction">Interaction Type</Label>
            <Select 
              value={interfaceLink.interaction.toString()} 
              onValueChange={(value) => handleInputChange('interaction', parseInt(value, 10))}
              disabled={disabled}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select interaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 - Unidirectional</SelectItem>
                <SelectItem value="1">1 - Bidirectional</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Current: {getInteractionTypeLabel(interfaceLink.interaction)}
            </p>
          </div>

          <div>
            <Label htmlFor="effect">Effect Type</Label>
            <Select 
              value={interfaceLink.effect.toString()} 
              onValueChange={(value) => handleInputChange('effect', parseInt(value, 10))}
              disabled={disabled}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select effect type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 - Normal</SelectItem>
                <SelectItem value="1">1 - Adverse</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Current: {getEffectTypeLabel(interfaceLink.effect)}
              <span 
                className="inline-block w-3 h-3 rounded ml-2 border"
                style={{
                  backgroundColor: interfaceLink.effect === 0 ? '#4ade80' : '#ef4444'
                }}
              ></span>
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={interfaceLink.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="mt-1"
              rows={3}
              disabled={disabled}
            />
          </div>

          <div>
            <Label htmlFor="virtualParts">Virtual Parts</Label>
            <Textarea
              id="virtualParts"
              value={interfaceLink.virtualParts}
              onChange={(e) => handleInputChange('virtualParts', e.target.value)}
              className="mt-1"
              rows={2}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </ScrollArea>
      <div className="p-6 border-t">
        <Button onClick={onUpdateInterfaceLink} className="w-full" disabled={disabled}>
          Update Interface Link
        </Button>
      </div>
    </Card>
  );
}
