export type CellType = "yellow" | "blue" | "purple" | "label";

/** 표시·채점 단위. percent = 0.932 → 93.2% / dollar = 200 → $200.0 / number = raw. */
export type CellFormat = "percent" | "dollar" | "number";

export interface CellDef {
  id: string;
  type: CellType;
  value?: number;
  answer?: number;
  tolerance?: number;
}

export interface RowDef {
  id: string;
  label: string;
  indent?: number;
  isSummary?: boolean;
  /** 행 전체 셀의 표기 단위. 기본값 dollar. */
  format?: CellFormat;
  cells: Record<string, CellDef>;
}

export interface ColumnDef {
  id: string;
  header: string;
  subheader?: string;
}

/** 구조화된 시나리오 — 카드에서 섹션별로 시각 분리해 렌더. */
export interface ScenarioSections {
  /** 상황 / 배경 설명. */
  situation: string;
  /** 과제 또는 질문 — 가장 눈에 띄게 표시. */
  task?: string;
  /** 계산 공식 / 힌트 — monospace 박스. */
  formula?: string;
  /** 가정 목록 — chip 형태로 표시. */
  assumptions?: string[];
}

export interface ProblemDef {
  id: string;
  title: string;
  /** 단일 문자열 시나리오 — 레거시 fallback. */
  scenario: string;
  /** 구조화 시나리오 — 카드에서 우선 사용. */
  scenarioSections?: ScenarioSections;
  columns: ColumnDef[];
  rows: RowDef[];
}
