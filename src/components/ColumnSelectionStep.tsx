import React, { FunctionComponent, useState } from 'react';
import { Divider, List, Switch, Typography } from 'antd';

import { BucketColumn, TableSchema } from '../types';

import './ColumnSelectionStep.css';

const { Title } = Typography;

function updateArray<T>(array: T[], index: number, value: T): T[] {
  if (array[index] === value) return array;
  const copy = array.slice();
  copy[index] = value;
  return copy;
}

function isTrue(x: boolean) {
  return x;
}

export type ColumnSelectionStepProps = {
  schema: TableSchema;
  children: (data: ColumnSelectionStepData) => React.ReactNode;
};

export type ColumnSelectionStepData = {
  bucketColumns: BucketColumn[];
};

export const ColumnSelectionStep: FunctionComponent<ColumnSelectionStepProps> = ({ children, schema }) => {
  const [selectedColumns, setSelectedColumns] = useState(() => Array(schema.columns.length).fill(false));

  return (
    <>
      <div className="ColumnSelectionStep notebook-step">
        <Title level={3}>Select columns for anonymization</Title>
        <List
          className="ColumnSelectionStep-list"
          size="small"
          bordered
          dataSource={schema.columns}
          renderItem={(column, index) => (
            <List.Item
              actions={[
                <Switch
                  key="column-toggle"
                  size="small"
                  checked={selectedColumns[index]}
                  onChange={(checked) => setSelectedColumns(updateArray(selectedColumns, index, checked))}
                />,
              ]}
            >
              {column.name}
            </List.Item>
          )}
        />
      </div>
      <div className="ColumnSelectionStep-reserved-space">
        {/* Render next step */}
        {selectedColumns.some(isTrue) && (
          <>
            <Divider />
            {children({ bucketColumns: [] })}
          </>
        )}
      </div>
    </>
  );
};
