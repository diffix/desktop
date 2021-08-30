import { useEffect, useState } from 'react';
import { inProgressState, useAnonymizer } from '../shared';
import { AnonymizedQueryResult, BucketColumn, ComputedData, TableSchema } from '../types';

export function useQuery(schema: TableSchema, bucketColumns: BucketColumn[]): ComputedData<AnonymizedQueryResult> {
  const anonymizer = useAnonymizer();
  const [result, setResult] = useState<ComputedData<AnonymizedQueryResult>>(inProgressState);

  useEffect(() => {
    setResult(inProgressState);

    let canceled = false;

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
  }, [anonymizer, schema, bucketColumns]);

  return result;
}
