import React, { FunctionComponent, useState } from 'react';
import { Button, Divider } from 'antd';
import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';

import { FileLoadStep } from '../FileLoadStep';
import { SchemaLoadStep } from '../SchemaLoadStep';
import { AidSelectionStep } from '../AidSelectionStep';
import { ColumnSelectionStep } from '../ColumnSelectionStep';
import { AnonParamsSelectionStep } from '../AnonParamsSelectionStep';
import { AnonymizationStep } from '../AnonymizationStep';
import { Layout } from '../shared';
import { NotebookNavProvider, NotebookNav } from './notebook-nav';
import { NotebookHelp } from './notebook-help';

import './Notebook.css';

export type NotebookProps = {
  isActive: boolean;
  onTitleChange: (title: string) => void;
};

export const Notebook: FunctionComponent<NotebookProps> = ({ isActive, onTitleChange }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <NotebookNavProvider isActive={isActive}>
      <Layout className="Notebook">
        <Layout.Sidebar collapsed={collapsed} className="Notebook-sidebar">
          <NotebookNav collapsed={collapsed} />
          {collapsed ? null : (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <NotebookHelp />
            </>
          )}
        </Layout.Sidebar>
        <Layout.CollapseButton className="Notebook-collapse-button">
          <Button
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
        </Layout.CollapseButton>
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
