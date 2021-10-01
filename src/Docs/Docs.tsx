import React, { FunctionComponent, useEffect, useRef, useState } from 'react';
import { Anchor, Typography } from 'antd';
import { find } from 'lodash';
import invariant from 'tiny-invariant';

import { Layout } from '../shared';
import { Markdown, TableOfContents, TableOfContentsLink } from './Markdown';

import './Docs.css';

// Placeholder doc files
import introductionSource from '../../docs/introduction.md';
import notebookStepsSource from '../../docs/notebook-steps.md';
import anonymizationSource from '../../docs/anonymization.md';

const { Link } = Anchor;
const { Title } = Typography;

type DocsPage = {
  id: string;
  title: string;
  source: string;
};

const docsPages: DocsPage[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    source: introductionSource,
  },
  {
    id: 'notebook-steps',
    title: 'Notebook Steps',
    source: notebookStepsSource,
  },
  {
    id: 'anonymization',
    title: 'Anonymization',
    source: anonymizationSource,
  },
];

function findDocsPage(id: string) {
  const page = find(docsPages, { id });
  invariant(page, `Page with ID ${id} must exist.`);
  return page;
}

function renderLink(link: TableOfContentsLink) {
  return (
    <Link key={link.hash} href={link.hash} title={link.title}>
      {link.children.map(renderLink)}
    </Link>
  );
}

export type DocsProps = {
  onTitleChange: (title: string) => void;
};

export const Docs: FunctionComponent<DocsProps> = () => {
  const [pageId, setPageId] = useState<string>(docsPages[0].id);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tableOfContents, setTableOfContents] = useState<TableOfContents>([]);

  useEffect(() => {
    // Hack to make ink dot appear at the top of the new page.
    setTimeout(() => {
      containerRef.current!.dispatchEvent(new CustomEvent('scroll'));
    }, 0);
  }, [pageId]);

  function switchPage(id: string) {
    setPageId(id);
    containerRef.current!.scroll(0, 0);
  }

  const currentPage = findDocsPage(pageId);

  return (
    <Layout className="Docs">
      <Layout.Sidebar className="Docs-sidebar">
        <Title level={4}>User documentation </Title>
        {docsPages.map((page) =>
          page.id === pageId ? (
            <Anchor
              key={page.id}
              affix={false}
              showInkInFixed={true}
              offsetTop={16}
              getContainer={() => containerRef.current || window}
            >
              {tableOfContents.map(renderLink)}
            </Anchor>
          ) : (
            <div key={page.id} className="Docs-nav-link ant-anchor-link">
              <a
                className="ant-anchor-link-title"
                title={page.title}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  switchPage(page.id);
                }}
              >
                {page.title}
              </a>
            </div>
          ),
        )}
      </Layout.Sidebar>
      <Layout.Content ref={containerRef} className="Docs-content">
        <Markdown source={currentPage.source} onTableOfContents={setTableOfContents} />
      </Layout.Content>
    </Layout>
  );
};
