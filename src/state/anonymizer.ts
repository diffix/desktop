import { createContext, useContext } from 'react';
import { Anonymizer, QueryResult, ResultRow, TableColumn, TableSchema, Value } from '../types';
import { delay } from './utils';

class FakeAnonymizer implements Anonymizer {
  async loadSchema(fileName: string): Promise<TableSchema> {
    // Simulate loading
    await delay(1000);

    // Small chance for failure
    if (Math.random() < 0.2) {
      throw new Error('Could not anonymize data');
    }

    return {
      fileName,
      columns: [
        { name: 'Name', type: 'string' },
        { name: 'Age', type: 'integer' },
      ],
    };
  }

  async anonymize(schema: TableSchema, _columns: TableColumn[]): Promise<QueryResult> {
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
      { kind: 'anonymized', values: [...tableColumns.map(fakeData(0)), { realValue: 10, anonValue: 10 }] },
      { kind: 'anonymized', values: [...tableColumns.map(fakeData(1)), { realValue: 5, anonValue: null }] },
      { kind: 'anonymized', values: [...tableColumns.map(fakeData(2)), { realValue: 100, anonValue: 99 }] },
      { kind: 'low_count', values: [...tableColumns.map(fakeData(3)), 13] },
    ];

    const queryResult: QueryResult = {
      columns: [...tableColumns.map((tc) => ({ name: tc.name, type: tc.type })), { name: 'count', type: 'aggregate' }],
      rows,
    };

    return queryResult;
  }
}

class DiffixAnonymizer implements Anonymizer {
  async loadSchema(_fileName: string): Promise<TableSchema> {
    throw new Error('Not implemented');
  }

  async anonymize(_schema: TableSchema, _columns: TableColumn[]): Promise<QueryResult> {
    throw new Error('Not implemented');
  }
}

export const fakeAnonymizer = new FakeAnonymizer();

export const anonymizer = new DiffixAnonymizer();

export const AnonymizerContext = createContext<Anonymizer>(anonymizer);

export function useAnonymizer(): Anonymizer {
  return useContext(AnonymizerContext);
}
