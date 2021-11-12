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
  BucketColumn,
} from '../types';
import { DisplayModeSwitch } from './DisplayModeSwitch';

import './AnonymizedResultsTable.css';

type TableRowData = RowData & {
  key: number;
  lowCount: AnonymizedResultRow['lowCount'];
};

// Columns

function cellDefaultTooltip(displayValue: string) {
  return <Tooltip title={displayValue}>{displayValue}</Tooltip>;
}

function cellNullTooltip() {
  return (
    <Tooltip title="NULL">
      <i>NULL</i>
    </Tooltip>
  );
}

function cellNumericGeneralizedTooltip(binSize: number, v: number) {
  const displayValue = v.toString();
  const tooltip = `[${v}; ${v + binSize})`;
  return <Tooltip title={tooltip}>{displayValue}</Tooltip>;
}

function cellTooltip(bucketColumn: BucketColumn | undefined, v: number | boolean | string) {
  if (
    bucketColumn &&
    (bucketColumn.type === 'integer' || bucketColumn.type === 'real') &&
    bucketColumn.generalization &&
    bucketColumn.generalization.binSize
  ) {
    return cellNumericGeneralizedTooltip(bucketColumn.generalization.binSize, v as number);
  } else {
    return cellDefaultTooltip(v.toString());
  }
}

function renderValue(v: Value) {
  // with `ellipsis: { showTitle: false }` set for the column, we're disabling the default tooltip
  // so that the styling of tooltips is more consistent. This forces us to provide Tooltip in all cases
  // even if the tooltip shown is same as the cell value.
  if (v === null) {
    return cellNullTooltip();
  } else {
    return cellDefaultTooltip(v.toString());
  }
}

function buildRenderTooltipValue(column: AnonymizedResultColumn, bucketColumns: BucketColumn[]) {
  const bucketColumn = bucketColumns.find((c) => c.name === column.name);
  return (v: Value) => {
    // see note on `ellipsis` above
    if (v === null) {
      return cellNullTooltip();
    } else {
      return cellTooltip(bucketColumn, v);
    }
  };
}

function renderLowCountValue(v: Value) {
  // see note on `ellipsis` above
  return cellDefaultTooltip(v === null ? '-' : v.toString());
}

function renderRelativeNoiseValue(v: Value) {
  // see note on `ellipsis` above
  return cellDefaultTooltip(v === null ? '-' : formatPercentage(v as number));
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

const mapColumn = (mode: DisplayMode, bucketColumns: BucketColumn[]) => (column: AnonymizedResultColumn, i: number) => {
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

  return [makeColumnData(column.name, i.toString(), column.type, buildRenderTooltipValue(column, bucketColumns))];
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
  bucketColumns: BucketColumn[];
};

export const AnonymizedResultsTable: FunctionComponent<AnonymizedResultsTableProps> = ({
  loading,
  result,
  bucketColumns,
}) => {
  const [mode, setMode] = useState<DisplayMode>('anonymized');

  const columns = result.columns.flatMap(mapColumn(mode, bucketColumns));
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
