import { useEffect, useState } from 'react';
import { ComputedData, QueryResult, TableSchema } from '../types';
import { useAnonymizer } from './anonymizer';
import { inProgressState } from './utils';

export function useQuery(schema: TableSchema, selectedColumns: boolean[]): ComputedData<QueryResult> {
  const anonymizer = useAnonymizer();
  const [result, setResult] = useState<ComputedData<QueryResult>>(inProgressState);

  useEffect(() => {
    setResult(inProgressState);

    let canceled = false;

    const columns = schema.columns.filter((_column, i) => selectedColumns[i]);
    const task = anonymizer.anonymize(schema, columns);

    task.result
      .then((queryResult) => {
        if (!canceled) {
          setResult({ state: 'completed', value: queryResult });
        }
      })
      .catch((error) => {
        if (!canceled) {
          setResult({ state: 'failed', error: error.toString() });
        }
      });

    return () => {
      canceled = true;
      task.cancel();
    };
  }, [anonymizer, schema, selectedColumns]);

  return result;
}
