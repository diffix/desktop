import { CloseCircleOutlined } from '@ant-design/icons';
import { Button, Divider, Form, InputNumber, Radio, Switch, Tooltip, Typography } from 'antd';
import { assign } from 'lodash';
import React, { FunctionComponent, useState } from 'react';
import { useImmer } from 'use-immer';
import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { useMemoStable, useT } from '../shared';
import {
  BucketColumn,
  ColumnType,
  CountInput,
  NumericGeneralization,
  StringGeneralization,
  TableSchema,
} from '../types';

import './ColumnSelectionStep.css';

const { Title } = Typography;

export type ColumnSelectionStepProps = {
  schema: TableSchema;
  aidColumn: string;
  children: (data: ColumnSelectionStepData) => React.ReactNode;
};

export type ColumnSelectionStepData = {
  bucketColumns: BucketColumn[];
  countInput: CountInput;
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

// Values lower than this will cause the anonymizer to crash.
const MIN_BIN_SIZE_REAL = 0.000001;
const MIN_BIN_SIZE_INTEGER = 1;

function minBinSize(columnType: ColumnType) {
  return columnType === 'real' ? MIN_BIN_SIZE_REAL : MIN_BIN_SIZE_INTEGER;
}

function getNumericGeneralization({ binSize, type }: ColumnState): NumericGeneralization | null {
  if (typeof binSize !== 'number' || binSize < minBinSize(type)) return null;
  return { binSize };
}

function getStringGeneralization({ substringStart, substringLength }: ColumnState): StringGeneralization | null {
  if (typeof substringLength !== 'number') return null;
  return { substringStart: substringStart || 1, substringLength };
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
  const t = useT('ColumnSelectionStep::GeneralizationControls');
  switch (column.type) {
    case 'integer':
    case 'real': {
      const minValue = minBinSize(column.type);
      const isActive = column.binSize !== null && column.binSize >= minValue;
      return (
        <Form className={'GeneralizationControls' + (isActive ? ' active' : '')} layout="inline">
          <Form.Item label={t('Bin size')} name="binSize">
            <span key={column.resetCount}>
              <InputNumber
                size="small"
                min={minValue}
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
          <Form.Item label={t('Substring start')} name="substringStart">
            <span key={column.resetCount}>
              <InputNumber
                // `precision` and `Math.round` in change handler both needed to protect from decimals
                precision={0}
                size="small"
                placeholder="1"
                min={1}
                value={column.substringStart as number}
                onChange={(substringStart) => updateColumn({ substringStart: Math.round(substringStart) })}
              />
            </span>
          </Form.Item>
          <Form.Item label={t('Substring length')} name="substringLength">
            <span key={column.resetCount}>
              <InputNumber
                // `precision` and `Math.round` in change handler both needed to protect from decimals
                precision={0}
                size="small"
                min={1}
                value={column.substringLength as number}
                onChange={(substringLength) => updateColumn({ substringLength: Math.round(substringLength) })}
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

export const ColumnSelectionStep: FunctionComponent<ColumnSelectionStepProps> = ({ children, schema, aidColumn }) => {
  const t = useT('ColumnSelectionStep');
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
        .filter((c) => c.name !== aidColumn)
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
    [columns, aidColumn],
  );

  const [countInput, setCountInput] = useState<CountInput>('Rows');

  const anySelected = columns.some((c) => c.selected);

  const hasAidColumn = aidColumn !== 'RowIndex';

  return (
    <>
      <div className="ColumnSelectionStep notebook-step">
        <NotebookNavAnchor step={NotebookNavStep.ColumnSelection} status="done" />
        <Title level={3}>{t('Select columns for anonymization')}</Title>
        <table className="ColumnSelectionStep-table">
          <thead>
            <tr>
              <th className="ColumnSelectionStep-th-name">{t('Column')}</th>
              <th className="ColumnSelectionStep-th-switch">{t('Selected')}</th>
              <th className="ColumnSelectionStep-th-generalization">{anySelected && t('Generalization')}</th>
              <th className="ColumnSelectionStep-th-clear-generalization" />
            </tr>
          </thead>
          <tbody>
            {columns.map((column, index) => {
              if (column.name === aidColumn) return;
              const updateColumn = (values: Partial<ColumnState>) =>
                setColumns((draft) => void assign(draft[index], values));
              return (
                <tr key={index}>
                  <td className="ColumnSelectionStep-td-name" title={`${t('Type:')} ${t('type::' + column.type)}`}>
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
                        title={t('Clear values')}
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
            {hasAidColumn && (
              <tr key={columns.length} className="ColumnSelectionStep-tr-count">
                <td className="ColumnSelectionStep-td-name" title={t('Type:') + ' ' + t('type::integer')}>
                  <strong>{t('Count')}</strong>
                </td>
                <td className="ColumnSelectionStep-td-switch">
                  <Radio.Group
                    value={countInput}
                    size="small"
                    buttonStyle="solid"
                    onChange={(e) => setCountInput(e.target.value)}
                  >
                    <Tooltip title={t('Count rows')}>
                      <Radio.Button value="Rows">{t('Rows')}</Radio.Button>
                    </Tooltip>
                    <Tooltip title={t('Count protected entities')}>
                      <Radio.Button value="Entities">{t('Entities')}</Radio.Button>
                    </Tooltip>
                  </Radio.Group>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Render next step */}
      <Divider />
      {children({ bucketColumns, countInput: hasAidColumn ? countInput : 'Rows' })}
    </>
  );
};
