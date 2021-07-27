import { useEffect, useState } from 'react';
import { AnonymizedQueryResult, ComputedData, TableSchema } from '../types';
import { useAnonymizer } from './anonymizer';
import { inProgressState } from './utils';

export function useQuery(schema: TableSchema, selectedColumns: boolean[]): ComputedData<AnonymizedQueryResult> {
  const anonymizer = useAnonymizer();
  const [result, setResult] = useState<ComputedData<AnonymizedQueryResult>>(inProgressState);

  useEffect(() => {
    setResult(inProgressState);

    let canceled = false;

    const bucketColumns = schema.columns.filter((_column, i) => selectedColumns[i]);
    const task = anonymizer.anonymize(schema, bucketColumns);

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
