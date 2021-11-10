import { useEffect, useState } from 'react';
import { inProgressState, useAnonymizer } from '../shared';
import { ComputedData, TableSchema } from '../types';

export function useMissingAid(schema: TableSchema, aidColumn: string): ComputedData<boolean> {
  const anonymizer = useAnonymizer();
  const [result, setResult] = useState<ComputedData<boolean>>({ state: 'completed', value: false });

  useEffect(() => {
    if (!aidColumn) {
      // For no AID we know immediately that there are no NULL values.
      setResult({ state: 'completed', value: false });
      return;
    } else {
      setResult(inProgressState);

      let canceled = false;

      const task = anonymizer.hasMissingAid(schema, aidColumn);

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
    }
  }, [anonymizer, schema, aidColumn]);

  return result;
}
