import React, { FunctionComponent, useState } from 'react';
import { Table } from 'antd';

import { DisplayModeSwitch } from '.';
import {
  AnonymizedAggregate,
  AnonymizedValue,
  DisplayMode,
  QueryResult,
  ResultColumn,
  ResultColumnType,
  ResultRow,
  Value,
} from '../types';

import './QueryResultsTable.css';

type TableRowData = {
  key: number;
  lowCount: ResultRow['lowCount'];
  [index: number]: AnonymizedValue;
};

// Rendering

function rowClassName({ lowCount }: TableRowData) {
  return 'QueryResultsTable-row' + (lowCount ? ' low-count' : '');
}

function renderValue(v: Value) {
  if (v === null) {
    return <i>NULL</i>;
  } else {
    return v.toString();
  }
}

function renderAnonymizedValue(v: AnonymizedValue, mode: DisplayMode) {
  if (v && typeof v === 'object') {
    switch (mode) {
      case 'anonymized':
        return renderValue(v.anonValue);
      case 'raw':
        return renderValue(v.realValue);
      case 'combined':
        return (
          <>
            {renderValue(v.anonValue)} ({renderValue(v.realValue)})
          </>
        );
      default:
        throw new Error('Invalid display mode');
    }
  }

  return renderValue(v);
}

const columnRenderer = (mode: DisplayMode) => (v: AnonymizedValue) => {
  return renderAnonymizedValue(v, mode);
};

// Sorting

function compareNumbers(a: number | null, b: number | null) {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a - b;
}

const columnSorter =
  (mode: DisplayMode, type: ResultColumnType, index: number) => (rowA: TableRowData, rowB: TableRowData) => {
    const a = rowA[index];
    const b = rowB[index];

    if (a === null && b === null) return 0;
    if (a === null) return -1;
    if (b === null) return 1;

    switch (type) {
      case 'boolean':
        return a === b ? 0 : a ? 1 : -1;
      case 'integer':
      case 'real':
        return (a as number) - (b as number);
      case 'string':
        return (a as string).localeCompare(b as string);
      case 'aggregate': {
        const aggA = a as AnonymizedAggregate;
        const aggB = b as AnonymizedAggregate;

        switch (mode) {
          case 'raw':
            return compareNumbers(aggA.realValue, aggB.realValue);
          case 'anonymized':
            return compareNumbers(aggA.anonValue, aggB.anonValue);
          case 'combined': {
            const result = compareNumbers(aggA.anonValue, aggB.anonValue);
            if (result === 0) {
              return compareNumbers(aggA.realValue, aggB.realValue);
            } else {
              return result;
            }
          }
        }
      }
    }
  };

// Data preprocessing

function filterRows(mode: DisplayMode, rows: ResultRow[]) {
  if (mode === 'anonymized') {
    return rows.filter((r) => !r.lowCount);
  } else {
    return rows;
  }
}

const normalizeRow = (columns: ResultColumn[]) => (row: ResultRow, i: number) => {
  const result: TableRowData = {
    key: i,
    lowCount: row.lowCount,
  };

  const values = row.values;
  for (let i = 0; i < values.length; i++) {
    if (!row.lowCount && columns[i].type === 'aggregate') {
      result[i] = { realValue: values[i] as number, anonValue: null };
    } else {
      result[i] = values[i];
    }
  }

  return result;
};

// Component

export type QueryResultsTableProps = {
  loading: boolean;
  result: QueryResult;
};

export const QueryResultsTable: FunctionComponent<QueryResultsTableProps> = ({ loading, result }) => {
  const [mode, setMode] = useState<DisplayMode>('anonymized');

  const render = columnRenderer(mode);

  const columns = result.columns.map((col, i) => ({
    title: col.name,
    dataIndex: i.toString(),
    render,
    sorter: columnSorter(mode, col.type, i),
  }));

  const data = filterRows(mode, result.rows).map(normalizeRow(result.columns));

  return (
    <div className={`QueryResultsTable ${mode}`}>
      <Table
        loading={loading}
        columns={columns}
        dataSource={data}
        rowClassName={rowClassName}
        footer={() => <DisplayModeSwitch value={mode} onChange={setMode} />}
      />
    </div>
  );
};
