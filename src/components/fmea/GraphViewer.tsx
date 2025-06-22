
"use client";

import React, { useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { CustomGraphNode } from "./CustomGraphNode";

interface GraphViewerProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  fitView?: boolean;
}

const nodeTypes: NodeTypes = {
  custom: CustomGraphNode,
};

function GraphViewerInternal({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  onNodesChange,
  onEdgesChange,
  fitView,
}: GraphViewerProps) {

  const proOptions = { hideAttribution: true };
  const { fitView: rfFitView } = useReactFlow();

  useEffect(() => {
    if (fitView) {
      rfFitView({ padding: 0.2 });
    }
  }, [fitView, rfFitView, nodes, edges]);


  return (
    <div className="w-full h-full rounded-lg shadow-lg overflow-hidden border border-border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        // fitView prop is now handled by the useEffect above
        proOptions={proOptions}
        className="bg-background"
      >
        <Controls className="[&_button]:bg-card [&_button]:border-border [&_button_path]:fill-foreground hover:[&_button]:bg-muted" />
        <MiniMap nodeStrokeWidth={3} zoomable pannable className="!bg-card border border-border" />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="opacity-50" />
      </ReactFlow>
    </div>
  );
}

// Wrap with ReactFlowProvider. This is crucial for useReactFlow to work.
export function GraphViewerWrapper(props: GraphViewerProps) {
  return (
    <ReactFlowProvider>
      <GraphViewerInternal {...props} />
    </ReactFlowProvider>
  );
}
