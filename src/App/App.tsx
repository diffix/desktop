import { Button, ConfigProvider, Empty, Tabs } from 'antd';
import deDE from 'antd/es/locale/de_DE';
import enUS from 'antd/es/locale/en_US';
import { find, findIndex } from 'lodash';
import React, { FunctionComponent } from 'react';
import ReactDOM from 'react-dom';
import { I18nextProvider } from 'react-i18next';
import { useImmer } from 'use-immer';
import { Docs, DocsFunctionsContext, PageId } from '../Docs';
import { Notebook } from '../Notebook';
import { anonymizer, AnonymizerContext, getT, TFunc, useStaticValue, useT } from '../shared';
import { useCheckUpdates } from './use-check-updates';

import './App.css';

const { TabPane } = Tabs;

type CommonTabData = {
  id: string;
  title: string;
};

type NotebookTab = CommonTabData & {
  type: 'notebook';
};

type DocsTab = CommonTabData & {
  type: 'docs';
  page: PageId;
  section: string | null;
  scrollInvalidator: number; // Triggers a scroll when changed
};

type TabInfo = NotebookTab | DocsTab;

type AppState = {
  tabs: TabInfo[];
  activeTab: string;
};

let nextTabId = 1;

function newNotebookTab(t: TFunc): TabInfo {
  return { id: (nextTabId++).toString(), title: t('New Notebook'), type: 'notebook' };
}

function newDocsTab(page: PageId, section: string | null, t: TFunc): TabInfo {
  return {
    id: (nextTabId++).toString(),
    title: t('Documentation'),
    type: 'docs',
    page,
    section,
    scrollInvalidator: 0,
  };
}

function setWindowTitle(state: AppState) {
  const t = getT('App');
  const tab = find(state.tabs, { id: state.activeTab });
  if (tab) {
    window.setMainWindowTitle(tab.title + ' - ' + t('Diffix for Desktop'));
  } else {
    window.setMainWindowTitle(t('Diffix for Desktop'));
  }
}

export const App: FunctionComponent = () => {
  const t = useT('App');
  const [state, updateState] = useImmer(() => {
    const initialNotebook = newNotebookTab(t);
    return {
      tabs: [initialNotebook],
      activeTab: initialNotebook.id,
    };
  });

  useCheckUpdates();

  function onEdit(targetKey: unknown, action: 'add' | 'remove'): void {
    switch (action) {
      case 'add':
        updateState((state) => {
          const addedNotebook = newNotebookTab(t);
          state.tabs.push(addedNotebook);
          state.activeTab = addedNotebook.id;
          setWindowTitle(state);
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
          setWindowTitle(state);
        });
        return;
    }
  }

  function setActiveTab(id: string) {
    updateState((state) => {
      state.activeTab = id;
      setWindowTitle(state);
    });
  }

  function setTitle(id: string, title: string) {
    updateState((state) => {
      const tab = find(state.tabs, { id });
      if (tab) {
        tab.title = title;
      }
      setWindowTitle(state);
    });
  }

  const docsFunctions = useStaticValue(() => ({
    openDocs(page: PageId, section: string | null = null) {
      updateState((state) => {
        const existingTab = state.tabs.find((t) => t.type === 'docs') as DocsTab | undefined;
        if (existingTab) {
          existingTab.page = page;
          existingTab.section = section;
          existingTab.scrollInvalidator++;
          state.activeTab = existingTab.id;
        } else {
          const newTab = newDocsTab(page, section, t);
          state.tabs.push(newTab);
          state.activeTab = newTab.id;
        }
        setWindowTitle(state);
      });
    },
  }));

  window.onOpenDocs = (page) => docsFunctions.openDocs(page);

  const { tabs, activeTab } = state;

  return (
    <ConfigProvider locale={window.i18n.language === 'de' ? deDE : enUS}>
      <AnonymizerContext.Provider value={anonymizer}>
        <DocsFunctionsContext.Provider value={docsFunctions}>
          <div className="App">
            {tabs.length !== 0 ? (
              <Tabs type="editable-card" activeKey={activeTab} onChange={setActiveTab} onEdit={onEdit}>
                {tabs.map((tab) => (
                  <TabPane tab={tab.title} key={tab.id}>
                    {tab.type === 'notebook' ? (
                      <Notebook isActive={activeTab === tab.id} onTitleChange={(title) => setTitle(tab.id, title)} />
                    ) : (
                      <Docs
                        onTitleChange={(title) => setTitle(tab.id, title)}
                        page={tab.page}
                        onPageChange={(page) =>
                          updateState((state) => {
                            const docsTab = find(state.tabs, { id: tab.id }) as DocsTab;
                            docsTab.page = page;
                            docsTab.section = null;
                            docsTab.scrollInvalidator++;
                          })
                        }
                        section={tab.section}
                        scrollInvalidator={tab.scrollInvalidator}
                      />
                    )}
                  </TabPane>
                ))}
              </Tabs>
            ) : (
              <Empty className="App-empty" description={t('No open notebooks')}>
                <Button type="primary" onClick={() => onEdit(null, 'add')}>
                  {t('Create New')}
                </Button>
              </Empty>
            )}
          </div>
        </DocsFunctionsContext.Provider>
      </AnonymizerContext.Provider>
    </ConfigProvider>
  );
};

export function render(): void {
  ReactDOM.render(
    <I18nextProvider i18n={window.i18n}>
      <App />
    </I18nextProvider>,
    document.getElementById('root'),
  );
}
