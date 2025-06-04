
"use client";

import React, { useState, useCallback, useEffect } from "react";
import type { Node as RFNode, Edge as RFEdge, OnNodesChange, OnEdgesChange } from "reactflow";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout, Network, AlertTriangleIcon, ListTree } from "lucide-react";

const nodeWidth = 256 + 20; 
const nodeHeight = 120 + 20;

const getLayoutedElements = (nodes: RFNode[], edges: RFEdge[], direction = "TB") => {
  const dagreGraphInstance = new Dagre.graphlib.Graph();
  dagreGraphInstance.setDefaultEdgeLabel(() => ({}));
  dagreGraphInstance.setGraph({ rankdir: direction, nodesep: 50, ranksep: 70 });

  nodes.forEach((node) => {
    dagreGraphInstance.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraphInstance.setEdge(edge.source, edge.target);
  });

  Dagre.layout(dagreGraphInstance);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraphInstance.node(node.id);
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
  
  const [mainRfNodes, setMainRfNodes] = useState<RFNode<CustomNodeData>[]>([]);
  const [mainRfEdges, setMainRfEdges] = useState<RFEdge[]>([]);
  
  const [featureRfNodes, setFeatureRfNodes] = useState<RFNode<CustomNodeData>[]>([]);
  const [featureRfEdges, setFeatureRfEdges] = useState<RFEdge[]>([]);

  const [failureRfNodes, setFailureRfNodes] = useState<RFNode<CustomNodeData>[]>([]);
  const [failureRfEdges, setFailureRfEdges] = useState<RFEdge[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<FmeaNode | null>(null);
  const [baseInfo, setBaseInfo] = useState<DfmeaBaseInfo | PfmeaBaseInfo | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [needsLayout, setNeedsLayout] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("main");
  const [initialLayoutAppliedForTabs, setInitialLayoutAppliedForTabs] = useState<Set<string>>(new Set());


  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (activeTab === 'main') {
        setMainRfNodes((nds) => applyNodeChanges(changes, nds));
      } else if (activeTab === 'feature') {
        setFeatureRfNodes((nds) => applyNodeChanges(changes, nds));
      } else if (activeTab === 'failure') {
        setFailureRfNodes((nds) => applyNodeChanges(changes, nds));
      }
    },
    [activeTab, setMainRfNodes, setFeatureRfNodes, setFailureRfNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (activeTab === 'main') {
        setMainRfEdges((eds) => applyEdgeChanges(changes, eds));
      } else if (activeTab === 'feature') {
        setFeatureRfEdges((eds) => applyEdgeChanges(changes, eds));
      } else if (activeTab === 'failure') {
        setFailureRfEdges((eds) => applyEdgeChanges(changes, eds));
      }
    },
    [activeTab, setMainRfEdges, setFeatureRfEdges, setFailureRfEdges]
  );

  const handleJsonSubmit = useCallback((json: string, type: ApiResponseType) => {
    setIsLoading(true);
    setRawJson(json);
    setApiResponseType(type);
    setSelectedNode(null);
    setBaseInfo(null);
    setMainRfNodes([]); setMainRfEdges([]);
    setFeatureRfNodes([]); setFeatureRfEdges([]);
    setFailureRfNodes([]); setFailureRfEdges([]);
    setInitialLayoutAppliedForTabs(new Set());

    try {
      const parsedData = JSON.parse(json) as FmeaApiResponse;
      
      const allApiNodes: BaseApiNode[] = parsedData.nodes || [];
      
      if ((parsedData as any).baseInfo) {
        setBaseInfo((parsedData as any).baseInfo);
      }

      const allTransformedNodes: RFNode<CustomNodeData>[] = allApiNodes.map((node) => ({
        id: node.uuid.toString(),
        type: "custom",
        data: {
          label: node.description,
          type: node.nodeType,
          originalApiNode: node as FmeaNode,
        },
        position: { x: Math.random() * 400, y: Math.random() * 400 },
      }));

      // Main Graph (Parent-Child)
      const parentChildEdges: RFEdge[] = allApiNodes
        .filter(node => node.parentId !== -1 && allApiNodes.find(n => n.uuid === node.parentId))
        .map(node => ({
          id: `e_parent_${node.parentId}_${node.uuid}`,
          source: node.parentId.toString(),
          target: node.uuid.toString(),
          type: 'smoothstep',
          animated: false,
          style: { stroke: 'hsl(var(--foreground)/0.5)', strokeWidth: 1.5 },
          markerEnd: { type: 'arrowclosed', color: 'hsl(var(--foreground)/0.5)' },
        }));
      
      if (allTransformedNodes.length > 0) {
        const { nodes: layoutedMainNodes, edges: layoutedMainEdges } = getLayoutedElements(
            [...allTransformedNodes], // Use a copy for layout
            parentChildEdges
        );
        setMainRfNodes(layoutedMainNodes);
        setMainRfEdges(layoutedMainEdges);
      }


      // Feature Net Graph
      const featureNetLinks: NetworkLink[] = (parsedData as any).featureNet || [];
      const featureNetApiEdges: RFEdge[] = featureNetLinks
        .filter(link => allApiNodes.find(n => n.uuid === link.from) && allApiNodes.find(n => n.uuid === link.to))
        .map(link => ({
          id: `e_feature_${link.from}_${link.to}_${link.type}`,
          source: link.from.toString(),
          target: link.to.toString(),
          label: `Feature (${link.type})`,
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--chart-2))', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: 'hsl(var(--chart-2))' },
        }));

      if (featureNetApiEdges.length > 0) {
        const featureNodeIds = new Set<string>();
        featureNetApiEdges.forEach(edge => {
          featureNodeIds.add(edge.source);
          featureNodeIds.add(edge.target);
        });
        const featureGraphApiNodes = allTransformedNodes.filter(node => featureNodeIds.has(node.id));
         if (featureGraphApiNodes.length > 0) {
            const { nodes: layoutedFeatureNodes, edges: layoutedFeatureEdges } = getLayoutedElements(
                [...featureGraphApiNodes], // Use a copy
                featureNetApiEdges
            );
            setFeatureRfNodes(layoutedFeatureNodes);
            setFeatureRfEdges(layoutedFeatureEdges);
        }
      }
      
      // Failure Net Graph
      const failureNetLinks: NetworkLink[] = (parsedData as any).failureNet || [];
      const failureNetApiEdges: RFEdge[] = failureNetLinks
        .filter(link => allApiNodes.find(n => n.uuid === link.from) && allApiNodes.find(n => n.uuid === link.to))
        .map(link => ({
          id: `e_failure_${link.from}_${link.to}_${link.type}`,
          source: link.from.toString(),
          target: link.to.toString(),
          label: `Failure (${link.type})`,
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--destructive))', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: 'hsl(var(--destructive))' },
        }));

      if (failureNetApiEdges.length > 0) {
        const failureNodeIds = new Set<string>();
        failureNetApiEdges.forEach(edge => {
          failureNodeIds.add(edge.source);
          failureNodeIds.add(edge.target);
        });
        const failureGraphApiNodes = allTransformedNodes.filter(node => failureNodeIds.has(node.id));
        if (failureGraphApiNodes.length > 0) {
            const { nodes: layoutedFailureNodes, edges: layoutedFailureEdges } = getLayoutedElements(
                [...failureGraphApiNodes], // Use a copy
                failureNetApiEdges
            );
            setFailureRfNodes(layoutedFailureNodes);
            setFailureRfEdges(layoutedFailureEdges);
        }
      }
      
      setActiveTab("main"); // Default to main graph view
      setNeedsLayout(true); // Layout for the initial active graph
      setInitialLayoutAppliedForTabs(prev => new Set(prev).add("main"));

      toast({ title: "Success", description: "FMEA data parsed and visualized." });
    } catch (error) {
      console.error("Error parsing JSON:", error);
      toast({ variant: "destructive", title: "Error", description: "Invalid JSON format or data structure." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
    setSelectedNode(node.data.originalApiNode);
  }, []);

  const handlePropertyChange = useCallback((updatedNodeData: FmeaNode) => {
    setSelectedNode(updatedNodeData);
  }, []);
  
  const handleUpdateNodeInGraph = useCallback(() => {
    if (!selectedNode) return;

    const updateNodeInList = (prevNodes: RFNode<CustomNodeData>[]) => 
      prevNodes.map(rfNode => {
        if (rfNode.id === selectedNode.uuid.toString()) {
          return {
            ...rfNode,
            data: {
              ...rfNode.data,
              label: selectedNode.description,
              type: selectedNode.nodeType,
              originalApiNode: selectedNode,
            },
          };
        }
        return rfNode;
      });

    setMainRfNodes(updateNodeInList);
    setFeatureRfNodes(updateNodeInList);
    setFailureRfNodes(updateNodeInList);

    const originalNodeInMainGraph = mainRfNodes.find(n => n.id === selectedNode.uuid.toString())?.data.originalApiNode;
    if (originalNodeInMainGraph && originalNodeInMainGraph.parentId !== selectedNode.parentId) {
      setMainRfEdges(prevEdges => {
        let newEdges = prevEdges.filter(edge => !(edge.target === selectedNode.uuid.toString() && edge.id.startsWith('e_parent_')));
        if (selectedNode.parentId !== -1 && mainRfNodes.some(n => n.id === selectedNode.parentId.toString())) {
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
    }
    
    toast({ title: "Node Updated", description: `Node ${selectedNode.uuid} properties updated in graph views.` });
  }, [selectedNode, mainRfNodes, toast]);

  const triggerLayout = useCallback(() => {
    let nodesToLayout: RFNode<CustomNodeData>[] = [];
    let edgesToLayout: RFEdge[] = [];
    let setNodesFn: React.Dispatch<React.SetStateAction<RFNode<CustomNodeData>[]>> | null = null;
    let setEdgesFn: React.Dispatch<React.SetStateAction<RFEdge[]>> | null = null;

    if (activeTab === 'main') {
      nodesToLayout = mainRfNodes;
      edgesToLayout = mainRfEdges;
      setNodesFn = setMainRfNodes;
      setEdgesFn = setMainRfEdges;
    } else if (activeTab === 'feature') {
      nodesToLayout = featureRfNodes;
      edgesToLayout = featureRfEdges;
      setNodesFn = setFeatureRfNodes;
      setEdgesFn = setFeatureRfEdges;
    } else if (activeTab === 'failure') {
      nodesToLayout = failureRfNodes;
      edgesToLayout = failureRfEdges;
      setNodesFn = setFailureRfNodes;
      setEdgesFn = setFailureRfEdges;
    }

    if (nodesToLayout.length > 0 && setNodesFn && setEdgesFn) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodesToLayout, edgesToLayout);
      setNodesFn([...layoutedNodes]); 
      setEdgesFn([...layoutedEdges]);
      setInitialLayoutAppliedForTabs(prev => new Set(prev).add(activeTab));
      setNeedsLayout(false); // After manual layout, reset needsLayout
      toast({ title: "Layout Applied", description: `Graph layout for ${activeTab} view has been recalculated.` });
    } else {
      toast({ variant: "destructive", title: "Layout Error", description: `No data to layout for ${activeTab} view.` });
    }
  }, [activeTab, mainRfNodes, mainRfEdges, featureRfNodes, featureRfEdges, failureRfNodes, failureRfEdges, toast]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedNode(null); // Clear selection when switching tabs
    if (!initialLayoutAppliedForTabs.has(value)) {
      setNeedsLayout(true);
      setInitialLayoutAppliedForTabs(prev => new Set(prev).add(value));
    } else {
      setNeedsLayout(false);
    }
  };
  
  const currentNodes = activeTab === 'main' ? mainRfNodes : activeTab === 'feature' ? featureRfNodes : failureRfNodes;
  const currentEdges = activeTab === 'main' ? mainRfEdges : activeTab === 'feature' ? featureRfEdges : failureRfEdges;
  const noDataForActiveTab = currentNodes.length === 0;


  return (
    <div className="flex flex-col md:flex-row h-screen max-h-screen p-4 gap-4 bg-background">
      <div className="md:w-1/4 lg:w-1/5 flex flex-col gap-4 min-w-[300px] max-h-full overflow-y-auto">
        <DataInputPanel onJsonSubmit={handleJsonSubmit} disabled={isLoading} />
        {baseInfo && <BaseInfoDisplay baseInfo={baseInfo} />}
         <Button 
            onClick={triggerLayout} 
            variant="outline" 
            className="mt-auto" 
            disabled={isLoading || noDataForActiveTab}
          >
            <Layout className="mr-2 h-4 w-4" /> Re-apply Layout
        </Button>
      </div>

      <div className="flex-grow h-[calc(100%-2rem)] md:h-full md:w-1/2 lg:w-3/5 order-first md:order-none flex flex-col">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
          <TabsList className="mb-2 shrink-0">
            <TabsTrigger value="main" className="gap-1.5"><ListTree size={16}/>Main Graph</TabsTrigger>
            <TabsTrigger value="feature" className="gap-1.5" disabled={featureRfNodes.length === 0 && featureRfEdges.length === 0 && !isLoading}>
                <Network size={16}/>Feature Net
            </TabsTrigger>
            <TabsTrigger value="failure" className="gap-1.5" disabled={failureRfNodes.length === 0 && failureRfEdges.length === 0 && !isLoading}>
                <AlertTriangleIcon size={16}/>Failure Net
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-grow min-h-0">
            <TabsContent value="main" className="h-full m-0">
              {!isLoading && mainRfNodes.length > 0 ? (
                <GraphViewerWrapper
                  nodes={mainRfNodes}
                  edges={mainRfEdges}
                  onNodeClick={handleNodeClick}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  fitView={needsLayout && activeTab === 'main'}
                />
              ) : (
                <div className="w-full h-full rounded-lg shadow-lg border border-border bg-card flex items-center justify-center">
                  <p className="text-muted-foreground text-lg p-8 text-center">
                    {isLoading ? "Loading graph..." : "Please input FMEA JSON data. Main graph will appear here."}
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="feature" className="h-full m-0">
              {!isLoading && featureRfNodes.length > 0 ? (
                <GraphViewerWrapper
                  nodes={featureRfNodes}
                  edges={featureRfEdges}
                  onNodeClick={handleNodeClick}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  fitView={needsLayout && activeTab === 'feature'}
                />
              ) : (
                <div className="w-full h-full rounded-lg shadow-lg border border-border bg-card flex items-center justify-center">
                  <p className="text-muted-foreground text-lg p-8 text-center">
                    {isLoading ? "Loading Feature Net..." : "No Feature Net data available or input FMEA JSON."}
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="failure" className="h-full m-0">
              {!isLoading && failureRfNodes.length > 0 ? (
                <GraphViewerWrapper
                  nodes={failureRfNodes}
                  edges={failureRfEdges}
                  onNodeClick={handleNodeClick}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  fitView={needsLayout && activeTab === 'failure'}
                />
              ) : (
                <div className="w-full h-full rounded-lg shadow-lg border border-border bg-card flex items-center justify-center">
                  <p className="text-muted-foreground text-lg p-8 text-center">
                    {isLoading ? "Loading Failure Net..." : "No Failure Net data available or input FMEA JSON."}
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <div className="md:w-1/4 lg:w-1/5 min-w-[300px] max-h-full overflow-y-auto">
        <PropertiesEditorPanel
          nodeData={selectedNode}
          apiResponseType={apiResponseType}
          onPropertyChange={handlePropertyChange}
          onUpdateNode={handleUpdateNodeInGraph}
          disabled={isLoading || noDataForActiveTab}
        />
      </div>
    </div>
  );
}
