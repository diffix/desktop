import { createContext, useContext } from 'react';
import { Anonymizer, QueryResult, ResultRow, TableColumn, TableSchema, Task, Value } from '../types';
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
        { lowCount: true, values: [...tableColumns.map(fakeData(3)), 13] },
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
  loadSchema(fileName: string): Task<TableSchema> {
    return toTask(async () => {
      const result = await window.executeQuery(fileName, 'SELECT * FROM table');
      const data = JSON.parse(result);
      return { fileName, columns: data.columns.slice(1) }; // Drop row index column from schema.
    });
  }

  anonymize(schema: TableSchema, columns: TableColumn[]): Task<QueryResult> {
    return toTask(async () => {
      const columnsString = columns.map((column) => column.name).join(', ');
      const statement = `SELECT ${columnsString} FROM table`;
      const result = await window.executeQuery(schema.fileName, statement);
      const data = JSON.parse(result);
      const rows: ResultRow[] = data.rows.map((values: Value[]) => ({ lowCount: true, values }));
      return { columns: data.columns, rows };
    });
  }
}

export const fakeAnonymizer = new FakeAnonymizer();

export const anonymizer = new DiffixAnonymizer();

export const AnonymizerContext = createContext<Anonymizer>(anonymizer);

export function useAnonymizer(): Anonymizer {
  return useContext(AnonymizerContext);
}
