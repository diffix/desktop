import React, { FunctionComponent } from 'react';

import { FileLoadStep } from '../FileLoadStep';
import { SchemaLoadStep } from '../SchemaLoadStep';
import { ColumnSelectionStep } from '../ColumnSelectionStep';
import { AnonymizationStep } from '../AnonymizationStep';
import { AIDSelectStep } from '../AIDSelectStep';
import { NotebookNavProvider, NotebookNav } from './notebook-nav';

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
        </div>
        <div className="Notebook-content">
          <FileLoadStep onLoad={(file) => onTitleChange(file.name)}>
            {({ file }) => (
              <SchemaLoadStep file={file}>
                {({ schema }) => (
                  <AIDSelectStep schema={schema}>
                    {({ aidColumn }) => (
                      <ColumnSelectionStep schema={schema} aidColumn={aidColumn}>
                        {({ bucketColumns }) => (
                          <AnonymizationStep bucketColumns={bucketColumns} schema={schema} aidColumn={aidColumn} />
                        )}
                      </ColumnSelectionStep>
                    )}
                  </AIDSelectStep>
                )}
              </SchemaLoadStep>
            )}
          </FileLoadStep>
        </div>
      </div>
    </NotebookNavProvider>
  );
};
