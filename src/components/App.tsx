import React, { FunctionComponent } from 'react';
import ReactDOM from 'react-dom';

import './App.css';

export const App: FunctionComponent = () => {
  return <h2>Hello from React!</h2>;
};

export function render(): void {
  ReactDOM.render(<App />, document.getElementById('root'));
}
