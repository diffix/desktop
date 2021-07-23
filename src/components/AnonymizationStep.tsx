import React, { FunctionComponent } from 'react';
import { Button, Result, Typography } from 'antd';

import { QueryResultsTable } from '.';
import { useCachedData, useQuery } from '../state';
import { QueryResult, TableSchema } from '../types';

import './AnonymizationStep.css';

const { Title } = Typography;

const emptyQueryResult: QueryResult = { columns: [], rows: [] };

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
      const loaded = computedResult.state === 'completed';
      return (
        <div className="AnonymizationStep notebook-step completed">
          <Title level={3}>Anonymized data</Title>
          <QueryResultsTable loading={!loaded} result={cachedResult} />
          <Button
            className="AnonymizationStep-export-button"
            type="primary"
            size="large"
            disabled={!loaded || !cachedResult.rows.length}
          >
            Export to CSV
          </Button>
        </div>
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
