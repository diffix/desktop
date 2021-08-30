import React, { FunctionComponent, useEffect } from 'react';
import { Divider, message, Result, Space, Spin, Typography } from 'antd';

import { File, TableSchema } from '../types';
import { DataPreviewTable } from './DataPreviewTable';
import { useSchema } from './use-schema';

import './SchemaLoadStep.css';

const { Text, Title } = Typography;

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
            <Title level={3}>Successfully imported {schema.value.file.name}</Title>
            <div className="mb-1">
              <Text>Here is what the data looks like:</Text>
              {schema.value.rowsPreview.length === 1000 && (
                <Text type="secondary"> (only the first 1000 rows are shown)</Text>
              )}
            </div>
            <DataPreviewTable schema={schema.value} />
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
