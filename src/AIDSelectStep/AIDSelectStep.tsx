import React, { FunctionComponent, useState } from 'react';
import { Divider, Typography, Select, Space } from 'antd';
import { WarningTwoTone } from '@ant-design/icons';

import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { TableSchema } from '../types';

import './AIDSelectStep.css';

const { Title, Text } = Typography;
const { Option } = Select;

type AIDSelectProps = {
  schema: TableSchema;
  children: (data: AIDSelectStepData) => React.ReactNode;
};

export type AIDSelectStepData = {
  aidColumn: string;
};

export const AIDSelectStep: FunctionComponent<AIDSelectProps> = ({ schema, children }) => {
  const [aidColumn, setAidColumn] = useState('');
  return (
    <>
      <div className="AIDSelectStep notebook-step">
        <NotebookNavAnchor step={NotebookNavStep.AIDSelect} status={aidColumn ? 'done' : 'active'} />
        <Title level={3}>Select the entity identifier column</Title>
        <div className="mb-1">
          <Select
            className="AIDSelectStep-select"
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
          <Space size={2}>
            <WarningTwoTone twoToneColor="orange" />
            <Text type="warning" strong>
              CAUTION: When no identifier column is present in the data, you must ensure that each individual row from
              the input file represents a unique entity.
            </Text>
          </Space>
        )}
      </div>
      <div className="AIDSelectStep-reserved-space">
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
