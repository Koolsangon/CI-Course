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

export interface ProblemDef {
  id: string;
  title: string;
  scenario: string;
  columns: ColumnDef[];
  rows: RowDef[];
}
