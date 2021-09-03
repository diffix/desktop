import { createContext, useContext } from 'react';
import {
  AnonymizedQueryResult,
  AnonymizedResultColumn,
  AnonymizedResultRow,
  Anonymizer,
  BucketColumn,
  ColumnType,
  File,
  LoadResponse,
  NumericGeneralization,
  PreviewResponse,
  StringGeneralization,
  TableSchema,
  Task,
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
    return `floor(cast(${columnName} AS real) / ${binSize}) * ${binSize}`;
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

  anonymize(schema: TableSchema, bucketColumns: BucketColumn[]): Task<AnonymizedQueryResult> {
    return runTask(async (signal) => {
      const request = {
        type: 'Preview',
        inputPath: schema.file.path,
        salt: schema.salt,
        buckets: this.mapBucketsToSQL(bucketColumns),
        rows: 1000,
      };
      const result = (await window.callService(request, signal)) as PreviewResponse;

      const rows: AnonymizedResultRow[] = result.rows.map((row) => {
        const lowCount = row[0] as boolean;
        return {
          lowCount,
          values: [...row.slice(3), { realValue: row[1] as number, anonValue: lowCount ? null : (row[2] as number) }],
        };
      });
      const columns: AnonymizedResultColumn[] = [...bucketColumns, { name: 'Count', type: 'aggregate' }];
      const summary = result.summary;

      return { columns, rows, summary };
    });
  }

  export(schema: TableSchema, bucketColumns: BucketColumn[], outFileName: string): Task<void> {
    return runTask(async (signal) => {
      const request = {
        type: 'Export',
        inputPath: schema.file.path,
        salt: schema.salt,
        buckets: this.mapBucketsToSQL(bucketColumns),
        outputPath: outFileName,
      };
      await window.callService(request, signal);
    });
  }
}

export const anonymizer = new DiffixAnonymizer();

export const AnonymizerContext = createContext<Anonymizer>(anonymizer);

export function useAnonymizer(): Anonymizer {
  return useContext(AnonymizerContext);
}
