import React, { FunctionComponent, useState } from 'react';
import { Button, Result } from 'antd';

import { ColumnSelector, QueryResultsTable } from '.';
import { useCachedData, useQuery } from '../state';
import { QueryResult, TableSchema } from '../types';

const emptyQueryResult: QueryResult = { columns: [], rows: [] };

export type AnonymizationViewProps = {
  schema: TableSchema;
  removeFile: () => void;
};

export const AnonymizationView: FunctionComponent<AnonymizationViewProps> = ({ schema, removeFile }) => {
  const [selectedColumns, setSelectedColumns] = useState(() => Array(schema.columns.length).fill(true));
  const computedResult = useQuery(schema, selectedColumns);
  const cachedResult = useCachedData(computedResult, emptyQueryResult);

  switch (computedResult.state) {
    case 'failed':
      return (
        <div className="AnonymizationView failed">
          <Result status="error" title="Anonymization failed" subTitle="Something went wrong." />
        </div>
      );

    default: {
      const loaded = computedResult.state === 'completed';
      return (
        <div className={`AnonymizationView ${loaded ? 'completed' : 'loading'}`}>
          <QueryResultsTable loading={!loaded} result={cachedResult} />
          <ColumnSelector schema={schema} selectedColumns={selectedColumns} onChange={setSelectedColumns} />
          <Button onClick={removeFile}>Choose another file</Button>
        </div>
      );
    }
  }
};
