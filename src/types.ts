import { RcFile } from 'antd/lib/upload';

// UI State

export type ComputedData<T> =
  | { state: 'in_progress' }
  | { state: 'failed'; error: string }
  | { state: 'completed'; value: T };

export type DisplayMode = 'anonymized' | 'combined';

export type RowData = {
  [dataIndex in number | string]: Value;
};

// Schema

export type File = RcFile;

export type TableSchema = {
  file: File;
  columns: TableColumn[];
  rowsPreview: ResultRow[];
  salt: string;
};

export type TableColumn = {
  name: string;
  type: ColumnType;
};

export type ColumnType = 'boolean' | 'integer' | 'real' | 'text';

// Query results

export type QueryResult = {
  columns: ResultColumn[];
  rows: ResultRow[];
};

export type ResultColumn = {
  name: string;
  type: ColumnType;
};

export type ResultRow = Value[];

export type Value = boolean | number | string | null;

// Anonymized query results

export type AnonymizedQueryResult = {
  columns: AnonymizedResultColumn[];
  rows: AnonymizedResultRow[];
};

export type AnonymizedResultColumn = {
  name: string;
  type: AnonymizedColumnType;
};

export type AnonymizedColumnType = ColumnType | 'aggregate';

export type AnonymizedResultRow = { lowCount: boolean; values: AnonymizedValue[] };

export type AnonymizedValue = Value | AnonymizedAggregate;

export type AnonymizedAggregate = {
  realValue: number;
  anonValue: number | null;
};

// Anonymization stats

export type AnonymizationStats = {
  bucketSuppression: number;
  averageDistortion: number;
  maximumDistortion: number;
};

// API

export type Anonymizer = {
  loadSchema(file: File): Task<TableSchema>;
  anonymize(schema: TableSchema, bucketColumns: TableColumn[]): Task<AnonymizedQueryResult>;
};

export type Task<T> = {
  cancel(): void;
  result: Promise<T>;
};

export {};
declare global {
  interface Window {
    executeQuery(fileName: string, salt: string, statement: string, signal: AbortSignal): Promise<QueryResult>;
    hashFile(fileName: string, signal: AbortSignal): Promise<string>;
  }
}
