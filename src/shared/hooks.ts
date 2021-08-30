import React, { useMemo, useRef } from 'react';
import { isEqual } from 'lodash';
import { ComputedData } from '../types';

export function useCachedData<T>(resultData: ComputedData<T>, initialData: T): T {
  const ref = useRef(initialData);

  if (resultData.state === 'completed') {
    ref.current = resultData.value;
  }

  return ref.current;
}

/** Similar to `useMemo`, but retains reference for deep-equal values. */
export function useMemoStable<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<T>();

  return useMemo(() => {
    const value = factory();
    if (isEqual(value, ref.current)) {
      return ref.current as T;
    }

    ref.current = value;
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
