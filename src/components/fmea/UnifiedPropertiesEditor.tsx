"use client";

import type { FmeaNode, ApiResponseType, InterfaceLink } from "@/types/fmea";
import React from "react";
import { PropertiesEditorPanel } from "./PropertiesEditorPanel";
import { InterfaceLinkEditor } from "./InterfaceLinkEditor";

interface UnifiedPropertiesEditorProps {
  nodeData: FmeaNode | null;
  interfaceLinkData: InterfaceLink | null;
  apiResponseType: ApiResponseType | null;
  onPropertyChange: (updatedNodeData: FmeaNode) => void;
  onInterfaceLinkPropertyChange: (updatedInterfaceLink: InterfaceLink) => void;
  onUpdateNode: () => void;
  onUpdateInterfaceLink: () => void;
  disabled?: boolean;
}

export function UnifiedPropertiesEditor({
  nodeData,
  interfaceLinkData,
  apiResponseType,
  onPropertyChange,
  onInterfaceLinkPropertyChange,
  onUpdateNode,
  onUpdateInterfaceLink,
  disabled
}: UnifiedPropertiesEditorProps) {
  // Show interface link editor if an interface link is selected
  if (interfaceLinkData) {
    return (
      <InterfaceLinkEditor
        interfaceLink={interfaceLinkData}
        onPropertyChange={onInterfaceLinkPropertyChange}
        onUpdateInterfaceLink={onUpdateInterfaceLink}
        disabled={disabled}
      />
    );
  }

  // Otherwise show the node properties editor
  return (
    <PropertiesEditorPanel
      nodeData={nodeData}
      apiResponseType={apiResponseType}
      onPropertyChange={onPropertyChange}
      onUpdateNode={onUpdateNode}
      disabled={disabled}
    />
  );
}
