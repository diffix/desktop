import React, { FunctionComponent } from 'react';
import ReactDOM from 'react-dom';
import { useSchema } from '../state/hooks/schema';
import { AnonymizationView } from './AnonymizationView';

import './App.css';

export const App: FunctionComponent = () => {
  const computedSchema = useSchema('my-file.csv');

  switch (computedSchema.state) {
    case 'in_progress':
      return <div>Computing schema</div>;

    case 'failed':
      return <div>Failed to compute schema: {computedSchema.error}</div>;

    case 'completed':
      return <AnonymizationView schema={computedSchema.value} />;

    case 'not_initialized':
      return <div>Initializing...</div>;
  }
};

export function render(): void {
  ReactDOM.render(<App />, document.getElementById('root'));
}
