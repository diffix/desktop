import React, { FunctionComponent } from 'react';
import ReactDOM from 'react-dom';
import { Result, Spin } from 'antd';

import { useSchema } from '../hooks';
import { AnonymizationView } from './AnonymizationView';

import './App.css';

export const App: FunctionComponent = () => {
  const computedSchema = useSchema('my-file.csv');

  switch (computedSchema.state) {
    case 'completed':
      return (
        <div className="App App--completed">
          <AnonymizationView schema={computedSchema.value} />
        </div>
      );

    case 'failed':
      return (
        <div className="App App--failed">
          <Result
            status="error"
            title="Schema discovery failed"
            subTitle="Something went wrong while loading the schema."
          />
        </div>
      );

    default:
      return (
        <div className="App App--loading">
          <Spin tip="Loading schema..." size="large" />
        </div>
      );
  }
};

export function render(): void {
  ReactDOM.render(<App />, document.getElementById('root'));
}
