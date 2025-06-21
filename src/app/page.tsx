
"use client";

import React, { useState, useCallback, useEffect } from "react";
import type { Node as RFNode, Edge as RFEdge, OnNodesChange, OnEdgesChange } from "reactflow";
import { applyNodeChanges, applyEdgeChanges, Position, MarkerType } from "reactflow";
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
  InterfaceLink,
} from "@/types/fmea";

import { DataInputPanel } from "@/components/fmea/DataInputPanel";
import { parseJsonWithBigInt } from "@/lib/bigint-utils";
import { GraphViewerWrapper } from "@/components/fmea/GraphViewer";
import { PropertiesEditorPanel } from "@/components/fmea/PropertiesEditorPanel";
import { UnifiedPropertiesEditor } from "@/components/fmea/UnifiedPropertiesEditor";
import { BaseInfoDisplay } from "@/components/fmea/BaseInfoDisplay";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Layout,
  Network,
  AlertTriangleIcon,
  ListTree,
  Share2,
  CheckCircle2,
  Expand,
  Shrink,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { InterfaceViewer } from "@/components/fmea/InterfaceViewer";
import { RuleVerificationPanel } from "@/components/fmea/RuleVerificationPanel";


const nodeWidth = 256 + 20; 
const nodeHeight = 120 + 20;

