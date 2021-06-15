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
    anonymizer
      .loadSchema(fileName)
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
      // Todo: the anonymizer needs to return a cancellable handle in order to terminate child processes / other resources.
      canceled = true;
    };
  }, [anonymizer, fileName]);

  return schema;
}
