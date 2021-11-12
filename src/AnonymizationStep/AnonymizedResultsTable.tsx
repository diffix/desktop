import React, { FunctionComponent, useState } from 'react';
import { Tooltip } from 'antd';

import { columnSorter, formatPercentage, relativeNoise, ResponsiveTable } from '../shared';
import {
  AnonymizedQueryResult,
  AnonymizedResultColumn,
  AnonymizedResultRow,
  ColumnType,
  DisplayMode,
  RowData,
  Value,
  TooltipFunction,
} from '../types';
import { DisplayModeSwitch } from './DisplayModeSwitch';

import './AnonymizedResultsTable.css';

type TableRowData = RowData & {
  key: number;
  lowCount: AnonymizedResultRow['lowCount'];
};

// Columns

function cellTrivialTooltip(displayValue: string) {
  return <Tooltip title={displayValue}>{displayValue}</Tooltip>;
}

function cellNullTooltip() {
  return (
    <Tooltip title="NULL">
      <i>NULL</i>
    </Tooltip>
  );
}

function cellTooltip(tooltip: string, displayValue: string) {
  return <Tooltip title={tooltip}>{displayValue}</Tooltip>;
}

function renderValue(v: Value) {
  // we must disable the default `ellipsis: {showTitle: true}` tooltip, so we're serving
  // a trivial Tooltip node everywhere
  if (v === null) {
    return cellNullTooltip();
  } else {
    return cellTrivialTooltip(v.toString());
  }
}

function buildRenderTooltipValue(valueToTooltip: TooltipFunction) {
  // see note on showTitle above
  return (v: Value) => {
    if (v === null) {
      return cellNullTooltip();
    } else {
      return cellTooltip(valueToTooltip(v), v.toString());
    }
  };
}

function renderLowCountValue(v: Value) {
  // see note on showTitle above
  return cellTrivialTooltip(v === null ? '-' : v.toString());
}

function renderRelativeNoiseValue(v: Value) {
  // see note on showTitle above
  return cellTrivialTooltip(v === null ? '-' : formatPercentage(v as number));
}

function makeColumnData(title: string, dataIndex: string, type: ColumnType, render: (v: Value) => React.ReactNode) {
  return {
    title,
    dataIndex,
    render,
    sorter: columnSorter(type, dataIndex),
    ellipsis: { showTitle: false },
  };
}

const AGG_COLUMN_TYPE = 'real';

const mapColumn = (mode: DisplayMode) => (column: AnonymizedResultColumn, i: number) => {
  if (column.type === 'aggregate') {
    switch (mode) {
      case 'anonymized':
        return [makeColumnData(column.name, i + '_anon', AGG_COLUMN_TYPE, renderValue)];
      case 'combined':
        return [
          makeColumnData(column.name + ' (anonymized)', i + '_anon', AGG_COLUMN_TYPE, renderLowCountValue),
          makeColumnData(column.name + ' (original)', i + '_real', AGG_COLUMN_TYPE, renderValue),
          makeColumnData('Distortion', i + '_diff', 'real', renderRelativeNoiseValue),
        ];
    }
  }

  if (column.type === 'integer' || column.type === 'real') {
    let renderTooltipValue = buildRenderTooltipValue(column.valueToTooltip);
    return [makeColumnData(column.name, i.toString(), column.type, renderTooltipValue)];
  } else {
    return [makeColumnData(column.name, i.toString(), column.type, renderValue)];
  }
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
      rowData[i + '_diff'] = relativeNoise(value);
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
