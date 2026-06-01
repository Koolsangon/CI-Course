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

// BOM/params 변동 노드를 직접 비교 — diff()는 CostResult만 보므로
// params.bom 변경(면취수·재료비)은 여기서 감지
const REFERENCE_BOM = { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 };
const REFERENCE_YIELDS = { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.972 };

function getParamsChangedNodes(params: CostParams): Set<string> {
  const set = new Set<string>();
  if (Math.abs(params.bom.tft - REFERENCE_BOM.tft) > 1e-6) set.add("bom_tft");
  if (Math.abs(params.bom.cf - REFERENCE_BOM.cf) > 1e-6) set.add("bom_cf");
  if (Math.abs(params.bom.cell - REFERENCE_BOM.cell) > 1e-6) set.add("bom_cell");
  if (Math.abs(params.bom.module - REFERENCE_BOM.module) > 1e-6) set.add("bom_module");
  // 수율 변동 시 소요재료비·COM·COP도 이미 diff()에 잡히지만 BOM 관련 시각 일관성
  if (Math.abs(params.yields.module - REFERENCE_YIELDS.module) > 1e-6) set.add("material");
  return set;
}

export interface CostTreeViewProps {
  result: CostResult;
  params: CostParams;
  changedPaths?: DeltaTrace[];
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
  treeInfo
}: CostTreeViewProps) {
  const changedNodeIds = useMemo(() => {
    const set = new Set<string>();
    // diff() 기반: CostResult 필드 변동 노드
    for (const trace of changedPaths) {
      const nodeId = FIELD_TO_NODE[trace.path];
      if (nodeId) set.add(nodeId);
    }
    // params 기반: BOM/수율 노드는 params 직접 비교
    for (const nodeId of getParamsChangedNodes(params)) {
      set.add(nodeId);
    }
    return set;
  }, [changedPaths, params]);

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
