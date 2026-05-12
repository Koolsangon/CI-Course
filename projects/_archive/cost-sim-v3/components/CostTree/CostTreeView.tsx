"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node
} from "reactflow";
import "reactflow/dist/style.css";

import type { CostParams, CostResult } from "@/lib/cost-engine/types";
import CostTreeNode, { type CostTreeNodeData } from "./CostTreeNode";
import { TREE_NODES, TREE_EDGES, FIELD_TO_NODE } from "./tree-model";
import { layoutTree } from "./layout";
import type { DeltaTrace } from "@/lib/cost-engine/diff";

const nodeTypes = { cost: CostTreeNode };

export interface CostTreeViewProps {
  result: CostResult;
  params: CostParams;
  changedPaths?: DeltaTrace[];
}

export default function CostTreeView({
  result,
  params,
  changedPaths = []
}: CostTreeViewProps) {
  const changedNodeIds = useMemo(() => {
    const set = new Set<string>();
    for (const trace of changedPaths) {
      const nodeId = FIELD_TO_NODE[trace.path];
      if (nodeId) set.add(nodeId);
    }
    return set;
  }, [changedPaths]);

  const nodes: Node<CostTreeNodeData>[] = useMemo(() => {
    const raw: Node<CostTreeNodeData>[] = TREE_NODES.map((def) => ({
      id: def.id,
      type: "cost",
      data: {
        label: def.label,
        value: def.valueOf(result, params),
        unit: def.unit,
        group: def.group,
        formula: def.formula,
        changed: changedNodeIds.has(def.id)
      },
      position: { x: 0, y: 0 }
    }));
    const edges: Edge[] = TREE_EDGES.map((e) => ({
      id: `${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      type: "smoothstep",
      animated: changedNodeIds.has(e.from) || changedNodeIds.has(e.to)
    }));
    return layoutTree(raw as Node[], edges) as Node<CostTreeNodeData>[];
  }, [result, params, changedNodeIds]);

  const edges: Edge[] = useMemo(
    () =>
      TREE_EDGES.map((e) => ({
        id: `${e.from}-${e.to}`,
        source: e.from,
        target: e.to,
        type: "smoothstep",
        animated: changedNodeIds.has(e.from) || changedNodeIds.has(e.to)
      })),
    [changedNodeIds]
  );

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden bg-[hsl(var(--surface-950))]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12, minZoom: 0.25, maxZoom: 1.4 }}
        minZoom={0.25}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
      >
        <Background
          color="hsl(220 16% 22%)"
          gap={24}
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
