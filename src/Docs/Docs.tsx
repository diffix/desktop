import { Anchor, Typography } from 'antd';
import { find } from 'lodash';
import React, { FunctionComponent, useEffect, useRef, useState } from 'react';
import invariant from 'tiny-invariant';
import { Layout, usePrevious, useT } from '../shared';
import { Markdown, TableOfContents, TableOfContentsLink } from './Markdown';

import './Docs.css';

import changelogSource from '../../CHANGELOG.md';

import anonymizationSourceEn from '../../docs/en/anonymization.md';
import anonymizationSourceDe from '../../docs/de/anonymization.md';

import operationSourceEn from '../../docs/en/operation.md';
import operationSourceDe from '../../docs/de/operation.md';

import tipsSourceEn from '../../docs/en/tips.md';
import tipsSourceDe from '../../docs/de/tips.md';

import licenseSource from '../../LICENSE.md';

const { Link } = Anchor;
const { Title } = Typography;

const docsPages = [
  {
    id: 'operation',
    title: 'Operation',
    source: {
      en: operationSourceEn,
      de: operationSourceDe,
    },
  },
  {
    id: 'anonymization',
    title: 'Anonymization',
    source: {
      en: anonymizationSourceEn,
      de: anonymizationSourceDe,
    },
  },
  {
    id: 'tips',
    title: 'Tips and Tricks',
    source: {
      en: tipsSourceEn,
      de: tipsSourceDe,
    },
  },
  {
    id: 'changelog',
    title: 'Changelog',
    source: {
      en: changelogSource,
      de: changelogSource,
    },
  },
  {
    id: 'license',
    title: 'License',
    source: {
      en: licenseSource,
      de: licenseSource,
    },
  },
] as const;

export type PageId = typeof docsPages[number]['id'];

export const allPageIds = docsPages.map((p) => p.id);

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

export type DocsProps = {
  page: PageId;
  section: string | null;
  scrollInvalidator: number;
  onPageChange: (page: PageId) => void;
  onTitleChange: (title: string) => void;
};

export const Docs: FunctionComponent<DocsProps> = ({ page: pageId, section, scrollInvalidator, onPageChange }) => {
  const t = useT('Docs');
  const containerRef = useRef<HTMLDivElement>(null);
  const [tableOfContents, setTableOfContents] = useState<TableOfContents>([]);

  function scrollToTop() {
    containerRef.current!.scroll(0, 0);
  }

  const prevPageId = usePrevious(pageId);
  const prevScrollInvalidator = usePrevious(scrollInvalidator);

  useEffect(() => {
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
      behavior: pageId === prevPageId && scrollInvalidator === prevScrollInvalidator ? 'smooth' : 'auto',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, section, scrollInvalidator]);

  const currentPage = findDocsPage(pageId);

  return (
    <Layout className="Docs">
      <Layout.Sidebar className="Docs-sidebar">
        <Title level={4}>{t('Documentation')}</Title>
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
                title={t(page.title)}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(page.id);
                }}
              >
                {t(page.title)}
              </a>
            </div>
          ),
        )}
      </Layout.Sidebar>
      <Layout.Content ref={containerRef} className="Docs-content">
        <Markdown
          source={currentPage.source[window.i18n.language as 'en' | 'de']}
          onTableOfContents={setTableOfContents}
        />
      </Layout.Content>
    </Layout>
  );
};
