import React from 'react'
import ReactDOM from 'react-dom'

function App() {
  return <h2>Hello from React!</h2>
}

export function render(): void {
  ReactDOM.render(<App />, document.getElementById('main'))
}
