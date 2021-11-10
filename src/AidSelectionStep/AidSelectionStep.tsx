import React, { FunctionComponent, useState } from 'react';
import { Typography, Select, Divider, Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { TableSchema } from '../types';

import { useMissingAid } from './use-missing-aid';

import './AidSelectionStep.css';

const { Title } = Typography;
const { Option } = Select;

type MissingAidWarningProps = {
  schema: TableSchema;
  aidColumn: string;
};

const MissingAidWarning: FunctionComponent<MissingAidWarningProps> = ({ schema, aidColumn }) => {
  const computedResult = useMissingAid(schema, aidColumn);

  return computedResult.state === 'completed' && computedResult.value ? (
    <Alert
      className="MissingAidWarning"
      message={
        <>
          <strong>CAUTION:</strong>The protected entity identifier column contains missing values.
        </>
      }
      type="warning"
      showIcon
      icon={<InfoCircleOutlined />}
      closable
    />
  ) : null;
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
      <MissingAidWarning schema={schema} aidColumn={aidColumn} />
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
