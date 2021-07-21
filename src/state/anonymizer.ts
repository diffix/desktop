import { createContext, useContext } from 'react';
import { Anonymizer, QueryResult, ResultColumn, ResultRow, TableColumn, TableSchema, Task, Value } from '../types';
import { delay, toTask } from './utils';

class FakeAnonymizer implements Anonymizer {
  loadSchema(fileName: string): Task<TableSchema> {
    return toTask(async () => {
      // Simulate loading
      await delay(1000);

      // Small chance for failure
      if (Math.random() < 0.2) {
        throw new Error('Could not load schema');
      }

      return {
        fileName,
        columns: [
          { name: 'Name', type: 'string' },
          { name: 'Age', type: 'integer' },
        ],
        salt: '0',
      };
    });
  }

  anonymize(schema: TableSchema, _columns: TableColumn[]): Task<QueryResult> {
    return toTask(async () => {
      // Simulate loading
      await delay(1000);

      // Small chance for failure
      if (Math.random() < 0.2) {
        throw new Error('Could not anonymize data');
      }

      const tableColumns = schema.columns;
      const names = ['Alice', 'Bob', 'Charlotte', 'Daniel'];

      const fakeData =
        (rowIndex: number) =>
        (column: TableColumn, colIndex: number): Value => {
          const seed = rowIndex + colIndex;
          switch (column.type) {
            case 'boolean':
              return seed % 2 === 0 ? true : false;
            case 'integer':
              return 1 + seed;
            case 'real':
              return 1.5 * seed;
            case 'string':
              return `${names[seed % names.length]} ${1 + rowIndex}`;
          }
        };

      const rows: ResultRow[] = [
        { lowCount: false, values: [...tableColumns.map(fakeData(0)), { realValue: 10, anonValue: 10 }] },
        { lowCount: false, values: [...tableColumns.map(fakeData(1)), { realValue: 5, anonValue: null }] },
        { lowCount: false, values: [...tableColumns.map(fakeData(2)), { realValue: 100, anonValue: 99 }] },
        { lowCount: true, values: [...tableColumns.map(fakeData(3)), { realValue: 13, anonValue: null }] },
      ];

      const queryResult: QueryResult = {
        columns: [
          ...tableColumns.map((tc) => ({ name: tc.name, type: tc.type })),
          { name: 'count', type: 'aggregate' },
        ],
        rows,
      };

      return queryResult;
    });
  }
}

class DiffixAnonymizer implements Anonymizer {
  private async computeSaltFromFile(fileName: string) {
    const hash = await window.hashFile(fileName);
    return BigInt('0x' + hash.substring(0, 16)).toString(10); // Return a 64-bit decimal string.
  }

  loadSchema(fileName: string): Task<TableSchema> {
    return toTask(async () => {
      const result = await window.executeQuery(fileName, '0', 'SELECT * FROM table');
      const data = JSON.parse(result);
      const salt = await this.computeSaltFromFile(fileName);
      return {
        fileName,
        columns: data.columns.slice(1), // Drop row index column from schema.
        salt,
      };
    });
  }

  anonymize(schema: TableSchema, bucketColumns: TableColumn[]): Task<QueryResult> {
    return toTask(async () => {
      if (bucketColumns.length === 0) return { columns: [], rows: [] };
      const bucketColumnsString = bucketColumns.map((column) => column.name).join(', ');
      const statement = `
          SELECT
            diffix_low_count(RowIndex),
            count(*),
            diffix_count(RowIndex),
            ${bucketColumnsString}
          FROM table
          GROUP BY ${bucketColumnsString}
      `;
      const result = await window.executeQuery(schema.fileName, schema.salt, statement);
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

export const fakeAnonymizer = new FakeAnonymizer();

export const anonymizer = new DiffixAnonymizer();

export const AnonymizerContext = createContext<Anonymizer>(anonymizer);

export function useAnonymizer(): Anonymizer {
  return useContext(AnonymizerContext);
}
