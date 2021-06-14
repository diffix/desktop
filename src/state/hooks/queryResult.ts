import { useState, useEffect } from 'react';
import type {
  Value,
  ResultColumnType,
  ColumnType,
  ComputedData,
  TableSchema,
  TableColumn,
  ResultColumn,
  ResultRow,
  QueryResult,
} from '../../types';

function typeConversion(columnType: ColumnType): ResultColumnType {
  switch (columnType) {
    case 'boolean':
      return 'boolean';
    case 'integer':
      return 'integer';
    case 'real':
      return 'real';
    case 'string':
      return 'string';
  }
}

const names = ['Alice', 'Bob', 'Charlotte', 'Daniel'];

function dummyResult(tableColumns: TableColumn[]): QueryResult {
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

  function mapToResultColumn(tc: TableColumn): ResultColumn {
    return { name: tc.name, type: typeConversion(tc.type) };
  }

  const rows: ResultRow[] = [
    { kind: 'anonymized', values: [...tableColumns.map(fakeData(0)), { realValue: 10, anonValue: 10 }] },
    { kind: 'anonymized', values: [...tableColumns.map(fakeData(1)), { realValue: 5, anonValue: null }] },
    { kind: 'anonymized', values: [...tableColumns.map(fakeData(2)), { realValue: 100, anonValue: 99 }] },
    { kind: 'low_count', values: [...tableColumns.map(fakeData(3)), 13] },
  ];

  const queryResult: QueryResult = {
    columns: [...tableColumns.map(mapToResultColumn), { name: 'count', type: 'aggregate' }],
    rows,
  };

  return queryResult;
}

export function useQueryResult(schema: TableSchema, columns: TableColumn[]): ComputedData<QueryResult> {
  const [result, setResult] = useState<ComputedData<QueryResult>>({ state: 'not_initialized' });

  useEffect(() => {
    setResult({ state: 'in_progress' });
    const id = setTimeout(() => {
      setResult({ state: 'completed', value: dummyResult(schema.columns) });
    }, 1000);
    return () => clearTimeout(id);
  }, [schema, columns]);

  return result;
}
