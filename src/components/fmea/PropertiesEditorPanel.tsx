
"use client";

import type { FmeaNode, ApiResponseType } from "@/types/fmea";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import { formatBigIntForEditor, isBigInt } from "@/lib/bigint-utils";

interface PropertiesEditorPanelProps {
  nodeData: FmeaNode | null;
  apiResponseType: ApiResponseType | null;
  onPropertyChange: (updatedNodeData: FmeaNode) => void;
  onUpdateNode: () => void;
  disabled?: boolean;
}

const getExtraFieldsConfig = (nodeType: string, apiResponseType: ApiResponseType | null): { key: string; label: string; type: 'string' | 'number' | 'textarea' }[] => {
  if (!apiResponseType) return [];

  switch (apiResponseType) {
    case 'requirements':
      if (nodeType === 'requirement') return [
        { key: 'partNo', label: 'Part No', type: 'string' },
        { key: 'partName', label: 'Part Name', type: 'string' },
      ];
      return [];
    case 'dfmea':
      switch (nodeType) {
        case 'system':
        case 'subsystem':
        case 'component':
          return [{ key: 'dr', label: 'DR', type: 'number' }];
        case 'func':
          return [{ key: 'category', label: 'Category', type: 'number' }];
        case 'failure':
          return [
            { key: 'failureType', label: 'Failure Type', type: 'number' },
            { key: 'severity', label: 'Severity', type: 'number' },
            { key: 'occurrence', label: 'Occurrence', type: 'number' },
          ];
        case 'action':
          return [
            { key: 'category', label: 'Category', type: 'number' },
            { key: 'detection', label: 'Detection', type: 'number' },
          ];
        default: return [];
      }
    case 'pfmea':
      switch (nodeType) {
        case 'elem':
          return [{ key: 'em', label: 'EM', type: 'number' }];
        case 'cha':
          return [{ key: 'type', label: 'Type (product/process)', type: 'string' }];
        case 'effect':
          return [
            { key: 'category', label: 'Category', type: 'number' },
            { key: 'severity', label: 'Severity', type: 'number' },
          ];
        case 'cause':
          return [{ key: 'occurrence', label: 'Occurrence', type: 'number' }];
        case 'action':
          return [
            { key: 'category', label: 'Category', type: 'number' },
            { key: 'detection', label: 'Detection', type: 'number' },
          ];
        default: return [];
      }
    default:
      return [];
  }
};


