"use client";

import type { ApiResponseType } from "@/types/fmea";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DataInputPanelProps {
  onJsonSubmit: (json: string, type: ApiResponseType) => void;
  disabled?: boolean;
}

const exampleJson = `{
  "nodes": [
    {
      "uuid": 1,
      "parentId": -1,
      "nodeType": "requirement",
      "description": "机械设计应符合 GB/T 12265—2021 标准，防止人体部位挤压。",
      "extra": { "partNo": "GENERIC_MACHINE_001", "partName": "通用机械设备" }
    }
  ]
}`;

export function DataInputPanel({ onJsonSubmit, disabled }: DataInputPanelProps) {
  const [jsonInput, setJsonInput] = useState<string>(exampleJson);
  const [apiType, setApiType] = useState<ApiResponseType>("requirements");

  const handleSubmit = () => {
    onJsonSubmit(jsonInput, apiType);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">FMEA Data Input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="apiType" className="mb-2 block">API Response Type</Label>
          <Select
            value={apiType}
            onValueChange={(value) => setApiType(value as ApiResponseType)}
            disabled={disabled}
          >
            <SelectTrigger id="apiType">
              <SelectValue placeholder="Select API type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="requirements">Requirements</SelectItem>
              <SelectItem value="dfmea">DFMEA</SelectItem>
              <SelectItem value="pfmea">PFMEA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="jsonInput" className="mb-2 block">Paste FMEA JSON here</Label>
          <Textarea
            id="jsonInput"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste JSON data here..."
            rows={15}
            className="font-code"
            disabled={disabled}
          />
        </div>
        <Button onClick={handleSubmit} className="w-full" disabled={disabled}>
          Visualize Data
        </Button>
      </CardContent>
    </Card>
  );
}
