import React, { FunctionComponent } from 'react';

import { FileLoadStep, SchemaLoadStep, ColumnSelectionStep, AnonymizationStep } from '.';

import './Notebook.css';

export type NotebookProps = {
  onTitleChange: (title: string) => void;
};

export const Notebook: FunctionComponent<NotebookProps> = ({ onTitleChange }) => {
  return (
    <div className="Notebook">
      <FileLoadStep onLoad={(file) => onTitleChange(file.name)}>
        {({ file }) => (
          <SchemaLoadStep file={file}>
            {({ schema }) => (
              <ColumnSelectionStep schema={schema}>
                {({ columns }) => <AnonymizationStep columns={columns} schema={schema} />}
              </ColumnSelectionStep>
            )}
          </SchemaLoadStep>
        )}
      </FileLoadStep>
    </div>
  );
};
