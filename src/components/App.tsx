import React, { FunctionComponent } from 'react';
import ReactDOM from 'react-dom';

import { Notebook } from '.';
import { AnonymizerContext, anonymizer } from '../state';

import './App.css';

export const App: FunctionComponent = () => {
  return (
    <AnonymizerContext.Provider value={anonymizer}>
      <Notebook />
    </AnonymizerContext.Provider>
  );
};

export function render(): void {
  ReactDOM.render(<App />, document.getElementById('root'));
}
