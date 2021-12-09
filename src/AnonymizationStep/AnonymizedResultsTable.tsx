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

// Columns

type TableColumnData = {
  title: string;
  // must refer to a field in `TableRowData`
  dataIndex: 'anon' | 'real' | 'diff' | string;
  render: (v: Value) => React.ReactNode;
  sorter: (rowA: RowData, rowB: RowData) => number;
  ellipsis: { showTitle: boolean };
};

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
  dataIndex: string,
  type: ColumnType,
  render: (v: Value) => React.ReactNode,
): TableColumnData {
  return {
    title,
    dataIndex,
    render,
    sorter: columnSorter(type, dataIndex),
    ellipsis: { showTitle: false },
  };
}

const AGG_COLUMN_TYPE = 'real';

const mapColumn = (mode: DisplayMode, bucketColumns: BucketColumn[]) => (column: AnonymizedResultColumn) => {
  if (column.type === 'aggregate') {
    switch (mode) {
      case 'anonymized':
        return [makeColumnData(column.name, 'anon', AGG_COLUMN_TYPE, renderValue)];
      case 'combined':
        return [
          makeColumnData(column.name + ' (anonymized)', 'anon', AGG_COLUMN_TYPE, renderLowCountValue),
          makeColumnData(column.name + ' (original)', 'real', AGG_COLUMN_TYPE, renderValue),
          makeColumnData('Distortion', 'diff', 'real', renderRelativeNoiseValue),
        ];
    }
  }

  return [makeColumnData(column.name, column.name, column.type, buildCellRenderer(column, bucketColumns))];
};

// Rows

// Represents data shown in the table; contains values which are displayed along
// with some metadata used to style and render the row.
type TableRowData = RowData & {
  // RowData contains fields derived from bucket columns,
  // which are shown in the table along with:
  anon: number | null;
  real: number;
  diff: number | null;
  // Row metadata fields:
  key: number;
  lowCount: AnonymizedResultRow['lowCount'];
};

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
  const anon = row.diffixCount;
  const real = row.count;
  return {
    // displayed values
    ...row.bucketValues,
    anon: anon,
    real: real,
    diff: relativeNoise(anon, real),
    // row metadata
    key: i,
    lowCount: row.lowCount,
  };
}

function makeSuppressBinData(result: AnonymizedQueryResult, bucketColumns: BucketColumn[]) {
  if (result.summary.suppressedAnonCount) {
    const anon = result.summary.suppressedAnonCount;
    const real = result.summary.suppressedCount;
    const rowData: TableRowData = {
      // displayed values; bucket values are filled in with *'s below
      anon: anon,
      real: real,
      diff: relativeNoise(anon, real),
      // row metadata
      key: -1,
      lowCount: false,
    };

    bucketColumns.forEach((column: BucketColumn) => {
      rowData[column.name] = '*';
    });

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

  const suppressBinData: TableRowData[] = mode === 'anonymized' ? makeSuppressBinData(result, bucketColumns) : [];

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
