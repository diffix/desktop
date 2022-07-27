import { DownloadOutlined } from '@ant-design/icons';
import { Button, Descriptions, Divider, message, Result, Space, Spin, Typography } from 'antd';
import React, { FunctionComponent, useEffect, useState } from 'react';
import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { anonymizer, formatPercentage, useCachedData } from '../shared';
import {
  AnonymizationParams,
  AnonymizationSummary,
  AnonymizedQueryResult,
  BucketColumn,
  CountInput,
  TableSchema,
} from '../types';
import { AnonymizedResultsTable } from './AnonymizedResultsTable';
import { useQuery } from './use-query';

import './AnonymizationStep.css';

const { Text, Title } = Typography;

const MAX_ROWS = 1000;

type CommonProps = {
  schema: TableSchema;
  aidColumn: string;
  bucketColumns: BucketColumn[];
  countInput: CountInput;
  anonParams: AnonymizationParams;
  result: AnonymizedQueryResult;
  loading: boolean;
};

const emptySummary: AnonymizationSummary = {
  totalBuckets: 0,
  suppressedBuckets: 0,
  totalCount: 0,
  suppressedCount: 0,
  suppressedAnonCount: null,
  maxDistortion: 0,
  medianDistortion: 0,
};

const emptyQueryResult: AnonymizedQueryResult = { columns: [], rows: [], summary: emptySummary };

function summaryDescriptions(summary: AnonymizationSummary) {
  return (
    <Descriptions className="AnonymizationSummary-descriptions" layout="vertical" bordered column={{ sm: 2, md: 4 }}>
      <Descriptions.Item label="Suppressed Count">
        {`${summary.suppressedCount} of ${summary.totalCount} (${formatPercentage(
          summary.suppressedCount / summary.totalCount,
        )})`}
      </Descriptions.Item>
      <Descriptions.Item label="Suppressed Bins">
        {`${summary.suppressedBuckets} of ${summary.totalBuckets} (${formatPercentage(
          summary.suppressedBuckets / summary.totalBuckets,
        )})`}
      </Descriptions.Item>
      <Descriptions.Item label="Median Distortion">{formatPercentage(summary.medianDistortion)}</Descriptions.Item>
      <Descriptions.Item label="Maximum Distortion">{formatPercentage(summary.maxDistortion)}</Descriptions.Item>
    </Descriptions>
  );
}

function AnonymizationSummary({ result: { summary }, loading }: CommonProps) {
  return (
    <div className="AnonymizationSummary notebook-step">
      <NotebookNavAnchor step={NotebookNavStep.AnonymizationSummary} status={loading ? 'loading' : 'done'} />
      <Title level={3}>Anonymization summary</Title>
      {summary === emptySummary ? (
        <div className="text-center">
          <Space direction="vertical">
            <Spin size="large" />
            <Text type="secondary">Anonymizing data</Text>
          </Space>
        </div>
      ) : (
        <div className="AnonymizationSummary-spin-container">
          <Spin spinning={loading}>{summaryDescriptions(summary)}</Spin>
        </div>
      )}
    </div>
  );
}

async function exportResult(
  schema: TableSchema,
  aidColumn: string,
  bucketColumns: BucketColumn[],
  countInput: CountInput,
  anonParams: AnonymizationParams,
) {
  const defaultPath = schema.file.path.replace(/\.\w*$/, '') + '_anonymized.csv';
  const filePath = await window.selectExportFile(defaultPath);
  if (!filePath) return;

  message.loading({ content: `Exporting anonymized data to ${filePath}...`, key: filePath, duration: 0 });

  try {
    const exportTask = anonymizer.export(schema, aidColumn, bucketColumns, countInput, filePath, anonParams);
    await exportTask.result;

    message.success({ content: 'Anonymized data exported successfully!', key: filePath, duration: 10 });
  } catch (e) {
    console.error(e);
    message.error({ content: 'Anonymized data export failed!', key: filePath, duration: 10 });
  }
}

function AnonymizationResults({
  schema,
  aidColumn,
  bucketColumns,
  countInput,
  anonParams,
  result,
  loading,
}: CommonProps) {
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
        <AnonymizedResultsTable loading={loading} result={result} bucketColumns={bucketColumns} />
      </div>
      <Divider />
      <div className="AnonymizationExports notebook-step">
        <NotebookNavAnchor
          step={NotebookNavStep.CsvExport}
          status={loading ? 'inactive' : exported ? 'done' : 'active'}
        />
        <Button
          icon={<DownloadOutlined />}
          className="AnonymizationResults-export-button"
          type="primary"
          size="large"
          disabled={loading || !result.rows.length}
          onClick={() => {
            exportResult(schema, aidColumn, bucketColumns, countInput, anonParams);
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
  countInput: CountInput;
  anonParams: AnonymizationParams;
};

export const AnonymizationStep: FunctionComponent<AnonymizationStepProps> = ({
  bucketColumns,
  schema,
  aidColumn,
  countInput,
  anonParams,
}) => {
  const computedResult = useQuery(schema, aidColumn, bucketColumns, countInput, anonParams);
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
            countInput={countInput}
            anonParams={anonParams}
            result={cachedResult}
            loading={loading}
          />
          <Divider />
          <AnonymizationResults
            schema={schema}
            aidColumn={aidColumn}
            bucketColumns={bucketColumns}
            countInput={countInput}
            anonParams={anonParams}
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
