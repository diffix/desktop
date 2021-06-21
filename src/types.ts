import { RcFile } from 'antd/lib/upload';

// UI State

export type ComputedData<T> =
  | { state: 'in_progress' }
  | { state: 'failed'; error: string }
  | { state: 'completed'; value: T };

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

export type File = RcFile;

export type Anonymizer = {
  loadSchema(fileName: string): Task<TableSchema>;
  anonymize(schema: TableSchema, columns: TableColumn[]): Task<QueryResult>;
};

export type Task<T> = {
  cancel(): void;
  result: Promise<T>;
};

export {};
declare global {
  interface Window {
    execute_query(fileName: string, statement: string): Promise<string>;
  }
}
