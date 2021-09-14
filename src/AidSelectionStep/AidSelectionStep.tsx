import React, { FunctionComponent, useState } from 'react';
import { Divider, Typography, Select, Space } from 'antd';
import { WarningTwoTone } from '@ant-design/icons';

import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { TableSchema } from '../types';

import './AidSelectionStep.css';

const { Title, Text } = Typography;
const { Option } = Select;

type AidSelectionProps = {
  schema: TableSchema;
  children: (data: AidSelectionStepData) => React.ReactNode;
};

export type AidSelectionStepData = {
  aidColumn: string;
};

export const AidSelectionStep: FunctionComponent<AidSelectionProps> = ({ schema, children }) => {
  const [aidColumn, setAidColumn] = useState('');
  return (
    <>
      <div className="AidSelectionStep notebook-step">
        <NotebookNavAnchor step={NotebookNavStep.AidSelection} status={aidColumn ? 'done' : 'active'} />
        <Title level={3}>Select the entity identifier column</Title>
        <div className="mb-1">
          <Select
            className="AidSelectionStep-select"
            showSearch
            placeholder="Select a column or 'None'"
            optionFilterProp="children"
            onChange={(column: string) => setAidColumn(column)}
            filterOption={true}
          >
            <Option key={-1} value="RowIndex">
              [None]
            </Option>
            {schema.columns.map((column, index) => (
              <Option key={index} value={column.name}>
                {column.name}
              </Option>
            ))}
          </Select>
        </div>
        {aidColumn == 'RowIndex' && (
          <Space>
            <WarningTwoTone twoToneColor="orange" />
            <Text type="warning" strong>
              CAUTION:
            </Text>
            <Text>
              When no identifier column is present in the data, you must ensure that each individual row from the input
              file represents a unique entity.
            </Text>
          </Space>
        )}
      </div>
      <div className="AidSelectionStep-reserved-space">
        {/* Render next step */}
        {aidColumn && (
          <>
            <Divider />
            {children({ aidColumn })}
          </>
        )}
      </div>
    </>
  );
};
