import React, { useEffect, useMemo, useRef, useState } from 'react';
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

export function useStaticValue<T>(factory: () => T): T {
  const [value] = useState(factory);
  return value;
}

type MaybeUndefined<T> = { readonly [K in keyof T]: T[K] | undefined };

export function useEffectWithChanges<TDeps extends readonly unknown[]>(
  effect: (previousDeps: MaybeUndefined<TDeps>) => void | (() => void),
  deps: readonly [...TDeps],
): void {
  const previousDeps = useRef<readonly [...TDeps]>();
  useEffect(() => {
    const disposer = effect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      previousDeps.current ?? (deps.map(() => undefined) as any),
    );
    previousDeps.current = deps;
    return disposer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
