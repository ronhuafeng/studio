// src/components/fmea/InterfaceSubFlow.tsx
"use client";

import React, { useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  Handle,
  Position,
  NodeProps,
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  useReactFlow,
} from "reactflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBigIntForDisplay } from "@/lib/bigint-utils";
import { CustomNodeData, InterfaceLink } from "@/types/fmea";
import { Network, Share2 } from "lucide-react";

interface InterfaceGroupData {
  structureId: bigint;
  interfaces: InterfaceLink[];
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
}

interface InterfaceSubFlowProps {
  interfaceGroup: InterfaceGroupData;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  fitView?: boolean;
}

// Custom node component for interface subflow
function InterfaceStructureNode({ data }: NodeProps<{ structureId: bigint; interfaceCount: number }>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-chart-4 w-3 h-3" />
      <Card className="bg-chart-4/10 border-chart-4 shadow-md w-48">
        <CardHeader className="p-3">
          <div className="flex items-center space-x-2">
            <Network className="w-4 h-4 text-chart-4" />
            <CardTitle className="text-sm font-medium text-chart-4">
              Interface Structure
            </CardTitle>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            ID: {formatBigIntForDisplay(data.structureId)}
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Badge variant="secondary" className="text-xs">
            {data.interfaceCount} interfaces
          </Badge>
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Bottom} className="!bg-chart-4 w-3 h-3" />
    </>
  );
}

function InterfaceSubFlow({
  interfaceGroup,
  onNodeClick,
  onEdgeClick,
  onNodesChange,
  onEdgesChange,
  fitView,
}: InterfaceSubFlowProps) {
  const { fitView: rfFitView } = useReactFlow();

  // Create a structure node for this group
  const structureNode: Node = useMemo(() => ({
    id: `structure_${interfaceGroup.structureId}`,
    type: 'interfaceStructure',
    position: { x: 0, y: 0 },
    data: {
      structureId: interfaceGroup.structureId,
      interfaceCount: interfaceGroup.interfaces.length,
    },
  }), [interfaceGroup.structureId, interfaceGroup.interfaces.length]);

  // Combine structure node with interface nodes
  const allNodes = useMemo(() => [
    structureNode,
    ...interfaceGroup.nodes.map(node => ({
      ...node,
      position: {
        x: node.position.x,
        y: node.position.y + 120, // Offset below structure node
      },
    })),
  ], [structureNode, interfaceGroup.nodes]);

  // Create edges from structure to interface start nodes
  const structureEdges = useMemo(() => {
    const uniqueStartNodes = new Set(
      interfaceGroup.interfaces.map(iface => iface.startId.toString())
    );
    
    return Array.from(uniqueStartNodes).map(startNodeId => ({
      id: `structure_edge_${interfaceGroup.structureId}_${startNodeId}`,
      source: structureNode.id,
      target: startNodeId,
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--chart-4))', strokeWidth: 1, strokeDasharray: '5,5' },
    }));
  }, [interfaceGroup.structureId, interfaceGroup.interfaces, structureNode.id]);

  const allEdges = useMemo(() => [
    ...structureEdges,
    ...interfaceGroup.edges,
  ], [structureEdges, interfaceGroup.edges]);

  useEffect(() => {
    if (fitView) {
      rfFitView({ padding: 0.1 });
    }
  }, [fitView, rfFitView, allNodes, allEdges]);

  const nodeTypes = useMemo(() => ({
    interfaceStructure: InterfaceStructureNode,
    custom: ({ data, selected }: NodeProps<CustomNodeData>) => {
      // Use existing CustomGraphNode logic but with interface-specific styling
      const { originalApiNode } = data;
      return (
        <>
          <Handle type="target" position={Position.Left} className="!bg-chart-4 w-3 h-3" />
          <Card 
            className={cn(
              "shadow-md w-48 border-chart-4 bg-chart-4/10",
              selected ? "ring-2 ring-chart-4 ring-offset-1" : ""
            )}
          >
            <CardHeader className="p-2">
              <div className="flex items-center space-x-2">
                <Share2 className="w-4 h-4 text-chart-4" />
                <CardTitle className="text-xs font-medium text-chart-4">
                  {data.type.toUpperCase()}
                </CardTitle>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                UUID: {formatBigIntForDisplay(originalApiNode.uuid)}
              </div>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="text-xs text-foreground/80 break-words line-clamp-2">
                {data.label}
              </div>
            </CardContent>
          </Card>
          <Handle type="source" position={Position.Right} className="!bg-chart-4 w-3 h-3" />
        </>
      );
    },
  }), []);

  return (
    <div className="w-full h-full rounded-lg border border-chart-4/30 bg-chart-4/5">
      <ReactFlow
        nodes={allNodes}
        edges={allEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={0.5} className="opacity-30" />
        <Panel position="top-left" className="bg-chart-4/10 border border-chart-4/30 rounded px-2 py-1">
          <div className="text-xs font-medium text-chart-4 flex items-center gap-1">
            <Network className="w-3 h-3" />
            Structure {formatBigIntForDisplay(interfaceGroup.structureId)}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default InterfaceSubFlow;
