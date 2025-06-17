
"use client";

import type { ApiResponseType } from "@/types/fmea";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { parseJsonWithBigInt } from "@/lib/bigint-utils";

interface DataInputPanelProps {
  onJsonSubmit: (json: string, type: ApiResponseType) => void;
  disabled?: boolean;
}

const exampleRequirementsJson = `{
  "nodes": [
    { "uuid": 9223372036854775801, "parentId": -1, "nodeType": "requirement", "description": "The system shall adhere to safety standard ISO 26262." },
    { "uuid": 9223372036854775802, "parentId": 9223372036854775801, "nodeType": "func", "description": "Implement fault detection for critical sensors." },
    { "uuid": 9223372036854775803, "parentId": 9223372036854775802, "nodeType": "cha", "description": "Sensor diagnostic coverage > 99%." }
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
    { "uuid": 9223372036854775701, "parentId": -1, "nodeType": "system", "description": "Vehicle Powertrain System", "extra": { "dr": 1 } },
    { "uuid": 9223372036854775702, "parentId": 9223372036854775701, "nodeType": "subsystem", "description": "Engine Control Unit (ECU)", "extra": { "dr": 2 } },
    { "uuid": 9223372036854775703, "parentId": 9223372036854775702, "nodeType": "component", "description": "Microprocessor", "extra": { "dr": 3 } },
    { "uuid": 9223372036854775704, "parentId": 9223372036854775703, "nodeType": "func", "description": "Execute control algorithms", "extra": { "category": 1 } },
    { "uuid": 9223372036854775705, "parentId": 9223372036854775704, "nodeType": "failure", "description": "Algorithm crashes", "extra": { "failureType": 1, "severity": 9, "occurrence": 3 } },
    { "uuid": 9223372036854775706, "parentId": 9223372036854775705, "nodeType": "action", "description": "Implement watchdog timer", "extra": { "category": 2, "detection": 4 } },
    { "uuid": 9223372036854775707, "parentId": 9223372036854775702, "nodeType": "cha", "description": "Processing speed > 100 MIPS" }
  ],
  "featureNet": [
    { "from": 9223372036854775704, "to": 9223372036854775707, "type": 1 }
  ],
  "failureNet": [
    { "from": 9223372036854775705, "to": 9223372036854775705, "type": 2 }
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
    { "uuid": "590066152953221201", "parentId": "-1", "nodeType": "item", "description": "Battery Cell Stacking Station" },
    { "uuid": "590066152953221202", "parentId": "590066152953221201", "nodeType": "step", "description": "Pick and place cell" },
    { "uuid": "590066152953221203", "parentId": "590066152953221202", "nodeType": "elem", "description": "Robot Gripper", "extra": { "em": 1 } },
    { "uuid": "590066152953221204", "parentId": "590066152953221203", "nodeType": "func", "description": "Securely hold cell during transfer" },
    { "uuid": "590066152953221205", "parentId": "590066152953221204", "nodeType": "cha", "description": "Gripping force between 5N-7N", "extra": { "type": "process" } },
    { "uuid": "590066152953221206", "parentId": "590066152953221204", "nodeType": "mode", "description": "Cell dropped or misaligned" },
    { "uuid": "590066152953221207", "parentId": "590066152953221206", "nodeType": "effect", "description": "Damaged cell, potential short circuit", "extra": { "category": 1, "severity": 10 } },
    { "uuid": "590066152953221208", "parentId": "590066152953221206", "nodeType": "cause", "description": "Incorrect gripper pressure", "extra": { "occurrence": 4 } },
    { "uuid": "590066152953221209", "parentId": "590066152953221208", "nodeType": "action", "description": "Calibrate gripper pressure sensor daily", "extra": { "category": 1, "detection": 3 } }
  ],
  "featureNet": [
    { "from": "590066152953221204", "to": "590066152953221205", "type": 1 }
  ],
  "failureNet": [
    { "from": "590066152953221206", "to": "590066152953221207", "type": 3 }
  ]
}`;

const exampleJsonMap: Record<ApiResponseType, string> = {
  requirements: exampleRequirementsJson,
  dfmea: exampleDfmeaJson,
  pfmea: examplePfmeaJson,
};

const defaultApiBaseUrl = 'https://fmea-api.xixifusi.online/api/fmea/analysis/'; // Updated Base URL

const defaultApiPayloads: Record<ApiResponseType, string> = {
  requirements: `{
  "sessionId": "session_ghia17289_requirements_focus",
  "nodes": [
    {
      "uuid": "590066152953221121"
    }
  ],
  "documentIds": [
    "http://www.example.doc_std_gbt20234_abc"
  ],
  "modifiedStructure": {
    "nodes": [
      {
        "uuid": "590066152953221100",
        "parentId": "-1",
        "nodeType": "system",
        "description": "调整后的机械安全系统",
        "extra": {
          "projectCode": "XYZ-Mod"
        }
      },
      {
        "uuid": "590066152953221121",
        "parentId": "590066152953221100",
        "nodeType": "subsystem",
        "description": "调整后的挤压防护子系统",
        "extra": {}
      },
      {
        "uuid": "590066152953221122",
        "parentId": "590066152953221121",
        "nodeType": "component",
        "description": "定制化安全间距挡板",
        "extra": {}
      }
    ]
  },
  "scope": "structure_only",
  "extraPayload": "{\\"analysisScope\\": \\"critical_safety_reqs_only\\"}"
}`,
  dfmea: `{
  "sessionId": "session_dfmea_example",
  "nodes": [],
  "modifiedStructure": { "nodes": [] },
  "scope": "full_dfmea",
  "extraPayload": "{}"
}`,
  pfmea: `{
  "sessionId": "session_pfmea_example",
  "processSteps": [],
  "modifiedStructure": { "nodes": [] },
  "scope": "full_pfmea",
  "extraPayload": "{}"
}`,
};


