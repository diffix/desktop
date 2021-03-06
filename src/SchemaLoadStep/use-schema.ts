import { useEffect, useState } from 'react';
import { inProgressState, useAnonymizer } from '../shared';
import { ComputedData, File, TableSchema } from '../types';

export function useSchema(file: File): ComputedData<TableSchema> {
  const anonymizer = useAnonymizer();
  const [schema, setSchema] = useState<ComputedData<TableSchema>>(inProgressState);

  useEffect(() => {
    setSchema(inProgressState);

    let canceled = false;
    const task = anonymizer.loadSchema(file);

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
  }, [anonymizer, file]);

  return schema;
}
