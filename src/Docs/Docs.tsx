import React, { FunctionComponent, useRef, useState } from 'react';
import { Anchor, Typography } from 'antd';
import { find } from 'lodash';
import invariant from 'tiny-invariant';

import { Layout, useEffectWithChanges } from '../shared';
import { Markdown, TableOfContents, TableOfContentsLink } from './Markdown';

import './Docs.css';

// Placeholder doc files
import introductionSource from '../../docs/introduction.md';
import notebookStepsSource from '../../docs/notebook-steps.md';
import anonymizationSource from '../../docs/anonymization.md';

const { Link } = Anchor;
const { Title } = Typography;

const docsPages = [
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
] as const;

export type PageId = typeof docsPages[number]['id'];

function findDocsPage(id: PageId) {
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

export const defaultPage = docsPages[0].id;

export type DocsProps = {
  page: PageId;
  section: string | null;
  scrollInvalidator: number;
  onPageChange: (page: PageId) => void;
  onTitleChange: (title: string) => void;
};

export const Docs: FunctionComponent<DocsProps> = ({ page: pageId, section, scrollInvalidator, onPageChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tableOfContents, setTableOfContents] = useState<TableOfContents>([]);

  function scrollToTop() {
    containerRef.current!.scroll(0, 0);
  }

  useEffectWithChanges(
    ([prevPageId]) => {
      if (pageId !== prevPageId) {
        // Hack to force the ink dot to appear.
        setTimeout(() => {
          containerRef.current!.dispatchEvent(new CustomEvent('scroll'));
        }, 0);
      }

      if (section === null) {
        scrollToTop();
        return;
      }

      const element = document.getElementById(section);
      if (!element) {
        console.warn(`Section '${section}' not found`);
        scrollToTop();
        return;
      }

      element.scrollIntoView({
        block: 'start',
        // Smooth scroll only when within the same page.
        behavior: pageId === prevPageId ? 'smooth' : 'auto',
      });
    },
    [pageId, section, scrollInvalidator],
  );

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
              getContainer={() => containerRef.current ?? window}
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
                  onPageChange(page.id);
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
