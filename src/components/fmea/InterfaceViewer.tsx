// src/components/fmea/InterfaceViewer.tsx
"use client";

import React, { useMemo } from "react";
import { Node, Edge, OnNodesChange, OnEdgesChange, ReactFlowProvider } from "reactflow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomNodeData, InterfaceLink } from "@/types/fmea";
import { formatBigIntForDisplay } from "@/lib/bigint-utils";
import InterfaceSubFlow from "./InterfaceSubFlow";
import { Network, Share2 } from "lucide-react";

interface InterfaceViewerProps {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  interfaceLinks: InterfaceLink[];
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  fitView?: boolean;
}

interface InterfaceGroupData {
  structureId: bigint;
  interfaces: InterfaceLink[];
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
}

function InterfaceViewerInternal({
  nodes,
  edges,
  interfaceLinks,
  onNodeClick,
  onEdgeClick,
  onNodesChange,
  onEdgesChange,
  fitView,
}: InterfaceViewerProps) {
  // Group interfaces by structureId
  const interfaceGroups = useMemo(() => {
    const groupMap = new Map<string, InterfaceGroupData>();
    
    interfaceLinks.forEach(iface => {
      const structureKey = iface.structureId.toString();
      
      if (!groupMap.has(structureKey)) {
        groupMap.set(structureKey, {
          structureId: iface.structureId,
          interfaces: [],
          nodes: [],
          edges: [],
        });
      }
      
      const group = groupMap.get(structureKey)!;
      group.interfaces.push(iface);
    });

    // For each group, find relevant nodes and edges
    groupMap.forEach((group) => {
      const nodeIds = new Set<string>();
      
      // Collect all node IDs involved in this interface group
      group.interfaces.forEach(iface => {
        nodeIds.add(iface.startId.toString());
        nodeIds.add(iface.endId.toString());
      });
      
      // Filter nodes that belong to this group
      group.nodes = nodes.filter(node => nodeIds.has(node.id));
      
      // Filter edges that belong to this group (interface edges)
      group.edges = edges.filter(edge => 
        edge.id.includes(`interface_${group.structureId}`) ||
        (nodeIds.has(edge.source) && nodeIds.has(edge.target))
      );
    });

    return Array.from(groupMap.values());
  }, [nodes, edges, interfaceLinks]);

  if (interfaceGroups.length === 0) {
    return (
      <div className="w-full h-full rounded-lg shadow-lg border border-border bg-card flex items-center justify-center">
        <p className="text-muted-foreground text-lg p-8 text-center">
          No Interface data available or input FMEA JSON.
        </p>
      </div>
    );
  }

  // If only one interface group, show it directly
  if (interfaceGroups.length === 1) {
    return (
      <div className="w-full h-full">
        <InterfaceSubFlow
          interfaceGroup={interfaceGroups[0]}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView={fitView}
        />
      </div>
    );
  }

  // Multiple interface groups - use tabs
  return (
    <div className="w-full h-full flex flex-col">
      <Tabs defaultValue={interfaceGroups[0]?.structureId.toString()} className="flex flex-col h-full">
        <TabsList className="mb-2 shrink-0 grid grid-cols-auto">
          {interfaceGroups.map((group) => (
            <TabsTrigger 
              key={group.structureId.toString()} 
              value={group.structureId.toString()}
              className="gap-1.5 text-xs"
            >
              <Network size={14} />
              Structure {formatBigIntForDisplay(group.structureId)}
              <span className="text-xs opacity-70">({group.interfaces.length})</span>
            </TabsTrigger>
          ))}
        </TabsList>
        
        <div className="flex-grow min-h-0">
          {interfaceGroups.map((group) => (
            <TabsContent 
              key={group.structureId.toString()} 
              value={group.structureId.toString()} 
              className="h-full m-0"
            >
              <InterfaceSubFlow
                interfaceGroup={group}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView={fitView}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

export function InterfaceViewer(props: InterfaceViewerProps) {
  return (
    <ReactFlowProvider>
      <InterfaceViewerInternal {...props} />
    </ReactFlowProvider>
  )
}
