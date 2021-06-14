import { useEffect, useState } from 'react';
import { ComputedData, QueryResult, TableColumn, TableSchema } from '../types';
import { useAnonymizer } from './anonymizer';

export function useQuery(schema: TableSchema, columns: TableColumn[]): ComputedData<QueryResult> {
  const anonymizer = useAnonymizer();
  const [result, setResult] = useState<ComputedData<QueryResult>>({ state: 'not_initialized' });

  useEffect(() => {
    setResult({ state: 'in_progress' });

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
