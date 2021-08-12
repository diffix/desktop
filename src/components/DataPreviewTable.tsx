import React, { FunctionComponent } from 'react';

import { ResponsiveTable } from '.';
import { TableSchema, Value } from '../types';
import { columnSorter } from '../state';

export type DataPreviewTableProps = {
  schema: TableSchema;
};

export const DataPreviewTable: FunctionComponent<DataPreviewTableProps> = ({ schema }) => {
  const columns = schema.columns.map((col, i) => ({
    title: col.name,
    dataIndex: i.toString(),
    sorter: columnSorter(col.type, i),
    ellipsis: true,
  }));

  const rows = schema.rowsPreview.map((row, i) => ({
    key: i,
    ...(row as Record<number, Value>),
  }));

  return (
    <div className="DataPreviewTable">
      <ResponsiveTable columns={columns} dataSource={rows} />
    </div>
  );
};
