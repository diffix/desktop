import { Radio, Tooltip } from 'antd';
import React, { FunctionComponent, useState } from 'react';
import { columnSorter, formatPercentage, relativeNoise, ResponsiveTable, TFunc, useT } from '../shared';
import {
  AnonymizedQueryResult,
  AnonymizedResultColumn,
  AnonymizedResultRow,
  AnonymizedValue,
  BucketColumn,
  ColumnType,
  DisplayMode,
  RowData,
  RowDataIndex,
  Value,
} from '../types';

import './AnonymizedResultsTable.css';

type TableRowData = RowData & {
  key: number;
  lowCount: AnonymizedResultRow['lowCount'];
  isStarBucketRow: boolean;
};

// Columns

// Ensures that star bucket row always comes first, regardless of sorting.
// It must be first in the `Table`'s dataSource
function anonymizedColumnSorter(type: ColumnType, dataIndex: RowDataIndex) {
  const commonSorter = columnSorter(type, dataIndex);
  return (rowA: TableRowData, rowB: TableRowData): number => {
    if (rowA.isStarBucketRow || rowB.isStarBucketRow) return 0;
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

function renderValue(v: Value) {
  if (v === null) {
    return nullCell();
  } else {
    return plainStringCell(v.toString());
  }
}

function renderBucketColumnValue(column: AnonymizedResultColumn, bucketColumns: BucketColumn[]) {
  const bucketColumn = bucketColumns.find((c) => c.name === column.name);
  return (v: Value, row: TableRowData) => {
    // see note on `ellipsis` above
    if (v === null) {
      return nullCell();
    } else {
      if (
        bucketColumn &&
        (bucketColumn.type === 'integer' || bucketColumn.type === 'real') &&
        bucketColumn.generalization &&
        !row.isStarBucketRow
      ) {
        return numericRangeCell(bucketColumn.generalization.binSize, v as number);
      } else {
        return plainStringCell(v.toString());
      }
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
  render: (v: Value, row: TableRowData) => React.ReactNode,
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
  (mode: DisplayMode, bucketColumns: BucketColumn[], t: TFunc) =>
  (column: AnonymizedResultColumn, columnIdx: number) => {
    if (column.type === 'aggregate') {
      switch (mode) {
        case 'anonymized':
          return [makeColumnData(column.name, `${columnIdx}_anon`, AGG_COLUMN_TYPE, renderValue)];
        case 'combined':
          return [
            makeColumnData(
              column.name + ' ' + t('(anonymized)'),
              `${columnIdx}_anon`,
              AGG_COLUMN_TYPE,
              renderLowCountValue,
            ),
            makeColumnData(column.name + ' ' + t('(original)'), `${columnIdx}_real`, AGG_COLUMN_TYPE, renderValue),
            makeColumnData(t('Distortion'), `${columnIdx}_diff`, AGG_COLUMN_TYPE, renderRelativeNoiseValue),
          ];
      }
    }

    return [makeColumnData(column.name, columnIdx, column.type, renderBucketColumnValue(column, bucketColumns))];
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
    isStarBucketRow: false,
  };

  addValuesToRowData(rowData, row.values);

  return rowData;
}

function makeStarBucketData(result: AnonymizedQueryResult, t: TFunc) {
  if (result.summary.suppressedAnonCount) {
    const rowData: TableRowData = {
      key: -1,
      // non-null `suppressedAnonCount` implies this
      lowCount: false,
      isStarBucketRow: true,
    };

    const values: AnonymizedValue[] = result.columns.map((column: AnonymizedResultColumn) =>
      // This TableRowData is for the star bucket, so all bucket columns hold
      // the star "*", while aggregate columns (counts) are coming from the summary
      column.type === 'aggregate' && column.name === 'Count'
        ? { realValue: result.summary.suppressedCount, anonValue: result.summary.suppressedAnonCount }
        : '*',
    );

    const firstStarInRowIdx = values.findIndex((v) => v === '*');
    if (firstStarInRowIdx > -1) values[firstStarInRowIdx] = `* (${t('Suppress bin')})`;

    addValuesToRowData(rowData, values);
    return [rowData];
  } else {
    // no suppression took place _OR_ the star bucket was itself suppressed
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
  const t = useT('AnonymizationResults::AnonymizedResultsTable');
  const [mode, setMode] = useState<DisplayMode>('anonymized');

  const columns = result.columns.flatMap(mapColumn(mode, bucketColumns, t));
  const queryData = filterRows(mode, result.rows).map(mapRow);

  const starBucketData: TableRowData[] = mode === 'anonymized' ? makeStarBucketData(result, t) : [];

  const data = starBucketData.concat(queryData);

  return (
    <div className={`AnonymizedResultsTable ${mode}`}>
      <ResponsiveTable
        key={loading ? 1 : 0 /* Resets internal state */}
        loading={loading}
        columns={columns}
        dataSource={data}
        rowClassName={rowClassName}
        footer={() => (
          <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
            <Radio.Button value="anonymized">{t('Anonymized')}</Radio.Button>
            <Radio.Button value="combined">{t('Combined view')}</Radio.Button>
          </Radio.Group>
        )}
      />
    </div>
  );
};
