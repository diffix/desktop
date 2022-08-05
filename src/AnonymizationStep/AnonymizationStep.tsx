import { DownloadOutlined } from '@ant-design/icons';
import { Button, Descriptions, Divider, message, Result, Space, Spin, Typography } from 'antd';
import React, { FunctionComponent, useEffect, useState } from 'react';
import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { anonymizer, formatPercentage, TFunc, useCachedData, useT } from '../shared';
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

function summaryDescriptions(summary: AnonymizationSummary, t: TFunc) {
  return (
    <Descriptions className="AnonymizationSummary-descriptions" layout="vertical" bordered column={{ sm: 2, md: 4 }}>
      <Descriptions.Item label={t('Suppressed Count')}>
        {`${summary.suppressedCount} ${t('of')} ${summary.totalCount} (${formatPercentage(
          summary.suppressedCount / summary.totalCount,
        )})`}
      </Descriptions.Item>
      <Descriptions.Item label={t('Suppressed Bins')}>
        {`${summary.suppressedBuckets} ${t('of')} ${summary.totalBuckets} (${formatPercentage(
          summary.suppressedBuckets / summary.totalBuckets,
        )})`}
      </Descriptions.Item>
      <Descriptions.Item label={t('Median Distortion')}>{formatPercentage(summary.medianDistortion)}</Descriptions.Item>
      <Descriptions.Item label={t('Maximum Distortion')}>{formatPercentage(summary.maxDistortion)}</Descriptions.Item>
    </Descriptions>
  );
}

function AnonymizationSummary({ result: { summary }, loading }: CommonProps) {
  const t = useT('AnonymizationSummary');
  return (
    <div className="AnonymizationSummary notebook-step">
      <NotebookNavAnchor step={NotebookNavStep.AnonymizationSummary} status={loading ? 'loading' : 'done'} />
      <Title level={3}>{t('Anonymization summary')}</Title>
      {summary === emptySummary ? (
        <div className="text-center">
          <Space direction="vertical">
            <Spin size="large" />
            <Text type="secondary">{t('Anonymization summary')}</Text>
          </Space>
        </div>
      ) : (
        <div className="AnonymizationSummary-spin-container">
          <Spin spinning={loading}>{summaryDescriptions(summary, t)}</Spin>
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
  t: TFunc,
) {
  const defaultPath = schema.file.path.replace(/\.\w*$/, '') + t('_anonymized.csv');
  const filePath = await window.selectExportFile(defaultPath);
  if (!filePath) return;

  message.loading({
    content: t('Exporting anonymized data to {{filePath}}...', { filePath }),
    key: filePath,
    duration: 0,
  });

  try {
    const exportTask = anonymizer.export(schema, aidColumn, bucketColumns, countInput, filePath, anonParams);
    await exportTask.result;

    message.success({ content: t('Anonymized data exported successfully!'), key: filePath, duration: 10 });
  } catch (e) {
    console.error(e);
    message.error({ content: t('Anonymized data export failed!'), key: filePath, duration: 10 });
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
  const t = useT('AnonymizationResults');
  const [exported, setExported] = useState(false);
  useEffect(() => {
    setExported(false);
  }, [bucketColumns]);

  return (
    <>
      <div className="AnonymizationResults notebook-step">
        <NotebookNavAnchor step={NotebookNavStep.AnonymizedResults} status={loading ? 'loading' : 'done'} />
        <Title level={3}>{t('Anonymized data')}</Title>
        <div className="mb-1">
          <Text>{t('Here is what the result looks like:')}</Text>
          {result.rows.length === MAX_ROWS && (
            <Text type="secondary"> {t('(only the first {{rows}} rows are shown)', { rows: MAX_ROWS })}</Text>
          )}
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
            exportResult(schema, aidColumn, bucketColumns, countInput, anonParams, t);
            setExported(true);
          }}
        >
          {t('Export anonymized data to CSV')}
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
  const t = useT('AnonymizationStep');
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
          <Result status="error" title={t('Anonymization failed')} subTitle={t('Something went wrong.')} />
        </div>
      );
  }
};
