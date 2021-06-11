import { useState, useEffect } from 'react';
import type { ComputedData, TableSchema } from '../../types';

function dummyData(fileName: string): TableSchema {
  return {
    fileName,
    columns: [
      { name: 'Name', type: 'string' },
      { name: 'Age', type: 'integer' },
    ],
  };
}

export function useSchema(fileName: string): ComputedData<TableSchema> {
  const [schema, setSchema] = useState<ComputedData<TableSchema>>({ state: 'not_initialized' });

  useEffect(() => {
    setSchema({ state: 'in_progress' });
    const id = setTimeout(() => {
      setSchema({ state: 'completed', value: dummyData(fileName) });
    }, 1000);
    return () => clearTimeout(id);
  }, [fileName]);

  return schema;
}
