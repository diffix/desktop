import React, { FunctionComponent } from 'react';
import { Divider } from 'antd';

import { FileLoadStep } from '../FileLoadStep';
import { SchemaLoadStep } from '../SchemaLoadStep';
import { AidSelectionStep } from '../AidSelectionStep';
import { ColumnSelectionStep } from '../ColumnSelectionStep';
import { AnonymizationStep } from '../AnonymizationStep';
import { NotebookNavProvider, NotebookNav } from './notebook-nav';
import { NotebookHelp } from './notebook-help';

import './Notebook.css';

export type NotebookProps = {
  onTitleChange: (title: string) => void;
};

export const Notebook: FunctionComponent<NotebookProps> = ({ onTitleChange }) => {
  return (
    <NotebookNavProvider>
      <div className="Notebook">
        <div className="Notebook-nav">
          <NotebookNav />
          <Divider style={{ margin: '16px 0' }} />
          <NotebookHelp />
        </div>
        <div className="Notebook-content">
          <FileLoadStep onLoad={(file) => onTitleChange(file.name)}>
            {({ file }) => (
              <SchemaLoadStep file={file}>
                {({ schema }) => (
                  <AidSelectionStep schema={schema}>
                    {({ aidColumn }) => (
                      <ColumnSelectionStep schema={schema} aidColumn={aidColumn}>
                        {({ bucketColumns }) => (
                          <AnonymizationStep bucketColumns={bucketColumns} schema={schema} aidColumn={aidColumn} />
                        )}
                      </ColumnSelectionStep>
                    )}
                  </AidSelectionStep>
                )}
              </SchemaLoadStep>
            )}
          </FileLoadStep>
        </div>
      </div>
    </NotebookNavProvider>
  );
};
