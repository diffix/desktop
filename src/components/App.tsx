import React, { FunctionComponent, useState } from 'react';
import ReactDOM from 'react-dom';
import { Button, Empty, Tabs } from 'antd';
import { StickyContainer, Sticky } from 'react-sticky';

import { Notebook } from '.';
import { AnonymizerContext, anonymizer } from '../state';

import './App.css';

const { TabPane } = Tabs;

type NotebookInfo = {
  id: string;
  title: string;
};

let nextNotebookId = 1;

function newNotebook(): NotebookInfo {
  return { id: (nextNotebookId++).toString(), title: 'New Notebook' };
}

const initialNotebook = [newNotebook()];

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

  function onEdit(targetKey: unknown, action: 'add' | 'remove'): void {
    switch (action) {
      case 'add':
        setNotebooks([...notebooks, newNotebook()]);
        return;
      case 'remove':
        setNotebooks(notebooks.filter((n) => n.id !== targetKey));
        return;
    }
  }

  function setTitle(id: string, title: string) {
    setNotebooks(notebooks.map((n) => (n.id === id ? { ...n, title } : n)));
  }

  return (
    <AnonymizerContext.Provider value={anonymizer}>
      <div className="App">
        <div className="App-container">
          <StickyContainer>
            {notebooks.length !== 0 ? (
              <Tabs type="editable-card" renderTabBar={renderTabBar} onEdit={onEdit}>
                {notebooks.map((notebook) => (
                  <TabPane tab={notebook.title} key={notebook.id}>
                    <Notebook onTitleChange={(title) => setTitle(notebook.id, title)} />
                  </TabPane>
                ))}
              </Tabs>
            ) : (
              <Empty className="App-empty" description="No open notebooks">
                <Button type="primary" onClick={() => onEdit(null, 'add')}>
                  Create New
                </Button>
              </Empty>
            )}
          </StickyContainer>
        </div>
      </div>
    </AnonymizerContext.Provider>
  );
};

export function render(): void {
  ReactDOM.render(<App />, document.getElementById('root'));
}
