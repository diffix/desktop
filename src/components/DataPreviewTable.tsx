import React, { FunctionComponent } from 'react';
import { Table } from 'antd';

import { TableSchema } from '../types';
import { columnSorter } from '../state';

export type DataPreviewTableProps = {
  schema: TableSchema;
};

export const DataPreviewTable: FunctionComponent<DataPreviewTableProps> = ({ schema }) => {
  const columns = schema.columns.map((col, i) => ({
    title: col.name,
    dataIndex: i.toString(),
    sorter: columnSorter(col.type, i),
  }));

  const rows = schema.rowsPreview.map((row, i) => ({
    key: i,
    ...row,
  }));

  return (
    <div className="DataPreviewTable">
      <Table bordered columns={columns} dataSource={rows} />
    </div>
  );
};
