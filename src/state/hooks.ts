import { useRef } from 'react';
import { ComputedData } from '../types';

export function useCachedData<T>(resultData: ComputedData<T>, initialData: T): T {
  const ref = useRef(initialData);

  if (resultData.state === 'completed') {
    ref.current = resultData.value;
  }

  return ref.current;
}
