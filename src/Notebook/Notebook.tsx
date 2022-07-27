import { Divider } from 'antd';
import React, { FunctionComponent } from 'react';
import { AidSelectionStep } from '../AidSelectionStep';
import { AnonParamsSelectionStep } from '../AnonParamsSelectionStep';
import { AnonymizationStep } from '../AnonymizationStep';
import { ColumnSelectionStep } from '../ColumnSelectionStep';
import { FileLoadStep } from '../FileLoadStep';
import { SchemaLoadStep } from '../SchemaLoadStep';
import { Layout } from '../shared';
import { NotebookHelp } from './notebook-help';
import { NotebookNav, NotebookNavProvider } from './notebook-nav';

import './Notebook.css';

export type NotebookProps = {
  isActive: boolean;
  onTitleChange: (title: string) => void;
};

export const Notebook: FunctionComponent<NotebookProps> = ({ isActive, onTitleChange }) => {
  return (
    <NotebookNavProvider isActive={isActive}>
      <Layout className="Notebook">
        <Layout.Sidebar className="Notebook-sidebar">
          <NotebookNav />
          <Divider style={{ margin: '16px 0' }} />
          <NotebookHelp />
        </Layout.Sidebar>
        <Layout.Content className="Notebook-content">
          <FileLoadStep onLoad={(file) => onTitleChange(file.name)}>
            {({ file }) => (
              <SchemaLoadStep file={file}>
                {({ schema }) => (
                  <AidSelectionStep schema={schema}>
                    {({ aidColumn }) => (
                      <ColumnSelectionStep schema={schema} aidColumn={aidColumn}>
                        {({ bucketColumns, countInput }) => (
                          <AnonParamsSelectionStep>
                            {({ anonParams }) => (
                              <AnonymizationStep
                                bucketColumns={bucketColumns}
                                schema={schema}
                                aidColumn={aidColumn}
                                countInput={countInput}
                                anonParams={anonParams}
                              />
                            )}
                          </AnonParamsSelectionStep>
                        )}
                      </ColumnSelectionStep>
                    )}
                  </AidSelectionStep>
                )}
              </SchemaLoadStep>
            )}
          </FileLoadStep>
        </Layout.Content>
      </Layout>
    </NotebookNavProvider>
  );
};
