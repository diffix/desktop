import React, { FunctionComponent, useEffect, useState } from 'react';
import { Button, Descriptions, Divider, message, Result, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

import { AnonymizedResultsTable } from '.';
import { computeAnonymizationStats, useCachedData, useQuery, anonymizer, formatPercentage } from '../state';
import { AnonymizationStats, AnonymizedQueryResult, BucketColumn, TableSchema } from '../types';

import './AnonymizationStep.css';

const { Text, Title } = Typography;

const MAX_ROWS = 1000;

type CommonProps = {
  schema: TableSchema;
  bucketColumns: BucketColumn[];
  result: AnonymizedQueryResult;
  loading: boolean;
};

const emptyQueryResult: AnonymizedQueryResult = { columns: [], rows: [] };

function TextPlaceholder() {
  return <span className="TextPlaceholder" />;
}

function AnonymizationSummary({ result, loading }: CommonProps) {
  const [stats, setStats] = useState<AnonymizationStats | null>(null);
  useEffect(() => {
    setStats(computeAnonymizationStats(result));
  }, [result]);

  return (
    <div className="AnonymizationSummary loading notebook-step">
      <Title level={3}>Anonymization summary</Title>
      {result.rows.length === MAX_ROWS && (
        <div className="mb-1">
          <Text type="secondary">Values are estimated based on the first {MAX_ROWS} rows.</Text>
        </div>
      )}
      <Descriptions
        className="AnonymizationSummary-descriptions"
        layout="vertical"
        bordered
        column={{ xs: 1, sm: 2, md: 3 }}
      >
        <Descriptions.Item label="Row suppression">
          {!loading && stats ? formatPercentage(stats.bucketSuppression) : <TextPlaceholder />}
        </Descriptions.Item>
        <Descriptions.Item label="Average distortion">
          {!loading && stats ? formatPercentage(stats.averageDistortion) : <TextPlaceholder />}
        </Descriptions.Item>
        <Descriptions.Item label="Maximum distortion">
          {!loading && stats ? formatPercentage(stats.maximumDistortion) : <TextPlaceholder />}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
}

async function exportResult(schema: TableSchema, bucketColumns: BucketColumn[]) {
  const filePath = await window.selectExportFile();
  if (!filePath) return;

  message.loading({ content: `Exporting anonymized data to ${filePath}...`, key: filePath, duration: 0 });

  try {
    const exportTask = anonymizer.export(schema, bucketColumns, filePath);
    await exportTask.result;

    message.success({ content: 'Anonymized data exported successfully!', key: filePath, duration: 10 });
  } catch (e) {
    console.log(e);
    message.error({ content: 'Anonymized data export failed!', key: filePath, duration: 10 });
  }
}

function AnonymizationResults({ schema, bucketColumns, result, loading }: CommonProps) {
  return (
    <div className="AnonymizationResults notebook-step">
      <Title level={3}>Anonymized data</Title>
      <div className="mb-1">
        <Text>Here is what the result looks like:</Text>
        {result.rows.length === MAX_ROWS && <Text type="secondary"> (only the first {MAX_ROWS} rows are shown)</Text>}
      </div>
      <AnonymizedResultsTable loading={loading} result={result} />
      <Button
        icon={<DownloadOutlined />}
        className="AnonymizationResults-export-button"
        type="primary"
        size="large"
        disabled={loading || !result.rows.length}
        onClick={() => exportResult(schema, bucketColumns)}
      >
        Export anonymized data to CSV
      </Button>
    </div>
  );
}

export type AnonymizationStepProps = {
  bucketColumns: BucketColumn[];
  schema: TableSchema;
};

export const AnonymizationStep: FunctionComponent<AnonymizationStepProps> = ({ bucketColumns, schema }) => {
  const computedResult = useQuery(schema, bucketColumns);
  const cachedResult = useCachedData(computedResult, emptyQueryResult);

  switch (computedResult.state) {
    case 'in_progress':
    case 'completed': {
      const loading = computedResult.state !== 'completed';
      return (
        <>
          <AnonymizationSummary schema={schema} bucketColumns={bucketColumns} result={cachedResult} loading={loading} />
          <Divider />
          <AnonymizationResults schema={schema} bucketColumns={bucketColumns} result={cachedResult} loading={loading} />
        </>
      );
    }

    case 'failed':
      return (
        <div className="AnonymizationStep notebook-step failed">
          <Result status="error" title="Anonymization failed" subTitle="Something went wrong." />
        </div>
      );
  }
};
