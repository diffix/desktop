import React, { FunctionComponent, useEffect, useState } from 'react';
import { Button, Descriptions, Divider, Result, Typography } from 'antd';

import { AnonymizedResultsTable } from '.';
import { computeAnonymizationStats, useCachedData, useQuery } from '../state';
import { AnonymizationStats, AnonymizedQueryResult, TableSchema } from '../types';

import './AnonymizationStep.css';

const { Text, Title } = Typography;

const MAX_ROWS = 1000;

type CommonProps = { result: AnonymizedQueryResult; loading: boolean };

const emptyQueryResult: AnonymizedQueryResult = { columns: [], rows: [] };

function TextPlaceholder() {
  return <span className="TextPlaceholder" />;
}

function formatPercentage(value: number) {
  return `${Math.round(10 * 100 * value) / 10}%`;
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

function AnonymizationResults({ result, loading }: CommonProps) {
  return (
    <div className="AnonymizationResults notebook-step">
      <Title level={3}>Anonymized data</Title>
      <div className="mb-1">
        <Text>Here is what the result looks like:</Text>
        {result.rows.length === MAX_ROWS && <Text type="secondary"> (only the first {MAX_ROWS} rows are shown)</Text>}
      </div>
      <AnonymizedResultsTable loading={loading} result={result} />
      <Button
        className="AnonymizationResults-export-button"
        type="primary"
        size="large"
        disabled={loading || !result.rows.length}
      >
        Export to CSV
      </Button>
    </div>
  );
}

export type AnonymizationStepProps = {
  columns: boolean[];
  schema: TableSchema;
};

export const AnonymizationStep: FunctionComponent<AnonymizationStepProps> = ({ columns, schema }) => {
  const computedResult = useQuery(schema, columns);
  const cachedResult = useCachedData(computedResult, emptyQueryResult);

  switch (computedResult.state) {
    case 'in_progress':
    case 'completed': {
      const loading = computedResult.state !== 'completed';
      return (
        <>
          <AnonymizationSummary result={cachedResult} loading={loading} />
          <Divider />
          <AnonymizationResults result={cachedResult} loading={loading} />
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
