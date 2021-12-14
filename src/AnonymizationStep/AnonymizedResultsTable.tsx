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
  AnonymizedValue,
  RowDataIndex,
} from '../types';
import { DisplayModeSwitch } from './DisplayModeSwitch';

import './AnonymizedResultsTable.css';

type TableRowData = RowData & {
  key: number;
  lowCount: AnonymizedResultRow['lowCount'];
  isSuppressBinRow: boolean;
};

// Columns

// Ensures that suppress bin row always comes first, regardless of sorting.
// It must be first in the `Table`'s dataSource
function anonymizedColumnSorter(type: ColumnType, dataIndex: RowDataIndex) {
  const commonSorter = columnSorter(type, dataIndex);
  return (rowA: TableRowData, rowB: TableRowData): number => {
    if (rowA.isSuppressBinRow || rowB.isSuppressBinRow) return 0;
    return commonSorter(rowA, rowB);
  };
}

// with `ellipsis: { showTitle: false }` set for the column, we're disabling the default tooltip
// so that the styling of tooltips is more consistent. This forces us to provide Tooltip in all cases
// even if the tooltip shown is same as the valueCell value.
function plainStringCell(displayValue: string) {
  return <Tooltip title={displayValue}>{displayValue}</Tooltip>;
}

function nullCell() {
  return (
    <Tooltip title="NULL">
      <i>NULL</i>
    </Tooltip>
  );
}

function numericRangeCell(binSize: number, v: number) {
  const tooltip = `[${v}; ${v + binSize})`;
  return <Tooltip title={tooltip}>{v}</Tooltip>;
}

function valueCell(bucketColumn: BucketColumn | undefined, v: number | boolean | string) {
  if (
    bucketColumn &&
    (bucketColumn.type === 'integer' || bucketColumn.type === 'real') &&
    bucketColumn.generalization
  ) {
    return numericRangeCell(bucketColumn.generalization.binSize, v as number);
  } else {
    return plainStringCell(v.toString());
  }
}

function renderValue(v: Value) {
  if (v === null) {
    return nullCell();
  } else {
    return plainStringCell(v.toString());
  }
}

function buildCellRenderer(column: AnonymizedResultColumn, bucketColumns: BucketColumn[]) {
  const bucketColumn = bucketColumns.find((c) => c.name === column.name);
  return (v: Value) => {
    // see note on `ellipsis` above
    if (v === null) {
      return nullCell();
    } else {
      return valueCell(bucketColumn, v);
    }
  };
}

function renderLowCountValue(v: Value) {
  // see note on `ellipsis` above
  return plainStringCell(v === null ? '-' : v.toString());
}

function renderRelativeNoiseValue(v: Value) {
  // see note on `ellipsis` above
  return plainStringCell(v === null ? '-' : formatPercentage(v as number));
}

function makeColumnData(
  title: string,
  dataIndex: RowDataIndex,
  type: ColumnType,
  render: (v: Value) => React.ReactNode,
) {
  return {
    title,
    dataIndex,
    render,
    sorter: anonymizedColumnSorter(type, dataIndex),
    ellipsis: { showTitle: false },
  };
}

const AGG_COLUMN_TYPE = 'real';

const mapColumn =
  (mode: DisplayMode, bucketColumns: BucketColumn[]) => (column: AnonymizedResultColumn, columnIdx: number) => {
    if (column.type === 'aggregate') {
      switch (mode) {
        case 'anonymized':
          return [makeColumnData(column.name, `${columnIdx}_anon`, AGG_COLUMN_TYPE, renderValue)];
        case 'combined':
          return [
            makeColumnData(column.name + ' (anonymized)', `${columnIdx}_anon`, AGG_COLUMN_TYPE, renderLowCountValue),
            makeColumnData(column.name + ' (original)', `${columnIdx}_real`, AGG_COLUMN_TYPE, renderValue),
            makeColumnData('Distortion', `${columnIdx}_diff`, AGG_COLUMN_TYPE, renderRelativeNoiseValue),
          ];
      }
    }

    return [makeColumnData(column.name, columnIdx, column.type, buildCellRenderer(column, bucketColumns))];
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

function addValuesToRowData(rowData: TableRowData, values: AnonymizedValue[]) {
  const { length } = values;
  for (let columnIdx = 0; columnIdx < length; columnIdx++) {
    const value = values[columnIdx];
    if (value && typeof value === 'object') {
      // if `value` is an object, must be of type `AnonymizedAggregate`
      rowData[`${columnIdx}_anon`] = value.anonValue;
      rowData[`${columnIdx}_real`] = value.realValue;
      rowData[`${columnIdx}_diff`] = relativeNoise(value);
    } else {
      rowData[columnIdx] = value;
    }
  }
}

function mapRow(row: AnonymizedResultRow, i: number) {
  const rowData: TableRowData = {
    key: i,
    lowCount: row.lowCount,
    isSuppressBinRow: false,
  };

  addValuesToRowData(rowData, row.values);

  return rowData;
}

function makeSuppressBinData(result: AnonymizedQueryResult) {
  if (result.summary.suppressedAnonCount) {
    const rowData: TableRowData = {
      key: -1,
      // non-null `suppressedAnonCount` implies this
      lowCount: false,
      isSuppressBinRow: true,
    };

    const values: AnonymizedValue[] = result.columns.map((column: AnonymizedResultColumn) =>
      // This TableRowData is for the suppress bin, so all bucket columns hold
      // the star "*", while aggregate columns (counts) are coming from the summary
      column.type === 'aggregate'
        ? { realValue: result.summary.suppressedCount, anonValue: result.summary.suppressedAnonCount }
        : '*',
    );

    const firstStarInRowIdx = values.findIndex((v) => v === '*');
    if (firstStarInRowIdx > -1) values[firstStarInRowIdx] = '* (Suppress bin)';

    addValuesToRowData(rowData, values);
    return [rowData];
  } else {
    // no suppression took place _OR_ the suppress bin was itself suppressed by the
    // low count filter
    return [];
  }
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
  const queryData = filterRows(mode, result.rows).map(mapRow);

  const suppressBinData: TableRowData[] = mode === 'anonymized' ? makeSuppressBinData(result) : [];

  const data = suppressBinData.concat(queryData);

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
