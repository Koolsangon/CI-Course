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
import type { TreeInfoEntry } from "@/lib/cases";

const nodeTypes = { cost: CostTreeNode };

export interface CostTreeViewProps {
  result: CostResult;
  params: CostParams;
  changedPaths?: DeltaTrace[];
  /** 직전 params 대비 변동된 bom/yield 노드 id (store.lastParamDelta). 절대 비교가 아니라 누적 없이 강조. */
  changedParamNodes?: string[];
  treeInfo?: TreeInfoEntry[];
}

function computeTreeInfoValue(field: string, params: CostParams, result: CostResult): number {
  switch (field) {
    case "module_yield_pct":
      return params.yields.module;
    case "module_net_bom":
      return params.bom.module;
    case "cumulative_yield":
      return result.cumulative_yield;
    default: {
      const v = (result as unknown as Record<string, unknown>)[field];
      if (typeof v === "number") return v;
      const p = (params as unknown as Record<string, unknown>)[field];
      return typeof p === "number" ? p : 0;
    }
  }
}

function formatTreeInfoValue(value: number, format: TreeInfoEntry["format"]): string {
  if (format === "percent1") return `${(value * 100).toFixed(1)}%`;
  return `$${value.toFixed(1)}`;
}

export default function CostTreeView({
  result,
  params,
  changedPaths = [],
  changedParamNodes = [],
  treeInfo
}: CostTreeViewProps) {
  const changedNodeIds = useMemo(() => {
    const set = new Set<string>();
    // diff() 기반: CostResult 필드 변동 노드 (직전 대비)
    for (const trace of changedPaths) {
      const nodeId = FIELD_TO_NODE[trace.path];
      if (nodeId) set.add(nodeId);
    }
    // params 기반: bom/yield 노드 (직전 대비 — store.lastParamDelta).
    // 절대 비교가 아니라서 다른 슬라이더를 움직이면 이전 파라미터 강조가 누적되지 않는다.
    for (const nodeId of changedParamNodes) {
      set.add(nodeId);
    }
    return set;
  }, [changedPaths, changedParamNodes]);

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
      animated: changedNodeIds.has(e.to)
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
        animated: changedNodeIds.has(e.to)
      })),
    [changedNodeIds]
  );

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden bg-[hsl(var(--surface-50))]">
      {treeInfo && treeInfo.length > 0 && (
        <div
          className="absolute top-3 left-3 z-10 flex flex-col gap-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.95)] px-3 py-2 shadow-card backdrop-blur"
        >
          {treeInfo.map((info) => (
            <div key={info.field} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-[hsl(var(--muted))]">{info.label}</span>
              <span className="font-bold tabular-nums text-[hsl(var(--fg))]">
                {formatTreeInfoValue(computeTreeInfoValue(info.field, params, result), info.format)}
              </span>
            </div>
          ))}
        </div>
      )}
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
          color="hsl(var(--surface-300))"
          gap={24}
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
