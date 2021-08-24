import React, { FunctionComponent, useState } from 'react';
import { Form, Button, Divider, InputNumber, Switch, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useImmer } from 'use-immer';
import { assign } from 'lodash';

import { useMemoStable } from '../state';
import { BucketColumn, NumericGeneralization, StringGeneralization, TableColumn, TableSchema } from '../types';

import './ColumnSelectionStep.css';

const { Title, Text } = Typography;

export type ColumnSelectionStepProps = {
  schema: TableSchema;
  children: (data: ColumnSelectionStepData) => React.ReactNode;
};

export type ColumnSelectionStepData = {
  bucketColumns: BucketColumn[];
};

type ColumnState = {
  tableColumn: TableColumn;
  selected: boolean;
  binSize: number | null;
  substringStart: number | null;
  substringLength: number | null;
};

function getNumericGeneralization({ binSize }: ColumnState): NumericGeneralization | null {
  if (typeof binSize !== 'number') return null;
  return { binSize };
}

function getStringGeneralization({ substringStart, substringLength }: ColumnState): StringGeneralization | null {
  if (typeof substringLength !== 'number') return null;
  return { substringStart: substringStart || 0, substringLength };
}

function greyedText(text: string, greyed: boolean) {
  if (greyed) {
    return <Text type="secondary">{text}</Text>;
  } else {
    return <Text>{text}</Text>;
  }
}

function GeneralizationControls({
  column,
  updateColumn,
}: {
  column: ColumnState;
  updateColumn: (values: Partial<ColumnState>) => void;
}) {
  // Needed to clean up InputNumber values on reset click.
  const [tick, setTick] = useState(0);

  switch (column.tableColumn.type) {
    case 'integer':
    case 'real': {
      const isActive = column.binSize !== null;
      return (
        <Form className="GeneralizationControls" layout="inline">
          <Form.Item label={greyedText('Bin size', !isActive)} name="binSize">
            <span key={tick}>
              <InputNumber
                size="small"
                min={1}
                value={column.binSize as number}
                onChange={(binSize) => updateColumn({ binSize })}
              />
            </span>
          </Form.Item>
          {isActive && (
            <Form.Item>
              <Button
                danger
                type="text"
                shape="circle"
                icon={<CloseOutlined />}
                title="Clear values"
                onClick={() => {
                  updateColumn({ binSize: null });
                  setTick((x) => x + 1);
                }}
              />
            </Form.Item>
          )}
        </Form>
      );
    }
    case 'text': {
      const isActive = column.substringLength !== null;
      return (
        <Form key={tick} layout="inline" className="GeneralizationControls">
          <Form.Item label={greyedText('Substring start', !isActive)} name="substringStart">
            <span key={tick}>
              <InputNumber
                size="small"
                min={0}
                value={column.substringStart as number}
                onChange={(substringStart) => updateColumn({ substringStart })}
              />
            </span>
          </Form.Item>
          <Form.Item label={greyedText('Substring length', !isActive)} name="substringLength">
            <span key={tick}>
              <InputNumber
                size="small"
                min={1}
                value={column.substringLength as number}
                onChange={(substringLength) => updateColumn({ substringLength })}
              />
            </span>
          </Form.Item>
          {(isActive || column.substringStart !== null) && (
            <Form.Item>
              <Button
                danger
                type="text"
                shape="circle"
                icon={<CloseOutlined />}
                title="Clear values"
                onClick={() => {
                  updateColumn({ substringStart: null, substringLength: null });
                  setTick((x) => x + 1);
                }}
              />
            </Form.Item>
          )}
        </Form>
      );
    }
    default:
      return null;
  }
}

export const ColumnSelectionStep: FunctionComponent<ColumnSelectionStepProps> = ({ children, schema }) => {
  const [columns, setColumns] = useImmer<ColumnState[]>(() =>
    schema.columns.map((column) => ({
      tableColumn: column,
      selected: false,
      binSize: null,
      substringStart: null,
      substringLength: null,
    })),
  );

  const bucketColumns = useMemoStable<BucketColumn[]>(
    () =>
      columns
        .filter((c) => c.selected)
        .map((c) => {
          const { tableColumn: column } = c;
          switch (column.type) {
            case 'integer':
              return { column, generalization: getNumericGeneralization(c) };
            case 'real':
              return { column, generalization: getNumericGeneralization(c) };
            case 'text':
              return { column, generalization: getStringGeneralization(c) };
            case 'boolean':
              return { column };
          }
        }),
    [columns],
  );

  const anySelected = columns.some((c) => c.selected);

  return (
    <>
      <div className="ColumnSelectionStep notebook-step">
        <Title level={3}>Select columns for anonymization</Title>
        <table className="ColumnSelectionStep-columns">
          <thead>
            <tr>
              <th>Column</th>
              <th>Selected</th>
              <th>{anySelected && 'Generalization'}</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column, index) => {
              const updateColumn = (values: Partial<ColumnState>) =>
                setColumns((draft) => void assign(draft[index], values));

              return (
                <tr key={index}>
                  <td className="ColumnSelectionStep-column-name">{column.tableColumn.name}</td>
                  <td className="ColumnSelectionStep-column-switch">
                    <Switch
                      size="small"
                      checked={column.selected}
                      onChange={(selected) => updateColumn({ selected })}
                    />
                  </td>
                  <td className="ColumnSelectionStep-column-generalization">
                    {column.selected && <GeneralizationControls column={column} updateColumn={updateColumn} />}
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
