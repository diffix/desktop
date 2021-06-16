import React, { FunctionComponent } from 'react';
import ReactDOM from 'react-dom';

import { AnonymizationView, SchemaLoader } from '.';
import { AnonymizerContext, fakeAnonymizer } from '../state';

import './App.css';

export const App: FunctionComponent = () => {
  return (
    <AnonymizerContext.Provider value={fakeAnonymizer}>
      <div className="App">
        <SchemaLoader />
      </div>
    </AnonymizerContext.Provider>
  );
};

export function render(): void {
  ReactDOM.render(<App />, document.getElementById('root'));
}
