// Schema

export interface TableSchema {
  fileName: string;
  columns: TableColumn[];
}

export interface TableColumn {
  name: string;
  type: ColumnType;
}

export type ColumnType = 'boolean' | 'integer' | 'real' | 'string';

// Results

export interface QueryResult {
  columns: ResultColumn[];
  rows: ResultRow[];
}

export interface ResultColumn {
  name: string;
  type: ColumnType;
  tag: null | 'anon-count';
}

export interface ResultRow {
  values: Value[];
  isLowCountFiltered: boolean;
  trueCount: number;
}

export type Value = boolean | number | string | null;

// API

export interface Anonymizer {
  anonymize(schema: TableSchema, columns: string[]): Promise<QueryResult>;
}