const getLayoutedElements = (initialNodes: RFNode<CustomNodeData>[], initialEdges: RFEdge[], direction = "LR") => {
  const dagreGraphInstance = new Dagre.graphlib.Graph();
  dagreGraphInstance.setDefaultEdgeLabel(() => ({}));
  dagreGraphInstance.setGraph({ rankdir: direction, nodesep: 100, ranksep: 150 });

  const layoutableNodes = initialNodes.map(n => ({ ...n })); 
  const layoutableEdges = initialEdges.map(e => ({ ...e })); 

  layoutableNodes.forEach((node) => {
    dagreGraphInstance.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  layoutableEdges.forEach((edge) => {
    dagreGraphInstance.setEdge(edge.source, edge.target);
  });

  Dagre.layout(dagreGraphInstance);

  const newNodes = layoutableNodes.map((node) => {
    const nodeWithPosition = dagreGraphInstance.node(node.id);
    return {
      ...node,
      targetPosition: direction === "LR" ? Position.Left : Position.Top,
      sourcePosition: direction === "LR" ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  // Return new array instances to ensure React Flow detects changes
  return { nodes: [...newNodes], edges: [...layoutableEdges] };
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

  const [interfaceRfNodes, setInterfaceRfNodes] = useState<RFNode<CustomNodeData>[]>([]);
  const [interfaceRfEdges, setInterfaceRfEdges] = useState<RFEdge[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<FmeaNode | null>(null);
  const [selectedInterfaceLink, setSelectedInterfaceLink] = useState<InterfaceLink | null>(null);
  const [baseInfo, setBaseInfo] = useState<DfmeaBaseInfo | PfmeaBaseInfo | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [needsLayout, setNeedsLayout] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("main");
  const [initialLayoutAppliedForTabs, setInitialLayoutAppliedForTabs] = useState<Set<string>>(new Set());
  const [isFullScreen, setIsFullScreen] = useState(false);


  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (activeTab === 'main') {
        setMainRfNodes((nds) => applyNodeChanges(changes, nds));
      } else if (activeTab === 'feature') {
        setFeatureRfNodes((nds) => applyNodeChanges(changes, nds));
      } else if (activeTab === 'failure') {
        setFailureRfNodes((nds) => applyNodeChanges(changes, nds));
      } else if (activeTab === 'interface') {
        setInterfaceRfNodes((nds) => applyNodeChanges(changes, nds));
      }
    },
    [activeTab] 
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (activeTab === 'main') {
        setMainRfEdges((eds) => applyEdgeChanges(changes, eds));
      } else if (activeTab === 'feature') {
        setFeatureRfEdges((eds) => applyEdgeChanges(changes, eds));
      } else if (activeTab === 'failure') {
        setFailureRfEdges((eds) => applyEdgeChanges(changes, eds));
      } else if (activeTab === 'interface') {
        setInterfaceRfEdges((eds) => applyEdgeChanges(changes, eds));
      }
    },
    [activeTab] 
  );

  const handleJsonSubmit = useCallback((json: string, type: ApiResponseType) => {
    setIsLoading(true);
    setRawJson(json);
    setApiResponseType(type);
    setSelectedNode(null);
    setSelectedInterfaceLink(null);
    setBaseInfo(null);
    setMainRfNodes([]); setMainRfEdges([]);
    setFeatureRfNodes([]); setFeatureRfEdges([]);
    setFailureRfNodes([]); setFailureRfEdges([]);
    setInterfaceRfNodes([]); setInterfaceRfEdges([]);
    setInitialLayoutAppliedForTabs(new Set());

    try {
      const parsedData: FmeaApiResponse = parseJsonWithBigInt(json);
      
      const allApiNodes: BaseApiNode[] = (parsedData.nodes || []).map(node => ({
        ...node,
        uuid: String(node.uuid),
        parentId: String(node.parentId),
      }));
      
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
        position: { x: Math.random() * 400, y: Math.random() * 400 }, // Initial random for Dagre
      }));

      const parentChildEdges: RFEdge[] = allApiNodes
        .filter(node => node.parentId !== "-1" && node.parentId !== node.uuid && allApiNodes.find(n => n.uuid === node.parentId))
        .map(node => ({
          id: `e_parent_${node.parentId}_${node.uuid}`,
          source: node.parentId.toString(),
          target: node.uuid.toString(),
          type: 'smoothstep',
          animated: false,
          style: { stroke: 'hsl(var(--foreground)/0.5)', strokeWidth: 1.5 },
        }));
      
      if (allTransformedNodes.length > 0) {
        const { nodes: layoutedMainNodes, edges: layoutedMainEdges } = getLayoutedElements(
            allTransformedNodes, 
            parentChildEdges
        );
        setMainRfNodes([...layoutedMainNodes]);
        setMainRfEdges([...layoutedMainEdges]);
      } else {
        setMainRfNodes([]); setMainRfEdges([]);
      }


      const featureNetLinks: NetworkLink[] = ((parsedData as any).featureNet || []).map((link: any) => ({
        ...link,
        from: String(link.from),
        to: String(link.to),
      }));
      const featureNetApiEdges: RFEdge[] = featureNetLinks
        .filter(link => allApiNodes.find(n => n.uuid === link.from) && allApiNodes.find(n => n.uuid === link.to))
        .map(link => ({
          id: `e_feature_${link.from}_${link.to}_${link.type}`,
          source: link.from.toString(),
          target: link.to.toString(),
          label: `Feature (${link.type}) [${link.from}→${link.to}]`,
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--chart-2))', strokeWidth: 2 },
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
                featureGraphApiNodes, 
                featureNetApiEdges
            );
            setFeatureRfNodes([...layoutedFeatureNodes]);
            setFeatureRfEdges([...layoutedFeatureEdges]);
        } else {
            setFeatureRfNodes([]); setFeatureRfEdges([]);
        }
      } else {
            setFeatureRfNodes([]); setFeatureRfEdges([]);
      }
      
      const failureNetLinks: NetworkLink[] = ((parsedData as any).failureNet || []).map((link: any) => ({
        ...link,
        from: String(link.from),
        to: String(link.to),
      }));
      const failureNetApiEdges: RFEdge[] = failureNetLinks
        .filter(link => allApiNodes.find(n => n.uuid === link.from) && allApiNodes.find(n => n.uuid === link.to))
        .map(link => ({
          id: `e_failure_${link.from}_${link.to}_${link.type}`,
          source: link.from.toString(),
          target: link.to.toString(),
          label: `Failure (${link.type}) [${link.from}→${link.to}]`,
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--destructive))', strokeWidth: 2 },
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
                failureGraphApiNodes, 
                failureNetApiEdges
            );
            setFailureRfNodes([...layoutedFailureNodes]);
            setFailureRfEdges([...layoutedFailureEdges]);
        } else {
            setFailureRfNodes([]); setFailureRfEdges([]);
        }
      } else {
            setFailureRfNodes([]); setFailureRfEdges([]);
      }

      // Process interface links for interface graph
      const interfaceLinks: InterfaceLink[] = ((parsedData as any).interface || []).map((link: any) => ({
        ...link,
        structureId: String(link.structureId),
        startId: String(link.startId),
        endId: String(link.endId),
      }));
      
      const interfaceApiEdges: RFEdge[] = interfaceLinks
        .filter(link => allApiNodes.find(n => n.uuid === link.startId) && allApiNodes.find(n => n.uuid === link.endId))
        .map(link => {
          const edgeColor = link.effect === 0 ? '#4ade80' : '#ef4444';
          return {
            id: `e_interface_${link.structureId}_${link.startId}_${link.endId}_${link.type}_${link.interaction}`,
            source: link.startId.toString(),
            target: link.endId.toString(),
            label: link.description,
            type: 'smoothstep',
            style: { 
              stroke: edgeColor, // Green for normal (0), Red for adverse (1)
              strokeWidth: 3,
              strokeDasharray: link.interaction === 1 ? '8,4' : undefined
            },
            markerEnd: {
              type: MarkerType.Arrow,
              width: 10,
              height: 10,
              color: edgeColor,
            },
            ...(link.interaction === 1 && {
              markerStart: {
                type: MarkerType.Arrow,
                width: 10,
                height: 10,
                color: edgeColor,
              },
            }),
          };
        });

      if (interfaceApiEdges.length > 0) {
        const interfaceNodeIds = new Set<string>();
        interfaceApiEdges.forEach(edge => {
          interfaceNodeIds.add(edge.source);
          interfaceNodeIds.add(edge.target);
        });
        const interfaceGraphApiNodes = allTransformedNodes.filter(node => interfaceNodeIds.has(node.id));
        if (interfaceGraphApiNodes.length > 0) {
            const { nodes: layoutedInterfaceNodes, edges: layoutedInterfaceEdges } = getLayoutedElements(
                interfaceGraphApiNodes, 
                interfaceApiEdges
            );
            setInterfaceRfNodes([...layoutedInterfaceNodes]);
            setInterfaceRfEdges([...layoutedInterfaceEdges]);
            // Store interface links for the new viewer
            setInterfaceLinks(interfaceLinks);
        } else {
            setInterfaceRfNodes([]); setInterfaceRfEdges([]);
            setInterfaceLinks([]);
        }
      } else {
            setInterfaceRfNodes([]); setInterfaceRfEdges([]);
            setInterfaceLinks([]);
      }
      
      setActiveTab("main"); 
      setNeedsLayout(true); 
      setInitialLayoutAppliedForTabs(prev => new Set(prev).add("main"));

      toast({ title: "Success", description: "FMEA data parsed and visualized." });
    } catch (error) {
      console.error("Error parsing JSON:", error);
      toast({ variant: "destructive", title: "Error", description: "Invalid JSON format or data structure." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const [interfaceLinks, setInterfaceLinks] = useState<InterfaceLink[]>([]);


  const handleNodeClick = useCallback((event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
    setSelectedNode(node.data.originalApiNode);
    setSelectedInterfaceLink(null); // Clear interface link selection when node is selected
  }, []);

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: RFEdge) => {
    // Only handle interface edge clicks in the interface tab
    if (activeTab === 'interface' && edge.id.includes('interface_')) {
      // Find the corresponding interface link
      const edgeIdParts = edge.id.split('_');
      if (edgeIdParts.length >= 6) {
        const structureId = edgeIdParts[2];
        const startId = edgeIdParts[3];
        const endId = edgeIdParts[4];
        const type = parseInt(edgeIdParts[5]);
        const interaction = parseInt(edgeIdParts[6]);
        
        const interfaceLink = interfaceLinks.find(link => 
          link.structureId === structureId &&
          link.startId === startId &&
          link.endId === endId &&
          link.type === type &&
          link.interaction === interaction
        );
        
        if (interfaceLink) {
          setSelectedInterfaceLink(interfaceLink);
          setSelectedNode(null); // Clear node selection when interface link is selected
        }
      }
    }
  }, [activeTab, interfaceLinks]);

  const handlePropertyChange = useCallback((updatedNodeData: FmeaNode) => {
    setSelectedNode(updatedNodeData);
  }, []);

  const handleInterfaceLinkPropertyChange = useCallback((updatedInterfaceLink: InterfaceLink) => {
    setSelectedInterfaceLink(updatedInterfaceLink);
    // Update the interface link in the interfaceLinks array
    setInterfaceLinks(prevLinks => 
      prevLinks.map(link => 
        link.structureId === updatedInterfaceLink.structureId &&
        link.startId === updatedInterfaceLink.startId &&
        link.endId === updatedInterfaceLink.endId &&
        link.type === updatedInterfaceLink.type &&
        link.interaction === updatedInterfaceLink.interaction
          ? updatedInterfaceLink
          : link
      )
    );
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
    setInterfaceRfNodes(updateNodeInList);

    const originalNodeInMainGraph = mainRfNodes.find(n => n.id === selectedNode.uuid.toString())?.data.originalApiNode;
    if (originalNodeInMainGraph && originalNodeInMainGraph.parentId !== selectedNode.parentId) {
      setMainRfEdges(prevEdges => {
        let newEdges = prevEdges.filter(edge => !(edge.target === selectedNode.uuid.toString() && edge.id.startsWith('e_parent_')));
        if (selectedNode.parentId !== "-1" && selectedNode.parentId !== selectedNode.uuid && mainRfNodes.some(n => n.id === selectedNode.parentId.toString())) {
          newEdges.push({
            id: `e_parent_${selectedNode.parentId}_${selectedNode.uuid}`,
            source: selectedNode.parentId.toString(),
            target: selectedNode.uuid.toString(),
            type: 'smoothstep',
            animated: false,
            style: { stroke: 'hsl(var(--foreground)/0.5)', strokeWidth: 1.5 },
          });
        }
        return newEdges;
      });
    }
    
    toast({ title: "Node Updated", description: `Node ${selectedNode.uuid} properties updated in graph views.` });
  }, [selectedNode, mainRfNodes, toast]);

  const handleUpdateInterfaceLinkInGraph = useCallback(() => {
    if (!selectedInterfaceLink) return;
    
    console.log('Updating interface link:', selectedInterfaceLink);
    console.log('Effect value:', selectedInterfaceLink.effect);
    console.log('Expected color:', selectedInterfaceLink.effect === 0 ? '#4ade80 (green)' : '#ef4444 (red)');
    
    // Update the interface edges in the graph
    setInterfaceRfEdges(prevEdges => 
      prevEdges.map(edge => {
        if (edge.id.includes(`interface_${selectedInterfaceLink.structureId}`) &&
            edge.source === selectedInterfaceLink.startId.toString() &&
            edge.target === selectedInterfaceLink.endId.toString()) {
          const updatedEdgeColor = selectedInterfaceLink.effect === 0 ? '#4ade80' : '#ef4444';
          return {
            ...edge,
            label: selectedInterfaceLink.description,
            style: { 
              ...edge.style,
              stroke: updatedEdgeColor, // Green for normal (0), Red for adverse (1)
              strokeWidth: 3,
              strokeDasharray: selectedInterfaceLink.interaction === 1 ? '8,4' : undefined
            },
            markerEnd: {
              type: MarkerType.Arrow,
              width: 10,
              height: 10,
              color: updatedEdgeColor
            },
            ...(selectedInterfaceLink.interaction === 1 && {
              markerStart: {
                type: MarkerType.Arrow,
                width: 10,
                height: 10,
                color: updatedEdgeColor
              }
            })
          };
        }
        return edge;
      })
    );
    toast({ title: "Success", description: `Interface link updated successfully. Effect: ${selectedInterfaceLink.effect === 0 ? 'Normal (Green)' : 'Adverse (Red)'}` });
  }, [selectedInterfaceLink, toast]);

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
    } else if (activeTab === 'interface') {
      nodesToLayout = interfaceRfNodes;
      edgesToLayout = interfaceRfEdges;
      setNodesFn = setInterfaceRfNodes;
      setEdgesFn = setInterfaceRfEdges;
    }

    if (nodesToLayout.length > 0 && setNodesFn && setEdgesFn) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodesToLayout, edgesToLayout);
      setNodesFn([...layoutedNodes]); 
      setEdgesFn([...layoutedEdges]);
      setNeedsLayout(true); 
      toast({ title: "Layout Applied", description: `Graph layout for ${activeTab} view has been recalculated.` });
    } else {
      toast({ variant: "destructive", title: "Layout Error", description: `No data to layout for ${activeTab} view.` });
    }
  }, [activeTab, mainRfNodes, mainRfEdges, featureRfNodes, featureRfEdges, failureRfNodes, failureRfEdges, interfaceRfNodes, interfaceRfEdges, toast]);
  
  const toggleFullScreen = useCallback(() => {
    setIsFullScreen(prev => !prev);
    // Refit the view after the container resizes
    setTimeout(() => {
      setNeedsLayout(true);
    }, 50);
  }, []);

  useEffect(() => {
    if (needsLayout) {
      const timer = setTimeout(() => setNeedsLayout(false), 0);
      return () => clearTimeout(timer);
    }
  }, [needsLayout, activeTab]);


  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedNode(null); 
    if (!initialLayoutAppliedForTabs.has(value)) {
      setNeedsLayout(true);
      setInitialLayoutAppliedForTabs(prev => new Set(prev).add(value));
    } else {
      setNeedsLayout(false);
    }
  };
  
  const currentNodes = activeTab === 'main' ? mainRfNodes : activeTab === 'feature' ? featureRfNodes : activeTab === 'failure' ? failureRfNodes : interfaceRfNodes;
  const noDataForActiveTab = currentNodes.length === 0 && !isLoading;
  const isGraphTabActive = ['main', 'feature', 'failure', 'interface'].includes(activeTab);


  return (
    <div className="flex flex-col md:flex-row h-screen max-h-screen p-4 gap-4 bg-background">
      <div className={cn(
        "md:w-1/4 lg:w-1/5 flex flex-col gap-4 min-w-[300px] max-h-full overflow-y-auto",
        isFullScreen && "hidden"
      )}>
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

      <div className={cn(
        "flex-grow h-[calc(100%-2rem)] md:h-full md:w-1/2 lg:w-3/5 order-first md:order-none flex flex-col",
        isFullScreen && "fixed inset-0 z-50 bg-background p-4"
      )}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
          <TabsList className="mb-2 shrink-0">
            <TabsTrigger value="main" className="gap-1.5"><ListTree size={16}/>Main Graph</TabsTrigger>
            <TabsTrigger value="feature" className="gap-1.5" disabled={featureRfNodes.length === 0 && featureRfEdges.length === 0 && !isLoading}>
                <Network size={16}/>Feature Net
            </TabsTrigger>
            <TabsTrigger value="failure" className="gap-1.5" disabled={failureRfNodes.length === 0 && failureRfEdges.length === 0 && !isLoading}>
                <AlertTriangleIcon size={16}/>Failure Net
            </TabsTrigger>
            <TabsTrigger value="interface" className="gap-1.5" disabled={interfaceRfNodes.length === 0 && interfaceRfEdges.length === 0 && !isLoading}>
                <Share2 size={16}/>Interface
            </TabsTrigger>
            <TabsTrigger value="verification" className="gap-1.5" disabled={!rawJson || isLoading}>
                <CheckCircle2 size={16}/>规则验证
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-grow min-h-0 relative">
            {isGraphTabActive && (
              <Button
                onClick={toggleFullScreen}
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 z-20 bg-card/60 hover:bg-card rounded-full"
                title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullScreen ? <Shrink size={16} /> : <Expand size={16} />}
              </Button>
            )}
            <TabsContent value="main" className="h-full m-0">
              {!isLoading && mainRfNodes.length > 0 ? (
                <GraphViewerWrapper
                  nodes={mainRfNodes}
                  edges={mainRfEdges}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={handleEdgeClick}
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
                  onEdgeClick={handleEdgeClick}
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
                  onEdgeClick={handleEdgeClick}
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
            <TabsContent value="interface" className="h-full m-0">
              {!isLoading && interfaceRfNodes.length > 0 ? (
                <InterfaceViewer
                  nodes={interfaceRfNodes}
                  edges={interfaceRfEdges}
                  interfaceLinks={interfaceLinks}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={handleEdgeClick}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                />
              ) : (
                <div className="w-full h-full rounded-lg shadow-lg border border-border bg-card flex items-center justify-center">
                  <p className="text-muted-foreground text-lg p-8 text-center">
                    {isLoading ? "Loading Interface..." : "No Interface data available or input FMEA JSON."}
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="verification" className="h-full m-0">
              {!isLoading && rawJson && apiResponseType ? (
                <div className="w-full h-full rounded-lg shadow-lg border border-border bg-card p-6 overflow-y-auto">
                  <RuleVerificationPanel
                    fmeaJson={rawJson}
                    fmeaType={apiResponseType}
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className="w-full h-full rounded-lg shadow-lg border border-border bg-card flex items-center justify-center">
                  <p className="text-muted-foreground text-lg p-8 text-center">
                    {isLoading ? "Loading..." : "Input FMEA JSON to see verification results."}
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <div className={cn(
        "md:w-1/4 lg:w-1/5 min-w-[300px] max-h-full overflow-y-auto",
        isFullScreen && "hidden"
      )}>
        <UnifiedPropertiesEditor
          nodeData={selectedNode}
          interfaceLinkData={selectedInterfaceLink}
          apiResponseType={apiResponseType}
          onPropertyChange={handlePropertyChange}
          onInterfaceLinkPropertyChange={handleInterfaceLinkPropertyChange}
          onUpdateNode={handleUpdateNodeInGraph}
          onUpdateInterfaceLink={handleUpdateInterfaceLinkInGraph}
          disabled={isLoading || noDataForActiveTab}
        />
      </div>
    </div>
  );
}
