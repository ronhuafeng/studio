
"use client";

import type { ApiResponseType } from "@/types/fmea";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const exampleJson = `{
  "nodes": [
    { "uuid": 1, "parentId": -1, "nodeType": "requirement", "description": "System must be safe and easy to use." },
    { "uuid": 2, "parentId": 1, "nodeType": "func", "description": "Provide safety interlock mechanism." },
    { "uuid": 3, "parentId": 1, "nodeType": "func", "description": "Provide clear user warnings and indicators." },
    { "uuid": 4, "parentId": 2, "nodeType": "failure", "description": "Interlock fails to engage (open)." },
    { "uuid": 5, "parentId": 2, "nodeType": "failure", "description": "Interlock engages prematurely (closed)." },
    { "uuid": 6, "parentId": 3, "nodeType": "cha", "description": "Warning light visibility." }
  ],
  "featureNet": [
    { "from": 2, "to": 3, "type": 1 }
  ],
  "failureNet": [
    { "from": 4, "to": 5, "type": 2 }
  ],
  "baseInfo": {
    "name": "Sample DFMEA Project",
    "partNo": "XYZ-123",
    "partName": "Safety Control Module",
    "evaluationCriteria": "Standard Automotive Safety"
  }
}`;

export function DataInputPanel({ onJsonSubmit, disabled }: DataInputPanelProps) {
  const [jsonInput, setJsonInput] = useState<string>(exampleJson);
  const [apiType, setApiType] = useState<ApiResponseType>("dfmea"); // Default to dfmea as example has baseInfo

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
