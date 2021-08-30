import React, { FunctionComponent } from 'react';
import { FileLoadStep } from '../FileLoadStep';
import { SchemaLoadStep } from '../SchemaLoadStep';
import { ColumnSelectionStep } from '../ColumnSelectionStep';
import { AnonymizationStep } from '../AnonymizationStep';

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
                {({ bucketColumns }) => <AnonymizationStep bucketColumns={bucketColumns} schema={schema} />}
              </ColumnSelectionStep>
            )}
          </SchemaLoadStep>
        )}
      </FileLoadStep>
    </div>
  );
};
