import { useEffect, useState } from 'react';
import { ComputedData, QueryResult, TableColumn, TableSchema } from '../types';
import { useAnonymizer } from './anonymizer';
import { inProgressState } from './utils';

export function useQuery(schema: TableSchema, columns: TableColumn[]): ComputedData<QueryResult> {
  const anonymizer = useAnonymizer();
  const [result, setResult] = useState<ComputedData<QueryResult>>(inProgressState);

  useEffect(() => {
    setResult(inProgressState);

    let canceled = false;
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
  }, [anonymizer, schema, columns]);

  return result;
}
