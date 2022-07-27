import { AnonymizedAggregate, ColumnType, ComputedData, RowData, RowDataIndex, Task, Value } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const inProgressState: ComputedData<any> = { state: 'in_progress' };

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function runTask<T>(func: (signal: AbortSignal) => Promise<T>): Task<T> {
  const controller = new AbortController();

  return {
    cancel() {
      controller.abort();
    },
    result: func(controller.signal),
  };
}

export function formatPercentage(value: number, precision = 2): string {
  const factor = 10 ** precision;
  return `${Math.round(factor * 100 * value) / factor}%`;
}

export function relativeNoise({ anonValue, realValue }: AnonymizedAggregate): number | null {
  if (anonValue === null) return null;
  return Math.abs(realValue - anonValue) / realValue;
}

function isNull(value: Value) {
  return value === '' || value === null;
}

function toBoolean(value: Value) {
  if (typeof value === 'string') value = value.toLowerCase();
  switch (value) {
    case '':
    case null:
      return null;
    case false:
    case 'false':
    case '0':
    case 0:
      return false;
    default:
      return true;
  }
}

export const columnSorter =
  (type: ColumnType, dataIndex: RowDataIndex) =>
  (rowA: RowData, rowB: RowData): number => {
    let a = rowA[dataIndex];
    let b = rowB[dataIndex];

    if (isNull(a) && isNull(b)) return 0;
    if (isNull(a)) return -1;
    if (isNull(b)) return 1;

    switch (type) {
      case 'boolean': {
        a = toBoolean(a);
        b = toBoolean(b);
        return a === b ? 0 : a ? 1 : -1;
      }
      case 'integer':
      case 'real':
        return (a as number) - (b as number);
      case 'text':
        return (a as string).localeCompare(b as string);
    }
  };
