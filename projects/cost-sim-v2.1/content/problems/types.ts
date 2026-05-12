export type CellType = "yellow" | "blue" | "purple" | "label";

/** 3-단계 누적 힌트 — 워크시트 셀 또는 행 단위로 정의. */
export interface CellHints {
  /** 1단계: 개념 — 이 셀이 어떤 원리에 지배되는지 설명. 정답 노출 금지. */
  l1: string;
  /** 2단계: 메커니즘 — 어느 방향으로/어떤 비례로 작동하는지. 정답 노출 금지. */
  l2: string;
  /** 3단계: 공식 — 계산식과 어떤 값을 어디에 대입할지. 정답 숫자 노출 금지. */
  l3: string;
}

export interface CellDef {
  id: string;
  type: CellType;
  value?: number;
  answer?: number;
  tolerance?: number;
  /** 이 yellow 셀 전용 힌트. 정의 시 row / case-level 힌트보다 우선. */
  hints?: CellHints;
}

export interface RowDef {
  id: string;
  label: string;
  indent?: number;
  isSummary?: boolean;
  cells: Record<string, CellDef>;
  /** 이 행의 yellow 셀들이 같은 메커니즘을 공유할 때 일괄 적용. cell.hints 다음 우선. */
  hints?: CellHints;
}

export interface ColumnDef {
  id: string;
  header: string;
  subheader?: string;
}

export interface ProblemDef {
  id: string;
  title: string;
  scenario: string;
  columns: ColumnDef[];
  rows: RowDef[];
}
