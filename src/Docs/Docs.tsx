import React, { FunctionComponent } from 'react';

import { Layout } from '../shared';
import { Markdown } from './Markdown';

import './Docs.css';

export type DocsProps = {
  onTitleChange: (title: string) => void;
};

export const Docs: FunctionComponent<DocsProps> = () => {
  return (
    <Layout className="Docs">
      <Layout.Sidebar className="Docs-sidebar">Docs nav</Layout.Sidebar>
      <Layout.Content className="Docs-content">
        <Markdown source="Docs content" />
      </Layout.Content>
    </Layout>
  );
};
