import React, { FunctionComponent } from 'react';
import { Form, Button, Divider, InputNumber, Switch, Typography } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { useImmer } from 'use-immer';
import { assign } from 'lodash';

import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { useMemoStable } from '../shared';
import { BucketColumn, ColumnType, NumericGeneralization, StringGeneralization, TableSchema } from '../types';

import './ColumnSelectionStep.css';

const { Title } = Typography;

export type ColumnSelectionStepProps = {
  schema: TableSchema;
  children: (data: ColumnSelectionStepData) => React.ReactNode;
};

export type ColumnSelectionStepData = {
  bucketColumns: BucketColumn[];
};

type ColumnState = {
  name: string;
  type: ColumnType;
  selected: boolean;
  binSize: number | null;
  substringStart: number | null;
  substringLength: number | null;
  // Hack to clear input numbers on reset click
  resetCount: number;
};

function getNumericGeneralization({ binSize }: ColumnState): NumericGeneralization | null {
  if (typeof binSize !== 'number') return null;
  return { binSize };
}

function getStringGeneralization({ substringStart, substringLength }: ColumnState): StringGeneralization | null {
  if (typeof substringLength !== 'number') return null;
  return { substringStart: substringStart || 0, substringLength };
}

function anyNonNull(...values: unknown[]) {
  return values.some((v) => v !== null);
}

function GeneralizationControls({
  column,
  updateColumn,
}: {
  column: ColumnState;
  updateColumn: (values: Partial<ColumnState>) => void;
}) {
  switch (column.type) {
    case 'integer':
    case 'real': {
      const isActive = column.binSize !== null;
      return (
        <Form className={'GeneralizationControls' + (isActive ? ' active' : '')} layout="inline">
          <Form.Item label="Bin size" name="binSize">
            <span key={column.resetCount}>
              <InputNumber
                size="small"
                min={1}
                value={column.binSize as number}
                onChange={(binSize) => updateColumn({ binSize })}
              />
            </span>
          </Form.Item>
        </Form>
      );
    }
    case 'text': {
      const isActive = column.substringLength !== null;
      return (
        <Form className={'GeneralizationControls' + (isActive ? ' active' : '')} layout="inline">
          <Form.Item label="Substring start" name="substringStart">
            <span key={column.resetCount}>
              <InputNumber
                size="small"
                min={0}
                value={column.substringStart as number}
                onChange={(substringStart) => updateColumn({ substringStart })}
              />
            </span>
          </Form.Item>
          <Form.Item label="Substring length" name="substringLength">
            <span key={column.resetCount}>
              <InputNumber
                size="small"
                min={1}
                value={column.substringLength as number}
                onChange={(substringLength) => updateColumn({ substringLength })}
              />
            </span>
          </Form.Item>
        </Form>
      );
    }
    default:
      return null;
  }
}

export const ColumnSelectionStep: FunctionComponent<ColumnSelectionStepProps> = ({ children, schema }) => {
  const [columns, setColumns] = useImmer<ColumnState[]>(() =>
    schema.columns.map(({ name, type }) => ({
      name,
      type,
      selected: false,
      binSize: null,
      substringStart: null,
      substringLength: null,
      resetCount: 0,
    })),
  );

  const bucketColumns = useMemoStable<BucketColumn[]>(
    () =>
      columns
        .filter((c) => c.selected)
        .map((c) => {
          const { name, type } = c;
          switch (type) {
            case 'integer':
            case 'real':
              return { name, type, generalization: getNumericGeneralization(c) };
            case 'text':
              return { name, type, generalization: getStringGeneralization(c) };
            case 'boolean':
              return { name, type };
          }
        }),
    [columns],
  );

  const anySelected = columns.some((c) => c.selected);

  return (
    <>
      <div className="ColumnSelectionStep notebook-step">
        <NotebookNavAnchor step={NotebookNavStep.ColumnSelection} status={anySelected ? 'done' : 'active'} />
        <Title level={3}>Select columns for anonymization</Title>
        <table className="ColumnSelectionStep-table">
          <thead>
            <tr>
              <th className="ColumnSelectionStep-th-name">Column</th>
              <th className="ColumnSelectionStep-th-switch">Selected</th>
              <th className="ColumnSelectionStep-th-generalization">{anySelected && 'Generalization'}</th>
              <th className="ColumnSelectionStep-th-clear-generalization" />
            </tr>
          </thead>
          <tbody>
            {columns.map((column, index) => {
              const updateColumn = (values: Partial<ColumnState>) =>
                setColumns((draft) => void assign(draft[index], values));

              return (
                <tr key={index}>
                  <td className="ColumnSelectionStep-td-name" title={`Type: ${column.type}`}>
                    {column.name}
                  </td>
                  <td className="ColumnSelectionStep-td-switch">
                    <Switch
                      size="small"
                      checked={column.selected}
                      onChange={(selected) => updateColumn({ selected })}
                    />
                  </td>
                  <td className="ColumnSelectionStep-td-generalization">
                    {column.selected && <GeneralizationControls column={column} updateColumn={updateColumn} />}
                  </td>
                  <td className="ColumnSelectionStep-td-clear-generalization">
                    {column.selected && anyNonNull(column.binSize, column.substringStart, column.substringLength) && (
                      <Button
                        type="text"
                        shape="circle"
                        icon={<CloseCircleOutlined />}
                        title="Clear values"
                        onClick={() => {
                          updateColumn({
                            binSize: null,
                            substringStart: null,
                            substringLength: null,
                            resetCount: column.resetCount + 1,
                          });
                        }}
                      ></Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ColumnSelectionStep-reserved-space">
        {/* Render next step */}
        {bucketColumns.length !== 0 && (
          <>
            <Divider />
            {children({ bucketColumns })}
          </>
        )}
      </div>
    </>
  );
};
