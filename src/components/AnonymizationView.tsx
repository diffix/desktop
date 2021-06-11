import React, { FunctionComponent, useState } from 'react';
import type { TableSchema } from '../types';
import { useQueryResult } from '../state/hooks/queryResult';

export const AnonymizationView: FunctionComponent<{ schema: TableSchema}> = ({ schema }) => {
  // In this dummy implementation we are not yet using the setColumns
  const [columns] = useState([]);
  const computedResult = useQueryResult(schema, columns);

  switch (computedResult.state) {
    case 'in_progress':
      return <div>Computing result</div>;

    case 'failed':
      return <div>Failed to anonymize: {computedResult.error}</div>;

    case 'completed': {
      const { rows } = computedResult.value;
      return <div>Got {rows.length} rows</div>;
    }

    default:
      return <div>Initializing...</div>;
  }
};
