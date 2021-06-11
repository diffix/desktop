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
    // Simulate loading the schema...
    setSchema({ state: 'in_progress' });
    setSchema({ state: 'completed', value: dummyData(fileName) });
  }, [fileName]);

  return schema;
}
