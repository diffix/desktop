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
    anonymizer
      .anonymize(schema, columns)
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
      // Todo: the anonymizer needs to return a cancellable handle in order to terminate child processes / other resources.
      canceled = true;
    };
  }, [anonymizer, schema, columns]);

  return result;
}
