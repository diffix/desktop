import { isEqual } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

export function useStaticValue<T>(factory: () => T): T {
  const [value] = useState(factory);
  return value;
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
