import { createContext, useContext } from 'react';
import {
  Anonymizer,
  File,
  QueryResult,
  ResultColumn,
  ResultRow,
  TableColumn,
  TableSchema,
  Task,
  Value,
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
      const data = JSON.parse(result);
      const salt = await this.computeSaltFromFile(fileName);
      return {
        file,
        columns: data.columns.slice(1), // Drop row index column from schema.
        salt,
      };
    });
  }

  anonymize(schema: TableSchema, bucketColumns: TableColumn[]): Task<QueryResult> {
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
      const data = JSON.parse(result);
      const rows: ResultRow[] = data.rows.map((values: Value[]) => ({
        lowCount: values[0],
        values: [...values.slice(3), { realValue: values[1], anonValue: values[2] }],
      }));
      const columns: ResultColumn[] = [...data.columns.slice(3), { name: 'Count', type: 'aggregate' }];
      return { columns, rows };
    });
  }
}

export const anonymizer = new DiffixAnonymizer();

export const AnonymizerContext = createContext<Anonymizer>(anonymizer);

export function useAnonymizer(): Anonymizer {
  return useContext(AnonymizerContext);
}
