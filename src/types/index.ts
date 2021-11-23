import { RcFile } from 'antd/lib/upload';
import { PageId } from '../Docs';

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
  | (IntegerColumn & { generalization: NumericGeneralization | null })
  | (RealColumn & { generalization: NumericGeneralization | null })
  | (TextColumn & { generalization: StringGeneralization | null })
  | BooleanColumn;

export type CountInput = 'Rows' | 'Entities';

// Query results

export type AnonymizationSummary = {
  totalBuckets: number;
  lowCountBuckets: number;
  totalRows: number;
  lowCountRows: number;
  maxDistortion: number;
  medianDistortion: number;
};

export type LoadResponse = {
  columns: ResultColumn[];
  rows: ResultRow[];
};

export type PreviewResponse = {
  summary: AnonymizationSummary;
  rows: ResultRow[];
};

export type HasMissingValuesResponse = boolean;

export type Response = LoadResponse | PreviewResponse | HasMissingValuesResponse;

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
  summary: AnonymizationSummary;
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

// AnonymizationParams

export type AnonParamsPreset = 'P' | 'XP' | 'XXP';

export type Interval = {
  lower: number;
  upper: number;
};

export type SuppressionParams = {
  lowThreshold: number;
  sD: number;
  lowMeanGap: number;
};

export type AnonymizationParams = {
  // we're excluding TableSettings and Salt, as compared to `reference`, since
  // both are handled differently in Diffix for Desktop
  suppression: SuppressionParams;

  // Count params
  outlierCount: Interval;
  topCount: Interval;
  baseNoiseSD: number;
};

// API

export type Anonymizer = {
  loadSchema(file: File): Task<TableSchema>;
  anonymize(
    schema: TableSchema,
    aidColumn: string,
    bucketColumns: BucketColumn[],
    countInput: CountInput,
    anonParams: AnonymizationParams,
  ): Task<AnonymizedQueryResult>;
  export(
    schema: TableSchema,
    aidColumn: string,
    bucketColumns: BucketColumn[],
    countInput: CountInput,
    outFileName: string,
    anonParams: AnonymizationParams,
  ): Task<void>;
  hasMissingAid(schema: TableSchema, aidColumn: string): Task<boolean>;
};

export type Task<T> = {
  cancel(): void;
  result: Promise<T>;
};

export {};
declare global {
  interface Window {
    callService(request: unknown, signal: AbortSignal): Promise<Response>;
    selectExportFile(defaultPath: string): Promise<string | null>;
    hashFile(fileName: string, signal: AbortSignal): Promise<string>;
    onOpenDocs: (page: PageId) => void;
    setMainWindowTitle: (title: string) => void;
    checkForUpdates: () => Promise<string | null>;
  }
}
