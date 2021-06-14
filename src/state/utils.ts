import { useEffect, useState } from 'react';
import { ComputedData } from '../types';

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
