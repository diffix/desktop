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

export type IntegerColumn = { name: string; type: 'integer' };
export type RealColumn = { name: string; type: 'real' };
export type TextColumn = { name: string; type: 'text' };
export type BooleanColumn = { name: string; type: 'boolean' };

export type TableColumn = IntegerColumn | RealColumn | TextColumn | BooleanColumn;

export type ColumnType = TableColumn['type'];

// Query request

export type NumericGeneralization = {
  binSize: number;
};

export type StringGeneralization = {
  substringStart: number;
  substringLength: number;
};

export type BucketColumn =
  | { column: BooleanColumn }
  | { column: IntegerColumn; generalization: NumericGeneralization | null }
  | { column: RealColumn; generalization: NumericGeneralization | null }
  | { column: TextColumn; generalization: StringGeneralization | null };

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
  anonymize(schema: TableSchema, bucketColumns: BucketColumn[]): Task<AnonymizedQueryResult>;
  export(schema: TableSchema, bucketColumns: BucketColumn[], outFileName: string): Promise<void>;
};

export type Task<T> = {
  cancel(): void;
  result: Promise<T>;
};

export {};
declare global {
  interface Window {
    executeQuery(fileName: string, salt: string, statement: string, signal: AbortSignal): Promise<QueryResult>;
    selectExportFile(): Promise<string | null>;
    exportQueryResult(inFileName: string, salt: string, statement: string, outFileName: string): Promise<void>;
    hashFile(fileName: string, signal: AbortSignal): Promise<string>;
  }
}
