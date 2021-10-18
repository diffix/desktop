import React, { FunctionComponent } from 'react';
import { Divider, Typography } from 'antd';
import { Components } from 'react-markdown';
import classNames from 'classnames';

import { allPageIds, PageId } from './Docs';
import { DocsLink } from './DocsLink';

const { Link, Paragraph, Text, Title } = Typography;

type SectionLinkProps = {
  className?: string;
  section: string | null;
};

// Link which scrolls to section smoothly.
const SectionLink: FunctionComponent<SectionLinkProps> = ({ className, section, children }) => {
  return (
    <Link
      className={classNames('SectionLink', className)}
      href={`#${section || ''}`}
      onClick={(e) => {
        e.preventDefault();

        if (!section) {
          window.scroll(0, 0);
          return;
        }

        const element = document.getElementById(section);
        if (!element) {
          console.warn(`Section '${section}' not found`);
          return;
        }

        element.scrollIntoView({
          block: 'start',
          behavior: 'smooth',
        });
      }}
    >
      {children}
    </Link>
  );
};

// Removes annoying `onClick` type mismatch error and discards the `node` prop.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap<TArgs>(fn: (props: TArgs & { onClick: any }) => JSX.Element) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (({ node: _, ...props }: any) => fn(props)) as (args: TArgs) => JSX.Element;
}

type LinkInfo = { type: 'external' } | { type: 'local'; path: string; hash: string };

function parseHref(href: string): LinkInfo {
  const dummyHostname = 'open-diffix.local';
  const url = new URL(href, `https://${dummyHostname}`);
  if (url.hostname === dummyHostname) {
    return { type: 'local', path: url.pathname, hash: url.hash };
  } else {
    return { type: 'external' };
  }
}

function parsePage(path: string): PageId | '/' | null {
  path = path.replace(/^\//, '').replace(/\.md$/i, '');
  if (path === '') {
    return '/';
  } else if (allPageIds.includes(path as PageId)) {
    return path as PageId;
  } else {
    return null;
  }
}

function parseSection(hash: string): string | null {
  if (!hash) return null;
  return hash.replace(/^#/, '');
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export const components: Components = {
  a: wrap((props) => {
    const linkInfo = parseHref(props.href || '#');
    if (linkInfo.type === 'external') {
      return <a {...props} target={'_blank'} />;
    } else {
      const page = parsePage(linkInfo.path);
      if (page === '/') {
        return <SectionLink {...props} section={parseSection(linkInfo.hash)} />;
      } else if (page) {
        return <DocsLink {...props} page={page} section={parseSection(linkInfo.hash)} />;
      } else {
        console.warn(`Page '${linkInfo.path}' not found`);
        return <a {...props} href="#" />;
      }
    }
  }),
  blockquote: wrap((props) => <blockquote {...props} className={classNames(props.className, 'ant-typography')} />),
  code: wrap(({ inline, ...props }) => {
    if (inline) {
      return <Text {...props} code />;
    } else {
      return <Paragraph {...props} code />;
    }
  }),
  em: wrap((props) => <Text {...props} italic />),
  h1: wrap((props) => <Title {...props} level={2} />),
  h2: wrap((props) => <Title {...props} level={3} />),
  h3: wrap((props) => <Title {...props} level={4} />),
  h4: wrap((props) => <Title {...props} level={5} />),
  hr: wrap((props) => <Divider {...props} />),
  img: wrap((props) => {
    const linkInfo = parseHref(props.src || '');
    if (linkInfo.type === 'external' || !linkInfo.path) {
      return <img {...props} />;
    } else {
      return <img {...props} src={`docs://${linkInfo.path}`} />;
    }
  }),
  ol: wrap(({ depth, ordered, ...props }) => (
    <ol {...props} className={classNames(props.className, 'ant-typography')} />
  )),
  p: wrap((props) => <Paragraph {...props} />),
  pre: wrap((props) => <pre {...props} className={classNames(props.className, 'ant-typography')} />),
  strong: wrap((props) => <Text {...props} strong />),
  ul: wrap(({ depth, ordered, ...props }) => (
    <ul {...props} className={classNames(props.className, 'ant-typography')} />
  )),
  // GFM
  del: wrap((props) => <Text {...props} delete />),
  table: wrap((props) => <table {...props} className={classNames(props.className, 'ant-typography')} />),
};
