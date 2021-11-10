import React, { FunctionComponent, useState } from 'react';
import { Typography, Select, Divider, Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { TableSchema } from '../types';

import { useNullAid } from './use-null-aid';

import './AidSelectionStep.css';

const { Title } = Typography;
const { Option } = Select;

type NullsInAidWarningProps = {
  schema: TableSchema;
  aidColumn: string;
};

const NullsInAidWarning: FunctionComponent<NullsInAidWarningProps> = ({ schema, aidColumn }) => {
  const computedResult = useNullAid(schema, aidColumn);

  switch (computedResult.state) {
    case 'completed': {
      return computedResult.value ? (
        <Alert
          className="ColumnSelectionStep-notice"
          message={
            <>
              <strong>CAUTION:</strong>The protected entity identifier column contains NULL or empty values.
            </>
          }
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
          closable
        />
      ) : null;
    }

    case 'in_progress':
    case 'failed':
      return null;
  }
};

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
        <Title level={3}>Select the protected entity identifier column</Title>
        <Alert
          className="AidSelectionStep-notice"
          message={
            <>
              <strong>CAUTION:</strong> When no identifier column is present in the data, you must ensure that each
              individual row from the input file represents a unique entity.
            </>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          closable
        />
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
      <NullsInAidWarning schema={schema} aidColumn={aidColumn} />
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
