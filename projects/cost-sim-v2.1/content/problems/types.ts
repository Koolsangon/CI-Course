export type CellType = "yellow" | "blue" | "purple" | "label";

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
