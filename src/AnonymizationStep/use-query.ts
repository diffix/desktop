import { useEffect, useState } from 'react';
import { inProgressState, useAnonymizer } from '../shared';
import {
  AnonymizationParams,
  AnonymizedQueryResult,
  BucketColumn,
  ComputedData,
  CountInput,
  TableSchema,
} from '../types';

export function useQuery(
  schema: TableSchema,
  aidColumn: string,
  bucketColumns: BucketColumn[],
  countInput: CountInput,
  anonParams: AnonymizationParams,
): ComputedData<AnonymizedQueryResult> {
  const anonymizer = useAnonymizer();
  const [result, setResult] = useState<ComputedData<AnonymizedQueryResult>>(inProgressState);

  useEffect(() => {
    setResult(inProgressState);

    let canceled = false;

    const task = anonymizer.anonymize(schema, aidColumn, bucketColumns, countInput, anonParams);

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
  }, [anonymizer, schema, aidColumn, bucketColumns, countInput, anonParams]);

  return result;
}
