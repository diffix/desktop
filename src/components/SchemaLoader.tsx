import React, { FunctionComponent, useEffect } from 'react';
import { Button, message, Result, Space, Spin, Typography } from 'antd';

import { useSchema } from '../state';
import { File, TableSchema } from '../types';

import './SchemaLoader.css';

const { Text } = Typography;

export type SchemaLoaderProps = {
  file: File;
  removeFile: () => void;
  children: (schema: TableSchema) => React.ReactNode;
};

export const SchemaLoader: FunctionComponent<SchemaLoaderProps> = ({ children, file, removeFile }) => {
  const schema = useSchema(file.path);
  useEffect(() => {
    if (schema.state === 'completed') {
      message.success(`Loaded ${file.name}`);
    }
  }, [schema.state, file.name]);

  switch (schema.state) {
    case 'completed':
      return <div className="SchemaLoader completed">{children(schema.value)}</div>;

    case 'failed':
      return (
        <div className="SchemaLoader failed">
          <Result
            status="error"
            title="Schema discovery failed"
            subTitle="Something went wrong while loading the schema."
            extra={
              <Button type="primary" onClick={removeFile}>
                Choose another file
              </Button>
            }
          />
        </div>
      );

    case 'in_progress':
      return (
        <div className="SchemaLoader loading">
          <Space direction="vertical">
            <Spin size="large" />
            <Text type="secondary">Loading schema</Text>
            <Button type="ghost" onClick={removeFile}>
              Cancel
            </Button>
          </Space>
        </div>
      );
  }
};
