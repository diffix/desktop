// Schema

export type TableSchema = {
  fileName: string;
  columns: TableColumn[];
};

export type TableColumn = {
  name: string;
  type: ColumnType;
};

export type ColumnType = 'boolean' | 'integer' | 'real' | 'string';

// Results

export type QueryResult = {
  columns: ResultColumn[];
  rows: ResultRow[];
};

export type ResultColumn = {
  name: string;
  type: ResultColumnType;
};

export type ResultColumnType = ColumnType | 'aggregate';

export type ResultRow = {
  values: Value[];
  isLowCountFiltered: boolean;
};

export type Value = boolean | number | string | Aggregate | null;

export type Aggregate = {
  realValue: number;
  anonValue: number | null;
};

// API

export type Anonymizer = {
  anonymize(schema: TableSchema, columns: string[]): Promise<QueryResult>;
};
