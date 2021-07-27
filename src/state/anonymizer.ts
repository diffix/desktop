import { createContext, useContext } from 'react';
import {
  AnonymizedQueryResult,
  AnonymizedResultColumn,
  AnonymizedResultRow,
  Anonymizer,
  File,
  TableColumn,
  TableSchema,
  Task,
} from '../types';
import { toTask } from './utils';

class DiffixAnonymizer implements Anonymizer {
  private async computeSaltFromFile(fileName: string) {
    const hash = await window.hashFile(fileName);
    return BigInt('0x' + hash.substring(0, 16)).toString(10); // Return a 64-bit decimal string.
  }

  loadSchema(file: File): Task<TableSchema> {
    return toTask(async () => {
      const fileName = file.path;
      const result = await window.executeQuery(fileName, '0', 'SELECT * FROM table LIMIT 10000');
      const salt = await this.computeSaltFromFile(fileName);
      return {
        file,
        columns: result.columns.slice(1), // Drop row index column from schema.
        rowsPreview: result.rows.map((row) => row.slice(1)),
        salt,
      };
    });
  }

  anonymize(schema: TableSchema, bucketColumns: TableColumn[]): Task<AnonymizedQueryResult> {
    return toTask(async () => {
      if (bucketColumns.length === 0) return { columns: [], rows: [] };
      const bucketColumnsString = bucketColumns.map((column) => `"${column.name}"`).join(', ');
      const statement = `
        SELECT
          diffix_low_count(RowIndex),
          count(*),
          diffix_count(RowIndex),
          ${bucketColumnsString}
        FROM table
        GROUP BY ${bucketColumnsString}
        LIMIT 10000
      `;
      const result = await window.executeQuery(schema.file.path, schema.salt, statement);
      const rows: AnonymizedResultRow[] = result.rows.map((row) => ({
        lowCount: row[0] as boolean,
        values: [...row.slice(3), { realValue: row[1] as number, anonValue: row[2] as number | null }],
      }));
      const columns: AnonymizedResultColumn[] = [...result.columns.slice(3), { name: 'Count', type: 'aggregate' }];
      return { columns, rows };
    });
  }
}

export const anonymizer = new DiffixAnonymizer();

export const AnonymizerContext = createContext<Anonymizer>(anonymizer);

export function useAnonymizer(): Anonymizer {
  return useContext(AnonymizerContext);
}
