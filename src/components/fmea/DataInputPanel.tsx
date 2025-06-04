
"use client";

import type { ApiResponseType } from "@/types/fmea";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DataInputPanelProps {
  onJsonSubmit: (json: string, type: ApiResponseType) => void;
  disabled?: boolean;
}

const exampleRequirementsJson = `{
  "nodes": [
    { "uuid": 101, "parentId": -1, "nodeType": "requirement", "description": "The system shall adhere to safety standard ISO 26262." },
    { "uuid": 102, "parentId": 101, "nodeType": "func", "description": "Implement fault detection for critical sensors." },
    { "uuid": 103, "parentId": 102, "nodeType": "cha", "description": "Sensor diagnostic coverage > 99%." }
  ]
}`;

const exampleDfmeaJson = `{
  "baseInfo": {
    "name": "Sample DFMEA Project - Powertrain Control Module",
    "partNo": "PCM-001-REV-B",
    "partName": "Powertrain Control Module",
    "evaluationCriteria": "Automotive SPICE Level 3"
  },
  "nodes": [
    { "uuid": 1, "parentId": -1, "nodeType": "system", "description": "Vehicle Powertrain System", "extra": { "dr": 1 } },
    { "uuid": 2, "parentId": 1, "nodeType": "subsystem", "description": "Engine Control Unit (ECU)", "extra": { "dr": 2 } },
    { "uuid": 3, "parentId": 2, "nodeType": "component", "description": "Microprocessor", "extra": { "dr": 3 } },
    { "uuid": 4, "parentId": 3, "nodeType": "func", "description": "Execute control algorithms", "extra": { "category": 1 } },
    { "uuid": 5, "parentId": 4, "nodeType": "failure", "description": "Algorithm crashes", "extra": { "failureType": 1, "severity": 9, "occurrence": 3 } },
    { "uuid": 6, "parentId": 5, "nodeType": "action", "description": "Implement watchdog timer", "extra": { "category": 2, "detection": 4 } },
    { "uuid": 7, "parentId": 2, "nodeType": "cha", "description": "Processing speed > 100 MIPS" }
  ],
  "featureNet": [
    { "from": 4, "to": 7, "type": 1 }
  ],
  "failureNet": [
    { "from": 5, "to": 5, "type": 2 }
  ]
}`;

const examplePfmeaJson = `{
  "baseInfo": {
    "name": "Sample PFMEA Project - Battery Assembly Line",
    "partNo": "BAT-ASSY-PROC-001",
    "partName": "Battery Module Assembly Process",
    "evaluationCriteria": "IATF 16949 Manufacturing Standards"
  },
  "nodes": [
    { "uuid": 201, "parentId": -1, "nodeType": "item", "description": "Battery Cell Stacking Station" },
    { "uuid": 202, "parentId": 201, "nodeType": "step", "description": "Pick and place cell" },
    { "uuid": 203, "parentId": 202, "nodeType": "elem", "description": "Robot Gripper", "extra": { "em": 1 } },
    { "uuid": 204, "parentId": 203, "nodeType": "func", "description": "Securely hold cell during transfer" },
    { "uuid": 205, "parentId": 204, "nodeType": "cha", "description": "Gripping force between 5N-7N", "extra": { "type": "process" } },
    { "uuid": 206, "parentId": 204, "nodeType": "mode", "description": "Cell dropped or misaligned" },
    { "uuid": 207, "parentId": 206, "nodeType": "effect", "description": "Damaged cell, potential short circuit", "extra": { "category": 1, "severity": 10 } },
    { "uuid": 208, "parentId": 206, "nodeType": "cause", "description": "Incorrect gripper pressure", "extra": { "occurrence": 4 } },
    { "uuid": 209, "parentId": 208, "nodeType": "action", "description": "Calibrate gripper pressure sensor daily", "extra": { "category": 1, "detection": 3 } }
  ],
  "featureNet": [
    { "from": 204, "to": 205, "type": 1 }
  ],
  "failureNet": [
    { "from": 206, "to": 207, "type": 3 }
  ]
}`;

const exampleJsonMap: Record<ApiResponseType, string> = {
  requirements: exampleRequirementsJson,
  dfmea: exampleDfmeaJson,
  pfmea: examplePfmeaJson,
};

export function DataInputPanel({ onJsonSubmit, disabled }: DataInputPanelProps) {
  const [apiType, setApiType] = useState<ApiResponseType>("dfmea");
  const [jsonInput, setJsonInput] = useState<string>(exampleJsonMap[apiType]);

  useEffect(() => {
    setJsonInput(exampleJsonMap[apiType]);
  }, [apiType]);

  const handleSubmit = () => {
    onJsonSubmit(jsonInput, apiType);
  };

  const handleApiTypeChange = (value: string) => {
    setApiType(value as ApiResponseType);
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
            onValueChange={handleApiTypeChange}
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
