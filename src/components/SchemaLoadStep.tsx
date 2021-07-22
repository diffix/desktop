import React, { FunctionComponent, useEffect } from 'react';
import { Divider, message, Result, Space, Spin, Typography } from 'antd';

import { useSchema } from '../state';
import { File, TableSchema } from '../types';

import './SchemaLoadStep.css';

const { Text } = Typography;

export type SchemaLoadStepProps = {
  file: File;
  children: (data: SchemaLoadStepData) => React.ReactNode;
};

export type SchemaLoadStepData = {
  schema: TableSchema;
};

export const SchemaLoadStep: FunctionComponent<SchemaLoadStepProps> = ({ children, file }) => {
  const schema = useSchema(file);
  useEffect(() => {
    if (schema.state === 'completed') {
      message.success(`Loaded ${schema.value.file.name}`);
    }
  }, [schema]);

  switch (schema.state) {
    case 'completed':
      return (
        <>
          <div className="SchemaLoadStep notebook-step completed">
            <h2>{file.name}</h2>
          </div>
          {/* Render next step */}
          <Divider />
          {children({ schema: schema.value })}
        </>
      );

    case 'failed':
      return (
        <div className="SchemaLoadStep notebook-step failed">
          <Result
            status="error"
            title="Schema discovery failed"
            subTitle="Something went wrong while loading the schema."
          />
        </div>
      );

    case 'in_progress':
      return (
        <div className="SchemaLoadStep notebook-step loading">
          <Space direction="vertical">
            <Spin size="large" />
            <Text type="secondary">Loading schema</Text>
          </Space>
        </div>
      );
  }
};
