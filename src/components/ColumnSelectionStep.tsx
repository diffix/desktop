import React, { FunctionComponent, useMemo } from 'react';
import { Divider, Switch, Typography } from 'antd';
import { useImmer } from 'use-immer';

import { BucketColumn, TableSchema } from '../types';

import './ColumnSelectionStep.css';

const { Title } = Typography;

export type ColumnSelectionStepProps = {
  schema: TableSchema;
  children: (data: ColumnSelectionStepData) => React.ReactNode;
};

export type ColumnSelectionStepData = {
  bucketColumns: BucketColumn[];
};

type ColumnState = BucketColumn & { selected: boolean };

export const ColumnSelectionStep: FunctionComponent<ColumnSelectionStepProps> = ({ children, schema }) => {
  const [columns, setColumns] = useImmer<ColumnState[]>(() =>
    schema.columns.map((column) => ({ column, generalization: null, selected: false })),
  );

  const bucketColumns = useMemo(() => columns.filter((c) => c.selected), [columns]);

  return (
    <>
      <div className="ColumnSelectionStep notebook-step">
        <Title level={3}>Select columns for anonymization</Title>
        <table className="ColumnSelectionStep-columns">
          <tbody>
            {columns.map(({ column }, index) => (
              <tr key={index}>
                <td className="ColumnSelectionStep-column-name">{column.name}</td>
                <td className="ColumnSelectionStep-column-switch">
                  <Switch
                    size="small"
                    checked={columns[index].selected}
                    onChange={(checked) => setColumns((draft) => void (draft[index].selected = checked))}
                  />
                </td>
                <td className="ColumnSelectionStep-column-generalization"></td>
              </tr>
            ))}
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
