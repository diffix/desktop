import { createContext, useContext } from 'react';
import {
  AnonymizedQueryResult,
  AnonymizedResultColumn,
  AnonymizedResultRow,
  Anonymizer,
  BucketColumn,
  HasMissingValuesResponse,
  ColumnType,
  CountInput,
  File,
  LoadResponse,
  NumericGeneralization,
  PreviewResponse,
  StringGeneralization,
  TableSchema,
  Task,
  AnonymizationParams,
  RowData,
} from '../types';
import { runTask } from './utils';

class DiffixAnonymizer implements Anonymizer {
  private static booleanRE = /^(?:true|false|0|1)$/i;
  private static integerRE = /^-?\d{1,20}$/;
  private static realRE = /^-?\d{1,20}(?:\.\d{1,20})?$/;

  private detectColumnTypes(columnsCount: number, rows: string[][]): ColumnType[] {
    const typesInfo = Array(columnsCount)
      .fill(null)
      .map(() => ({ isEmpty: true, isBoolean: true, isInteger: true, isReal: true }));

    for (const row of rows) {
      for (let index = 0; index < row.length; index++) {
        const value = row[index];
        if (value) {
          // Not null and not empty.
          const typeInfo = typesInfo[index];
          typeInfo.isEmpty = false;
          typeInfo.isBoolean &&= DiffixAnonymizer.booleanRE.test(value);
          typeInfo.isInteger &&= DiffixAnonymizer.integerRE.test(value);
          typeInfo.isReal &&= DiffixAnonymizer.realRE.test(value);
        }
      }
    }

    return typesInfo.map((info) => {
      if (info.isEmpty) return 'text';
      if (info.isBoolean) return 'boolean';
      if (info.isInteger) return 'integer';
      if (info.isReal) return 'real';
      return 'text';
    });
  }

  private makeBinSQL = (columnName: string, { binSize }: NumericGeneralization) => {
    return `floor_by(cast(${columnName} AS real), ${binSize})`;
  };

  private makeSubstringSQL = (columnName: string, { substringStart, substringLength }: StringGeneralization) => {
    return `substring(${columnName}, ${substringStart}, ${substringLength})`;
  };

  private mapBucketToSQL = (column: BucketColumn) => {
    const columnName = `"${column.name}"`;

    switch (column.type) {
      case 'integer':
      case 'real':
        return column.generalization
          ? this.makeBinSQL(columnName, column.generalization) + ` AS ${columnName}`
          : columnName;
      case 'text':
        return column.generalization
          ? this.makeSubstringSQL(columnName, column.generalization) + ` AS ${columnName}`
          : columnName;
      case 'boolean':
        return columnName;
    }
  };

  private mapBucketsToSQL = (bucketColumns: BucketColumn[]) => {
    return bucketColumns.map((column) => this.mapBucketToSQL(column));
  };

  loadSchema(file: File): Task<TableSchema> {
    return runTask(async (signal) => {
      const request = { type: 'Load', inputPath: file.path, rows: 10000 };
      const saltPromise = window.hashFile(file.path, signal);
      const result = (await window.callService(request, signal)) as LoadResponse;

      // Drop row index column from schema.
      const columns = result.columns.slice(1);
      const rowsPreview = result.rows.map((row) => row.slice(1)).slice(0, 1000);

      const types = this.detectColumnTypes(columns.length, rowsPreview as string[][]);
      for (let index = 0; index < columns.length; index++) columns[index].type = types[index];

      const salt = await saltPromise;
      return { file, columns, rowsPreview, salt };
    });
  }

  anonymize(
    schema: TableSchema,
    aidColumn: string,
    bucketColumns: BucketColumn[],
    countInput: CountInput,
    anonParams: AnonymizationParams,
  ): Task<AnonymizedQueryResult> {
    return runTask(async (signal) => {
      const request = {
        type: 'Preview',
        inputPath: schema.file.path,
        aidColumn: `"${aidColumn}"`,
        salt: schema.salt,
        anonParams,
        buckets: this.mapBucketsToSQL(bucketColumns),
        countInput,
        rows: 1000,
      };
      const result = (await window.callService(request, signal)) as PreviewResponse;

      const rows: AnonymizedResultRow[] = result.rows.map((row) => {
        // NOTE: the position of `diffix_low_count` and other columns must be kept in sync with the
        // Preview request's `SELECT` in `anonymizer/OpenDiffix.Service/Program.fs`.
        const lowCount = row[0] as boolean;
        const count = row[1] as number;
        const diffixCount = lowCount ? null : (row[2] as number);
        // the remainder of cells in the row are bucket values from `GROUP BY`s
        const bucketValueArray = [...row.slice(3)];

        // now translate this into a structure with named fields `AnonymizedResultRow`
        const emptyRowData: RowData = {};
        const bucketValues: RowData = bucketColumns.reduce((rowData: RowData, column: BucketColumn, columnIdx) => {
          rowData[column.name] = bucketValueArray[columnIdx];
          return rowData;
        }, emptyRowData);
        return {
          lowCount,
          count,
          diffixCount,
          bucketValues,
        };
      });
      const columns: AnonymizedResultColumn[] = [...bucketColumns, { name: 'Count', type: 'aggregate' }];
      const summary = result.summary;

      return { columns, rows, summary };
    });
  }

  export(
    schema: TableSchema,
    aidColumn: string,
    bucketColumns: BucketColumn[],
    countInput: CountInput,
    outFileName: string,
    anonParams: AnonymizationParams,
  ): Task<void> {
    return runTask(async (signal) => {
      const request = {
        type: 'Export',
        inputPath: schema.file.path,
        aidColumn: `"${aidColumn}"`,
        salt: schema.salt,
        anonParams,
        buckets: this.mapBucketsToSQL(bucketColumns),
        countInput,
        outputPath: outFileName,
      };
      await window.callService(request, signal);
    });
  }

  hasMissingAid(schema: TableSchema, aidColumn: string): Task<boolean> {
    return runTask(async (signal) => {
      const request = {
        type: 'HasMissingValues',
        inputPath: schema.file.path,
        aidColumn: `"${aidColumn}"`,
      };
      return (await window.callService(request, signal)) as HasMissingValuesResponse;
    });
  }
}

export const anonymizer = new DiffixAnonymizer();

export const AnonymizerContext = createContext<Anonymizer>(anonymizer);

export function useAnonymizer(): Anonymizer {
  return useContext(AnonymizerContext);
}
