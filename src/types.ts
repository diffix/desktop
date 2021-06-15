// Generic API related utility types

export type ComputedData<T> =
  | { state: 'in_progress' }
  | { state: 'failed'; error: string }
  | { state: 'completed'; value: T };

// UI Types

export type DisplayMode = 'anonymized' | 'raw' | 'combined';

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

export type ResultRow = { kind: 'anonymized'; values: AnonymizedValue[] } | { kind: 'low_count'; values: Value[] };

export type Value = boolean | number | string | null;

export type AnonymizedValue = Value | AnonymizedAggregate;

export type AnonymizedAggregate = {
  realValue: number;
  anonValue: number | null;
};

// API

export type Anonymizer = {
  loadSchema(fileName: string): Promise<TableSchema>;
  anonymize(schema: TableSchema, columns: TableColumn[]): Promise<QueryResult>;
};