export function PropertiesEditorPanel({ nodeData, apiResponseType, onPropertyChange, onUpdateNode, disabled }: PropertiesEditorPanelProps) {
  const [newExtraKey, setNewExtraKey] = useState<string>("");
  const [newExtraValue, setNewExtraValue] = useState<string>("");

  useEffect(() => {
    // Reset new extra property fields when nodeData changes
    setNewExtraKey("");
    setNewExtraValue("");
  }, [nodeData]);

  if (!nodeData) {
    return (
      <Card className="shadow-lg h-full">
        <CardHeader>
          <CardTitle className="font-headline">Node Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Select a node to view and edit its properties.</p>
        </CardContent>
      </Card>
    );
  }

  const handleInputChange = (field: keyof FmeaNode | `extra.${string}`, value: string | number | bigint) => {
    const updatedNode = { ...nodeData, extra: { ...(nodeData.extra || {}) } } as FmeaNode; // Ensure extra is an object
    if (typeof field === 'string' && field.startsWith('extra.')) {
      const extraKey = field.substring(6);
      (updatedNode.extra as any)![extraKey] = value;
    } else {
      (updatedNode as any)[field] = value;
    }
    onPropertyChange(updatedNode);
  };
  
  const handleAddExtraProperty = () => {
    if (!newExtraKey.trim() || !nodeData) return;
    const updatedNode = {
      ...nodeData,
      extra: {
        ...(nodeData.extra || {}),
        [newExtraKey.trim()]: newExtraValue,
      },
    } as FmeaNode;
    onPropertyChange(updatedNode);
    setNewExtraKey("");
    setNewExtraValue("");
  };


  const extraFieldsConfig = getExtraFieldsConfig(nodeData.nodeType, apiResponseType);
  const dynamicExtraProperties = nodeData.extra 
    ? Object.entries(nodeData.extra).filter(([key]) => !extraFieldsConfig.find(field => field.key === key))
    : [];


  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline">Edit Node: <span className="text-accent">{nodeData.nodeType}</span></CardTitle>
        <CardDescription>UUID: {formatBigIntForEditor(nodeData.uuid)}</CardDescription>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="uuid">UUID (Read-only)</Label>
            <Input id="uuid" value={formatBigIntForEditor(nodeData.uuid)} readOnly disabled className="mt-1 bg-muted/50" />
          </div>
          <div>
            <Label htmlFor="parentId">Parent ID</Label>
            <Input
              id="parentId"
              type="text"
              value={nodeData.parentId === BigInt(-1) ? '' : nodeData.parentId.toString()} // Show empty if -1 for better UX
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  handleInputChange('parentId', BigInt(-1));
                } else {
                  try {
                    handleInputChange('parentId', BigInt(value));
                  } catch (error) {
                    // If BigInt conversion fails, keep the current value
                    // Could add validation feedback here
                  }
                }
              }}
              className="mt-1"
              disabled={disabled}
              placeholder="Enter Parent ID or leave empty if none"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={nodeData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="mt-1"
              rows={3}
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="nodeType">Node Type (Read-only)</Label>
            <Input id="nodeType" value={nodeData.nodeType} readOnly disabled className="mt-1 bg-muted/50" />
          </div>

          {(extraFieldsConfig.length > 0 || dynamicExtraProperties.length > 0) && (
            <div className="pt-2">
              <h4 className="text-md font-medium mb-2 font-headline">Extra Properties</h4>
              {extraFieldsConfig.map(field => (
                <div key={field.key} className="mb-3">
                  <Label htmlFor={`extra-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`extra-${field.key}`}
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={(nodeData.extra as any)?.[field.key] ?? ''}
                    onChange={(e) => handleInputChange(`extra.${field.key}`, field.type === 'number' ? parseInt(e.target.value, 10) || 0 : e.target.value)}
                    className="mt-1"
                    disabled={disabled}
                  />
                </div>
              ))}
              {dynamicExtraProperties.map(([key, value]) => (
                <div key={key} className="mb-3">
                  <Label htmlFor={`extra-dyn-${key}`}>{key}</Label>
                  <Input
                    id={`extra-dyn-${key}`}
                    type="text" // Assume text for dynamically added ones initially
                    value={String(value)}
                    onChange={(e) => handleInputChange(`extra.${key}`, e.target.value)}
                    className="mt-1"
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-4 border-t border-border/50">
            <h4 className="text-md font-medium mb-2 font-headline">Add New Extra Property</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="newExtraKey">Property Key</Label>
                <Input
                  id="newExtraKey"
                  value={newExtraKey}
                  onChange={(e) => setNewExtraKey(e.target.value)}
                  placeholder="Enter property key"
                  className="mt-1"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label htmlFor="newExtraValue">Property Value</Label>
                <Input
                  id="newExtraValue"
                  value={newExtraValue}
                  onChange={(e) => setNewExtraValue(e.target.value)}
                  placeholder="Enter property value"
                  className="mt-1"
                  disabled={disabled}
                />
              </div>
              <Button 
                onClick={handleAddExtraProperty} 
                variant="outline" 
                className="w-full"
                disabled={disabled || !newExtraKey.trim()}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </div>
          </div>

        </CardContent>
      </ScrollArea>
      <div className="p-6 border-t">
        <Button onClick={onUpdateNode} className="w-full" disabled={disabled}>
          Update Node in Graph
        </Button>
      </div>
    </Card>
  );
}
