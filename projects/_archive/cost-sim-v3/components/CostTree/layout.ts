import dagre from "@dagrejs/dagre";
import { Position, type Edge, type Node } from "reactflow";

const NODE_WIDTH = 168;
const NODE_HEIGHT = 72;

/**
 * dagre layouting — left-to-right. Price on the left, leaf nodes (BOM, panel/module
 * cost items) cascade rightward. Horizontal LR layout wastes less space because
 * the panel has more vertical than horizontal room, and with 10 leaf nodes at
 * depth 4 the LR rank packs them vertically — stays readable at a normal zoom
 * instead of being forced to shrink to 30% in a top-down layout.
 */
export function layoutTree(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 14, ranksep: 60, edgesep: 10 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      targetPosition: Position.Left,
      sourcePosition: Position.Right
    };
  });
}
