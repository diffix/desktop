import React, { useRef } from 'react';
import { Table, TableProps } from 'antd';
import useComponentSize from '@rehooks/component-size';

import './ResponsiveTable.css';

const AntTable = React.memo(Table) as unknown as typeof Table;

const MIN_COL_WIDTH = 150;
const MAX_COL_WIDTH = 300;

function isFixedLayout(width: number, columnCount: number) {
  if (isNaN(width)) return false;
  const minWidth = columnCount * MIN_COL_WIDTH;
  return width >= minWidth;
}

function maxWidth(columnCount: number) {
  return Math.max(2, columnCount) * MAX_COL_WIDTH;
}

function tableProps<T extends TableProps<unknown>>(props: T): T {
  return props;
}

const fixedLayoutProps = tableProps({ tableLayout: 'fixed' });
const scrollableLayoutProps = tableProps({ scroll: { x: true } });

type AnyRecord = Record<string, unknown>;

export type ResponsiveTableProps<T> = TableProps<T>;

export function ResponsiveTable<T extends AnyRecord = AnyRecord>(props: ResponsiveTableProps<T>): JSX.Element {
  const ref = useRef(null);
  const { width } = useComponentSize(ref);

  const columnCount = props.columns!.length;
  const fixed = isFixedLayout(width, columnCount);
  const layoutProps = fixed ? fixedLayoutProps : scrollableLayoutProps;

  return (
    <div className="ResponsiveTable" ref={ref}>
      <div style={{ maxWidth: maxWidth(columnCount) }}>
        <AntTable bordered {...props} {...layoutProps} />
      </div>
    </div>
  );
}