export function DataInputPanel({ onJsonSubmit, disabled }: DataInputPanelProps) {
  const [apiType, setApiType] = useState<ApiResponseType>("requirements");
  const [jsonInput, setJsonInput] = useState<string>(exampleJsonMap[apiType]);
  
  const [apiUrl, setApiUrl] = useState<string>(`${defaultApiBaseUrl}${apiType}`);
  const [apiPayload, setApiPayload] = useState<string>(defaultApiPayloads[apiType]);
  const [isFetchingApiData, setIsFetchingApiData] = useState<boolean>(false);
  const [apiFetchError, setApiFetchError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setJsonInput(exampleJsonMap[apiType]);
    setApiUrl(`${defaultApiBaseUrl}${apiType}`);
    setApiPayload(defaultApiPayloads[apiType]);
    setApiFetchError(null);
  }, [apiType]);

  const handleSubmit = () => {
    onJsonSubmit(jsonInput, apiType);
  };

  const handleApiTypeChange = (value: string) => {
    setApiType(value as ApiResponseType);
  };

  const handleFetchFromApi = async () => {
    setIsFetchingApiData(true);
    setApiFetchError(null);
    let parsedPayload;

    try {
      parsedPayload = parseJsonWithBigInt(apiPayload);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid Payload JSON",
        description: "The request payload is not valid JSON. Please correct it.",
      });
      setIsFetchingApiData(false);
      return;
    }

    let currentPayloadSnapshot = apiPayload; 

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedPayload),
        mode: 'cors', 
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Check for specific CORS or network-related status codes if possible, though response.ok handles general HTTP errors.
        // A status of 0 often indicates a CORS preflight failure or network error before the server could respond with a typical HTTP status.
        if (response.status === 0) {
           throw new Error(`API request failed. This might be due to a CORS policy on the server or a network issue. Status: ${response.status}. Error: ${errorText}`);
        }
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const responseDataText = await response.text();
      try {
        parseJsonWithBigInt(responseDataText); 
        setJsonInput(responseDataText);
        toast({
          title: "API Data Fetched",
          description: "Data successfully retrieved from the API and loaded into the JSON input area.",
        });
      } catch (e) {
        setJsonInput(responseDataText); 
        toast({
          variant: "destructive",
          title: "API Response Not JSON",
          description: "The API responded, but the data is not valid JSON. It has been loaded as text.",
        });
      }
    } catch (error: any) {
      let description = error.message || "An unknown error occurred while fetching data.";
       if (error.message && (error.message.toLowerCase().includes('failed to fetch') || error.message.toLowerCase().includes('networkerror'))) {
        description = `Failed to fetch: ${error.message}. This commonly occurs due to network issues, or a CORS (Cross-Origin Resource Sharing) policy on the API server. Please check your network connection, ensure the API server at ${apiUrl} is configured to allow requests from your origin, and check the browser's developer console (Network tab) for more specific error details (e.g., preflight OPTIONS request failures).`;
      } else if (error.message && (error.message.toLowerCase().includes('ssl') || error.message.toLowerCase().includes('certificate'))) {
        description = `SSL/TLS Certificate error: ${error.message}. The API server at ${apiUrl} might be using an invalid or self-signed certificate. Ensure the server has a valid HTTPS certificate.`;
      }
      
      setApiFetchError(description); 
      
      toast({
        variant: "destructive",
        title: "API Request Error",
        description: description,
      });
      console.error("API Fetch Error:", {
        url: apiUrl,
        payloadAttempted: currentPayloadSnapshot, 
        errorDetails: error,
        errorMessage: error.message,
        advice: "If this is a CORS issue, the API server needs to be configured with appropriate Access-Control-Allow-Origin headers."
      });
    } finally {
      setIsFetchingApiData(false);
    }
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
            disabled={disabled || isFetchingApiData}
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
        
        <Separator className="my-6" />
        
        <CardDescription>Option 1: Fetch from API</CardDescription>
        <div>
          <Label htmlFor="apiUrl" className="mb-2 block">API URL</Label>
          <Input
            id="apiUrl"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="Enter API endpoint URL"
            className="font-code"
            disabled={disabled || isFetchingApiData}
          />
        </div>
        <div>
          <Label htmlFor="apiPayload" className="mb-2 block">Request Payload (JSON)</Label>
          <Textarea
            id="apiPayload"
            value={apiPayload}
            onChange={(e) => setApiPayload(e.target.value)}
            placeholder="Enter JSON payload for the API request"
            rows={8}
            className="font-code"
            disabled={disabled || isFetchingApiData}
          />
        </div>
        <Button 
          onClick={handleFetchFromApi} 
          className="w-full" 
          disabled={disabled || isFetchingApiData}
        >
          {isFetchingApiData && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Fetch Data from API
        </Button>
        {apiFetchError && !isFetchingApiData && <p className="text-sm text-destructive mt-2">{apiFetchError}</p>}
        
        <Separator className="my-6" />

        <CardDescription>Option 2: Paste JSON or Use Example</CardDescription>
        <div>
          <Label htmlFor="jsonInput" className="mb-2 block">FMEA JSON Data</Label>
          <Textarea
            id="jsonInput"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste JSON data here, or fetch from API, or use loaded example..."
            rows={15}
            className="font-code"
            disabled={disabled || isFetchingApiData}
          />
        </div>
        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          disabled={disabled || isFetchingApiData || !jsonInput.trim()}
        >
          Visualize Data
        </Button>
      </CardContent>
    </Card>
  );
}

