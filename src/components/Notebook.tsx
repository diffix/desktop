import React, { FunctionComponent } from 'react';

import { FileLoadStep, SchemaLoadStep, ColumnSelectionStep, AnonymizationStep } from '.';

import './Notebook.css';

export const Notebook: FunctionComponent = () => {
  return (
    <div className="Notebook">
      <FileLoadStep>
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
