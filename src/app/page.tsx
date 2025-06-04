"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import type { Node as RFNode, Edge as RFEdge, OnNodesChange, OnEdgesChange, Viewport } from "reactflow";
import { applyNodeChanges, applyEdgeChanges, Position } from "reactflow";
import Dagre from "@dagrejs/dagre";

import type {
  FmeaNode,
  ApiResponseType,
  FmeaApiResponse,
  DfmeaBaseInfo,
  PfmeaBaseInfo,
  NetworkLink,
  CustomNodeData,
  BaseApiNode,
} from "@/types/fmea";

import { DataInputPanel } from "@/components/fmea/DataInputPanel";
import { GraphViewerWrapper } from "@/components/fmea/GraphViewer";
import { PropertiesEditorPanel } from "@/components/fmea/PropertiesEditorPanel";
import { BaseInfoDisplay } from "@/components/fmea/BaseInfoDisplay";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Layout } from "lucide-react";

const dagreGraph = new Dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 256 + 20; // CustomGraphNode width (w-64 = 256px) + some padding
const nodeHeight = 120 + 20; // Approximate height + some padding

const getLayoutedElements = (nodes: RFNode[], edges: RFEdge[], direction = "TB") => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 70 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  Dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Top;
    node.sourcePosition = Position.Bottom;
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });

  return { nodes, edges };
};


