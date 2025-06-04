# **App Name**: FMEA Visualizer

## Core Features:

- Data Input: Paste JSON for Requirements, DFMEA, or PFMEA from the FMEA Agent API.
- Graph Visualization: Parse JSON into interactive React Flow graph with parent-child, featureNet, and failureNet edges.
- Node Property Editing: Edit node properties from `originalApiNode` and see local changes.
- State Management: Manage state and data flow for graph updates via JSON input and node property changes.

## Style Guidelines:

- Primary color: Light blue (#94D0CC) for clarity and system visualization.
- Background color: Light gray (#E9E9E9) for a clean, neutral backdrop.
- Accent color: Soft teal (#64B2CD) to highlight interactive elements and edges.
- Body and headline font: 'Inter', a neutral sans-serif for readability.
- Use clear icons to represent node types within the graph (e.g., failure, action, cha, etc.).
- Employ a hierarchical graph layout (using Dagre or similar) with optional user rearrangement of nodes.
- Subtle animations when updating node properties or highlighting graph paths.