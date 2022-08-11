import { Divider, message, Result, Space, Spin, Typography } from 'antd';
import React, { FunctionComponent, useEffect } from 'react';
import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { getT, useT } from '../shared';
import { File, TableSchema } from '../types';
import { DataPreviewTable } from './DataPreviewTable';
import { useSchema } from './use-schema';

const { Text, Title } = Typography;

export type SchemaLoadStepProps = {
  file: File;
  children: (data: SchemaLoadStepData) => React.ReactNode;
};

export type SchemaLoadStepData = {
  schema: TableSchema;
};

export const SchemaLoadStep: FunctionComponent<SchemaLoadStepProps> = ({ children, file }) => {
  const t = useT('SchemaLoadStep');
  const schema = useSchema(file);
  useEffect(() => {
    if (schema.state === 'completed') {
      const t = getT('SchemaLoadStep'); // Get a fresh version so hook won't complain.
      message.success(t('Loaded {{fileName}}', { fileName: schema.value.file.name }));
    }
  }, [schema]);

  switch (schema.state) {
    case 'completed':
      return (
        <>
          <div className="SchemaLoadStep notebook-step completed">
            <NotebookNavAnchor step={NotebookNavStep.DataPreview} status="done" />
            <Title level={3}>{t('Successfully imported {{fileName}}', { fileName: schema.value.file.name })}</Title>
            <div className="mb-1">
              <Text>{t('Here is what the data looks like:')}</Text>
              {schema.value.rowsPreview.length === 1000 && (
                <Text type="secondary"> {t('(only the first 1000 rows are shown)')}</Text>
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
          <NotebookNavAnchor step={NotebookNavStep.DataPreview} status="failed" />
          <Result
            status="error"
            title={t('Schema discovery failed')}
            subTitle={t('Something went wrong while loading the schema.')}
          />
        </div>
      );

    case 'in_progress':
      return (
        <div className="SchemaLoadStep notebook-step text-center">
          <NotebookNavAnchor step={NotebookNavStep.DataPreview} status="loading" />
          <Space direction="vertical">
            <Spin size="large" />
            <Text type="secondary">{t('Loading schema')}</Text>
          </Space>
        </div>
      );
  }
};
