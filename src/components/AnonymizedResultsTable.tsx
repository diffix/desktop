import React, { FunctionComponent, useState } from 'react';

import { DisplayModeSwitch, ResponsiveTable } from '.';
import { columnSorter } from '../state';
import {
  AnonymizedQueryResult,
  AnonymizedResultColumn,
  AnonymizedResultRow,
  ColumnType,
  DisplayMode,
  RowData,
  Value,
} from '../types';

import './AnonymizedResultsTable.css';

type TableRowData = RowData & {
  key: number;
  lowCount: AnonymizedResultRow['lowCount'];
};

// Columns

function renderValue(v: Value) {
  if (v === null) {
    return <i>NULL</i>;
  } else {
    return v.toString();
  }
}

function renderLowCountValue(v: Value) {
  if (v === null) {
    return '-';
  } else {
    return v.toString();
  }
}

function makeColumnData(
  title: string,
  dataIndex: string,
  type: ColumnType,
  render: (v: Value) => React.ReactNode = renderValue,
) {
  return {
    title,
    dataIndex,
    render,
    sorter: columnSorter(type, dataIndex),
    ellipsis: true,
  };
}

const AGG_COLUMN_TYPE = 'real';

const mapColumn = (mode: DisplayMode) => (column: AnonymizedResultColumn, i: number) => {
  if (column.type === 'aggregate') {
    switch (mode) {
      case 'anonymized':
        return [makeColumnData(column.name, i + '_anon', AGG_COLUMN_TYPE)];
      case 'combined':
        return [
          makeColumnData(column.name + ' (anonymized)', i + '_anon', AGG_COLUMN_TYPE, renderLowCountValue),
          makeColumnData(column.name + ' (original)', i + '_real', AGG_COLUMN_TYPE),
        ];
    }
  }

  return [makeColumnData(column.name, i.toString(), column.type)];
};

// Rows

function rowClassName({ lowCount }: TableRowData) {
  return 'AnonymizedResultsTable-row' + (lowCount ? ' low-count' : '');
}

function filterRows(mode: DisplayMode, rows: AnonymizedResultRow[]) {
  if (mode === 'anonymized') {
    return rows.filter((r) => !r.lowCount);
  } else {
    return rows;
  }
}

function mapRow(row: AnonymizedResultRow, i: number) {
  const rowData: TableRowData = {
    key: i,
    lowCount: row.lowCount,
  };

  const { values } = row;
  const { length } = values;
  for (let i = 0; i < length; i++) {
    const value = values[i];
    if (value && typeof value === 'object') {
      rowData[i + '_real'] = value.realValue;
      rowData[i + '_anon'] = value.anonValue;
    } else {
      rowData[i] = value;
    }
  }

  return rowData;
}

// Component

export type AnonymizedResultsTableProps = {
  loading: boolean;
  result: AnonymizedQueryResult;
};

export const AnonymizedResultsTable: FunctionComponent<AnonymizedResultsTableProps> = ({ loading, result }) => {
  const [mode, setMode] = useState<DisplayMode>('anonymized');

  const columns = result.columns.flatMap(mapColumn(mode));
  const data = filterRows(mode, result.rows).map(mapRow);

  return (
    <div className={`AnonymizedResultsTable ${mode}`}>
      <ResponsiveTable
        key={loading ? 1 : 0 /* Resets internal state */}
        loading={loading}
        columns={columns}
        dataSource={data}
        rowClassName={rowClassName}
        footer={() => <DisplayModeSwitch value={mode} onChange={setMode} />}
      />
    </div>
  );
};
