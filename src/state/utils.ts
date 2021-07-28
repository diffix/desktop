import { useEffect, useState } from 'react';
import { ColumnType, ComputedData, RowData, Task, Value } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const inProgressState: ComputedData<any> = { state: 'in_progress' };

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useCachedData<T>(resultData: ComputedData<T>, initialData: T): T {
  const [cached, setCached] = useState(resultData.state === 'completed' ? resultData.value : initialData);

  useEffect(() => {
    if (resultData.state === 'completed') {
      setCached(resultData.value);
    }
  }, [resultData]);

  return cached;
}

export function toTask<T>(func: () => Promise<T>): Task<T> {
  return {
    cancel() {
      /* no-op */
    },
    result: func(),
  };
}

function isNull(value: Value) {
  return value === '' || value === null;
}

export const columnSorter =
  (type: ColumnType, index: number) =>
  (rowA: RowData, rowB: RowData): number => {
    const a = rowA[index];
    const b = rowB[index];

    if (isNull(a) && isNull(b)) return 0;
    if (isNull(a)) return -1;
    if (isNull(b)) return 1;

    switch (type) {
      case 'boolean':
        return a === b ? 0 : a ? 1 : -1;
      case 'integer':
      case 'real':
        return (a as number) - (b as number);
      case 'string':
        return (a as string).localeCompare(b as string);
    }
  };
