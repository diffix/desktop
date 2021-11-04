import { useEffect, useState } from 'react';
import { inProgressState, useAnonymizer } from '../shared';
import { ComputedData, TableSchema } from '../types';

export function useNullAid(schema: TableSchema, aidColumn: string): ComputedData<boolean> {
  const anonymizer = useAnonymizer();
  const [result, setResult] = useState<ComputedData<boolean>>(inProgressState);

  useEffect(() => {
    setResult(inProgressState);

    let canceled = false;

    const task = anonymizer.hasNullAid(schema, aidColumn);

    task.result
      .then((result) => {
        if (!canceled) {
          setResult({ state: 'completed', value: result });
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
  }, [anonymizer, schema, aidColumn]);

  return result;
}
