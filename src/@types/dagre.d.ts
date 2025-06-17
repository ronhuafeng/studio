declare module '@dagrejs/dagre' {
  export namespace graphlib {
    class Graph {
      setDefaultEdgeLabel(label: () => {}): void;
      setGraph(opts: { rankdir: string; nodesep: number; ranksep: number }): void;
      setNode(nodeId: string, nodeOpts: { width: number; height: number }): void;
      setEdge(source: string, target: string): void;
      node(nodeId: string): { x: number; y: number };
    }
  }
  
  export function layout(graph: graphlib.Graph): void;
}
