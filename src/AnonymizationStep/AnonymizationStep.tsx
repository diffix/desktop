import React, { FunctionComponent, useEffect, useState } from 'react';
import { Button, Descriptions, Divider, message, Result, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { anonymizer, formatPercentage, useCachedData } from '../shared';
import { AnonymizationSummary, AnonymizedQueryResult, BucketColumn, TableSchema } from '../types';
import { AnonymizedResultsTable } from './AnonymizedResultsTable';
import { useQuery } from './use-query';

import './AnonymizationStep.css';

const { Text, Title } = Typography;

const MAX_ROWS = 1000;

type CommonProps = {
  schema: TableSchema;
  aidColumn: string;
  bucketColumns: BucketColumn[];
  result: AnonymizedQueryResult;
  loading: boolean;
};

const emptySummary: AnonymizationSummary = {
  totalBuckets: 0,
  lowCountBuckets: 0,
  totalRows: 0,
  lowCountRows: 0,
  maxDistortion: 0,
  medianDistortion: 0,
};

const emptyQueryResult: AnonymizedQueryResult = { columns: [], rows: [], summary: emptySummary };

function TextPlaceholder() {
  return <span className="TextPlaceholder" />;
}

function AnonymizationSummary({ result: { summary }, loading }: CommonProps) {
  return (
    <div className="AnonymizationSummary loading notebook-step">
      <NotebookNavAnchor step={NotebookNavStep.AnonymizationSummary} status={loading ? 'loading' : 'done'} />
      <Title level={3}>Anonymization summary</Title>
      <Descriptions className="AnonymizationSummary-descriptions" layout="vertical" bordered column={{ sm: 2, md: 4 }}>
        <Descriptions.Item label="Suppressed Count">
          {!loading ? (
            `${summary.lowCountRows} of ${summary.totalRows} (${formatPercentage(
              summary.lowCountRows / summary.totalRows,
            )})`
          ) : (
            <TextPlaceholder />
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Suppressed Bins">
          {!loading ? (
            `${summary.lowCountBuckets} of ${summary.totalBuckets} (${formatPercentage(
              summary.lowCountBuckets / summary.totalBuckets,
            )})`
          ) : (
            <TextPlaceholder />
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Median Distortion">
          {!loading ? formatPercentage(summary.medianDistortion) : <TextPlaceholder />}
        </Descriptions.Item>
        <Descriptions.Item label="Maximum Distortion">
          {!loading ? formatPercentage(summary.maxDistortion) : <TextPlaceholder />}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
}

async function exportResult(schema: TableSchema, aidColumn: string, bucketColumns: BucketColumn[]) {
  const defaultPath = schema.file.path.replace(/\.\w*$/, '') + '_anonymized.csv';
  const filePath = await window.selectExportFile(defaultPath);
  if (!filePath) return;

  message.loading({ content: `Exporting anonymized data to ${filePath}...`, key: filePath, duration: 0 });

  try {
    const exportTask = anonymizer.export(schema, aidColumn, bucketColumns, filePath);
    await exportTask.result;

    message.success({ content: 'Anonymized data exported successfully!', key: filePath, duration: 10 });
  } catch (e) {
    console.error(e);
    message.error({ content: 'Anonymized data export failed!', key: filePath, duration: 10 });
  }
}

function AnonymizationResults({ schema, aidColumn, bucketColumns, result, loading }: CommonProps) {
  const [exported, setExported] = useState(false);
  useEffect(() => {
    setExported(false);
  }, [bucketColumns]);

  return (
    <>
      <div className="AnonymizationResults notebook-step">
        <NotebookNavAnchor step={NotebookNavStep.AnonymizedResults} status={loading ? 'loading' : 'done'} />
        <Title level={3}>Anonymized data</Title>
        <div className="mb-1">
          <Text>Here is what the result looks like:</Text>
          {result.rows.length === MAX_ROWS && <Text type="secondary"> (only the first {MAX_ROWS} rows are shown)</Text>}
        </div>
        <AnonymizedResultsTable loading={loading} result={result} />
        <NotebookNavAnchor
          step={NotebookNavStep.CsvExport}
          status={loading ? 'inactive' : exported ? 'done' : 'active'}
        />
      </div>
      <Divider />
      <div className="AnonymizationExports notebook-step">
        <Button
          icon={<DownloadOutlined />}
          className="AnonymizationResults-export-button"
          type="primary"
          size="large"
          disabled={loading || !result.rows.length}
          onClick={() => {
            exportResult(schema, aidColumn, bucketColumns);
            setExported(true);
          }}
        >
          Export anonymized data to CSV
        </Button>
        <div className="AnonymizationExport-reserved-space"></div>
      </div>
    </>
  );
}

export type AnonymizationStepProps = {
  bucketColumns: BucketColumn[];
  schema: TableSchema;
  aidColumn: string;
};

export const AnonymizationStep: FunctionComponent<AnonymizationStepProps> = ({ bucketColumns, schema, aidColumn }) => {
  const computedResult = useQuery(schema, aidColumn, bucketColumns);
  const cachedResult = useCachedData(computedResult, emptyQueryResult);

  switch (computedResult.state) {
    case 'in_progress':
    case 'completed': {
      const loading = computedResult.state !== 'completed';
      return (
        <>
          <AnonymizationSummary
            schema={schema}
            aidColumn={aidColumn}
            bucketColumns={bucketColumns}
            result={cachedResult}
            loading={loading}
          />
          <Divider />
          <AnonymizationResults
            schema={schema}
            aidColumn={aidColumn}
            bucketColumns={bucketColumns}
            result={cachedResult}
            loading={loading}
          />
        </>
      );
    }

    case 'failed':
      return (
        <div className="AnonymizationStep notebook-step failed">
          <NotebookNavAnchor step={NotebookNavStep.AnonymizationSummary} status="failed" />
          <NotebookNavAnchor step={NotebookNavStep.AnonymizedResults} status="failed" />
          <Result status="error" title="Anonymization failed" subTitle="Something went wrong." />
        </div>
      );
  }
};
