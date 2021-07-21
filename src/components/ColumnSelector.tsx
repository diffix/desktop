import React, { FunctionComponent } from 'react';
import { List, Switch } from 'antd';

import { TableSchema } from '../types';

function updateArray<T>(array: T[], index: number, value: T): T[] {
  if (array[index] === value) return array;
  const copy = array.slice();
  copy[index] = value;
  return copy;
}

type ColumnSelectorProps = {
  schema: TableSchema;
  selectedColumns: boolean[];
  onChange: (newSelectedColumns: boolean[]) => void;
};

export const ColumnSelector: FunctionComponent<ColumnSelectorProps> = ({ schema, selectedColumns, onChange }) => {
  return (
    <div className="ColumnSelector">
      <List
        dataSource={schema.columns}
        renderItem={(column, index) => (
          <List.Item
            actions={[
              <Switch
                key="column-toggle"
                checked={selectedColumns[index]}
                onChange={(checked) => onChange(updateArray(selectedColumns, index, checked))}
              />,
            ]}
          >
            {column.name}
          </List.Item>
        )}
      ></List>
    </div>
  );
};
