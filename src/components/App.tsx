import React, { FunctionComponent, useState } from 'react';
import ReactDOM from 'react-dom';
import { Tabs } from 'antd';
import { StickyContainer, Sticky } from 'react-sticky';

import { Notebook } from '.';
import { AnonymizerContext, anonymizer } from '../state';

import './App.css';

const { TabPane } = Tabs;

type NotebookInfo = {
  id: number;
  title: string;
};

let nextNotebookId = 1;

function newNotebook(): NotebookInfo {
  return { id: nextNotebookId++, title: 'New Notebook' };
}

const initialNotebook = [newNotebook(), newNotebook()];

function renderTabBar(
  props: Record<string, unknown>,
  DefaultTabBar: React.ComponentType<React.HTMLAttributes<HTMLElement>>,
): React.ReactElement {
  return (
    <Sticky>
      {({ isSticky, style }) => (
        <DefaultTabBar
          {...props}
          className={isSticky ? 'App-tab-bar sticky' : 'App-tab-bar'}
          style={{ ...style, margin: 0 }}
        />
      )}
    </Sticky>
  );
}

export const App: FunctionComponent = () => {
  const [notebooks, setNotebooks] = useState(initialNotebook);

  return (
    <AnonymizerContext.Provider value={anonymizer}>
      <div className="App">
        <div className="App-container">
          <StickyContainer>
            <Tabs type="editable-card" renderTabBar={renderTabBar}>
              {notebooks.map((notebook) => (
                <TabPane tab={notebook.title} key={notebook.id}>
                  <Notebook />
                </TabPane>
              ))}
            </Tabs>
          </StickyContainer>
        </div>
      </div>
    </AnonymizerContext.Provider>
  );
};

export function render(): void {
  ReactDOM.render(<App />, document.getElementById('root'));
}
