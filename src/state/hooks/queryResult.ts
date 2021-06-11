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

function dummyResult(tableColumns: TableColumn[]): QueryResult {
  const fakeData = (column: TableColumn, index: number): Value => {
    switch (column.type) {
      case 'boolean':
        return false;
      case 'integer':
        return index;
      case 'real':
        return 1.0 * index;
      case 'string':
        return `Bob the ${index}st/nd/rd/th`;
    }
  };

  function mapToResultColumn(tc: TableColumn): ResultColumn {
    return { name: tc.name, type: typeConversion(tc.type) };
  }

  const rows: ResultRow[] = [
    { kind: 'anonymized', values: [...tableColumns.map(fakeData), { realValue: 10, anonValue: 10 }] },
    { kind: 'anonymized', values: [...tableColumns.map(fakeData), { realValue: 5, anonValue: null }] },
    { kind: 'anonymized', values: [...tableColumns.map(fakeData), { realValue: 100, anonValue: 100 }] },
    { kind: 'low_count', values: [...tableColumns.map(fakeData), 13] },
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
    // Simulate producing result...
    setResult({ state: 'in_progress' });
    const id = setTimeout(() => {
      setResult({ state: 'completed', value: dummyResult(schema.columns) });
    }, 1000);
    // useEffect allows returning a disposer in case of an unmount or re-run.
    return () => clearTimeout(id);
  }, [schema, columns]);

  return result;
}
