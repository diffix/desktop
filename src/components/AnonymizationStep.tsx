import React, { FunctionComponent } from 'react';
import { Button, Result, Typography } from 'antd';

import { AnonymizedResultsTable } from '.';
import { useCachedData, useQuery } from '../state';
import { AnonymizedQueryResult, TableSchema } from '../types';

import './AnonymizationStep.css';

const { Text, Title } = Typography;

const emptyQueryResult: AnonymizedQueryResult = { columns: [], rows: [] };

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
          <Text>Here is what the result looks like:</Text>
          { cachedResult.rows.length === 1000 && (
            <Text><small> (only the first 1000 rows are shown)</small></Text>
          )}
          <AnonymizedResultsTable loading={!loaded} result={cachedResult} />
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
