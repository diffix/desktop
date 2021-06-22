import React, { FunctionComponent, useState } from 'react';
import { Button, Result } from 'antd';

import { QueryResultsTable } from '.';
import { useCachedData, useQuery } from '../state';
import { QueryResult, TableSchema } from '../types';

const emptyQueryResult: QueryResult = { columns: [], rows: [] };

export type AnonymizationViewProps = {
  schema: TableSchema;
  removeFile: () => void;
};

export const AnonymizationView: FunctionComponent<AnonymizationViewProps> = ({ schema, removeFile }) => {
  // In this dummy implementation we are not yet using the setColumns
  const [columns, setColumns] = useState(schema.columns);
  const computedResult = useQuery(schema, columns);
  const cachedResult = useCachedData(computedResult, emptyQueryResult);
  let resultState = computedResult.state;

  // Demo only
  const [isError, setError] = useState(false);
  if (isError) resultState = 'failed';
  const demoUtils = (
    <>
      <Button
        onClick={() => {
          setError(false);
          setColumns([]);
        }}
      >
        Simulate new query
      </Button>
      <Button onClick={() => setError(true)}>Simulate error</Button>
      <Button onClick={removeFile}>Remove file</Button>
    </>
  );

  switch (resultState) {
    case 'failed':
      return (
        <div className="AnonymizationView failed">
          <Result status="error" title="Anonymization failed" subTitle="Something went wrong." />
          {demoUtils}
        </div>
      );

    default: {
      const loaded = computedResult.state === 'completed';
      return (
        <div className={`AnonymizationView ${loaded ? 'completed' : 'loading'}`}>
          <QueryResultsTable loading={!loaded} result={cachedResult} />
          {demoUtils}
        </div>
      );
    }
  }
};
