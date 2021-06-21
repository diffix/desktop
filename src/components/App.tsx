import React, { FunctionComponent } from 'react';
import ReactDOM from 'react-dom';

import { AnonymizationView, CsvFilePicker, SchemaLoader } from '.';
import { AnonymizerContext, anonymizer } from '../state';

import './App.css';

export const App: FunctionComponent = () => {
  return (
    <AnonymizerContext.Provider value={anonymizer}>
      <div className="App">
        <CsvFilePicker>
          {(file, removeFile) => (
            <SchemaLoader file={file} removeFile={removeFile}>
              {(schema) => <AnonymizationView schema={schema} removeFile={removeFile} />}
            </SchemaLoader>
          )}
        </CsvFilePicker>
      </div>
    </AnonymizerContext.Provider>
  );
};

export function render(): void {
  ReactDOM.render(<App />, document.getElementById('root'));
}
