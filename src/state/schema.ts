import { useEffect, useState } from 'react';
import { ComputedData, TableSchema } from '../types';
import { useAnonymizer } from './anonymizer';
import { inProgressState } from './utils';

export function useSchema(fileName: string): ComputedData<TableSchema> {
  const anonymizer = useAnonymizer();
  const [schema, setSchema] = useState<ComputedData<TableSchema>>(inProgressState);

  useEffect(() => {
    setSchema(inProgressState);

    let canceled = false;
    const task = anonymizer.loadSchema(fileName);

    task.result
      .then((schema) => {
        if (!canceled) {
          setSchema({ state: 'completed', value: schema });
        }
      })
      .catch((error) => {
        if (!canceled) {
          setSchema({ state: 'failed', error: error.toString() });
        }
      });

    return () => {
      canceled = true;
      task.cancel();
    };
  }, [anonymizer, fileName]);

  return schema;
}
