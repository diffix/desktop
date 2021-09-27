import React, { FunctionComponent } from 'react';
import ReactDOM from 'react-dom';
import { Button, Empty, Tabs } from 'antd';
import { useImmer } from 'use-immer';
import { find, findIndex } from 'lodash';

import { AnonymizerContext, anonymizer } from '../shared';
import { Docs } from '../Docs';
import { Notebook } from '../Notebook';

import './App.css';

const { TabPane } = Tabs;

type TabInfo = {
  id: string;
  title: string;
  type: 'notebook' | 'docs';
};

type AppState = {
  tabs: TabInfo[];
  activeTab: string;
};

let nextTabId = 1;

function newNotebookTab(): TabInfo {
  return { id: (nextTabId++).toString(), title: 'New Notebook', type: 'notebook' };
}

function newDocsTab(): TabInfo {
  return { id: (nextTabId++).toString(), title: 'Documentation', type: 'docs' };
}

const initialNotebook = newNotebookTab();

const initialAppState: AppState = {
  tabs: [initialNotebook, newDocsTab()],
  activeTab: initialNotebook.id,
};

export const App: FunctionComponent = () => {
  const [state, updateState] = useImmer(initialAppState);

  function onEdit(targetKey: unknown, action: 'add' | 'remove'): void {
    switch (action) {
      case 'add':
        updateState((state) => {
          const addedNotebook = newNotebookTab();
          state.tabs.push(addedNotebook);
          state.activeTab = addedNotebook.id;
        });
        return;

      case 'remove':
        updateState((state) => {
          const { tabs } = state;
          const id = targetKey as string;
          const index = findIndex(tabs, { id });
          if (index < 0) return;

          tabs.splice(index, 1);
          if (id === state.activeTab && tabs.length !== 0) {
            state.activeTab = tabs[Math.min(index, tabs.length - 1)].id;
          }
        });
        return;
    }
  }

  function setActiveTab(id: string) {
    updateState((state) => {
      state.activeTab = id;
    });
  }

  function setTitle(id: string, title: string) {
    updateState(({ tabs }) => {
      const tab = find(tabs, { id });
      if (tab) tab.title = title;
    });
  }

  const { tabs, activeTab } = state;

  return (
    <AnonymizerContext.Provider value={anonymizer}>
      <div className="App">
        {tabs.length !== 0 ? (
          <Tabs type="editable-card" activeKey={activeTab} onChange={setActiveTab} onEdit={onEdit}>
            {tabs.map((tab) => (
              <TabPane tab={tab.title} key={tab.id}>
                {tab.type === 'notebook' ? (
                  <Notebook isActive={activeTab === tab.id} onTitleChange={(title) => setTitle(tab.id, title)} />
                ) : (
                  <Docs onTitleChange={(title) => setTitle(tab.id, title)} />
                )}
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
      </div>
    </AnonymizerContext.Provider>
  );
};

export function render(): void {
  ReactDOM.render(<App />, document.getElementById('root'));
}
