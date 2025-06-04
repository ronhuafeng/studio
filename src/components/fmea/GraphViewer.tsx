"use client";

import React, { useCallback, useMemo } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
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
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  fitView?: boolean;
}

const nodeTypes: NodeTypes = {
  custom: CustomGraphNode,
};

export function GraphViewer({
  nodes,
  edges,
  onNodeClick,
  onNodesChange,
  onEdgesChange,
  fitView,
}: GraphViewerProps) {

  const proOptions = { hideAttribution: true };

  return (
    <div className="w-full h-full rounded-lg shadow-lg overflow-hidden border border-border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView={fitView}
        fitViewOptions={{ padding: 0.2 }}
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

// Wrap with ReactFlowProvider if it's used at the root of GraphViewer or its parent
export function GraphViewerWrapper(props: GraphViewerProps) {
  return (
    <ReactFlowProvider>
      <GraphViewer {...props} />
    </ReactFlowProvider>
  );
}