export default function FmeaVisualizerPage() {
  const [rawJson, setRawJson] = useState<string>("");
  const [apiResponseType, setApiResponseType] = useState<ApiResponseType | null>(null);
  
  const [rfNodes, setRfNodes] = useState<RFNode<CustomNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<RFEdge[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<FmeaNode | null>(null);
  const [baseInfo, setBaseInfo] = useState<DfmeaBaseInfo | PfmeaBaseInfo | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [needsLayout, setNeedsLayout] = useState(true);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setRfNodes((nds) => applyNodeChanges(changes, nds)),
    [setRfNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setRfEdges((eds) => applyEdgeChanges(changes, eds)),
    [setRfEdges]
  );

  const handleJsonSubmit = useCallback((json: string, type: ApiResponseType) => {
    setIsLoading(true);
    setRawJson(json);
    setApiResponseType(type);
    setSelectedNode(null);
    setBaseInfo(null);

    try {
      const parsedData = JSON.parse(json) as FmeaApiResponse;
      
      const apiNodes: BaseApiNode[] = parsedData.nodes || [];
      const featureNet: NetworkLink[] = (parsedData as any).featureNet || [];
      const failureNet: NetworkLink[] = (parsedData as any).failureNet || [];
      
      if ((parsedData as any).baseInfo) {
        setBaseInfo((parsedData as any).baseInfo);
      }

      const transformedNodes: RFNode<CustomNodeData>[] = apiNodes.map((node) => ({
        id: node.uuid.toString(),
        type: "custom", // Use custom node type
        data: {
          label: node.description,
          type: node.nodeType,
          originalApiNode: node as FmeaNode,
        },
        position: { x: Math.random() * 400, y: Math.random() * 400 }, // Initial random position
      }));

      const parentChildEdges: RFEdge[] = apiNodes
        .filter(node => node.parentId !== -1 && apiNodes.find(n => n.uuid === node.parentId)) // Ensure parent exists
        .map(node => ({
          id: `e_parent_${node.parentId}_${node.uuid}`,
          source: node.parentId.toString(),
          target: node.uuid.toString(),
          type: 'smoothstep',
          animated: false,
          style: { stroke: 'hsl(var(--foreground)/0.5)', strokeWidth: 1.5 },
          markerEnd: { type: 'arrowclosed', color: 'hsl(var(--foreground)/0.5)' },
        }));

      const featureNetEdges: RFEdge[] = featureNet
        .filter(link => apiNodes.find(n => n.uuid === link.from) && apiNodes.find(n => n.uuid === link.to))
        .map(link => ({
          id: `e_feature_${link.from}_${link.to}_${link.type}`,
          source: link.from.toString(),
          target: link.to.toString(),
          label: `Feature (${link.type})`,
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--chart-2))', strokeWidth: 2 }, // Greenish
          markerEnd: { type: 'arrowclosed', color: 'hsl(var(--chart-2))' },
        }));

      const failureNetEdges: RFEdge[] = failureNet
        .filter(link => apiNodes.find(n => n.uuid === link.from) && apiNodes.find(n => n.uuid === link.to))
        .map(link => ({
          id: `e_failure_${link.from}_${link.to}_${link.type}`,
          source: link.from.toString(),
          target: link.to.toString(),
          label: `Failure (${link.type})`,
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--destructive))', strokeWidth: 2 }, // Reddish
          markerEnd: { type: 'arrowclosed', color: 'hsl(var(--destructive))' },
        }));
      
      const allEdges = [...parentChildEdges, ...featureNetEdges, ...failureNetEdges];
      
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(transformedNodes, allEdges);
      
      setRfNodes(layoutedNodes);
      setRfEdges(layoutedEdges);
      setNeedsLayout(false); // Layout has been applied

      toast({ title: "Success", description: "FMEA data parsed and visualized." });
    } catch (error) {
      console.error("Error parsing JSON:", error);
      toast({ variant: "destructive", title: "Error", description: "Invalid JSON format or data structure." });
      setRfNodes([]);
      setRfEdges([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
    setSelectedNode(node.data.originalApiNode);
  }, []);

  const handlePropertyChange = useCallback((updatedNodeData: FmeaNode) => {
    setSelectedNode(updatedNodeData); // Update the form state immediately
  }, []);
  
  const handleUpdateNodeInGraph = useCallback(() => {
    if (!selectedNode) return;

    setRfNodes(prevNodes => 
      prevNodes.map(rfNode => {
        if (rfNode.id === selectedNode.uuid.toString()) {
          return {
            ...rfNode,
            data: {
              ...rfNode.data,
              label: selectedNode.description,
              type: selectedNode.nodeType, // type usually doesn't change, but for completeness
              originalApiNode: selectedNode,
            },
          };
        }
        return rfNode;
      })
    );

    // If parentId changed, update edges
    const originalNodeInGraph = rfNodes.find(n => n.id === selectedNode.uuid.toString())?.data.originalApiNode;
    if (originalNodeInGraph && originalNodeInGraph.parentId !== selectedNode.parentId) {
      setRfEdges(prevEdges => {
        let newEdges = prevEdges.filter(edge => !(edge.target === selectedNode.uuid.toString() && edge.id.startsWith('e_parent_')));
        if (selectedNode.parentId !== -1 && rfNodes.some(n => n.id === selectedNode.parentId.toString())) {
          newEdges.push({
            id: `e_parent_${selectedNode.parentId}_${selectedNode.uuid}`,
            source: selectedNode.parentId.toString(),
            target: selectedNode.uuid.toString(),
            type: 'smoothstep',
            animated: false,
            style: { stroke: 'hsl(var(--foreground)/0.5)', strokeWidth: 1.5 },
            markerEnd: { type: 'arrowclosed', color: 'hsl(var(--foreground)/0.5)' },
          });
        }
        return newEdges;
      });
       // Mark that layout might be needed again if parent changes significantly
      // For now, we don't auto-re-layout on parentId change to avoid jarring UX. User can manually re-layout.
    }
    
    toast({ title: "Node Updated", description: `Node ${selectedNode.uuid} properties updated in the graph.` });
  }, [selectedNode, rfNodes, toast]);

  const triggerLayout = useCallback(() => {
    if (rfNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges);
      setRfNodes([...layoutedNodes]); // Create new array instance to trigger re-render
      setRfEdges([...layoutedEdges]);
      toast({ title: "Layout Applied", description: "Graph layout has been recalculated." });
    }
  }, [rfNodes, rfEdges, toast]);


  return (
    <div className="flex flex-col md:flex-row h-screen max-h-screen p-4 gap-4 bg-background">
      <div className="md:w-1/4 lg:w-1/5 flex flex-col gap-4 min-w-[300px] max-h-full overflow-y-auto">
        <DataInputPanel onJsonSubmit={handleJsonSubmit} disabled={isLoading} />
        {baseInfo && <BaseInfoDisplay baseInfo={baseInfo} />}
         <Button onClick={triggerLayout} variant="outline" className="mt-auto" disabled={isLoading || rfNodes.length === 0}>
            <Layout className="mr-2 h-4 w-4" /> Re-apply Layout
        </Button>
      </div>

      <div className="flex-grow h-[calc(100%-2rem)] md:h-full md:w-1/2 lg:w-3/5 order-first md:order-none">
        {rfNodes.length > 0 ? (
           <GraphViewerWrapper
            nodes={rfNodes}
            edges={rfEdges}
            onNodeClick={handleNodeClick}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView={needsLayout} 
          />
        ) : (
          <div className="w-full h-full rounded-lg shadow-lg border border-border bg-card flex items-center justify-center">
            <p className="text-muted-foreground text-lg p-8 text-center">
              {isLoading ? "Loading graph..." : "Please input FMEA JSON data to visualize the graph."}
            </p>
          </div>
        )}
      </div>

      <div className="md:w-1/4 lg:w-1/5 min-w-[300px] max-h-full overflow-y-auto">
        <PropertiesEditorPanel
          nodeData={selectedNode}
          apiResponseType={apiResponseType}
          onPropertyChange={handlePropertyChange}
          onUpdateNode={handleUpdateNodeInGraph}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
