import { createContext, useContext } from 'react';
import {
  AnonymizationStats,
  AnonymizedAggregate,
  AnonymizedQueryResult,
  AnonymizedResultColumn,
  AnonymizedResultRow,
  Anonymizer,
  BucketColumn,
  ColumnType,
  File,
  NumericGeneralization,
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

  private makeColumnSQL = (column: BucketColumn) => {
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

  private makeBucketsSQL = (bucketColumns: BucketColumn[]) => {
    return bucketColumns.map((column) => this.makeColumnSQL(column)).join(', ');
  };

  loadSchema(file: File): Task<TableSchema> {
    return runTask(async (signal) => {
      const request = { type: 'Load', inputPath: file.path, rows: 1000 };
      const saltPromise = window.hashFile(file.path, signal);
      const result = await window.callService(request, signal);

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
      if (bucketColumns.length === 0) return { columns: [], rows: [] };

      const statement = `
        SELECT
          diffix_low_count(RowIndex),
          count(*),
          diffix_count(RowIndex),
          ${this.makeBucketsSQL(bucketColumns)}
        FROM table
        GROUP BY ${bucketColumns.map((_, index) => 4 + index).join(', ')}
        LIMIT 1000
      `;
      const request = {
        type: 'Preview',
        inputPath: schema.file.path,
        salt: schema.salt,
        query: statement,
        rows: 1000,
      };
      const result = await window.callService(request, signal);

      const rows: AnonymizedResultRow[] = result.rows.map((row) => {
        const lowCount = row[0] as boolean;
        return {
          lowCount,
          values: [...row.slice(3), { realValue: row[1] as number, anonValue: lowCount ? null : (row[2] as number) }],
        };
      });
      const columns: AnonymizedResultColumn[] = [...bucketColumns, { name: 'Count', type: 'aggregate' }];

      return { columns, rows };
    });
  }

  export(schema: TableSchema, bucketColumns: BucketColumn[], outFileName: string): Task<void> {
    return runTask(async (signal) => {
      const statement = `
        SELECT
          ${this.makeBucketsSQL(bucketColumns)},
          diffix_count(RowIndex) AS count
        FROM table
        GROUP BY ${bucketColumns.map((_, index) => 1 + index).join(', ')}
        HAVING NOT diffix_low_count(RowIndex)
      `;
      const request = {
        type: 'Export',
        inputPath: schema.file.path,
        salt: schema.salt,
        query: statement,
        outputPath: outFileName,
      };
      await window.callService(request, signal);
    });
  }
}

export function computeAnonymizationStats(result: AnonymizedQueryResult): AnonymizationStats {
  const totalBuckets = result.rows.length;
  let suppressedBuckets = 0;
  let averageDistortion = 0;
  let maximumDistortion = 0;

  for (let i = 0; i < totalBuckets; i++) {
    const row = result.rows[i];
    if (row.lowCount) {
      suppressedBuckets++;
      continue;
    }

    const count = row.values[row.values.length - 1] as AnonymizedAggregate;
    const distortion = Math.abs(count.realValue - (count.anonValue || 0)) / count.realValue;
    maximumDistortion = Math.max(distortion, maximumDistortion);
    averageDistortion += distortion;
  }

  const anonymizedBuckets = totalBuckets - suppressedBuckets;

  if (anonymizedBuckets > 0) {
    averageDistortion /= anonymizedBuckets;
  }

  return {
    bucketSuppression: totalBuckets > 0 ? suppressedBuckets / totalBuckets : 0,
    averageDistortion,
    maximumDistortion,
  };
}

export const anonymizer = new DiffixAnonymizer();

export const AnonymizerContext = createContext<Anonymizer>(anonymizer);

export function useAnonymizer(): Anonymizer {
  return useContext(AnonymizerContext);
}
