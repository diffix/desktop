import React, { FunctionComponent, useState } from 'react';
import { Divider, List, Switch, Typography } from 'antd';

import { TableSchema } from '../types';

import './ColumnSelectionStep.css';

const { Title } = Typography;

function updateArray<T>(array: T[], index: number, value: T): T[] {
  if (array[index] === value) return array;
  const copy = array.slice();
  copy[index] = value;
  return copy;
}

export type ColumnSelectionStepProps = {
  schema: TableSchema;
  children: (data: ColumnSelectionStepData) => React.ReactNode;
};

export type ColumnSelectionStepData = {
  columns: boolean[];
};

export const ColumnSelectionStep: FunctionComponent<ColumnSelectionStepProps> = ({ children, schema }) => {
  const [columns, setColumns] = useState(() => Array(schema.columns.length).fill(false));

  return (
    <>
      <div className="ColumnSelectionStep notebook-step">
        <Title level={3}>Select columns for anonymization</Title>
        <List
          className="ColumnSelectionStep-list"
          dataSource={schema.columns}
          renderItem={(column, index) => (
            <List.Item
              actions={[
                <Switch
                  key="column-toggle"
                  checked={columns[index]}
                  onChange={(checked) => setColumns(updateArray(columns, index, checked))}
                />,
              ]}
            >
              {column.name}
            </List.Item>
          )}
        />
      </div>
      {/* Render next step */}
      <Divider />
      {children({ columns })}
    </>
  );
};
